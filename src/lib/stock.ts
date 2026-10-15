import crypto from "crypto";
import { query, transaction, type SqlClient } from "@/lib/db";
import { nightsBetween, todayInRiyadh } from "@/lib/money";

const holdingAllotment = `
  (
    a.status = 'confirmed'
    OR (
      a.status = 'provisional'
      AND (
        (
          a.hold_until IS NOT NULL
          AND a.hold_until::timestamptz > NOW()
        )
        OR EXISTS (
          SELECT 1 FROM bookings AS held
          WHERE held.id = a.booking_id
            AND held.status = 'pending'
            AND held.hold_until::timestamptz > NOW()
        )
      )
    )
  )
  AND COALESCE(sale.supplier_status, 'new') NOT IN ('cancelled', 'no_show')
`;

export type HoldReleaseResult = {
  skipped: boolean;
  processed: number;
  bookingsCancelled: number;
  reservationsExpired: number;
};

export async function releaseExpiredHolds(): Promise<HoldReleaseResult> {
  return transaction(async (sql) => {
    const lock = await sql.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_xact_lock(8142026, 1007) AS locked",
    );
    if (!lock[0]?.locked) {
      return {
        skipped: true,
        processed: 0,
        bookingsCancelled: 0,
        reservationsExpired: 0,
      };
    }

    const bookings = await sql.query<{ id: string }>(
      `UPDATE bookings
       SET status = 'cancelled'
       WHERE status = 'pending'
         AND hold_until::timestamptz <= NOW()
       RETURNING id`,
    );
    const expired = await sql.query<{ id: string; reason: string }>(
      `WITH doomed AS (
         SELECT allotment.id,
                CASE
                  WHEN allotment.hold_until IS NULL
                    OR btrim(allotment.hold_until) = '' THEN 'orphan'
                  WHEN allotment.hold_until::timestamptz <= NOW() THEN 'expired'
                  ELSE 'booking_expired'
                END AS reason
         FROM allotments AS allotment
         WHERE allotment.status = 'provisional'
           AND (
             (
               allotment.hold_until IS NOT NULL
               AND btrim(allotment.hold_until) <> ''
               AND allotment.hold_until::timestamptz <= NOW()
             )
             OR (
               allotment.booking_id IS NOT NULL
               AND EXISTS (
                 SELECT 1 FROM bookings AS booking
                 WHERE booking.id = allotment.booking_id
                   AND booking.status = 'cancelled'
                   AND booking.hold_until::timestamptz <= NOW()
               )
             )
             OR (
               (allotment.hold_until IS NULL OR btrim(allotment.hold_until) = '')
               AND NOT EXISTS (
                 SELECT 1 FROM bookings AS booking
                 WHERE booking.id = allotment.booking_id
                   AND booking.status = 'pending'
                   AND booking.hold_until::timestamptz > NOW()
               )
             )
           )
       ),
       updated AS (
         UPDATE allotments
         SET status = 'cancelled', hold_until = NULL
         WHERE id IN (SELECT id FROM doomed)
         RETURNING id
       )
       SELECT updated.id, doomed.reason
       FROM updated
       JOIN doomed ON doomed.id = updated.id`,
    );
    const createdAt = new Date().toISOString();
    for (const reservation of expired) {
      await sql.execute(
        `INSERT INTO reservation_events
          (id, allotment_id, kind, actor_type, actor_id, payload, created_at)
         VALUES (?, ?, 'hold_expired', 'system', NULL, ?::jsonb, ?)`,
        [
          crypto.randomUUID(),
          reservation.id,
          JSON.stringify({ reason: reservation.reason, stockEffect: "released" }),
          createdAt,
        ],
      );
    }
    return {
      skipped: false,
      processed: bookings.length + expired.length,
      bookingsCancelled: bookings.length,
      reservationsExpired: expired.length,
    };
  });
}

function nightSeries(checkIn: string, checkOut: string) {
  return {
    sql: `generate_series(?::timestamp, (?::date - INTERVAL '1 day')::timestamp, INTERVAL '1 day')`,
    args: [checkIn, checkOut],
  };
}

export type ContractRule = {
  quantityLeft: number;
  overbookLeft: number;
  request: boolean;
};

const emptyRule: ContractRule = {
  quantityLeft: 0,
  overbookLeft: 0,
  request: false,
};

function allowanceSql(periodMatch: string, saleMatch: string) {
  const live = `
    purchase.status = 'confirmed'
    AND purchase.active = TRUE
    AND period.active = TRUE
    AND period.check_in::date <= day.day::date
    AND period.check_out::date > day.day::date
  `;
  return `
    SELECT
      COALESCE(MIN(GREATEST(day_qty - day_taken, 0)), 0)::int AS quantity_left,
      COALESCE(MIN(GREATEST(day_over - GREATEST(day_taken - day_qty, 0), 0)), 0)::int AS overbook_left,
      COALESCE(MIN(day_request), 0)::int AS request
    FROM (
      SELECT
        COALESCE((
          SELECT SUM(period.quantity)::int
          FROM contract_periods AS period
          JOIN purchase_lines AS line ON line.id = period.purchase_line_id
          JOIN purchases AS purchase ON purchase.id = line.purchase_id
          WHERE ${periodMatch}
            AND ${live}
            AND period.sale_mode <> 'request'
            AND (period.stop_sale = FALSE OR ?::boolean)
        ), 0) AS day_qty,
        COALESCE((
          SELECT SUM(period.overbook_limit)::int
          FROM contract_periods AS period
          JOIN purchase_lines AS line ON line.id = period.purchase_line_id
          JOIN purchases AS purchase ON purchase.id = line.purchase_id
          WHERE ${periodMatch}
            AND ${live}
            AND period.sale_mode <> 'request'
            AND (period.stop_sale = FALSE OR ?::boolean)
        ), 0) AS day_over,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM contract_periods AS period
            JOIN purchase_lines AS line ON line.id = period.purchase_line_id
            JOIN purchases AS purchase ON purchase.id = line.purchase_id
            WHERE ${periodMatch}
              AND ${live}
              AND period.sale_mode = 'request'
              AND period.stop_sale = FALSE
          ) AND NOT EXISTS (
            SELECT 1
            FROM contract_periods AS period
            JOIN purchase_lines AS line ON line.id = period.purchase_line_id
            JOIN purchases AS purchase ON purchase.id = line.purchase_id
            WHERE ${periodMatch}
              AND ${live}
              AND period.sale_mode <> 'request'
          ) THEN 1
          ELSE 0
        END AS day_request,
        COALESCE((
          SELECT SUM(sale.quantity)::int
          FROM allotment_lines AS sale
          JOIN allotments AS a ON a.id = sale.allotment_id
          WHERE ${saleMatch}
            AND ${holdingAllotment}
            AND (?::text IS NULL OR a.id <> ?::text)
            AND a.check_in::date <= day.day::date
            AND a.check_out::date > day.day::date
        ), 0) AS day_taken
      FROM generate_series(
        ?::timestamp,
        (?::date - INTERVAL '1 day')::timestamp,
        INTERVAL '1 day'
      ) AS day(day)
    ) AS nights`;
}

function ruleFrom(
  row:
    | { quantity_left: number; overbook_left: number; request: number }
    | undefined,
): ContractRule {
  if (!row) return emptyRule;
  return {
    quantityLeft: Number(row.quantity_left),
    overbookLeft: Number(row.overbook_left),
    request: Number(row.request) === 1,
  };
}

export async function offerRule(
  offerId: string,
  checkIn: string,
  checkOut: string,
  db: Pick<SqlClient, "query"> = { query },
  ignoreAllotmentId?: string,
  countStopSale = false,
) {
  if (nightsBetween(checkIn, checkOut) < 1) return emptyRule;
  const rows = await db.query<{
    quantity_left: number;
    overbook_left: number;
    request: number;
  }>(allowanceSql("line.offer_id = ?", "sale.offer_id = ?"), [
    offerId,
    countStopSale,
    offerId,
    countStopSale,
    offerId,
    offerId,
    offerId,
    ignoreAllotmentId ?? null,
    ignoreAllotmentId ?? null,
    checkIn,
    checkOut,
  ]);
  return ruleFrom(rows[0]);
}

export async function contractLineRule(
  purchaseLineId: string,
  checkIn: string,
  checkOut: string,
  db: Pick<SqlClient, "query"> = { query },
  ignoreAllotmentId?: string,
  countStopSale = false,
) {
  if (nightsBetween(checkIn, checkOut) < 1) return emptyRule;
  const rows = await db.query<{
    quantity_left: number;
    overbook_left: number;
    request: number;
  }>(allowanceSql("period.purchase_line_id = ?", "sale.purchase_line_id = ?"), [
    purchaseLineId,
    countStopSale,
    purchaseLineId,
    countStopSale,
    purchaseLineId,
    purchaseLineId,
    purchaseLineId,
    ignoreAllotmentId ?? null,
    ignoreAllotmentId ?? null,
    checkIn,
    checkOut,
  ]);
  return ruleFrom(rows[0]);
}

export async function offerFree(
  offerId: string,
  checkIn: string,
  checkOut: string,
  db: Pick<SqlClient, "query"> = { query },
  ignoreAllotmentId?: string,
) {
  return (await offerRule(offerId, checkIn, checkOut, db, ignoreAllotmentId))
    .quantityLeft;
}

export async function contractLineFree(
  purchaseLineId: string,
  checkIn: string,
  checkOut: string,
  db: Pick<SqlClient, "query"> = { query },
  ignoreAllotmentId?: string,
) {
  return (
    await contractLineRule(
      purchaseLineId,
      checkIn,
      checkOut,
      db,
      ignoreAllotmentId,
    )
  ).quantityLeft;
}

export type ChartDay = {
  day: string;
  held: number;
  overbook: number;
  taken: number;
  free: number;
};

export async function offerChart(offerId: string, from: string, to: string) {
  if (nightsBetween(from, to) < 1) return [] as ChartDay[];
  const rows = await query<{
    day: string;
    held: number;
    overbook: number;
    taken: number;
  }>(
    `SELECT day.day::date::text AS day,
            COALESCE((
              SELECT SUM(period.quantity)::int
              FROM contract_periods AS period
              JOIN purchase_lines AS line ON line.id = period.purchase_line_id
              JOIN purchases AS purchase ON purchase.id = line.purchase_id
              WHERE line.offer_id = ?
                AND purchase.status = 'confirmed'
                AND purchase.active = TRUE
                AND period.active = TRUE
                AND period.sale_mode <> 'request'
                AND period.stop_sale = FALSE
                AND period.check_in::date <= day.day::date
                AND period.check_out::date > day.day::date
            ), 0) AS held,
            COALESCE((
              SELECT SUM(period.overbook_limit)::int
              FROM contract_periods AS period
              JOIN purchase_lines AS line ON line.id = period.purchase_line_id
              JOIN purchases AS purchase ON purchase.id = line.purchase_id
              WHERE line.offer_id = ?
                AND purchase.status = 'confirmed'
                AND purchase.active = TRUE
                AND period.active = TRUE
                AND period.sale_mode <> 'request'
                AND period.stop_sale = FALSE
                AND period.check_in::date <= day.day::date
                AND period.check_out::date > day.day::date
            ), 0) AS overbook,
            COALESCE((
              SELECT SUM(sale.quantity)::int
              FROM allotment_lines AS sale
              JOIN allotments AS a ON a.id = sale.allotment_id
              WHERE sale.offer_id = ?
                AND ${holdingAllotment}
                AND a.check_in::date <= day.day::date
                AND a.check_out::date > day.day::date
            ), 0) AS taken
     FROM ${nightSeries(from, to).sql} AS day(day)
     ORDER BY day.day`,
    [offerId, offerId, offerId, from, to],
  );
  return rows.map((row) => ({
    day: row.day.slice(0, 10),
    held: Number(row.held),
    overbook: Number(row.overbook),
    taken: Number(row.taken),
    free: Math.max(0, Number(row.held) - Number(row.taken)),
  }));
}

export function chartWindow(spans: Array<{ checkIn: string; checkOut: string }>) {
  const today = todayInRiyadh();
  let start = spans.reduce(
    (earliest, span) => (span.checkIn < earliest ? span.checkIn : earliest),
    spans[0]?.checkIn || today,
  );
  if (start < today) start = today;
  const end = spans.reduce(
    (latest, span) => (span.checkOut > latest ? span.checkOut : latest),
    start,
  );
  const cap = shiftDays(start, 30);
  return { from: start, to: end < cap ? end : cap };
}

function shiftDays(day: string, count: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

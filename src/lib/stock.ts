import { execute, query, type SqlClient } from "@/lib/db";
import { nightsBetween, todayInRiyadh } from "@/lib/money";

const holdingAllotment = `
  (
    a.status = 'confirmed'
    OR (
      a.status = 'provisional'
      AND (
        a.booking_id IS NULL
        OR EXISTS (
          SELECT 1 FROM bookings AS held
          WHERE held.id = a.booking_id
            AND held.status = 'pending'
            AND held.hold_until::timestamptz > NOW()
        )
      )
    )
  )
`;

export async function releaseExpiredHolds() {
  await execute(
    `UPDATE bookings
     SET status = 'cancelled'
     WHERE status = 'pending'
       AND hold_until::timestamptz <= NOW()`,
  );
  await execute(
    `UPDATE allotments AS allotment
     SET status = 'cancelled'
     WHERE allotment.status = 'provisional'
       AND allotment.booking_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM bookings AS booking
         WHERE booking.id = allotment.booking_id
           AND booking.status = 'cancelled'
           AND booking.hold_until::timestamptz <= NOW()
       )`,
  );
}

function nightSeries(checkIn: string, checkOut: string) {
  return {
    sql: `generate_series(?::timestamp, (?::date - INTERVAL '1 day')::timestamp, INTERVAL '1 day')`,
    args: [checkIn, checkOut],
  };
}

export async function offerFree(
  offerId: string,
  checkIn: string,
  checkOut: string,
  db: Pick<SqlClient, "query"> = { query },
  ignoreAllotmentId?: string,
) {
  if (nightsBetween(checkIn, checkOut) < 1) return 0;
  const rows = await db.query<{ free: number }>(
    `SELECT COALESCE(MIN(GREATEST(day_held - day_taken, 0)), 0)::int AS free
     FROM (
       SELECT
         COALESCE((
           SELECT SUM(line.quantity)::int
           FROM purchase_lines AS line
           JOIN purchases AS purchase ON purchase.id = line.purchase_id
           WHERE line.offer_id = ?
             AND purchase.status = 'confirmed'
             AND line.check_in::date <= day.day::date
             AND line.check_out::date > day.day::date
         ), 0) AS day_held,
         COALESCE((
           SELECT SUM(sale.quantity)::int
           FROM allotment_lines AS sale
           JOIN allotments AS a ON a.id = sale.allotment_id
           WHERE sale.offer_id = ?
             AND ${holdingAllotment}
             AND (?::text IS NULL OR a.id <> ?::text)
             AND a.check_in::date <= day.day::date
             AND a.check_out::date > day.day::date
         ), 0) AS day_taken
       FROM ${nightSeries(checkIn, checkOut).sql} AS day(day)
     ) AS nights`,
    [
      offerId,
      offerId,
      ignoreAllotmentId ?? null,
      ignoreAllotmentId ?? null,
      checkIn,
      checkOut,
    ],
  );
  return Number(rows[0]?.free ?? 0);
}

export async function contractLineFree(
  purchaseLineId: string,
  checkIn: string,
  checkOut: string,
  db: Pick<SqlClient, "query"> = { query },
  ignoreAllotmentId?: string,
) {
  if (nightsBetween(checkIn, checkOut) < 1) return 0;
  const rows = await db.query<{ free: number }>(
    `SELECT COALESCE(MIN(GREATEST(day_held - day_taken, 0)), 0)::int AS free
     FROM (
       SELECT
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM purchase_lines AS line
             JOIN purchases AS purchase ON purchase.id = line.purchase_id
             WHERE line.id = ?
               AND purchase.status = 'confirmed'
               AND line.check_in::date <= day.day::date
               AND line.check_out::date > day.day::date
           )
           THEN (
             SELECT line.quantity
             FROM purchase_lines AS line
             WHERE line.id = ?
           )
           ELSE 0
         END AS day_held,
         COALESCE((
           SELECT SUM(sale.quantity)::int
           FROM allotment_lines AS sale
           JOIN allotments AS a ON a.id = sale.allotment_id
           WHERE sale.purchase_line_id = ?
             AND ${holdingAllotment}
             AND (?::text IS NULL OR a.id <> ?::text)
             AND a.check_in::date <= day.day::date
             AND a.check_out::date > day.day::date
         ), 0) AS day_taken
       FROM ${nightSeries(checkIn, checkOut).sql} AS day(day)
     ) AS nights`,
    [
      purchaseLineId,
      purchaseLineId,
      purchaseLineId,
      ignoreAllotmentId ?? null,
      ignoreAllotmentId ?? null,
      checkIn,
      checkOut,
    ],
  );
  return Number(rows[0]?.free ?? 0);
}

export type ChartDay = {
  day: string;
  held: number;
  taken: number;
  free: number;
};

export async function offerChart(offerId: string, from: string, to: string) {
  if (nightsBetween(from, to) < 1) return [] as ChartDay[];
  const rows = await query<{
    day: string;
    held: number;
    taken: number;
  }>(
    `SELECT day.day::date::text AS day,
            COALESCE((
              SELECT SUM(line.quantity)::int
              FROM purchase_lines AS line
              JOIN purchases AS purchase ON purchase.id = line.purchase_id
              WHERE line.offer_id = ?
                AND purchase.status = 'confirmed'
                AND line.check_in::date <= day.day::date
                AND line.check_out::date > day.day::date
            ), 0) AS held,
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
    [offerId, offerId, from, to],
  );
  return rows.map((row) => ({
    day: row.day.slice(0, 10),
    held: Number(row.held),
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

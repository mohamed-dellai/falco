import crypto from "crypto";
import {
  lockAndPrepareSelections,
  policySnapshot,
  type ReservationSelection,
} from "@/lib/contracts";
import { query, transaction, type SqlClient } from "@/lib/db";
import { nightsBetween } from "@/lib/money";
import {
  mealPlanCode,
  type MealPlan,
} from "@/lib/room-types";
import { releaseExpiredHolds } from "@/lib/stock";

export type ReservationEvent = {
  id: string;
  allotmentId: string;
  eventType: string;
  actorType: string;
  actorId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

function uniqueViolation(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505",
  );
}

async function nextReservationNumber(sql: Pick<SqlClient, "query">) {
  const rows = await sql.query<{ number: string }>(
    `SELECT number FROM allotments
     WHERE number ~ '^A[0-9]+$'
     ORDER BY number DESC
     LIMIT 1`,
  );
  const current = Number(rows[0]?.number?.slice(1) ?? 0);
  return `A${String(current + 1).padStart(5, "0")}`;
}

export async function appendReservationEvent(
  sql: Pick<SqlClient, "execute">,
  input: {
    allotmentId: string;
    eventType: string;
    actorType: "admin" | "agency" | "system";
    actorId?: string | null;
    details?: Record<string, unknown>;
    createdAt?: string;
  },
) {
  await sql.execute(
    `INSERT INTO reservation_events
      (id, allotment_id, kind, actor_type, actor_id, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?::jsonb, ?)`,
    [
      crypto.randomUUID(),
      input.allotmentId,
      input.eventType,
      input.actorType,
      input.actorId ?? null,
      JSON.stringify(input.details ?? {}),
      input.createdAt ?? new Date().toISOString(),
    ],
  );
}

export async function listReservationEvents(allotmentId: string) {
  const rows = await query<{
    id: string;
    allotment_id: string;
    kind: string;
    actor_type: string;
    actor_id: string | null;
    payload: Record<string, unknown> | string | null;
    created_at: string;
  }>(
    `SELECT * FROM reservation_events
     WHERE allotment_id = ?
     ORDER BY created_at DESC, id DESC`,
    [allotmentId],
  );
  return rows.map(
    (row): ReservationEvent => ({
      id: row.id,
      allotmentId: row.allotment_id,
      eventType: row.kind,
      actorType: row.actor_type,
      actorId: row.actor_id,
      details:
        typeof row.payload === "string"
          ? (JSON.parse(row.payload) as Record<string, unknown>)
          : (row.payload ?? {}),
      createdAt: row.created_at,
    }),
  );
}

export async function expireReservationHolds() {
  await releaseExpiredHolds();
}

type MoveResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "allotment"
        | "allotment-lines"
        | "dates"
        | "missing-room"
        | "window"
        | "stop-sale"
        | "quantity"
        | "request";
      remaining?: number;
    };

export async function moveReservation(
  id: string,
  next: "provisional" | "confirmed",
  actor?: {
    type: "admin" | "agency" | "system";
    id?: string | null;
    allowOverbook?: boolean;
    from?: string[];
  },
): Promise<MoveResult> {
  await expireReservationHolds();
  return transaction(async (sql): Promise<MoveResult> => {
    const rows = await sql.query<{
      id: string;
      status: string;
      channel: string;
      check_in: string;
      check_out: string;
      sale_source: string | null;
    }>(
      `SELECT id, status, channel, check_in, check_out, sale_source
       FROM allotments WHERE id = ? FOR UPDATE`,
      [id],
    );
    const reservation = rows[0];
    const from =
      actor?.from ??
      (next === "provisional" ? ["request"] : ["request", "provisional"]);
    if (
      !reservation ||
      reservation.channel === "b2c" ||
      !from.includes(reservation.status)
    ) {
      return { ok: false, error: "allotment" };
    }
    if (nightsBetween(reservation.check_in, reservation.check_out) < 1) {
      return { ok: false, error: "dates" };
    }
    const lines = await sql.query<{
      contract_period_id: string | null;
      quantity: number;
    }>(
      `SELECT contract_period_id, quantity
       FROM allotment_lines
       WHERE allotment_id = ?
       ORDER BY sort_order, id`,
      [id],
    );
    if (!lines.length) return { ok: false, error: "allotment-lines" };
    if (reservation.sale_source === "direct") {
      const now = new Date();
      const holdUntil =
        next === "provisional"
          ? new Date(now.getTime() + 24 * 60 * 60_000).toISOString()
          : null;
      await sql.execute(
        `UPDATE allotments
         SET status = ?,
             hold_until = ?,
             confirmed_at = CASE
               WHEN ? = 'confirmed' THEN COALESCE(confirmed_at, ?)
               ELSE confirmed_at
             END
         WHERE id = ?`,
        [next, holdUntil, next, now.toISOString(), id],
      );
      await appendReservationEvent(sql, {
        allotmentId: id,
        eventType:
          next === "provisional" ? "hold_created" : "reservation_confirmed",
        actorType: actor?.type ?? "admin",
        actorId: actor?.id,
        details: holdUntil ? { holdUntil, stockEffect: "none" } : { stockEffect: "none" },
        createdAt: now.toISOString(),
      });
      return { ok: true };
    }
    if (lines.some((line) => !line.contract_period_id)) {
      return { ok: false, error: "missing-room" };
    }
    const prepared = await lockAndPrepareSelections(
      sql,
      lines.map((line) => ({
        contractPeriodId: line.contract_period_id ?? "",
        quantity: Number(line.quantity),
      })),
      reservation.check_in,
      reservation.check_out,
      {
        ignoreAllotmentId: id,
        allowStopSale: reservation.status === "provisional",
        allowOverbook: actor?.allowOverbook,
      },
    );
    if (!prepared.ok) {
      return {
        ok: false,
        error: prepared.error,
        ...("remaining" in prepared
          ? { remaining: prepared.remaining }
          : {}),
      };
    }
    if (prepared.selections.some((item) => item.period.saleMode === "request")) {
      return { ok: false, error: "request" };
    }
    const now = new Date();
    const holdMinutes = Math.min(
      ...prepared.selections.map((item) => item.period.holdMinutes),
    );
    const holdUntil =
      next === "provisional"
        ? new Date(now.getTime() + holdMinutes * 60_000).toISOString()
        : null;
    await sql.execute(
      `UPDATE allotments
       SET status = ?,
           hold_until = ?,
           confirmed_at = CASE
             WHEN ? = 'confirmed' THEN COALESCE(confirmed_at, ?)
             ELSE confirmed_at
           END
       WHERE id = ?`,
      [next, holdUntil, next, now.toISOString(), id],
    );
    await appendReservationEvent(sql, {
      allotmentId: id,
      eventType:
        next === "provisional" ? "hold_created" : "reservation_confirmed",
      actorType: actor?.type ?? "admin",
      actorId: actor?.id,
      details: holdUntil ? { holdUntil } : {},
      createdAt: now.toISOString(),
    });
    return { ok: true };
  });
}

const reservationStatusValues = [
  "request",
  "provisional",
  "confirmed",
  "cancelled",
  "no_show",
  "unavailable",
  "regret",
] as const;

type ReservationActor = { type: "admin" | "agency" | "system"; id?: string | null };

async function closeReservation(
  id: string,
  status: "cancelled" | "no_show" | "unavailable" | "regret",
  actor?: ReservationActor,
  options?: { penalty?: number; lineStatus?: "cancelled" | "no_show" },
) {
  return transaction(async (sql) => {
    const rows = await sql.query<{
      status: string;
      channel: string;
      booking_id: string | null;
    }>(
      `SELECT status, channel, booking_id FROM allotments WHERE id = ? FOR UPDATE`,
      [id],
    );
    const reservation = rows[0];
    if (
      !reservation ||
      reservation.channel === "b2c" ||
      !reservationStatusValues.includes(
        reservation.status as (typeof reservationStatusValues)[number],
      )
    ) {
      return { ok: false as const, error: "allotment" as const };
    }
    if (reservation.booking_id) {
      await sql.execute(
        `UPDATE bookings SET status = 'cancelled'
         WHERE id = ? AND status IN ('pending', 'confirmed')`,
        [reservation.booking_id],
      );
    }
    if (options?.lineStatus) {
      await sql.execute(
        `UPDATE allotment_lines SET supplier_status = ? WHERE allotment_id = ?`,
        [options.lineStatus, id],
      );
    }
    const penalty = options?.penalty ?? 0;
    const recorded = status === "cancelled" && Number.isInteger(penalty) && penalty > 0 ? penalty : 0;
    await sql.execute(
      `UPDATE allotments
       SET status = ?, hold_until = NULL, penalty_amount = ?
       WHERE id = ?`,
      [status, recorded, id],
    );
    await appendReservationEvent(sql, {
      allotmentId: id,
      eventType:
        status === "cancelled"
          ? "reservation_cancelled"
          : status === "no_show"
            ? "reservation_no_show"
            : status === "unavailable"
              ? "reservation_unavailable"
              : "reservation_regret",
      actorType: actor?.type ?? "admin",
      actorId: actor?.id,
      details: {
        ...(recorded ? { penalty: recorded } : {}),
        ...(options?.lineStatus ? { lines: options.lineStatus } : {}),
      },
    });
    return { ok: true as const };
  });
}

export async function cancelReservation(
  id: string,
  actor?: ReservationActor,
  penalty = 0,
) {
  return closeReservation(id, "cancelled", actor, { penalty });
}

export async function cancelAllReservation(
  id: string,
  actor?: ReservationActor,
  penalty = 0,
) {
  return closeReservation(id, "cancelled", actor, { penalty, lineStatus: "cancelled" });
}

export async function noShowReservation(id: string, actor?: ReservationActor) {
  return closeReservation(id, "no_show", actor);
}

export async function unavailableReservation(id: string, actor?: ReservationActor) {
  return closeReservation(id, "unavailable", actor);
}

export async function regretReservation(id: string, actor?: ReservationActor) {
  return closeReservation(id, "regret", actor);
}

export async function setReservationRequest(id: string, actor?: ReservationActor) {
  return transaction(async (sql) => {
    const rows = await sql.query<{ status: string; channel: string }>(
      `SELECT status, channel FROM allotments WHERE id = ? FOR UPDATE`,
      [id],
    );
    const reservation = rows[0];
    if (
      !reservation ||
      reservation.channel === "b2c" ||
      !reservationStatusValues.includes(
        reservation.status as (typeof reservationStatusValues)[number],
      )
    ) {
      return { ok: false as const, error: "allotment" as const };
    }
    if (reservation.status === "request") return { ok: true as const };
    await sql.execute(
      `UPDATE allotments SET status = 'request', hold_until = NULL WHERE id = ?`,
      [id],
    );
    await appendReservationEvent(sql, {
      allotmentId: id,
      eventType: "returned_to_request",
      actorType: actor?.type ?? "admin",
      actorId: actor?.id,
    });
    return { ok: true as const };
  });
}

export async function setAllReservationLines(
  id: string,
  supplierStatus: "confirmed" | "cancelled" | "no_show",
) {
  return transaction(async (sql) => {
    const rows = await sql.query<{ status: string; channel: string }>(
      `SELECT status, channel FROM allotments WHERE id = ? FOR UPDATE`,
      [id],
    );
    const reservation = rows[0];
    if (
      !reservation ||
      reservation.channel === "b2c" ||
      !["request", "provisional", "confirmed"].includes(reservation.status)
    ) {
      return { ok: false as const, error: "allotment" as const };
    }
    await sql.execute(
      `UPDATE allotment_lines SET supplier_status = ? WHERE allotment_id = ?`,
      [supplierStatus, id],
    );
    await appendReservationEvent(sql, {
      allotmentId: id,
      eventType: supplierStatus === "confirmed" ? "reservation_confirm_all" : "line_supplier",
      actorType: "admin",
      details: { lines: supplierStatus },
    });
    return { ok: true as const };
  });
}

export async function returnReservationToRequest(
  id: string,
  actor?: { type: "admin" | "agency" | "system"; id?: string | null },
) {
  return transaction(async (sql) => {
    const rows = await sql.query<{ status: string; channel: string }>(
      `SELECT status, channel FROM allotments WHERE id = ? FOR UPDATE`,
      [id],
    );
    const reservation = rows[0];
    if (
      !reservation ||
      reservation.channel === "b2c" ||
      reservation.status !== "provisional"
    ) {
      return { ok: false as const, error: "allotment" as const };
    }
    await sql.execute(
      `UPDATE allotments SET status = 'request', hold_until = NULL WHERE id = ?`,
      [id],
    );
    await appendReservationEvent(sql, {
      allotmentId: id,
      eventType: "returned_to_request",
      actorType: actor?.type ?? "admin",
      actorId: actor?.id,
    });
    return { ok: true as const };
  });
}

export async function markSupplierRequestSent(
  allotmentId: string,
  actorId?: string | null,
) {
  return transaction(async (sql) => {
    const rows = await sql.query<{ id: string }>(
      "SELECT id FROM allotments WHERE id = ? FOR UPDATE",
      [allotmentId],
    );
    if (!rows[0]) return false;
    const now = new Date().toISOString();
    await sql.execute(
      `UPDATE allotment_lines
       SET supplier_status = 'waiting'
       WHERE allotment_id = ? AND supplier_status = 'new'`,
      [allotmentId],
    );
    await sql.execute(
      `UPDATE allotments SET supplier_sent_at = COALESCE(supplier_sent_at, ?) WHERE id = ?`,
      [now, allotmentId],
    );
    await appendReservationEvent(sql, {
      allotmentId,
      eventType: "supplier_requested",
      actorType: "admin",
      actorId,
      createdAt: now,
    });
    return true;
  });
}

export function checkoutToken(value: string | undefined) {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : "";
}

export async function createAgencyReservation(input: {
  agencyId: string;
  checkIn: string;
  checkOut: string;
  selections: ReservationSelection[];
  termsAccepted: boolean;
  termsAcceptedName: string;
  notes?: string;
  idempotencyKey?: string;
}) {
  if (
    nightsBetween(input.checkIn, input.checkOut) < 1 ||
    nightsBetween(input.checkIn, input.checkOut) > 120
  ) {
    return { ok: false as const, error: "dates" as const };
  }
  if (!input.termsAccepted || !input.termsAcceptedName.trim()) {
    return { ok: false as const, error: "terms" as const };
  }
  if (!input.selections.length || input.selections.length > 20) {
    return { ok: false as const, error: "quantity" as const };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await transaction(async (sql) => {
        const agency = await sql.query<{
          id: string;
          kind: string | null;
          stop_sale: boolean;
          disabled: boolean;
        }>(
          `SELECT id, kind, stop_sale, disabled FROM agencies WHERE id = ?`,
          [input.agencyId],
        );
        if (!agency[0] || agency[0].kind !== "agency") {
          return { ok: false as const, error: "agency" as const };
        }
        if (agency[0].stop_sale || agency[0].disabled) {
          return { ok: false as const, error: "client" as const };
        }
        const idempotencyKey = checkoutToken(input.idempotencyKey);
        if (input.idempotencyKey && !idempotencyKey) {
          return { ok: false as const, error: "reservation" as const };
        }
        const prepared = await lockAndPrepareSelections(
          sql,
          input.selections,
          input.checkIn,
          input.checkOut,
        );
        if (!prepared.ok) return prepared;
        const hotelIds = new Set(
          prepared.selections.map((item) => item.period.hotelId),
        );
        if (hotelIds.size !== 1) {
          return { ok: false as const, error: "hotel" as const };
        }
        const periodIds = prepared.selections.map((item) => item.period.id);
        const rates = await sql.query<{
          contract_period_id: string;
          price_per_night: number | null;
        }>(
          `SELECT period.id AS contract_period_id,
                  COALESCE(private.price_per_night, group_rate.price_per_night,
                           period.default_agency_price_per_night) AS price_per_night
           FROM contract_periods AS period
           LEFT JOIN contract_period_rates AS private
             ON private.contract_period_id = period.id
            AND private.agency_id = ?
           LEFT JOIN agencies AS rate_buyer ON rate_buyer.id = ?
           LEFT JOIN contract_group_rates AS group_rate
             ON group_rate.contract_period_id = period.id
            AND group_rate.group_id = rate_buyer.group_id
           WHERE period.id IN (${periodIds.map(() => "?").join(", ")})`,
          [input.agencyId, input.agencyId, ...periodIds],
        );
        const priceByPeriod = new Map(
          rates.map((rate) => [
            rate.contract_period_id,
            rate.price_per_night == null
              ? null
              : Number(rate.price_per_night),
          ]),
        );
        if (
          prepared.selections.some(
            (item) => priceByPeriod.get(item.period.id) == null,
          )
        ) {
          return { ok: false as const, error: "rate" as const };
        }
        const requiresRequest = prepared.selections.some(
          (item) => item.period.saleMode === "request",
        );
        const status =
          !requiresRequest && prepared.available ? "provisional" : "request";
        const now = new Date();
        const holdMinutes = Math.min(
          ...prepared.selections.map((item) => item.period.holdMinutes),
        );
        const holdUntil =
          status === "provisional"
            ? new Date(now.getTime() + holdMinutes * 60_000).toISOString()
            : null;
        if (idempotencyKey) {
          const claimed = await sql.query<{ token: string }>(
            `INSERT INTO agency_checkout_attempts
              (token, agency_id, created_at)
             VALUES (?, ?, ?)
             ON CONFLICT (token) DO NOTHING
             RETURNING token`,
            [idempotencyKey, input.agencyId, now.toISOString()],
          );
          if (!claimed[0]) {
            const prior = await sql.query<{
              agency_id: string;
              allotment_id: string | null;
            }>(
              `SELECT agency_id, allotment_id
               FROM agency_checkout_attempts
               WHERE token = ?
               FOR UPDATE`,
              [idempotencyKey],
            );
            if (!prior[0] || prior[0].agency_id !== input.agencyId) {
              return { ok: false as const, error: "agency" as const };
            }
            const existing = prior[0].allotment_id
              ? await sql.query<{
                  id: string;
                  number: string;
                  status: string;
                  hold_until: string | null;
                }>(
                  `SELECT id, number, status, hold_until
                   FROM allotments WHERE id = ?`,
                  [prior[0].allotment_id],
                )
              : [];
            if (!existing[0]) {
              return { ok: false as const, error: "reservation" as const };
            }
            return {
              ok: true as const,
              id: existing[0].id,
              number: existing[0].number,
              status: existing[0].status,
              holdUntil: existing[0].hold_until,
              idempotent: true as const,
            };
          }
        }
        const id = crypto.randomUUID();
        const number = await nextReservationNumber(sql);
        await sql.execute(
          `INSERT INTO allotments
            (id, number, agency_id, status, check_in, check_out, notes,
             created_at, channel, hold_until, terms_accepted_at,
             terms_accepted_by, terms_version, supplier_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'b2b', ?, ?, ?, ?, 'not_requested')`,
          [
            id,
            number,
            input.agencyId,
            status,
            input.checkIn,
            input.checkOut,
            (input.notes ?? "").trim().slice(0, 2000),
            now.toISOString(),
            holdUntil,
            now.toISOString(),
            input.termsAcceptedName.trim().slice(0, 160),
            prepared.selections
              .map((item) => item.period.policyId)
              .filter(Boolean)
              .sort()
              .join(","),
          ],
        );
        for (const [index, item] of prepared.selections.entries()) {
          const period = item.period;
          await sql.execute(
            `INSERT INTO allotment_lines
              (id, allotment_id, room_id, offer_id, purchase_line_id,
               contract_period_id, quantity, cost_per_night,
               agency_price_per_night, sort_order, board_snapshot,
               view_snapshot, terms_snapshot)
             VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb)`,
            [
              crypto.randomUUID(),
              id,
              period.offerId,
              period.purchaseLineId,
              period.id,
              item.quantity,
              period.costPerNight,
              priceByPeriod.get(period.id),
              index,
              period.board,
              period.view,
              JSON.stringify(policySnapshot(period)),
            ],
          );
        }
        await appendReservationEvent(sql, {
          allotmentId: id,
          eventType:
            status === "provisional"
              ? "reservation_held"
              : "reservation_requested",
          actorType: "agency",
          actorId: input.agencyId,
          details: {
            holdUntil,
            termsAcceptedBy: input.termsAcceptedName.trim(),
          },
          createdAt: now.toISOString(),
        });
        if (idempotencyKey) {
          await sql.execute(
            `UPDATE agency_checkout_attempts
             SET allotment_id = ?, reservation_number = ?
             WHERE token = ? AND agency_id = ?`,
            [id, number, idempotencyKey, input.agencyId],
          );
        }
        return {
          ok: true as const,
          id,
          number,
          status,
          holdUntil,
          idempotent: false as const,
        };
      });
    } catch (error) {
      if (uniqueViolation(error) && attempt < 2) continue;
      throw error;
    }
  }
  return { ok: false as const, error: "reservation" as const };
}

export type AgencyReservationLine = {
  id: string;
  roomName: string;
  guests: number;
  board: MealPlan;
  view: string;
  quantity: number;
  pricePerNight: number;
  terms: {
    name?: string;
    generalTerms?: string;
    cancellationTerms?: string;
    paymentTerms?: string;
    releaseDays?: number;
    refundable?: boolean;
  };
};

export type AgencyReservation = {
  id: string;
  number: string;
  agencyId: string;
  status: string;
  hotelId: string;
  hotelName: string;
  hotelCity: string;
  hotelAddress: string;
  checkIn: string;
  checkOut: string;
  notes: string;
  createdAt: string;
  confirmedAt: string | null;
  holdUntil: string | null;
  termsAcceptedAt: string | null;
  termsAcceptedBy: string;
  cancellationRequestedAt: string | null;
  cancellationReason: string;
  supplierStatus: string;
  supplierReference: string;
  lines: AgencyReservationLine[];
  nights: number;
  totalRooms: number;
  total: number;
};

type AgencyReservationRow = {
  id: string;
  number: string;
  agency_id: string;
  status: string;
  hotel_id: string;
  hotel_name: string;
  hotel_city: string;
  hotel_address: string;
  check_in: string;
  check_out: string;
  notes: string;
  created_at: string;
  confirmed_at: string | null;
  hold_until: string | null;
  terms_accepted_at: string | null;
  terms_accepted_by: string | null;
  cancel_requested_at: string | null;
  cancel_request_reason: string | null;
  supplier_status: string;
  supplier_reference: string;
};

type AgencyReservationLineRow = {
  id: string;
  allotment_id: string;
  room_name: string;
  guests: number;
  board_snapshot: string;
  view_snapshot: string;
  quantity: number;
  agency_price_per_night: number;
  terms_snapshot:
    | AgencyReservationLine["terms"]
    | string
    | null;
};

async function agencyReservationLines(ids: string[]) {
  if (!ids.length) return new Map<string, AgencyReservationLine[]>();
  const rows = await query<AgencyReservationLineRow>(
    `SELECT line.id, line.allotment_id, type.name AS room_name, type.guests,
            line.board_snapshot, line.view_snapshot, line.quantity,
            line.agency_price_per_night, line.terms_snapshot
     FROM allotment_lines AS line
     JOIN offers AS offer ON offer.id = line.offer_id
     JOIN room_types AS type ON type.id = offer.room_type_id
     WHERE line.allotment_id IN (${ids.map(() => "?").join(", ")})
     ORDER BY line.sort_order, line.id`,
    ids,
  );
  const grouped = new Map<string, AgencyReservationLine[]>();
  for (const row of rows) {
    const terms =
      typeof row.terms_snapshot === "string"
        ? (JSON.parse(row.terms_snapshot) as AgencyReservationLine["terms"])
        : (row.terms_snapshot ?? {});
    const line: AgencyReservationLine = {
      id: row.id,
      roomName: row.room_name,
      guests: Number(row.guests),
      board: mealPlanCode(row.board_snapshot) ?? "room_only",
      view: row.view_snapshot ?? "",
      quantity: Number(row.quantity),
      pricePerNight: Number(row.agency_price_per_night),
      terms,
    };
    grouped.set(row.allotment_id, [
      ...(grouped.get(row.allotment_id) ?? []),
      line,
    ]);
  }
  return grouped;
}

function mapAgencyReservation(
  row: AgencyReservationRow,
  lines: AgencyReservationLine[],
): AgencyReservation {
  const nights = nightsBetween(row.check_in, row.check_out);
  return {
    id: row.id,
    number: row.number,
    agencyId: row.agency_id,
    status: row.status,
    hotelId: row.hotel_id,
    hotelName: row.hotel_name,
    hotelCity: row.hotel_city,
    hotelAddress: row.hotel_address,
    checkIn: row.check_in,
    checkOut: row.check_out,
    notes: row.notes,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    holdUntil: row.hold_until,
    termsAcceptedAt: row.terms_accepted_at,
    termsAcceptedBy: row.terms_accepted_by ?? "",
    cancellationRequestedAt: row.cancel_requested_at,
    cancellationReason: row.cancel_request_reason ?? "",
    supplierStatus: row.supplier_status,
    supplierReference: row.supplier_reference,
    lines,
    nights,
    totalRooms: lines.reduce((sum, line) => sum + line.quantity, 0),
    total: lines.reduce(
      (sum, line) => sum + line.pricePerNight * line.quantity * nights,
      0,
    ),
  };
}

const agencyReservationSelect = `
  SELECT reservation.id, reservation.number, reservation.agency_id,
         reservation.status, hotel.id AS hotel_id, hotel.name AS hotel_name,
         hotel.city AS hotel_city, hotel.address AS hotel_address,
         reservation.check_in, reservation.check_out, reservation.notes,
         reservation.created_at, reservation.confirmed_at,
         reservation.hold_until, reservation.terms_accepted_at,
         reservation.terms_accepted_by, reservation.cancel_requested_at,
         reservation.cancel_request_reason, reservation.supplier_status,
         reservation.supplier_reference
  FROM allotments AS reservation
  JOIN allotment_lines AS first_line ON first_line.id = (
    SELECT candidate.id FROM allotment_lines AS candidate
    WHERE candidate.allotment_id = reservation.id
    ORDER BY candidate.sort_order, candidate.id LIMIT 1
  )
  JOIN offers AS offer ON offer.id = first_line.offer_id
  JOIN hotels AS hotel ON hotel.id = offer.hotel_id
`;

export async function listAgencyReservations(agencyId: string) {
  await expireReservationHolds();
  const rows = await query<AgencyReservationRow>(
    `${agencyReservationSelect}
     WHERE reservation.agency_id = ? AND reservation.channel = 'b2b'
     ORDER BY reservation.created_at DESC, reservation.number DESC`,
    [agencyId],
  );
  const lines = await agencyReservationLines(rows.map((row) => row.id));
  return rows.map((row) =>
    mapAgencyReservation(row, lines.get(row.id) ?? []),
  );
}

export async function getAgencyReservation(
  agencyId: string,
  number: string,
) {
  await expireReservationHolds();
  const rows = await query<AgencyReservationRow>(
    `${agencyReservationSelect}
     WHERE reservation.agency_id = ? AND reservation.number = ?
       AND reservation.channel = 'b2b'`,
    [agencyId, number],
  );
  if (!rows[0]) return null;
  const lines = await agencyReservationLines([rows[0].id]);
  return mapAgencyReservation(rows[0], lines.get(rows[0].id) ?? []);
}

export async function requestAgencyCancellation(input: {
  agencyId: string;
  number: string;
  reason: string;
}) {
  return transaction(async (sql) => {
    const rows = await sql.query<{ id: string; status: string }>(
      `SELECT id, status FROM allotments
       WHERE agency_id = ? AND number = ? AND channel = 'b2b'
       FOR UPDATE`,
      [input.agencyId, input.number],
    );
    const reservation = rows[0];
    if (
      !reservation ||
      !["request", "provisional", "confirmed"].includes(reservation.status)
    ) {
      return false;
    }
    const now = new Date().toISOString();
    await sql.execute(
      `UPDATE allotments
       SET cancel_requested_at = ?,
           cancel_request_reason = ?
       WHERE id = ?`,
      [now, input.reason.trim().slice(0, 1000), reservation.id],
    );
    await appendReservationEvent(sql, {
      allotmentId: reservation.id,
      eventType: "cancellation_requested",
      actorType: "agency",
      actorId: input.agencyId,
      details: { reason: input.reason.trim().slice(0, 1000) },
      createdAt: now,
    });
    return true;
  });
}

export async function decideCancellation(input: {
  allotmentId: string;
  decision: "approved" | "denied";
  actorId?: string | null;
  note?: string;
}) {
  return transaction(async (sql) => {
    const rows = await sql.query<{
      id: string;
      status: string;
      booking_id: string | null;
      cancel_requested_at: string | null;
      cancel_request_reason: string;
      supplier_status: string;
    }>(
      `SELECT id, status, booking_id, cancel_requested_at,
              cancel_request_reason, supplier_status
       FROM allotments
       WHERE id = ?
       FOR UPDATE`,
      [input.allotmentId],
    );
    const reservation = rows[0];
    if (
      !reservation?.cancel_requested_at ||
      !["request", "provisional", "confirmed"].includes(reservation.status)
    ) {
      return { ok: false as const, error: "cancellation" as const };
    }
    const now = new Date().toISOString();
    const reason = reservation.cancel_request_reason;
    const note = (input.note ?? "").trim().slice(0, 1000);
    if (input.decision === "denied") {
      await sql.execute(
        `UPDATE allotments
         SET cancel_requested_at = NULL,
             cancel_request_reason = ''
         WHERE id = ?`,
        [reservation.id],
      );
      await appendReservationEvent(sql, {
        allotmentId: reservation.id,
        eventType: "cancellation_denied",
        actorType: "admin",
        actorId: input.actorId,
        details: {
          decision: "denied",
          reason,
          note,
          supplierStatus: reservation.supplier_status,
          stockEffect: "unchanged",
        },
        createdAt: now,
      });
      return { ok: true as const, decision: "denied" as const };
    }

    const held = reservation.status === "provisional" || reservation.status === "confirmed";
    if (reservation.booking_id) {
      await sql.execute(
        `UPDATE bookings SET status = 'cancelled'
         WHERE id = ? AND status IN ('pending', 'confirmed')`,
        [reservation.booking_id],
      );
    }
    await sql.execute(
      `UPDATE allotments
       SET status = 'cancelled',
           hold_until = NULL,
           supplier_status = 'cancelled',
           cancel_requested_at = NULL
       WHERE id = ?`,
      [reservation.id],
    );
    await sql.execute(
      `UPDATE allotment_lines
       SET supplier_status = 'cancelled'
       WHERE allotment_id = ? AND supplier_status <> 'no_show'`,
      [reservation.id],
    );
    await appendReservationEvent(sql, {
      allotmentId: reservation.id,
      eventType: "cancellation_approved",
      actorType: "admin",
      actorId: input.actorId,
      details: {
        decision: "approved",
        reason,
        note,
        previousStatus: reservation.status,
        supplierStatus: "cancelled",
        supplierAction: "cancelled",
        stockEffect: held ? "released" : "none",
      },
      createdAt: now,
    });
    return { ok: true as const, decision: "approved" as const };
  });
}

export type ReservationContacts = {
  hotelId: string;
  hotelName: string;
  reservationEmail: string;
  reservationPhone: string;
  reservationWhatsapp: string;
  agencyName: string;
  agencyEmail: string;
  agencyPhone: string;
};

export async function getReservationContacts(allotmentId: string) {
  const rows = await query<{
    hotel_id: string;
    hotel_name: string;
    reservation_email: string;
    reservation_phone: string;
    reservation_whatsapp: string;
    agency_name: string;
    agency_email: string;
    agency_phone: string;
  }>(
    `SELECT hotel.id AS hotel_id, hotel.name AS hotel_name,
            hotel.reservation_email, hotel.reservation_phone,
            hotel.reservation_whatsapp, agency.name AS agency_name,
            COALESCE(NULLIF(agency.email, ''), login.email, '') AS agency_email,
            agency.phone AS agency_phone
     FROM allotments AS reservation
     JOIN agencies AS agency ON agency.id = reservation.agency_id
     LEFT JOIN agency_logins AS login ON login.agency_id = agency.id
     JOIN allotment_lines AS line ON line.id = (
       SELECT candidate.id FROM allotment_lines AS candidate
       WHERE candidate.allotment_id = reservation.id
       ORDER BY candidate.sort_order, candidate.id LIMIT 1
     )
     JOIN offers AS offer ON offer.id = line.offer_id
     JOIN hotels AS hotel ON hotel.id = offer.hotel_id
     WHERE reservation.id = ?`,
    [allotmentId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    hotelId: row.hotel_id,
    hotelName: row.hotel_name,
    reservationEmail: row.reservation_email ?? "",
    reservationPhone: row.reservation_phone ?? "",
    reservationWhatsapp: row.reservation_whatsapp ?? "",
    agencyName: row.agency_name,
    agencyEmail: row.agency_email ?? "",
    agencyPhone: row.agency_phone ?? "",
  } satisfies ReservationContacts;
}

export async function updateSupplierWorkflow(input: {
  allotmentId: string;
  status:
    | "not_requested"
    | "requested"
    | "confirmed"
    | "modified"
    | "cancelled";
  reference: string;
  notes: string;
  actorId?: string | null;
}) {
  return transaction(async (sql) => {
    const rows = await sql.query<{ id: string; supplier_status: string }>(
      "SELECT id, supplier_status FROM allotments WHERE id = ? FOR UPDATE",
      [input.allotmentId],
    );
    if (!rows[0]) return false;
    const now = new Date().toISOString();
    await sql.execute(
      `UPDATE allotments
       SET supplier_status = ?,
           supplier_reference = ?,
           supplier_notes = ?,
           supplier_sent_at = CASE
             WHEN ? = 'requested' THEN COALESCE(supplier_sent_at, ?)
             ELSE supplier_sent_at
           END,
           supplier_confirmed_at = CASE
             WHEN ? = 'confirmed' THEN ?
             ELSE supplier_confirmed_at
           END
       WHERE id = ?`,
      [
        input.status,
        input.reference.trim().slice(0, 160),
        input.notes.trim().slice(0, 2000),
        input.status,
        now,
        input.status,
        now,
        input.allotmentId,
      ],
    );
    await appendReservationEvent(sql, {
      allotmentId: input.allotmentId,
      eventType: `supplier_${input.status}`,
      actorType: "admin",
      actorId: input.actorId,
      details: {
        previous: rows[0].supplier_status,
        reference: input.reference.trim().slice(0, 160),
        notes: input.notes.trim().slice(0, 2000),
      },
      createdAt: now,
    });
    return true;
  });
}

export async function recordReservationCommunication(input: {
  allotmentId: string;
  kind: "supplier_email" | "agency_email" | "supplier_whatsapp";
  recipient: string;
  actorId?: string | null;
}) {
  await transaction(async (sql) => {
    const exists = await sql.query<{ id: string }>(
      "SELECT id FROM allotments WHERE id = ? FOR UPDATE",
      [input.allotmentId],
    );
    if (!exists[0]) return;
    await appendReservationEvent(sql, {
      allotmentId: input.allotmentId,
      eventType: input.kind,
      actorType: "admin",
      actorId: input.actorId,
      details: { recipient: input.recipient },
    });
  });
}


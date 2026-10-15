import crypto from "crypto";
import { clientCanBuy } from "@/lib/client-sale";
import { execute, query, transaction, type SqlClient } from "@/lib/db";
import { stayAllowed } from "@/lib/hotel-rules";
import { nightsBetween } from "@/lib/money";
import {
  checkoutToken,
  createAgencyReservation,
} from "@/lib/reservations";
import {
  mealPlanCode,
  saleModeCode,
  type MealPlan,
} from "@/lib/room-types";
import { contractLineFree, offerFree } from "@/lib/stock";

type CartRow = {
  id: string;
  agency_id: string;
  hotel_id: string;
  hotel_name: string;
  check_in: string;
  check_out: string;
  updated_at: string;
};

type CartLineRow = {
  id: string;
  contract_period_id: string;
  purchase_line_id: string;
  offer_id: string;
  room_name: string;
  guests: number;
  board: string;
  view: string;
  check_in: string;
  check_out: string;
  quantity: number;
  price_per_night: number | null;
  sale_mode: string;
  stop_sale: boolean;
  policy_id: string | null;
  policy_name: string | null;
  general_terms: string | null;
  cancellation_terms: string | null;
  payment_terms: string | null;
  release_days: number | null;
  refundable: boolean | null;
  photo_url: string | null;
};

export type AgencyCartLine = {
  id: string;
  contractPeriodId: string;
  purchaseLineId: string;
  offerId: string;
  roomName: string;
  guests: number;
  board: MealPlan;
  view: string;
  quantity: number;
  pricePerNight: number;
  saleMode: "book" | "request";
  stopSale: boolean;
  open: number;
  photoUrl: string | null;
  policy: {
    id: string | null;
    name: string;
    generalTerms: string;
    cancellationTerms: string;
    paymentTerms: string;
    releaseDays: number;
    refundable: boolean;
  };
};

export type AgencyCart = {
  id: string;
  agencyId: string;
  hotelId: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  updatedAt: string;
  lines: AgencyCartLine[];
  total: number;
};

export async function getAgencyCart(
  agencyId: string,
): Promise<AgencyCart | null> {
  const carts = await query<CartRow>(
    `SELECT cart.*, hotel.name AS hotel_name
     FROM agency_carts AS cart
     JOIN hotels AS hotel ON hotel.id = cart.hotel_id
     WHERE cart.agency_id = ?`,
    [agencyId],
  );
  const cart = carts[0];
  if (!cart) return null;
  const rows = await query<CartLineRow>(
    `SELECT cart_line.id, cart_line.contract_period_id,
            period.purchase_line_id, line.offer_id, type.name AS room_name,
            type.guests, offer.board, offer.view, period.check_in,
            period.check_out, cart_line.quantity,
            COALESCE(private.price_per_night, group_rate.price_per_night,
                     period.default_agency_price_per_night) AS price_per_night,
            period.sale_mode, period.stop_sale, period.policy_id,
            policy.name AS policy_name, policy.general_terms,
            policy.cancellation_terms, policy.payment_terms,
            policy.release_days, policy.refundable,
            (
              SELECT photo.url FROM offer_photos AS photo
              WHERE photo.offer_id = offer.id
              ORDER BY photo.sort_order, photo.id LIMIT 1
            ) AS photo_url
     FROM agency_cart_lines AS cart_line
     JOIN contract_periods AS period ON period.id = cart_line.contract_period_id
     JOIN purchase_lines AS line ON line.id = period.purchase_line_id
     JOIN offers AS offer ON offer.id = line.offer_id
     JOIN room_types AS type ON type.id = offer.room_type_id
     LEFT JOIN contract_period_rates AS private
       ON private.contract_period_id = period.id
      AND private.agency_id = ?
     LEFT JOIN agencies AS rate_buyer ON rate_buyer.id = ?
     LEFT JOIN contract_group_rates AS group_rate
       ON group_rate.contract_period_id = period.id
      AND group_rate.group_id = rate_buyer.group_id
     LEFT JOIN contract_policies AS policy ON policy.id = period.policy_id
     WHERE cart_line.cart_id = ?
     ORDER BY type.guests, type.name, offer.board, offer.view, cart_line.id`,
    [agencyId, agencyId, cart.id],
  );
  const lines = await Promise.all(
    rows.flatMap((row) =>
      row.price_per_night == null
        ? []
        : [
            (async (): Promise<AgencyCartLine> => ({
              id: row.id,
              contractPeriodId: row.contract_period_id,
              purchaseLineId: row.purchase_line_id,
              offerId: row.offer_id,
              roomName: row.room_name,
              guests: Number(row.guests),
              board: mealPlanCode(row.board) ?? "room_only",
              view: row.view ?? "",
              quantity: Number(row.quantity),
              pricePerNight: Number(row.price_per_night),
              saleMode: saleModeCode(row.sale_mode) ?? "book",
              stopSale: Boolean(row.stop_sale),
              open: await contractLineFree(
                row.purchase_line_id,
                cart.check_in,
                cart.check_out,
              ),
              photoUrl: row.photo_url,
              policy: {
                id: row.policy_id,
                name: row.policy_name ?? "",
                generalTerms: row.general_terms ?? "",
                cancellationTerms: row.cancellation_terms ?? "",
                paymentTerms: row.payment_terms ?? "",
                releaseDays: Number(row.release_days ?? 0),
                refundable: row.refundable ?? true,
              },
            }))(),
          ],
    ),
  );
  const nights = nightsBetween(cart.check_in, cart.check_out);
  return {
    id: cart.id,
    agencyId: cart.agency_id,
    hotelId: cart.hotel_id,
    hotelName: cart.hotel_name,
    checkIn: cart.check_in,
    checkOut: cart.check_out,
    nights,
    updatedAt: cart.updated_at,
    lines,
    total: lines.reduce(
      (sum, line) => sum + line.pricePerNight * line.quantity * nights,
      0,
    ),
  };
}

async function remainingBookable(
  sql: SqlClient,
  input: {
    cartId: string;
    contractPeriodId: string;
    purchaseLineId: string;
    offerId: string;
    saleMode: string;
    checkIn: string;
    checkOut: string;
  },
) {
  if ((saleModeCode(input.saleMode) ?? "book") === "request") return null;
  const others = await sql.query<{ line_qty: number; offer_qty: number }>(
    `SELECT
       COALESCE(SUM(cart_line.quantity) FILTER (
         WHERE period.purchase_line_id = ?
       ), 0)::int AS line_qty,
       COALESCE(SUM(cart_line.quantity) FILTER (
         WHERE line.offer_id = ?
       ), 0)::int AS offer_qty
     FROM agency_cart_lines AS cart_line
     JOIN contract_periods AS period ON period.id = cart_line.contract_period_id
     JOIN purchase_lines AS line ON line.id = period.purchase_line_id
     WHERE cart_line.cart_id = ?
       AND cart_line.contract_period_id <> ?`,
    [
      input.purchaseLineId,
      input.offerId,
      input.cartId,
      input.contractPeriodId,
    ],
  );
  const [lineFree, offerAvailable] = await Promise.all([
    contractLineFree(input.purchaseLineId, input.checkIn, input.checkOut, sql),
    offerFree(input.offerId, input.checkIn, input.checkOut, sql),
  ]);
  return Math.min(
    lineFree - Number(others[0]?.line_qty ?? 0),
    offerAvailable - Number(others[0]?.offer_qty ?? 0),
  );
}

async function replayCheckout(agencyId: string, token: string) {
  const rows = await query<{ allotment_id: string | null }>(
    `SELECT allotment_id
     FROM agency_checkout_attempts
     WHERE token = ? AND agency_id = ? AND allotment_id IS NOT NULL`,
    [token, agencyId],
  );
  if (!rows[0]?.allotment_id) return null;
  const reservation = await query<{
    id: string;
    number: string;
    status: string;
    hold_until: string | null;
  }>(
    "SELECT id, number, status, hold_until FROM allotments WHERE id = ?",
    [rows[0].allotment_id],
  );
  if (!reservation[0]) return null;
  return {
    ok: true as const,
    id: reservation[0].id,
    number: reservation[0].number,
    status: reservation[0].status,
    holdUntil: reservation[0].hold_until,
    idempotent: true as const,
  };
}

async function hotelSaleGate(hotelId: string, checkIn: string) {
  const rows = await query<{
    published_desk: boolean | null;
    min_advance_days: number | null;
    cutoff_time: string | null;
  }>(
    `SELECT published_desk, min_advance_days, cutoff_time
     FROM hotels WHERE id = ?`,
    [hotelId],
  );
  const hotel = rows[0];
  if (!hotel || hotel.published_desk === false) {
    return { ok: false as const, error: "rate" as const };
  }
  if (
    !stayAllowed(
      {
        minAdvanceDays: Number(hotel.min_advance_days ?? 0),
        cutoffTime: hotel.cutoff_time ?? "",
      },
      checkIn,
    )
  ) {
    return { ok: false as const, error: "window" as const };
  }
  return { ok: true as const };
}

export async function addAgencyCartLine(input: {
  agencyId: string;
  contractPeriodId: string;
  hotelId: string;
  checkIn: string;
  checkOut: string;
  quantity: number;
}) {
  if (
    nightsBetween(input.checkIn, input.checkOut) < 1 ||
    nightsBetween(input.checkIn, input.checkOut) > 120 ||
    !Number.isInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > 5000
  ) {
    return { ok: false as const, error: "invalid" as const };
  }
  if (!(await clientCanBuy(input.agencyId))) {
    return { ok: false as const, error: "client" as const };
  }
  const gate = await hotelSaleGate(input.hotelId, input.checkIn);
  if (!gate.ok) return gate;
  return transaction(async (sql) => {
    const periods = await sql.query<{
      id: string;
      purchase_line_id: string;
      offer_id: string;
      hotel_id: string;
      check_in: string;
      check_out: string;
      min_nights: number;
      active: boolean;
      stop_sale: boolean;
      sale_mode: string;
      price_per_night: number | null;
    }>(
      `SELECT period.id, period.purchase_line_id, line.offer_id, offer.hotel_id,
              period.check_in, period.check_out, period.min_nights,
              period.active, period.stop_sale, period.sale_mode,
              COALESCE(private.price_per_night, group_rate.price_per_night,
                       period.default_agency_price_per_night) AS price_per_night
       FROM contract_periods AS period
       JOIN purchase_lines AS line ON line.id = period.purchase_line_id
       JOIN purchases AS purchase ON purchase.id = line.purchase_id
       JOIN offers AS offer ON offer.id = line.offer_id
       LEFT JOIN contract_period_rates AS private
         ON private.contract_period_id = period.id
        AND private.agency_id = ?
       LEFT JOIN agencies AS rate_buyer ON rate_buyer.id = ?
       LEFT JOIN contract_group_rates AS group_rate
         ON group_rate.contract_period_id = period.id
        AND group_rate.group_id = rate_buyer.group_id
       WHERE period.id = ? AND purchase.status = 'confirmed'
       FOR UPDATE OF period`,
      [input.agencyId, input.agencyId, input.contractPeriodId],
    );
    const period = periods[0];
    if (
      !period ||
      period.hotel_id !== input.hotelId ||
      !period.active ||
      period.stop_sale ||
      period.price_per_night == null ||
      period.check_in > input.checkIn ||
      period.check_out < input.checkOut ||
      nightsBetween(input.checkIn, input.checkOut) <
        Number(period.min_nights)
    ) {
      return { ok: false as const, error: "rate" as const };
    }
    const existing = await sql.query<{
      id: string;
      hotel_id: string;
      check_in: string;
      check_out: string;
    }>(
      "SELECT id, hotel_id, check_in, check_out FROM agency_carts WHERE agency_id = ? FOR UPDATE",
      [input.agencyId],
    );
    if (
      existing[0] &&
      (existing[0].hotel_id !== input.hotelId ||
        existing[0].check_in !== input.checkIn ||
        existing[0].check_out !== input.checkOut)
    ) {
      return { ok: false as const, error: "cart-mismatch" as const };
    }
    const now = new Date().toISOString();
    const cartId = existing[0]?.id ?? crypto.randomUUID();
    if (!existing[0]) {
      await sql.execute(
        `INSERT INTO agency_carts
          (id, agency_id, hotel_id, check_in, check_out, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          cartId,
          input.agencyId,
          input.hotelId,
          input.checkIn,
          input.checkOut,
          now,
        ],
      );
    }
    const current = await sql.query<{ quantity: number }>(
      `SELECT quantity FROM agency_cart_lines
       WHERE cart_id = ? AND contract_period_id = ?`,
      [cartId, input.contractPeriodId],
    );
    const quantity = Number(current[0]?.quantity ?? 0) + input.quantity;
    if (quantity > 5000) {
      return { ok: false as const, error: "quantity" as const };
    }
    const available = await remainingBookable(sql, {
      cartId,
      contractPeriodId: period.id,
      purchaseLineId: period.purchase_line_id,
      offerId: period.offer_id,
      saleMode: period.sale_mode,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
    });
    if (available != null && quantity > available) {
      return { ok: false as const, error: "quantity" as const };
    }
    await sql.execute(
      `INSERT INTO agency_cart_lines
        (id, cart_id, contract_period_id, quantity)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (cart_id, contract_period_id)
       DO UPDATE SET quantity = EXCLUDED.quantity`,
      [crypto.randomUUID(), cartId, input.contractPeriodId, quantity],
    );
    await sql.execute("UPDATE agency_carts SET updated_at = ? WHERE id = ?", [
      now,
      cartId,
    ]);
    return { ok: true as const };
  });
}

export async function updateAgencyCartLine(input: {
  agencyId: string;
  lineId: string;
  quantity: number;
}) {
  if (
    !Number.isInteger(input.quantity) ||
    input.quantity < 0 ||
    input.quantity > 5000
  ) {
    return { ok: false as const, error: "invalid" as const };
  }
  if (input.quantity === 0) {
    await execute(
      `DELETE FROM agency_cart_lines AS line
       USING agency_carts AS cart
       WHERE line.cart_id = cart.id
         AND line.id = ? AND cart.agency_id = ?`,
      [input.lineId, input.agencyId],
    );
  } else {
    const saved = await transaction(async (sql) => {
      const rows = await sql.query<{
        cart_id: string;
        contract_period_id: string;
        purchase_line_id: string;
        offer_id: string;
        sale_mode: string;
        check_in: string;
        check_out: string;
      }>(
        `SELECT cart.id AS cart_id, period.id AS contract_period_id,
                period.purchase_line_id, line.offer_id, period.sale_mode,
                cart.check_in, cart.check_out
         FROM agency_cart_lines AS cart_line
         JOIN agency_carts AS cart ON cart.id = cart_line.cart_id
         JOIN contract_periods AS period
           ON period.id = cart_line.contract_period_id
         JOIN purchase_lines AS line ON line.id = period.purchase_line_id
         WHERE cart_line.id = ? AND cart.agency_id = ?
         FOR UPDATE OF period`,
        [input.lineId, input.agencyId],
      );
      const line = rows[0];
      if (!line?.offer_id) return false;
      const available = await remainingBookable(sql, {
        cartId: line.cart_id,
        contractPeriodId: line.contract_period_id,
        purchaseLineId: line.purchase_line_id,
        offerId: line.offer_id,
        saleMode: line.sale_mode,
        checkIn: line.check_in,
        checkOut: line.check_out,
      });
      if (available != null && input.quantity > available) return false;
      await sql.execute(
        `UPDATE agency_cart_lines AS cart_line
         SET quantity = ?
         FROM agency_carts AS cart
         WHERE cart_line.cart_id = cart.id
           AND cart_line.id = ? AND cart.agency_id = ?`,
        [input.quantity, input.lineId, input.agencyId],
      );
      return true;
    });
    if (!saved) return { ok: false as const, error: "quantity" as const };
  }
  await execute(
    `DELETE FROM agency_carts AS cart
     WHERE cart.agency_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM agency_cart_lines AS line WHERE line.cart_id = cart.id
       )`,
    [input.agencyId],
  );
  return { ok: true as const };
}

export async function clearAgencyCart(agencyId: string) {
  await execute("DELETE FROM agency_carts WHERE agency_id = ?", [agencyId]);
}

export async function checkoutAgencyCart(input: {
  agencyId: string;
  termsAccepted: boolean;
  acceptedBy: string;
  notes: string;
  idempotencyKey?: string;
}) {
  const key = checkoutToken(input.idempotencyKey);
  if (input.idempotencyKey && !key) {
    return { ok: false as const, error: "reservation" as const };
  }
  if (key) {
    const replay = await replayCheckout(input.agencyId, key);
    if (replay) return replay;
  }
  const cart = await getAgencyCart(input.agencyId);
  if (!cart?.lines.length) {
    return { ok: false as const, error: "empty" as const };
  }
  if (!(await clientCanBuy(input.agencyId))) {
    return { ok: false as const, error: "client" as const };
  }
  const gate = await hotelSaleGate(cart.hotelId, cart.checkIn);
  if (!gate.ok) return { ok: false as const, error: "window" as const };
  const reservation = await createAgencyReservation({
    agencyId: input.agencyId,
    checkIn: cart.checkIn,
    checkOut: cart.checkOut,
    selections: cart.lines.map((line) => ({
      contractPeriodId: line.contractPeriodId,
      quantity: line.quantity,
    })),
    termsAccepted: input.termsAccepted,
    termsAcceptedName: input.acceptedBy,
    notes: input.notes,
    idempotencyKey: key || cart.id,
  });
  if (reservation.ok && !reservation.idempotent) {
    await clearAgencyCart(input.agencyId);
  }
  return reservation;
}

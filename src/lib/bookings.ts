import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { transaction, query, execute, type SqlClient } from "@/lib/db";
import { deliverBooking } from "@/lib/email";
import {
  ensureIndividualAgency,
  getHotel,
  getRoom,
  insertWebsiteSale,
  mirrorBookingSale,
  parseStay,
} from "@/lib/inventory";
import { contractLineFree, offerFree, releaseExpiredHolds } from "@/lib/stock";
import { saleModeCode } from "@/lib/room-types";
import { nightsBetween } from "@/lib/money";
import { routing, type Locale } from "@/i18n/routing";
import { roomTypeLabel } from "@/lib/room-types";
import { maxDirectRooms } from "@/lib/booking-limits";
import { createCheckoutSession } from "@/lib/stripe";
const holdMinutes = 45;

export const bookingStatuses = ["pending", "confirmed", "cancelled"] as const;
export type BookingStatus = (typeof bookingStatuses)[number];

export const bookingRequestSchema = z.object({
  roomId: z.string().uuid(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.number().int().min(1).max(maxDirectRooms),
  travellers: z.number().int().min(1).max(20),
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(6).max(40),
  country: z.string().trim().min(2).max(100),
  locale: z.enum(["en", "ar", "fr", "it"]),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export type Booking = {
  id: string;
  number: string;
  roomId: string;
  hotelName: string;
  roomName: string;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  quantity: number;
  travellers: number;
  publicPricePerNight: number;
  name: string;
  email: string;
  phone: string;
  country: string;
  locale: Locale;
  stripeSessionId: string | null;
  stripePaymentIntent: string | null;
  holdUntil: string;
  createdAt: string;
  confirmedAt: string | null;
};

type BookingRow = {
  id: string;
  number: string;
  room_id: string | null;
  offer_id: string | null;
  hotel_name: string;
  room_name: string;
  status: string;
  check_in: string;
  check_out: string;
  quantity: number;
  travellers: number;
  public_price_per_night: number;
  name: string;
  email: string;
  phone: string;
  country: string;
  locale: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  hold_until: string;
  created_at: string;
  confirmed_at: string | null;
};

function asStatus(value: string): BookingStatus {
  return bookingStatuses.includes(value as BookingStatus)
    ? (value as BookingStatus)
    : "pending";
}

async function labelledRoom(name: string, locale: string) {
  const hotels = await getTranslations({ locale, namespace: "Hotels" });
  return roomTypeLabel(name, (type) => hotels(type));
}

function asLocale(value: string): Locale {
  return routing.locales.includes(value as Locale) ? (value as Locale) : "en";
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    number: row.number,
    roomId: row.room_id ?? row.offer_id ?? "",
    hotelName: row.hotel_name,
    roomName: row.room_name,
    status: asStatus(row.status),
    checkIn: row.check_in,
    checkOut: row.check_out,
    quantity: Number(row.quantity),
    travellers: Number(row.travellers),
    publicPricePerNight: Number(row.public_price_per_night),
    name: row.name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    locale: asLocale(row.locale),
    stripeSessionId: row.stripe_session_id,
    stripePaymentIntent: row.stripe_payment_intent,
    holdUntil: row.hold_until,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
  };
}

const bookingSelect = `
  SELECT b.*,
         COALESCE(hotel.name, room_hotel.name, '') AS hotel_name,
         COALESCE(type.name, room.name, '') AS room_name
  FROM bookings b
  LEFT JOIN rooms room ON room.id = b.room_id
  LEFT JOIN hotels room_hotel ON room_hotel.id = room.hotel_id
  LEFT JOIN offers offer ON offer.id = COALESCE(b.offer_id, room.offer_id)
  LEFT JOIN hotels hotel ON hotel.id = offer.hotel_id
  LEFT JOIN room_types type ON type.id = offer.room_type_id
`;

export async function getBooking(id: string) {
  const rows = await query<BookingRow>(`${bookingSelect} WHERE b.id = ?`, [id]);
  return rows[0] ? mapBooking(rows[0]) : null;
}

export async function listBookings(status?: BookingStatus) {
  const rows = await query<BookingRow>(
    `${bookingSelect}
     ${status ? "WHERE b.status = ?" : ""}
     ORDER BY b.created_at DESC`,
    status ? [status] : [],
  );
  return rows.map(mapBooking);
}

async function nextBookingNumber(sql: SqlClient) {
  const rows = await sql.query<{ number: string }>(
    `SELECT number FROM bookings
     WHERE number ~ '^B[0-9]+$'
     ORDER BY number DESC
     LIMIT 1`,
  );
  const current = Number(rows[0]?.number?.slice(1) ?? 0);
  return `B${String(current + 1).padStart(5, "0")}`;
}

export async function createBooking(input: BookingRequest) {
  const stay = parseStay(input.checkIn, input.checkOut);
  if (!stay) return { ok: false as const, error: "dates" as const };
  const room = await getRoom(input.roomId);
  const hotel = room ? await getHotel(room.hotelId) : null;
  const offerId = room?.offerId;
  if (!room || !hotel || !offerId) {
    return { ok: false as const, error: "unavailable" as const };
  }
  if (input.travellers > room.capacity * input.quantity) {
    return { ok: false as const, error: "capacity" as const };
  }

  await releaseExpiredHolds();
  const contracts = await query<{
    id: string;
    offer_id: string;
    check_in: string;
    check_out: string;
    cost_per_night: number;
    public_price_per_night: number | null;
    min_nights: number | null;
    sale_mode: string | null;
    room_id: string | null;
  }>(
    `SELECT line.id, line.offer_id, line.check_in, line.check_out, line.cost_per_night,
            line.public_price_per_night, line.min_nights, line.sale_mode,
            (SELECT room.id FROM rooms AS room WHERE room.offer_id = line.offer_id LIMIT 1) AS room_id
     FROM purchase_lines AS line
     JOIN purchases AS purchase ON purchase.id = line.purchase_id
     WHERE line.offer_id = ?
       AND purchase.status = 'confirmed'
       AND line.check_in <= ?
       AND line.check_out >= ?`,
    [offerId, stay.checkIn, stay.checkOut],
  );
  const eligible = contracts.filter(
    (line) => stay.nights >= (Number(line.min_nights ?? 1) || 1),
  );
  const open = await offerFree(offerId, stay.checkIn, stay.checkOut);
  let bookLine: (typeof eligible)[number] | undefined;
  for (const line of eligible) {
    if (
      (saleModeCode(line.sale_mode ?? "") ?? "book") !== "book" ||
      line.public_price_per_night == null
    ) {
      continue;
    }
    const onLine = await contractLineFree(line.id, stay.checkIn, stay.checkOut);
    if (input.quantity <= Math.min(open, onLine)) {
      bookLine = line;
      break;
    }
  }
  const requestLine = eligible.find(
    (line) => (saleModeCode(line.sale_mode ?? "") ?? "book") === "request",
  );
  const chosen = bookLine ?? requestLine;
  if (!chosen || chosen.public_price_per_night == null) {
    return { ok: false as const, error: "unavailable" as const };
  }
  const nightly = Number(chosen.public_price_per_night);
  const requesting = !bookLine;

  const holdUntil = new Date(Date.now() + holdMinutes * 60_000).toISOString();
  const id = crypto.randomUUID();
  let number = "";

  const reserved = await transaction(async (sql) => {
    if (!requesting) {
      const locked = await sql.query<{ id: string }>(
        "SELECT id FROM offers WHERE id = ? FOR UPDATE",
        [offerId],
      );
      if (!locked[0]) return false;
      await sql.query("SELECT id FROM purchase_lines WHERE id = ? FOR UPDATE", [
        chosen.id,
      ]);
      const onLine = await contractLineFree(
        chosen.id,
        stay.checkIn,
        stay.checkOut,
        sql,
      );
      const stillOpen = await offerFree(offerId, stay.checkIn, stay.checkOut, sql);
      if (input.quantity > Math.min(onLine, stillOpen)) return false;
    }
    const createdAt = new Date().toISOString();
    if (!requesting) {
      number = await nextBookingNumber(sql);
      await sql.execute(
        `INSERT INTO bookings
          (id, number, room_id, offer_id, status, check_in, check_out, quantity, travellers,
           public_price_per_night, name, email, phone, country, locale, hold_until, created_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          number,
          chosen.room_id,
          offerId,
          stay.checkIn,
          stay.checkOut,
          input.quantity,
          input.travellers,
          nightly,
          input.name,
          input.email,
          input.phone,
          input.country,
          input.locale,
          holdUntil,
          createdAt,
        ],
      );
    }
    const agencyId = await ensureIndividualAgency(sql, {
      name: input.name,
      email: input.email,
      phone: input.phone,
      country: input.country,
      createdAt,
    });
    const saleId = await insertWebsiteSale(sql, {
      channel: "b2c",
      agencyId,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      notes: [input.name, input.email, input.phone, input.country]
        .filter(Boolean)
        .join("\n"),
      createdAt,
      bookingId: requesting ? null : id,
      status: requesting ? "request" : "provisional",
      lines: [
        {
          roomId: chosen.room_id ?? "",
          offerId,
          purchaseLineId: chosen.id,
          quantity: input.quantity,
          costPerNight: Number(chosen.cost_per_night),
          agencyPricePerNight: nightly,
        },
      ],
    });
    if (requesting) {
      const sale = await sql.query<{ number: string }>(
        "SELECT number FROM allotments WHERE id = ?",
        [saleId],
      );
      number = sale[0]?.number ?? "";
    }
    return true;
  });

  if (!reserved) {
    return { ok: false as const, error: "unavailable" as const };
  }
  if (requesting) {
    return { ok: true as const, id, number, url: null, requested: true as const };
  }

  try {
    const session = await createCheckoutSession({
      bookingId: id,
      locale: input.locale,
      email: input.email,
      roomId: room.id,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      name: `${hotel.name} — ${await labelledRoom(room.name, input.locale)}`,
      unitAmount: nightly,
      quantity: input.quantity * stay.nights,
    });
    await execute("UPDATE bookings SET stripe_session_id = ? WHERE id = ?", [
      session.id,
      id,
    ]);
    return { ok: true as const, id, number, url: session.url };
  } catch {
    await execute(
      "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status = 'pending'",
      [id],
    );
    await mirrorBookingSale(id, "cancelled");
    return { ok: false as const, error: "payment" as const };
  }
}

export async function confirmBookingPayment(
  bookingId: string,
  paymentIntent: string | null,
) {
  const existing = await getBooking(bookingId);
  if (!existing || existing.status !== "pending") return;

  const confirmed = await transaction(async (sql) => {
    const pending = await sql.query<{ id: string }>(
      "SELECT id FROM bookings WHERE id = ? AND status = 'pending' FOR UPDATE",
      [bookingId],
    );
    if (!pending[0]) return false;
    const confirmedAt = new Date().toISOString();
    const rows = await sql.query<{ id: string }>(
      `UPDATE bookings
       SET status = 'confirmed',
           confirmed_at = ?,
           stripe_payment_intent = COALESCE(?, stripe_payment_intent)
       WHERE id = ? AND status = 'pending'
       RETURNING id`,
      [confirmedAt, paymentIntent, bookingId],
    );
    if (!rows[0]) return false;
    await mirrorBookingSale(bookingId, "confirmed", sql);
    return true;
  });
  if (!confirmed) return;
  const booking = await getBooking(bookingId);
  if (!booking) return;
  const nights = Math.max(0, nightsBetween(booking.checkIn, booking.checkOut));
  await deliverBooking({
    reference: booking.number,
    name: booking.name,
    email: booking.email,
    phone: booking.phone,
    country: booking.country,
    hotel: booking.hotelName,
    room: await labelledRoom(booking.roomName, booking.locale),
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    quantity: booking.quantity,
    travellers: booking.travellers,
    total: booking.publicPricePerNight * nights * booking.quantity,
  }).catch(() => undefined);
}

export async function deleteBooking(id: string) {
  await execute(
    `DELETE FROM assignments
     WHERE allotment_id IN (SELECT id FROM allotments WHERE booking_id = ?)`,
    [id],
  );
  await execute(
    `DELETE FROM allotment_lines
     WHERE allotment_id IN (SELECT id FROM allotments WHERE booking_id = ?)`,
    [id],
  );
  await execute("DELETE FROM allotments WHERE booking_id = ?", [id]);
  const rows = await query<{ id: string }>(
    "DELETE FROM bookings WHERE id = ? RETURNING id",
    [id],
  );
  return Boolean(rows[0]);
}

export async function cancelPendingBooking(bookingId: string) {
  await execute(
    "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status = 'pending'",
    [bookingId],
  );
  await mirrorBookingSale(bookingId, "cancelled");
}

export async function cancelBooking(id: string) {
  const result = await execute(
    `UPDATE bookings
     SET status = 'cancelled'
     WHERE id = ? AND status IN ('pending', 'confirmed')`,
    [id],
  );
  await mirrorBookingSale(id, "cancelled");
  return (result.rowCount ?? 0) > 0;
}

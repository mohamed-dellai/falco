import { z } from "zod";
import { transaction, query, execute, type SqlClient } from "@/lib/db";
import { deliverBooking } from "@/lib/email";
import { getHotel, getRoom, openForStay, parseStay } from "@/lib/inventory";
import { nightsBetween } from "@/lib/money";
import { routing, type Locale } from "@/i18n/routing";
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
  room_id: string;
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

function asLocale(value: string): Locale {
  return routing.locales.includes(value as Locale) ? (value as Locale) : "en";
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    number: row.number,
    roomId: row.room_id,
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
  SELECT b.*, h.name AS hotel_name, r.name AS room_name
  FROM bookings b
  JOIN rooms r ON r.id = b.room_id
  JOIN hotels h ON h.id = r.hotel_id
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
  if (!room || !hotel || room.publicPricePerNight == null) {
    return { ok: false as const, error: "unavailable" as const };
  }
  if (input.travellers > room.capacity * input.quantity) {
    return { ok: false as const, error: "capacity" as const };
  }

  const holdUntil = new Date(Date.now() + holdMinutes * 60_000).toISOString();
  const id = crypto.randomUUID();
  let number = "";

  const reserved = await transaction(async (sql) => {
    const locked = await sql.query<{ id: string }>(
      "SELECT id FROM rooms WHERE id = ? FOR UPDATE",
      [room.id],
    );
    if (!locked[0]) return false;
    const open = await openForStay(room, stay.checkIn, stay.checkOut, sql);
    if (input.quantity > open) return false;
    number = await nextBookingNumber(sql);
    await sql.execute(
      `INSERT INTO bookings
        (id, number, room_id, status, check_in, check_out, quantity, travellers,
         public_price_per_night, name, email, phone, country, locale, hold_until, created_at)
       VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        number,
        room.id,
        stay.checkIn,
        stay.checkOut,
        input.quantity,
        input.travellers,
        room.publicPricePerNight,
        input.name,
        input.email,
        input.phone,
        input.country,
        input.locale,
        holdUntil,
        new Date().toISOString(),
      ],
    );
    return true;
  });

  if (!reserved || room.publicPricePerNight == null) {
    return { ok: false as const, error: "unavailable" as const };
  }

  try {
    const session = await createCheckoutSession({
      bookingId: id,
      locale: input.locale,
      email: input.email,
      roomId: room.id,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      name: `${hotel.name} — ${room.name}`,
      unitAmount: room.publicPricePerNight,
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
    return { ok: false as const, error: "payment" as const };
  }
}

export async function confirmBookingPayment(
  bookingId: string,
  paymentIntent: string | null,
) {
  const existing = await getBooking(bookingId);
  if (!existing || existing.status !== "pending") return;
  const room = await getRoom(existing.roomId);
  if (!room) return;

  const confirmed = await transaction(async (sql) => {
    const locked = await sql.query<{ id: string }>(
      "SELECT id FROM rooms WHERE id = ? FOR UPDATE",
      [room.id],
    );
    if (!locked[0]) return false;
    const pending = await sql.query<{ id: string }>(
      "SELECT id FROM bookings WHERE id = ? AND status = 'pending'",
      [bookingId],
    );
    if (!pending[0]) return false;
    const open = await openForStay(
      room,
      existing.checkIn,
      existing.checkOut,
      sql,
      bookingId,
    );
    if (existing.quantity > open) {
      await sql.execute(
        "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status = 'pending'",
        [bookingId],
      );
      return false;
    }
    const rows = await sql.query<{ id: string }>(
      `UPDATE bookings
       SET status = 'confirmed',
           confirmed_at = ?,
           stripe_payment_intent = COALESCE(?, stripe_payment_intent)
       WHERE id = ? AND status = 'pending'
       RETURNING id`,
      [new Date().toISOString(), paymentIntent, bookingId],
    );
    return Boolean(rows[0]);
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
    room: booking.roomName,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    quantity: booking.quantity,
    travellers: booking.travellers,
    total: booking.publicPricePerNight * nights * booking.quantity,
  }).catch(() => undefined);
}

export async function cancelPendingBooking(bookingId: string) {
  await execute(
    "UPDATE bookings SET status = 'cancelled' WHERE id = ? AND status = 'pending'",
    [bookingId],
  );
}

export async function cancelBooking(id: string) {
  const result = await execute(
    `UPDATE bookings
     SET status = 'cancelled'
     WHERE id = ? AND status IN ('pending', 'confirmed')`,
    [id],
  );
  return (result.rowCount ?? 0) > 0;
}

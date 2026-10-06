import { execute, query, transaction, type SqlClient } from "@/lib/db";
import { nightsBetween, stayInside, todayInRiyadh } from "@/lib/money";
import { cities, type City } from "@/lib/places";
import { mealPlanCode, saleModeCode, type MealPlan, type SaleMode } from "@/lib/room-types";
import {
  chartWindow,
  contractLineFree,
  offerChart,
  offerFree,
  releaseExpiredHolds,
} from "@/lib/stock";
import { removeImages, saveImage } from "@/lib/uploads";

export { cities, type City } from "@/lib/places";

export type Hotel = {
  id: string;
  name: string;
  city: City;
  address: string;
  description: string;
  stars: number;
  distanceToHaram: string;
  createdAt: string;
  photos: string[];
};

export type Room = {
  id: string;
  hotelId: string;
  roomTypeId: string;
  name: string;
  description: string;
  capacity: number;
  quantity: number;
  costPerNight: number;
  publicPricePerNight: number | null;
  checkIn: string | null;
  checkOut: string | null;
  createdAt: string;
  photos: string[];
  board: MealPlan;
  view: string;
  typeDescription: string;
  offerId: string | null;
};

export function roomHasPeriod<
  T extends { checkIn: string | null; checkOut: string | null },
>(room: T): room is T & { checkIn: string; checkOut: string } {
  return Boolean(room.checkIn && room.checkOut);
}

export const clientKinds = ["agency", "individual"] as const;
export type ClientKind = (typeof clientKinds)[number];

export const saleChannels = ["desk", "b2c", "b2b"] as const;
export type SaleChannel = (typeof saleChannels)[number];

export type Agency = {
  id: string;
  name: string;
  kind: ClientKind;
  country: string;
  contactName: string;
  email: string;
  phone: string;
  commercialRegistration: string;
  vatNumber: string;
  createdAt: string;
};

function asClientKind(value: string | null | undefined): ClientKind {
  return value === "individual" ? "individual" : "agency";
}

export const purchaseStatuses = ["draft", "confirmed", "cancelled"] as const;
export type PurchaseStatus = (typeof purchaseStatuses)[number];

export type PurchaseLine = {
  id: string;
  purchaseId: string;
  roomTypeId: string | null;
  roomName: string;
  description: string;
  capacity: number;
  quantity: number;
  costPerNight: number;
  publicPricePerNight: number | null;
  checkIn: string;
  checkOut: string;
  roomId: string | null;
  offerId: string | null;
  board: MealPlan;
  view: string;
  minNights: number;
  saleMode: SaleMode;
};

export type PurchaseLineInput = {
  roomTypeId: string;
  roomName: string;
  description: string;
  capacity: number;
  quantity: number;
  costPerNight: number;
  publicPricePerNight: number | null;
  checkIn: string;
  checkOut: string;
  board: MealPlan;
  view: string;
  minNights: number;
  saleMode: SaleMode;
};

export type Purchase = {
  id: string;
  number: string;
  hotelId: string;
  hotelName: string;
  hotelCity: City;
  status: PurchaseStatus;
  checkIn: string;
  checkOut: string;
  notes: string;
  createdAt: string;
  confirmedAt: string | null;
  lines: PurchaseLine[];
};

export type Assignment = {
  id: string;
  roomId: string;
  agencyId: string;
  agencyName: string;
  hotelName: string;
  roomName: string;
  quantity: number;
  checkIn: string;
  checkOut: string;
  costPerNight: number;
  agencyPricePerNight: number;
  notes: string;
  createdAt: string;
  allotmentId: string | null;
};

export const allotmentStatuses = [
  "request",
  "provisional",
  "confirmed",
  "cancelled",
  "no_show",
] as const;
export type AllotmentStatus = (typeof allotmentStatuses)[number];

export type AllotmentLine = {
  id: string;
  allotmentId: string;
  roomId: string;
  offerId: string | null;
  purchaseLineId: string | null;
  hotelName: string;
  roomName: string;
  roomCheckIn: string | null;
  roomCheckOut: string | null;
  quantity: number;
  costPerNight: number;
  agencyPricePerNight: number;
};

export type AllotmentLineInput = {
  roomId: string;
  offerId: string | null;
  purchaseLineId: string | null;
  quantity: number;
  costPerNight: number;
  agencyPricePerNight: number;
};

export type Allotment = {
  id: string;
  number: string;
  agencyId: string;
  agencyName: string;
  status: AllotmentStatus;
  channel: SaleChannel;
  bookingId: string | null;
  submissionId: string | null;
  checkIn: string;
  checkOut: string;
  notes: string;
  createdAt: string;
  confirmedAt: string | null;
  lines: AllotmentLine[];
};

type HotelRow = {
  id: string;
  name: string;
  city: string;
  address: string;
  description: string;
  stars: number;
  distance_to_haram: string;
  created_at: string;
};

type RoomRow = {
  id: string;
  hotel_id: string;
  room_type_id: string | null;
  name: string;
  description: string;
  capacity: number;
  quantity: number;
  cost_per_night: number;
  public_price_per_night: number | null;
  check_in: string | null;
  check_out: string | null;
  created_at: string;
  offer_id: string | null;
  type_board: string | null;
  type_view: string | null;
  type_description: string | null;
};

function asCity(value: string): City {
  return cities.includes(value as City) ? (value as City) : "makkah";
}

function mapHotel(row: HotelRow, photos: string[]): Hotel {
  return {
    id: row.id,
    name: row.name,
    city: asCity(row.city),
    address: row.address,
    description: row.description,
    stars: Number(row.stars),
    distanceToHaram: row.distance_to_haram,
    createdAt: row.created_at,
    photos,
  };
}

const roomSelect = `
  SELECT r.id, r.hotel_id, r.room_type_id, r.name, r.description, r.capacity,
         r.quantity, r.cost_per_night, r.public_price_per_night, r.check_in,
         r.check_out, r.created_at, r.offer_id,
         t.board AS type_board, t.view AS type_view,
         t.description AS type_description
  FROM rooms r
  LEFT JOIN room_types t ON t.id = r.room_type_id
`;

function mapRoom(row: RoomRow, photos: string[]): Room {
  return {
    id: row.id,
    hotelId: row.hotel_id,
    roomTypeId: row.room_type_id ?? "",
    name: row.name,
    board: mealPlanCode(row.type_board ?? "") ?? "room_only",
    view: row.type_view ?? "",
    typeDescription: row.type_description ?? "",
    description: row.description,
    capacity: Number(row.capacity),
    quantity: Number(row.quantity),
    costPerNight: Number(row.cost_per_night),
    publicPricePerNight:
      row.public_price_per_night == null
        ? null
        : Number(row.public_price_per_night),
    checkIn: row.check_in,
    checkOut: row.check_out,
    createdAt: row.created_at,
    photos,
    offerId: row.offer_id,
  };
}

async function photosFor(
  table: "hotel_photos" | "room_photos",
  column: "hotel_id" | "room_id",
) {
  const rows = await query<{ owner: string; url: string }>(
    `SELECT ${column} AS owner, url FROM ${table} ORDER BY sort_order, id`,
  );
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    grouped.set(row.owner, [...(grouped.get(row.owner) ?? []), row.url]);
  }
  return grouped;
}

export async function listHotels() {
  const [rows, photos] = await Promise.all([
    query<HotelRow>("SELECT * FROM hotels ORDER BY created_at DESC"),
    photosFor("hotel_photos", "hotel_id"),
  ]);
  return rows.map((row) => mapHotel(row, photos.get(row.id) ?? []));
}

export async function getHotel(id: string) {
  const rows = await query<HotelRow>("SELECT * FROM hotels WHERE id = ?", [id]);
  const row = rows[0];
  if (!row) return null;
  const photos = await query<{ url: string }>(
    "SELECT url FROM hotel_photos WHERE hotel_id = ? ORDER BY sort_order, id",
    [id],
  );
  return mapHotel(
    row,
    photos.map((photo) => photo.url),
  );
}

export async function listRooms(hotelId?: string) {
  await sweepRoomsWithoutPurchases();
  const rows = await query<RoomRow>(
    hotelId
      ? `${roomSelect} WHERE r.hotel_id = ? ORDER BY lower(r.name), r.check_in NULLS LAST, r.created_at DESC`
      : `${roomSelect} ORDER BY lower(r.name), r.check_in NULLS LAST, r.created_at DESC`,
    hotelId ? [hotelId] : [],
  );
  const photos = await photosFor("room_photos", "room_id");
  return rows.map((row) => mapRoom(row, photos.get(row.id) ?? []));
}

export async function getRoom(id: string) {
  const rows = await query<RoomRow>(`${roomSelect} WHERE r.id = ?`, [id]);
  const row = rows[0];
  if (!row) return getOfferRoom(id);
  const photos = await query<{ url: string }>(
    "SELECT url FROM room_photos WHERE room_id = ? ORDER BY sort_order, id",
    [id],
  );
  return mapRoom(
    row,
    photos.map((photo) => photo.url),
  );
}

export type CatalogRoomType = {
  id: string;
  name: string;
  guests: number;
  board: MealPlan;
  view: string;
  description: string;
  createdAt: string;
};

type RoomTypeRow = {
  id: string;
  name: string;
  guests: number;
  board: string;
  view: string;
  description: string;
  created_at: string;
};

function mapRoomType(row: RoomTypeRow): CatalogRoomType {
  return {
    id: row.id,
    name: row.name,
    guests: Number(row.guests),
    board: mealPlanCode(row.board) ?? "room_only",
    view: row.view ?? "",
    description: row.description ?? "",
    createdAt: row.created_at,
  };
}

export async function listRoomTypes() {
  const rows = await query<RoomTypeRow>(
    "SELECT * FROM room_types ORDER BY lower(name), guests, board, view",
  );
  return rows.map(mapRoomType);
}

export async function getRoomType(id: string) {
  const rows = await query<RoomTypeRow>(
    "SELECT * FROM room_types WHERE id = ?",
    [id],
  );
  return rows[0] ? mapRoomType(rows[0]) : null;
}

export async function roomTypeInUse(id: string) {
  const rows = await query<{ count: number }>(
    `SELECT (
       (SELECT COUNT(*) FROM rooms WHERE room_type_id = ?)
       + (SELECT COUNT(*) FROM purchase_lines WHERE room_type_id = ?)
     )::int AS count`,
    [id, id],
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

export async function saveRoomType(input: {
  id?: string | null;
  name: string;
  guests: number;
  description: string;
}) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) return null;
  if (!Number.isInteger(input.guests) || input.guests < 1 || input.guests > 20) {
    return null;
  }
  const description = input.description.trim().slice(0, 2000);
  if (input.id) {
    const existing = await getRoomType(input.id);
    if (!existing) return null;
    await execute(
      `UPDATE room_types
       SET name = ?, guests = ?, description = ?
       WHERE id = ?`,
      [name, input.guests, description, input.id],
    );
    return input.id;
  }
  const id = crypto.randomUUID();
  await execute(
    `INSERT INTO room_types
      (id, name, guests, board, view, description, created_at)
     VALUES (?, ?, ?, 'room_only', '', ?, ?)`,
    [id, name, input.guests, description, new Date().toISOString()],
  );
  return id;
}

export async function deleteRoomType(id: string) {
  if (await roomTypeInUse(id)) return false;
  const rows = await query<{ id: string }>(
    "DELETE FROM room_types WHERE id = ? RETURNING id",
    [id],
  );
  return Boolean(rows[0]);
}

type AgencyRow = {
  id: string;
  name: string;
  kind: string | null;
  country: string;
  contact_name: string;
  email: string;
  phone: string;
  commercial_registration: string | null;
  vat_number: string | null;
  created_at: string;
};

function mapAgency(row: AgencyRow): Agency {
  return {
    id: row.id,
    name: row.name,
    kind: asClientKind(row.kind),
    country: row.country,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    commercialRegistration: row.commercial_registration ?? "",
    vatNumber: row.vat_number ?? "",
    createdAt: row.created_at,
  };
}

export async function listAgencies() {
  const rows = await query<AgencyRow>(
    "SELECT * FROM agencies ORDER BY lower(name)",
  );
  return rows.map(mapAgency);
}

export async function getAgency(id: string) {
  const rows = await query<AgencyRow>("SELECT * FROM agencies WHERE id = ?", [
    id,
  ]);
  return rows[0] ? mapAgency(rows[0]) : null;
}

export async function reservedQuantity(
  roomId: string,
  checkIn: string,
  checkOut: string,
  ignoreAssignmentId?: string,
) {
  const rows = await query<{ reserved: number }>(
    `SELECT
       COALESCE((
         SELECT SUM(quantity)
         FROM assignments
         WHERE room_id = ?
           AND check_in < ?
           AND check_out > ?
           AND (?::text IS NULL OR id != ?::text)
       ), 0)
       + COALESCE((
         SELECT SUM(quantity)
         FROM bookings
         WHERE room_id = ?
           AND check_in < ?
           AND check_out > ?
           AND (
             status = 'confirmed'
             OR (status = 'pending' AND hold_until::timestamptz > NOW())
           )
       ), 0) AS reserved`,
    [
      roomId,
      checkOut,
      checkIn,
      ignoreAssignmentId ?? null,
      ignoreAssignmentId ?? null,
      roomId,
      checkOut,
      checkIn,
    ],
  );
  return Number(rows[0]?.reserved ?? 0);
}

export async function heldQuantity(
  room: Room,
  checkIn: string,
  checkOut: string,
  ignorePurchaseId?: string,
) {
  if (nightsBetween(checkIn, checkOut) < 1) return 0;

  const linked = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM purchase_lines WHERE room_id = ?",
    [room.id],
  );
  if (Number(linked[0]?.count ?? 0) === 0) return room.quantity;

  const rows = await query<{ held: number }>(
    `SELECT COALESCE(MIN(day_held), 0) AS held
     FROM (
       SELECT COALESCE((
         SELECT SUM(pl.quantity)
         FROM purchase_lines pl
         JOIN purchases p ON p.id = pl.purchase_id
         WHERE pl.room_id = ?
           AND p.status = 'confirmed'
           AND pl.check_in::date <= d.day::date
           AND pl.check_out::date > d.day::date
           AND (?::text IS NULL OR p.id <> ?::text)
       ), 0) AS day_held
       FROM generate_series(
         ?::timestamp,
         (?::date - INTERVAL '1 day')::timestamp,
         INTERVAL '1 day'
       ) AS d(day)
     ) days`,
    [
      room.id,
      ignorePurchaseId ?? null,
      ignorePurchaseId ?? null,
      checkIn,
      checkOut,
    ],
  );
  return Number(rows[0]?.held ?? 0);
}

export async function heldOn(room: Room, day = todayInRiyadh()) {
  return heldQuantity(room, day, nextDay(day));
}

export async function openQuantity(room: Room, day = todayInRiyadh()) {
  const held = await heldQuantity(room, day, nextDay(day));
  const reserved = await reservedQuantity(room.id, day, nextDay(day));
  return Math.max(0, held - reserved);
}

const maxStayNights = 120;

export function parseStay(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    return null;
  }
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1 || nights > maxStayNights) return null;
  return { checkIn, checkOut, nights };
}

export async function openForStay(
  room: Room,
  checkIn: string,
  checkOut: string,
  db: Pick<SqlClient, "query"> = { query },
  excludeBookingId?: string,
) {
  if (nightsBetween(checkIn, checkOut) < 1) return 0;
  if (room.offerId) {
    await releaseExpiredHolds();
    const ignore = excludeBookingId
      ? (
          await db.query<{ id: string }>(
            "SELECT id FROM allotments WHERE booking_id = ?",
            [excludeBookingId],
          )
        )[0]?.id
      : undefined;
    return offerFree(room.offerId, checkIn, checkOut, db, ignore);
  }
  if (
    room.checkIn &&
    room.checkOut &&
    (checkIn < room.checkIn || checkOut > room.checkOut)
  ) {
    return 0;
  }

  const linked = await db.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM purchase_lines WHERE room_id = ?",
    [room.id],
  );
  const fromPurchases = Number(linked[0]?.count ?? 0) > 0;
  const rows = await db.query<{ open: number }>(
    `SELECT COALESCE(MIN(GREATEST(day_held - day_reserved - day_booked, 0)), 0)::int AS open
     FROM (
       SELECT
         CASE
           WHEN ?::int = 1 THEN COALESCE((
             SELECT SUM(pl.quantity)::int
             FROM purchase_lines pl
             JOIN purchases p ON p.id = pl.purchase_id
             WHERE pl.room_id = ?
               AND p.status = 'confirmed'
               AND pl.check_in::date <= d.day::date
               AND pl.check_out::date > d.day::date
           ), 0)
           ELSE ?::int
         END AS day_held,
         COALESCE((
           SELECT SUM(a.quantity)::int
           FROM assignments a
           WHERE a.room_id = ?
             AND a.check_in::date <= d.day::date
             AND a.check_out::date > d.day::date
         ), 0) AS day_reserved,
         COALESCE((
           SELECT SUM(b.quantity)::int
           FROM bookings b
           WHERE b.room_id = ?
             AND (?::text IS NULL OR b.id <> ?::text)
             AND b.check_in::date <= d.day::date
             AND b.check_out::date > d.day::date
             AND (
               b.status = 'confirmed'
               OR (b.status = 'pending' AND b.hold_until::timestamptz > NOW())
             )
         ), 0) AS day_booked
       FROM generate_series(
         ?::timestamp,
         (?::date - INTERVAL '1 day')::timestamp,
         INTERVAL '1 day'
       ) AS d(day)
     ) days`,
    [
      fromPurchases ? 1 : 0,
      room.id,
      room.quantity,
      room.id,
      room.id,
      excludeBookingId ?? null,
      excludeBookingId ?? null,
      checkIn,
      checkOut,
    ],
  );
  return Number(rows[0]?.open ?? 0);
}

function nextDay(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

type ContractStock = {
  id: string;
  offerId: string;
  checkIn: string;
  checkOut: string;
  costPerNight: number;
  publicPricePerNight: number | null;
  minNights: number;
  saleMode: SaleMode;
  description: string;
};

async function loadContractStock() {
  const offers = await query<{
    id: string;
    hotel_id: string;
    room_type_id: string;
    board: string;
    view: string;
    created_at: string;
    name: string;
    guests: number;
    description: string;
  }>(
    `SELECT offer.id, offer.hotel_id, offer.room_type_id, offer.board, offer.view,
            offer.created_at, type.name, type.guests, type.description
     FROM offers AS offer
     JOIN room_types AS type ON type.id = offer.room_type_id
     WHERE EXISTS (
       SELECT 1
       FROM purchase_lines AS line
       JOIN purchases AS purchase ON purchase.id = line.purchase_id
       WHERE line.offer_id = offer.id
         AND purchase.status = 'confirmed'
     )`,
  );
  const lines = await query<{
    id: string;
    offer_id: string;
    check_in: string;
    check_out: string;
    cost_per_night: number;
    public_price_per_night: number | null;
    min_nights: number | null;
    sale_mode: string | null;
    description: string;
  }>(
    `SELECT line.id, line.offer_id, line.check_in, line.check_out, line.cost_per_night,
            line.public_price_per_night, line.min_nights, line.sale_mode, line.description
     FROM purchase_lines AS line
     JOIN purchases AS purchase ON purchase.id = line.purchase_id
     WHERE purchase.status = 'confirmed'
       AND line.offer_id IS NOT NULL`,
  );
  const photos = await query<{ offer_id: string; url: string }>(
    `SELECT room.offer_id, photo.url
     FROM room_photos AS photo
     JOIN rooms AS room ON room.id = photo.room_id
     WHERE room.offer_id IS NOT NULL
     ORDER BY photo.sort_order, photo.id`,
  );
  const byOffer = new Map<string, ContractStock[]>();
  for (const line of lines) {
    const stock: ContractStock = {
      id: line.id,
      offerId: line.offer_id,
      checkIn: line.check_in,
      checkOut: line.check_out,
      costPerNight: Number(line.cost_per_night),
      publicPricePerNight:
        line.public_price_per_night == null
          ? null
          : Number(line.public_price_per_night),
      minNights: Number(line.min_nights ?? 1) || 1,
      saleMode: saleModeCode(line.sale_mode ?? "") ?? "book",
      description: line.description,
    };
    byOffer.set(line.offer_id, [...(byOffer.get(line.offer_id) ?? []), stock]);
  }
  const photoMap = new Map<string, string[]>();
  for (const photo of photos) {
    photoMap.set(photo.offer_id, [...(photoMap.get(photo.offer_id) ?? []), photo.url]);
  }
  return { offers, byOffer, photoMap };
}

async function getOfferRoom(id: string) {
  const stock = await loadContractStock();
  const offer = stock.offers.find((item) => item.id === id);
  if (!offer) return null;
  return offerRoom(
    offer,
    stock.byOffer.get(offer.id) ?? [],
    stock.photoMap.get(offer.id) ?? [],
    null,
  );
}

function offerRoom(
  offer: {
    id: string;
    hotel_id: string;
    room_type_id: string;
    board: string;
    view: string;
    created_at: string;
    name: string;
    guests: number;
    description: string;
  },
  lines: ContractStock[],
  photos: string[],
  stay: { checkIn: string; checkOut: string } | null,
) {
  const covering = stay
    ? lines.filter(
        (line) => line.checkIn <= stay.checkIn && line.checkOut >= stay.checkOut,
      )
    : lines;
  if (!covering.length) return null;
  const nights = stay ? nightsBetween(stay.checkIn, stay.checkOut) : 0;
  const eligible = stay
    ? covering.filter((line) => nights >= line.minNights)
    : covering;
  if (!eligible.length) return null;
  const priced = eligible.find(
    (line) => line.saleMode === "book" && line.publicPricePerNight != null,
  );
  const chosen = priced ?? eligible.find((line) => line.publicPricePerNight != null) ?? eligible[0];
  const span = purchaseSpan(lines);
  return {
    id: offer.id,
    hotelId: offer.hotel_id,
    roomTypeId: offer.room_type_id,
    name: offer.name,
    description: chosen.description || offer.description,
    capacity: Number(offer.guests),
    quantity: 0,
    costPerNight: chosen.costPerNight,
    publicPricePerNight: chosen.publicPricePerNight,
    checkIn: span?.checkIn ?? chosen.checkIn,
    checkOut: span?.checkOut ?? chosen.checkOut,
    createdAt: offer.created_at,
    photos,
    board: mealPlanCode(offer.board) ?? "room_only",
    view: offer.view,
    typeDescription: offer.description,
    offerId: offer.id,
    saleMode: chosen.saleMode,
    minNights: chosen.minNights,
    purchaseLineId: chosen.id,
    agencyPricePerNight: null as number | null,
  };
}

async function hotelsWithOffers(
  stay: { checkIn: string; checkOut: string } | null,
  options?: { requirePrice?: boolean; hideWhenFull?: boolean; keepWhenFull?: boolean },
) {
  const [hotels, stock] = await Promise.all([listHotels(), loadContractStock()]);
  const rooms = stock.offers
    .map((offer) =>
      offerRoom(
        offer,
        stock.byOffer.get(offer.id) ?? [],
        stock.photoMap.get(offer.id) ?? [],
        stay,
      ),
    )
    .filter((room): room is NonNullable<typeof room> => Boolean(room));
  const open = new Map<string, number>();
  if (stay) {
    await releaseExpiredHolds();
    await Promise.all(
      rooms.map(async (room) => {
        open.set(room.id, await offerFree(room.id, stay.checkIn, stay.checkOut));
      }),
    );
  }
  return hotels
    .map((hotel) => ({
      ...hotel,
      rooms: rooms
        .filter((room) => room.hotelId === hotel.id)
        .map((room) => ({ ...room, open: stay ? (open.get(room.id) ?? 0) : null }))
        .filter((room) => {
          if (options?.requirePrice && room.publicPricePerNight == null) return false;
          if (!stay || room.open == null) return true;
          if (options?.keepWhenFull) return true;
          if (room.open > 0) return true;
          if (options?.hideWhenFull) return false;
          return room.saleMode === "request";
        }),
    }))
    .filter((hotel) => hotel.rooms.length > 0 || !stay);
}

export async function listShowcase(stay: { checkIn: string; checkOut: string }) {
  const hotels = await hotelsWithOffers(stay);
  return hotels.filter((hotel) => hotel.rooms.length > 0);
}

export async function listAgencyCatalog(
  stay: { checkIn: string; checkOut: string } | null,
) {
  const hotels = await hotelsWithOffers(stay, { keepWhenFull: true });
  if (!stay) return hotels;
  return hotels.filter((hotel) => hotel.rooms.length > 0);
}

export async function listPublicStay(stay: { checkIn: string; checkOut: string }) {
  const hotels = await hotelsWithOffers(stay, { requirePrice: true });
  return hotels
    .filter((hotel) => hotel.rooms.length > 0)
    .map((hotel) => ({
      ...hotel,
      rooms: hotel.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        description: room.description,
        capacity: room.capacity,
        board: room.board,
        view: room.view,
        typeDescription: room.typeDescription,
        checkIn: room.checkIn,
        checkOut: room.checkOut,
        publicPricePerNight: room.publicPricePerNight ?? 0,
        photos: room.photos,
        saleMode: room.saleMode,
        open: room.open,
      })),
    }));
}

export async function getShowcaseHotel(
  id: string,
  stay: { checkIn: string; checkOut: string },
) {
  const hotels = await hotelsWithOffers(stay, { keepWhenFull: true });
  return hotels.find((hotel) => hotel.id === id) ?? null;
}

export async function listAssignments() {
  const rows = await query<{
    id: string;
    room_id: string;
    agency_id: string;
    quantity: number;
    check_in: string;
    check_out: string;
    cost_per_night: number;
    agency_price_per_night: number;
    notes: string;
    created_at: string;
    allotment_id: string | null;
    agency_name: string;
    hotel_name: string;
    room_name: string;
  }>(
    `SELECT a.*, g.name AS agency_name, h.name AS hotel_name, r.name AS room_name
     FROM assignments a
     JOIN agencies g ON g.id = a.agency_id
     JOIN rooms r ON r.id = a.room_id
     JOIN hotels h ON h.id = r.hotel_id
     ORDER BY a.check_in DESC, a.created_at DESC`,
  );

  return rows.map((row) => ({
    id: row.id,
    roomId: row.room_id,
    agencyId: row.agency_id,
    agencyName: row.agency_name,
    hotelName: row.hotel_name,
    roomName: row.room_name,
    quantity: Number(row.quantity),
    checkIn: row.check_in,
    checkOut: row.check_out,
    costPerNight: Number(row.cost_per_night),
    agencyPricePerNight: Number(row.agency_price_per_night),
    notes: row.notes,
    createdAt: row.created_at,
    allotmentId: row.allotment_id,
  }));
}

export function assignmentValue(assignment: Assignment) {
  const nights = nightsBetween(assignment.checkIn, assignment.checkOut);
  return {
    nights,
    cost: assignment.costPerNight * nights * assignment.quantity,
    revenue: assignment.agencyPricePerNight * nights * assignment.quantity,
    margin:
      (assignment.agencyPricePerNight - assignment.costPerNight) *
      nights *
      assignment.quantity,
  };
}

export async function inventoryStats() {
  const [hotels, rooms, assignments] = await Promise.all([
    listHotels(),
    listRooms(),
    listAssignments(),
  ]);
  const today = todayInRiyadh();
  const tomorrow = nextDay(today);
  const dated = rooms.filter(roomHasPeriod);
  const [open, held, drafts] = await Promise.all([
    Promise.all(dated.map((room) => openQuantity(room, today))),
    Promise.all(dated.map((room) => heldQuantity(room, today, tomorrow))),
    query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM purchases WHERE status = 'draft'",
    ),
  ]);
  const active = assignments.filter(
    (assignment) => assignment.checkIn <= today && assignment.checkOut > today,
  );

  return {
    hotels: hotels.length,
    rooms: dated.length,
    units: held.reduce((sum, quantity) => sum + quantity, 0),
    openUnits: open.reduce((sum, quantity) => sum + quantity, 0),
    activeAssignments: active.length,
    draftPurchases: Number(drafts[0]?.count ?? 0),
  };
}

export async function createHotel(
  input: Omit<Hotel, "id" | "createdAt" | "photos">,
) {
  const id = crypto.randomUUID();
  await execute(
    `INSERT INTO hotels
      (id, name, city, address, description, stars, distance_to_haram, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.city,
      input.address,
      input.description,
      input.stars,
      input.distanceToHaram,
      new Date().toISOString(),
    ],
  );
  return id;
}

export async function updateHotel(
  id: string,
  input: Omit<Hotel, "id" | "createdAt" | "photos">,
) {
  await execute(
    `UPDATE hotels
     SET name = ?, city = ?, address = ?, description = ?, stars = ?, distance_to_haram = ?
     WHERE id = ?`,
    [
      input.name,
      input.city,
      input.address,
      input.description,
      input.stars,
      input.distanceToHaram,
      id,
    ],
  );
}

export async function deleteHotel(id: string) {
  const hotel = await getHotel(id);
  const rooms = await listRooms(id);
  if (!hotel) return;
  await execute(
    "DELETE FROM assignments WHERE room_id IN (SELECT id FROM rooms WHERE hotel_id = ?)",
    [id],
  );
  await execute(
    `WITH removed AS (
       DELETE FROM allotment_lines
       WHERE room_id IN (SELECT id FROM rooms WHERE hotel_id = ?)
       RETURNING allotment_id
     )
     DELETE FROM allotments a
     WHERE a.id IN (SELECT allotment_id FROM removed)
       AND NOT EXISTS (
         SELECT 1 FROM allotment_lines l WHERE l.allotment_id = a.id
       )`,
    [id],
  );
  await execute(
    "DELETE FROM purchase_lines WHERE purchase_id IN (SELECT id FROM purchases WHERE hotel_id = ?)",
    [id],
  );
  await execute("DELETE FROM purchases WHERE hotel_id = ?", [id]);
  await execute(
    "DELETE FROM room_photos WHERE room_id IN (SELECT id FROM rooms WHERE hotel_id = ?)",
    [id],
  );
  await execute("DELETE FROM rooms WHERE hotel_id = ?", [id]);
  await execute("DELETE FROM hotel_photos WHERE hotel_id = ?", [id]);
  await execute("DELETE FROM hotels WHERE id = ?", [id]);
  await removeImages([
    ...hotel.photos,
    ...rooms.flatMap((room) => room.photos),
  ]);
}

export async function listHotelPhotos(hotelId: string) {
  return query<{ id: string; url: string }>(
    "SELECT id, url FROM hotel_photos WHERE hotel_id = ? ORDER BY sort_order, id",
    [hotelId],
  );
}

export async function addHotelPhoto(hotelId: string, file: File) {
  const url = await saveImage(file, `hotels/${hotelId}`);
  try {
    await execute(
      `INSERT INTO hotel_photos (id, hotel_id, url, sort_order, content_type)
       VALUES (?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), hotelId, url, Date.now(), file.type],
    );
  } catch (error) {
    await removeImages([url]);
    throw error;
  }
}

export async function deleteHotelPhoto(photoId: string) {
  const rows = await query<{ url: string }>(
    "SELECT url FROM hotel_photos WHERE id = ?",
    [photoId],
  );
  await execute("DELETE FROM hotel_photos WHERE id = ?", [photoId]);
  if (rows[0]) await removeImages([rows[0].url]);
}

export async function createRoom(
  input: Omit<Room, "id" | "createdAt" | "photos" | "board" | "view" | "typeDescription">,
) {
  const id = crypto.randomUUID();
  await execute(
    `INSERT INTO rooms
      (id, hotel_id, room_type_id, name, room_type, description, capacity, quantity, cost_per_night, public_price_per_night, created_at, check_in, check_out)
     VALUES (?, ?, ?, ?, lower(btrim(?)), ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.hotelId,
      input.roomTypeId,
      input.name,
      input.name,
      input.description,
      input.capacity,
      input.quantity,
      input.costPerNight,
      input.publicPricePerNight,
      new Date().toISOString(),
      input.checkIn,
      input.checkOut,
    ],
  );
  return id;
}

export async function updateActivePurchaseCosts(
  roomId: string,
  costPerNight: number,
  day = todayInRiyadh(),
) {
  await execute(
    `UPDATE purchase_lines AS line
     SET cost_per_night = ?
     FROM purchases AS purchase
     WHERE line.purchase_id = purchase.id
       AND line.room_id = ?
       AND purchase.status = 'confirmed'
       AND line.check_out > ?`,
    [costPerNight, roomId, day],
  );
}

export async function saveRoomStay(
  roomId: string,
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
) {
  const room = await getRoom(roomId);
  const type = await getRoomType(roomTypeId);
  if (!room || !type) return { ok: false as const, error: "invalid" as const };
  const period = purchasePeriodError(checkIn, checkOut);
  if (period) return { ok: false as const, error: period };

  const clash = await query<{ id: string }>(
    `SELECT id FROM rooms
     WHERE hotel_id = ?
       AND id <> ?
       AND room_type_id = ?
       AND check_in = ?
       AND check_out = ?
     LIMIT 1`,
    [room.hotelId, roomId, type.id, checkIn, checkOut],
  );
  if (clash[0]) return { ok: false as const, error: "duplicate" as const };

  const outside = await query<{ count: number }>(
    `SELECT (
       COALESCE((
         SELECT COUNT(*)
         FROM assignments
         WHERE room_id = ?
           AND (check_in < ? OR check_out > ?)
       ), 0)
       + COALESCE((
         SELECT COUNT(*)
         FROM bookings
         WHERE room_id = ?
           AND (check_in < ? OR check_out > ?)
           AND (
             status = 'confirmed'
             OR (status = 'pending' AND hold_until::timestamptz > NOW())
           )
       ), 0)
       + COALESCE((
         SELECT COUNT(*)
         FROM allotment_lines l
         JOIN allotments a ON a.id = l.allotment_id
         WHERE l.room_id = ?
           AND a.status = 'request'
           AND (a.check_in < ? OR a.check_out > ?)
       ), 0)
     )::int AS count`,
    [
      roomId,
      checkIn,
      checkOut,
      roomId,
      checkIn,
      checkOut,
      roomId,
      checkIn,
      checkOut,
    ],
  );
  if (Number(outside[0]?.count ?? 0) > 0) {
    return { ok: false as const, error: "dates-sold" as const };
  }

  await execute(
    `UPDATE rooms
     SET name = ?, room_type = lower(btrim(?)), room_type_id = ?, capacity = ?,
         check_in = ?, check_out = ?
     WHERE id = ?`,
    [type.name, type.name, type.id, type.guests, checkIn, checkOut, roomId],
  );
  await execute(
    `UPDATE purchase_lines AS line
     SET room_name = ?, room_type_id = ?, check_in = ?, check_out = ?
     FROM purchases AS purchase
     WHERE line.purchase_id = purchase.id
       AND line.room_id = ?
       AND purchase.status = 'confirmed'`,
    [type.name, type.id, checkIn, checkOut, roomId],
  );
  const purchases = await query<{ purchase_id: string }>(
    "SELECT DISTINCT purchase_id FROM purchase_lines WHERE room_id = ?",
    [roomId],
  );
  for (const purchase of purchases) {
    await execute(
      `UPDATE purchases
       SET check_in = (SELECT MIN(check_in) FROM purchase_lines WHERE purchase_id = ?),
           check_out = (SELECT MAX(check_out) FROM purchase_lines WHERE purchase_id = ?)
       WHERE id = ?`,
      [purchase.purchase_id, purchase.purchase_id, purchase.purchase_id],
    );
  }
  return { ok: true as const };
}

export async function updateRoom(
  id: string,
  input: Omit<Room, "id" | "hotelId" | "createdAt" | "photos" | "board" | "view" | "typeDescription">,
) {
  await execute(
    `UPDATE rooms
     SET room_type_id = ?, name = ?, room_type = lower(btrim(?)), description = ?, capacity = ?, quantity = ?, cost_per_night = ?, public_price_per_night = ?, check_in = ?, check_out = ?
     WHERE id = ?`,
    [
      input.roomTypeId,
      input.name,
      input.name,
      input.description,
      input.capacity,
      input.quantity,
      input.costPerNight,
      input.publicPricePerNight,
      input.checkIn,
      input.checkOut,
      id,
    ],
  );
}

export async function roomHasPurchaseLines(roomId: string) {
  const rows = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM purchase_lines WHERE room_id = ?",
    [roomId],
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

export async function roomIsPurchased(roomId: string) {
  const rows = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM purchase_lines pl
     JOIN purchases p ON p.id = pl.purchase_id
     WHERE pl.room_id = ? AND p.status = 'confirmed'`,
    [roomId],
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

export async function deleteRoom(id: string) {
  const room = await getRoom(id);
  if (!room) return false;
  if (await roomIsPurchased(id)) return "purchased" as const;
  const allotted = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM allotment_lines WHERE room_id = ?",
    [id],
  );
  if (Number(allotted[0]?.count ?? 0) > 0) return "allotted" as const;
  const booked = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM bookings WHERE room_id = ?",
    [id],
  );
  if (Number(booked[0]?.count ?? 0) > 0) return "booked" as const;
  await execute("UPDATE purchase_lines SET room_id = NULL WHERE room_id = ?", [
    id,
  ]);
  await execute("DELETE FROM assignments WHERE room_id = ?", [id]);
  await execute("DELETE FROM room_photos WHERE room_id = ?", [id]);
  await execute("DELETE FROM rooms WHERE id = ?", [id]);
  await removeImages(room.photos);
  return true as const;
}

export async function listRoomPhotos(roomId: string) {
  return query<{ id: string; url: string }>(
    "SELECT id, url FROM room_photos WHERE room_id = ? ORDER BY sort_order, id",
    [roomId],
  );
}

export async function addRoomPhoto(roomId: string, file: File) {
  const url = await saveImage(file, `rooms/${roomId}`);
  try {
    await execute(
      `INSERT INTO room_photos (id, room_id, url, sort_order, content_type)
       VALUES (?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), roomId, url, Date.now(), file.type],
    );
  } catch (error) {
    await removeImages([url]);
    throw error;
  }
}

export async function deleteRoomPhoto(photoId: string) {
  const rows = await query<{ url: string }>(
    "SELECT url FROM room_photos WHERE id = ?",
    [photoId],
  );
  await execute("DELETE FROM room_photos WHERE id = ?", [photoId]);
  if (rows[0]) await removeImages([rows[0].url]);
}

export async function getStoredPhoto(kind: "hotels" | "rooms", id: string) {
  const table = kind === "hotels" ? "hotel_photos" : "room_photos";
  const rows = await query<{ content_type: string; bytes: Uint8Array | null }>(
    `SELECT content_type, bytes FROM ${table} WHERE id = ?`,
    [id],
  );
  const photo = rows[0];
  const bytes = photo?.bytes;
  if (!bytes) return null;
  const body = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return { contentType: photo.content_type, bytes: body };
}

export async function createAgency(input: Omit<Agency, "id" | "createdAt">) {
  const id = crypto.randomUUID();
  await execute(
    `INSERT INTO agencies
      (id, name, kind, country, contact_name, email, phone,
       commercial_registration, vat_number, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.kind,
      input.country,
      input.kind === "individual" ? "" : input.contactName,
      input.email,
      input.phone,
      input.kind === "individual" ? "" : input.commercialRegistration,
      input.kind === "individual" ? "" : input.vatNumber,
      new Date().toISOString(),
    ],
  );
  return id;
}

export async function updateAgency(
  id: string,
  input: Omit<Agency, "id" | "createdAt">,
) {
  await execute(
    `UPDATE agencies
     SET name = ?, kind = ?, country = ?, contact_name = ?, email = ?, phone = ?,
         commercial_registration = ?, vat_number = ?
     WHERE id = ?`,
    [
      input.name,
      input.kind,
      input.country,
      input.kind === "individual" ? "" : input.contactName,
      input.email,
      input.phone,
      input.kind === "individual" ? "" : input.commercialRegistration,
      input.kind === "individual" ? "" : input.vatNumber,
      id,
    ],
  );
}

export async function createAssignment(input: {
  roomId: string;
  agencyId: string;
  quantity: number;
  checkIn: string;
  checkOut: string;
  costPerNight: number;
  agencyPricePerNight: number;
  notes: string;
}) {
  const room = await getRoom(input.roomId);
  if (!room) return { ok: false as const, error: "missing-room" };
  if (nightsBetween(input.checkIn, input.checkOut) < 1) {
    return { ok: false as const, error: "dates" };
  }
  if (
    room.checkIn &&
    room.checkOut &&
    !stayInside(input.checkIn, input.checkOut, room.checkIn, room.checkOut)
  ) {
    return { ok: false as const, error: "window" };
  }

  const [reserved, held] = await Promise.all([
    reservedQuantity(input.roomId, input.checkIn, input.checkOut),
    heldQuantity(room, input.checkIn, input.checkOut),
  ]);
  if (input.quantity < 1 || reserved + input.quantity > held) {
    return {
      ok: false as const,
      error: "quantity",
      remaining: Math.max(0, held - reserved),
    };
  }

  await execute(
    `INSERT INTO assignments
      (id, room_id, agency_id, quantity, check_in, check_out, cost_per_night, agency_price_per_night, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      input.roomId,
      input.agencyId,
      input.quantity,
      input.checkIn,
      input.checkOut,
      input.costPerNight,
      input.agencyPricePerNight,
      input.notes,
      new Date().toISOString(),
    ],
  );
  return { ok: true as const };
}

export async function deleteAssignment(id: string) {
  await execute("DELETE FROM assignments WHERE id = ?", [id]);
}

const maxPurchaseNights = 1095;

type PurchaseRow = {
  id: string;
  number: string;
  hotel_id: string;
  hotel_name: string;
  hotel_city: string;
  status: string;
  check_in: string;
  check_out: string;
  notes: string;
  created_at: string;
  confirmed_at: string | null;
};

type PurchaseLineRow = {
  id: string;
  purchase_id: string;
  room_type_id: string | null;
  room_name: string;
  description: string;
  capacity: number;
  quantity: number;
  cost_per_night: number;
  public_price_per_night: number | null;
  check_in: string;
  check_out: string;
  room_id: string | null;
  offer_id: string | null;
  board: string | null;
  view: string | null;
  min_nights: number | null;
  sale_mode: string | null;
};

function asStatus(value: string): PurchaseStatus {
  return purchaseStatuses.includes(value as PurchaseStatus)
    ? (value as PurchaseStatus)
    : "draft";
}

function mapLine(row: PurchaseLineRow): PurchaseLine {
  return {
    id: row.id,
    purchaseId: row.purchase_id,
    roomTypeId: row.room_type_id,
    roomName: row.room_name,
    description: row.description,
    capacity: Number(row.capacity),
    quantity: Number(row.quantity),
    costPerNight: Number(row.cost_per_night),
    publicPricePerNight:
      row.public_price_per_night == null
        ? null
        : Number(row.public_price_per_night),
    checkIn: row.check_in,
    checkOut: row.check_out,
    roomId: row.room_id,
    offerId: row.offer_id,
    board: mealPlanCode(row.board ?? "") ?? "room_only",
    view: row.view ?? "",
    minNights: Number(row.min_nights ?? 1) || 1,
    saleMode: saleModeCode(row.sale_mode ?? "") ?? "book",
  };
}

function mapPurchase(row: PurchaseRow, lines: PurchaseLine[]): Purchase {
  return {
    id: row.id,
    number: row.number,
    hotelId: row.hotel_id,
    hotelName: row.hotel_name,
    hotelCity: asCity(row.hotel_city),
    status: asStatus(row.status),
    checkIn: row.check_in,
    checkOut: row.check_out,
    notes: row.notes,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    lines,
  };
}

async function purchaseLinesByOwner() {
  const rows = await query<PurchaseLineRow>(
    "SELECT * FROM purchase_lines ORDER BY sort_order, id",
  );
  const grouped = new Map<string, PurchaseLine[]>();
  for (const row of rows) {
    const line = mapLine(row);
    grouped.set(line.purchaseId, [...(grouped.get(line.purchaseId) ?? []), line]);
  }
  return grouped;
}

export function purchaseSpan(
  lines: Array<{ checkIn: string; checkOut: string }>,
) {
  if (!lines.length) return null;
  let checkIn = lines[0].checkIn;
  let checkOut = lines[0].checkOut;
  for (const line of lines) {
    if (line.checkIn < checkIn) checkIn = line.checkIn;
    if (line.checkOut > checkOut) checkOut = line.checkOut;
  }
  return { checkIn, checkOut };
}

export function purchasePeriod(
  lines: Array<{ checkIn: string; checkOut: string }>,
) {
  const span = purchaseSpan(lines);
  return span ? `${span.checkIn} → ${span.checkOut}` : "—";
}

export function purchaseAmount(purchase: { lines: PurchaseLine[] }) {
  return purchase.lines.reduce((sum, line) => {
    const nights = Math.max(0, nightsBetween(line.checkIn, line.checkOut));
    return sum + line.costPerNight * line.quantity * nights;
  }, 0);
}

export async function listPurchases(filter?: {
  hotelId?: string;
  status?: PurchaseStatus;
}) {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter?.hotelId) {
    where.push("p.hotel_id = ?");
    args.push(filter.hotelId);
  }
  if (filter?.status) {
    where.push("p.status = ?");
    args.push(filter.status);
  }
  const [rows, lines] = await Promise.all([
    query<PurchaseRow>(
      `SELECT p.*, h.name AS hotel_name, h.city AS hotel_city
       FROM purchases p
       JOIN hotels h ON h.id = p.hotel_id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY p.created_at DESC`,
      args,
    ),
    purchaseLinesByOwner(),
  ]);
  return rows.map((row) => mapPurchase(row, lines.get(row.id) ?? []));
}

export async function getPurchase(id: string) {
  const rows = await query<PurchaseRow>(
    `SELECT p.*, h.name AS hotel_name, h.city AS hotel_city
     FROM purchases p
     JOIN hotels h ON h.id = p.hotel_id
     WHERE p.id = ?`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  const lines = await query<PurchaseLineRow>(
    "SELECT * FROM purchase_lines WHERE purchase_id = ? ORDER BY sort_order, id",
    [id],
  );
  return mapPurchase(row, lines.map(mapLine));
}

export async function listRoomPurchases(roomId: string) {
  const rows = await query<
    PurchaseRow & {
      line_id: string;
      line_quantity: number;
      line_cost: number;
      line_name: string;
      line_check_in: string;
      line_check_out: string;
    }
  >(
    `SELECT p.*, h.name AS hotel_name, h.city AS hotel_city,
            pl.id AS line_id, pl.quantity AS line_quantity,
            pl.cost_per_night AS line_cost, pl.room_name AS line_name,
            pl.check_in AS line_check_in, pl.check_out AS line_check_out
     FROM purchase_lines pl
     JOIN purchases p ON p.id = pl.purchase_id
     JOIN hotels h ON h.id = p.hotel_id
     WHERE pl.room_id = ?
     ORDER BY pl.check_in DESC, p.created_at DESC`,
    [roomId],
  );
  return rows.map((row) => ({
    lineId: row.line_id,
    id: row.id,
    number: row.number,
    status: asStatus(row.status),
    checkIn: row.line_check_in,
    checkOut: row.line_check_out,
    roomName: row.line_name,
    quantity: Number(row.line_quantity),
    costPerNight: Number(row.line_cost),
  }));
}

function purchasePeriodError(checkIn: string, checkOut: string) {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return "dates" as const;
  if (nights > maxPurchaseNights) return "span" as const;
  return null;
}

async function nextPurchaseNumber(sql: Pick<SqlClient, "query">) {
  const rows = await sql.query<{ number: string }>(
    `SELECT number FROM purchases
     WHERE number ~ '^P[0-9]+$'
     ORDER BY number DESC
     LIMIT 1`,
  );
  const current = Number(rows[0]?.number?.slice(1) ?? 0);
  return `P${String(current + 1).padStart(5, "0")}`;
}

async function insertPurchaseLines(
  sql: Pick<SqlClient, "execute">,
  purchaseId: string,
  lines: PurchaseLineInput[],
) {
  for (const [index, line] of lines.entries()) {
    await sql.execute(
      `INSERT INTO purchase_lines
        (id, purchase_id, room_type_id, room_name, description, capacity, quantity, cost_per_night, public_price_per_night, sort_order, check_in, check_out, board, view, min_nights, sale_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        purchaseId,
        line.roomTypeId,
        line.roomName,
        line.description,
        line.capacity,
        line.quantity,
        line.costPerNight,
        line.publicPricePerNight,
        index,
        line.checkIn,
        line.checkOut,
        line.board,
        line.view,
        line.minNights,
        line.saleMode,
      ],
    );
  }
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function headerDates(lines: Array<{ checkIn: string; checkOut: string }>) {
  const span = purchaseSpan(lines);
  if (span) return span;
  const checkIn = todayInRiyadh();
  return { checkIn, checkOut: nextDay(checkIn) };
}

export async function savePurchase(input: {
  id?: string | null;
  hotelId: string;
  notes: string;
  lines: PurchaseLineInput[];
}) {
  for (const line of input.lines) {
    const period = purchasePeriodError(line.checkIn, line.checkOut);
    if (period) return { ok: false as const, error: period };
  }
  if (!(await getHotel(input.hotelId))) {
    return { ok: false as const, error: "invalid" as const };
  }
  const { checkIn, checkOut } = headerDates(input.lines);

  if (input.id) {
    const existing = await getPurchase(input.id);
    if (!existing || existing.status !== "draft") {
      return { ok: false as const, error: "purchase" as const };
    }
    const purchaseId = input.id;
    await transaction(async (sql) => {
      await sql.execute(
        `UPDATE purchases
         SET hotel_id = ?, check_in = ?, check_out = ?, notes = ?
         WHERE id = ? AND status = 'draft'`,
        [input.hotelId, checkIn, checkOut, input.notes, purchaseId],
      );
      await sql.execute("DELETE FROM purchase_lines WHERE purchase_id = ?", [
        purchaseId,
      ]);
      await insertPurchaseLines(sql, purchaseId, input.lines);
    });
    return { ok: true as const, id: purchaseId };
  }

  const id = crypto.randomUUID();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await transaction(async (sql) => {
        const number = await nextPurchaseNumber(sql);
        await sql.execute(
          `INSERT INTO purchases
            (id, number, hotel_id, status, check_in, check_out, notes, created_at)
           VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)`,
          [
            id,
            number,
            input.hotelId,
            checkIn,
            checkOut,
            input.notes,
            new Date().toISOString(),
          ],
        );
        await insertPurchaseLines(sql, id, input.lines);
      });
      return { ok: true as const, id };
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 2) continue;
      throw error;
    }
  }
  return { ok: false as const, error: "purchase" as const };
}

async function ensureOffer(
  sql: SqlClient,
  input: { hotelId: string; roomTypeId: string; board: string; view: string },
) {
  const view = input.view.trim().slice(0, 80);
  const existing = await sql.query<{ id: string }>(
    `SELECT id FROM offers
     WHERE hotel_id = ? AND room_type_id = ? AND board = ? AND view = ?
     LIMIT 1`,
    [input.hotelId, input.roomTypeId, input.board, view],
  );
  if (existing[0]) return existing[0].id;
  const id = crypto.randomUUID();
  await sql.execute(
    `INSERT INTO offers (id, hotel_id, room_type_id, board, view, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.hotelId, input.roomTypeId, input.board, view, new Date().toISOString()],
  );
  return id;
}

export async function confirmPurchase(id: string) {
  const purchase = await getPurchase(id);
  if (!purchase || purchase.status !== "draft") {
    return { ok: false as const, error: "purchase" as const };
  }
  if (!purchase.lines.length) return { ok: false as const, error: "lines" as const };
  for (const line of purchase.lines) {
    if (!line.roomTypeId) return { ok: false as const, error: "lines" as const };
    const period = purchasePeriodError(line.checkIn, line.checkOut);
    if (period) return { ok: false as const, error: period };
  }

  await transaction(async (sql) => {
    for (const line of purchase.lines) {
      const offerId = await ensureOffer(sql, {
        hotelId: purchase.hotelId,
        roomTypeId: line.roomTypeId ?? "",
        board: line.board,
        view: line.view,
      });
      await sql.execute(
        `UPDATE purchase_lines
         SET offer_id = ?, board = ?, view = ?, min_nights = ?, sale_mode = ?
         WHERE id = ?`,
        [offerId, line.board, line.view, line.minNights, line.saleMode, line.id],
      );
    }
    await sql.execute(
      `UPDATE purchases SET status = 'confirmed', confirmed_at = ? WHERE id = ? AND status = 'draft'`,
      [new Date().toISOString(), id],
    );
  });

  return { ok: true as const };
}

export async function cancelPurchase(id: string) {
  const purchase = await getPurchase(id);
  if (!purchase || purchase.status !== "confirmed") {
    return { ok: false as const, error: "purchase" as const };
  }

  for (const line of purchase.lines) {
    const sold = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM allotment_lines AS sale
       JOIN allotments AS allotment ON allotment.id = sale.allotment_id
       WHERE allotment.status IN ('provisional', 'confirmed')
         AND (
           sale.purchase_line_id = ?
           OR (sale.purchase_line_id IS NULL AND sale.offer_id = ?)
         )
         AND allotment.check_in < ?
         AND allotment.check_out > ?`,
      [line.id, line.offerId, line.checkOut, line.checkIn],
    );
    if (Number(sold[0]?.count ?? 0) > 0) {
      return { ok: false as const, error: "cancel" as const };
    }
  }

  await execute("UPDATE purchases SET status = 'cancelled' WHERE id = ?", [id]);
  return { ok: true as const };
}

async function removeRoomWithoutPurchase(sql: SqlClient, roomId: string) {
  const room = await sql.query<{
    check_in: string | null;
    check_out: string | null;
  }>("SELECT check_in, check_out FROM rooms WHERE id = ? FOR UPDATE", [roomId]);
  if (!room[0]?.check_in || !room[0]?.check_out) return [];

  const linked = await sql.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM purchase_lines WHERE room_id = ?",
    [roomId],
  );
  if (Number(linked[0]?.count ?? 0) > 0) return [];

  const blockers = await sql.query<{ count: number }>(
    `SELECT
       (SELECT COUNT(*)::int FROM allotment_lines WHERE room_id = ?)
       + (SELECT COUNT(*)::int FROM assignments WHERE room_id = ?)
       + (SELECT COUNT(*)::int FROM bookings WHERE room_id = ? AND status <> 'cancelled')
       AS count`,
    [roomId, roomId, roomId],
  );
  if (Number(blockers[0]?.count ?? 0) > 0) return [];

  const photos = await sql.query<{ url: string }>(
    "SELECT url FROM room_photos WHERE room_id = ?",
    [roomId],
  );
  await sql.execute(
    "DELETE FROM bookings WHERE room_id = ? AND status = 'cancelled'",
    [roomId],
  );
  await sql.execute("DELETE FROM room_photos WHERE room_id = ?", [roomId]);
  await sql.execute("DELETE FROM rooms WHERE id = ?", [roomId]);
  return photos.map((photo) => photo.url);
}

export async function sweepRoomsWithoutPurchases() {
  const rows = await query<{ id: string }>(
    `SELECT id FROM rooms
     WHERE check_in IS NOT NULL
       AND check_out IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM purchase_lines WHERE room_id = rooms.id
       )`,
  );
  const urls: string[] = [];
  for (const row of rows) {
    urls.push(
      ...(await transaction((sql) => removeRoomWithoutPurchase(sql, row.id))),
    );
  }
  await removeImages(urls);
}

export async function deletePurchase(id: string) {
  const purchase = await getPurchase(id);
  if (!purchase || (purchase.status !== "draft" && purchase.status !== "cancelled")) {
    return false;
  }
  const roomIds = [
    ...new Set(
      purchase.lines
        .map((line) => line.roomId)
        .filter((roomId): roomId is string => Boolean(roomId)),
    ),
  ];
  const urls = await transaction(async (sql) => {
    await sql.execute("DELETE FROM purchase_lines WHERE purchase_id = ?", [id]);
    const removed = await sql.query<{ id: string }>(
      "DELETE FROM purchases WHERE id = ? AND status IN ('draft', 'cancelled') RETURNING id",
      [id],
    );
    if (!removed[0]) return [];
    const photoUrls: string[] = [];
    for (const roomId of roomIds) {
      photoUrls.push(...(await removeRoomWithoutPurchase(sql, roomId)));
    }
    return photoUrls;
  });
  await removeImages(urls);
  return true;
}

export async function costForStay(room: Room, day = todayInRiyadh()) {
  const rows = await query<{ cost: number }>(
    `SELECT pl.cost_per_night AS cost
     FROM purchase_lines pl
     JOIN purchases p ON p.id = pl.purchase_id
     WHERE pl.room_id = ?
       AND p.status = 'confirmed'
       AND pl.check_in <= ?
       AND pl.check_out > ?
     ORDER BY p.confirmed_at DESC NULLS LAST
     LIMIT 1`,
    [room.id, day, day],
  );
  if (rows[0]) return Number(rows[0].cost);
  return room.costPerNight;
}

const maxAllotmentNights = 1095;

export function allotmentValue(allotment: {
  checkIn: string;
  checkOut: string;
  lines: Array<{
    quantity: number;
    costPerNight: number;
    agencyPricePerNight: number;
  }>;
}) {
  const nights = Math.max(0, nightsBetween(allotment.checkIn, allotment.checkOut));
  let cost = 0;
  let revenue = 0;
  let rooms = 0;
  for (const line of allotment.lines) {
    rooms += line.quantity;
    cost += line.costPerNight * nights * line.quantity;
    revenue += line.agencyPricePerNight * nights * line.quantity;
  }
  return { nights, rooms, cost, revenue, margin: revenue - cost };
}

export async function listAllotmentRooms() {
  const rows = await query<{
    id: string;
    name: string;
    hotel_name: string;
    cost_per_night: number;
    check_in: string;
    check_out: string;
    board: string;
    view: string;
    offer_id: string | null;
  }>(
    `SELECT line.id, type.name, line.cost_per_night, line.check_in, line.check_out,
            line.board, line.view, line.offer_id, hotel.name AS hotel_name
     FROM purchase_lines AS line
     JOIN purchases AS purchase ON purchase.id = line.purchase_id
     JOIN hotels AS hotel ON hotel.id = purchase.hotel_id
     JOIN room_types AS type ON type.id = line.room_type_id
     WHERE purchase.status = 'confirmed'
     ORDER BY hotel.name, type.name, line.check_in`,
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    hotelName: row.hotel_name,
    costPerNight: Number(row.cost_per_night),
    checkIn: row.check_in,
    checkOut: row.check_out,
    board: mealPlanCode(row.board) ?? "room_only",
    view: row.view ?? "",
    offerId: row.offer_id,
  }));
}

type AllotmentRow = {
  id: string;
  number: string;
  agency_id: string;
  agency_name: string;
  status: string;
  channel: string | null;
  booking_id: string | null;
  submission_id: string | null;
  check_in: string;
  check_out: string;
  notes: string;
  created_at: string;
  confirmed_at: string | null;
};

type AllotmentLineRow = {
  id: string;
  allotment_id: string;
  room_id: string | null;
  offer_id: string | null;
  purchase_line_id: string | null;
  hotel_name: string | null;
  room_name: string | null;
  room_check_in: string | null;
  room_check_out: string | null;
  quantity: number;
  cost_per_night: number;
  agency_price_per_night: number;
};

function asAllotmentStatus(value: string): AllotmentStatus {
  if (value === "draft") return "request";
  return allotmentStatuses.includes(value as AllotmentStatus)
    ? (value as AllotmentStatus)
    : "request";
}

function asSaleChannel(value: string | null): SaleChannel {
  return saleChannels.includes(value as SaleChannel)
    ? (value as SaleChannel)
    : "desk";
}

function mapAllotmentLine(row: AllotmentLineRow): AllotmentLine {
  return {
    id: row.id,
    allotmentId: row.allotment_id,
    roomId: row.room_id ?? "",
    offerId: row.offer_id,
    purchaseLineId: row.purchase_line_id,
    hotelName: row.hotel_name ?? "",
    roomName: row.room_name ?? "",
    roomCheckIn: row.room_check_in,
    roomCheckOut: row.room_check_out,
    quantity: Number(row.quantity),
    costPerNight: Number(row.cost_per_night),
    agencyPricePerNight: Number(row.agency_price_per_night),
  };
}

function mapAllotment(row: AllotmentRow, lines: AllotmentLine[]): Allotment {
  return {
    id: row.id,
    number: row.number,
    agencyId: row.agency_id,
    agencyName: row.agency_name,
    status: asAllotmentStatus(row.status),
    channel: asSaleChannel(row.channel),
    bookingId: row.booking_id,
    submissionId: row.submission_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    notes: row.notes,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    lines,
  };
}

async function allotmentLines(allotmentId?: string) {
  const rows = await query<AllotmentLineRow>(
    `SELECT l.id, l.allotment_id, l.room_id, l.offer_id, l.purchase_line_id,
            l.quantity, l.cost_per_night, l.agency_price_per_night,
            COALESCE(hotel.name, room_hotel.name, '') AS hotel_name,
            COALESCE(type.name, room.name, '') AS room_name,
            COALESCE(contract.check_in, room.check_in) AS room_check_in,
            COALESCE(contract.check_out, room.check_out) AS room_check_out
     FROM allotment_lines l
     LEFT JOIN rooms room ON room.id = l.room_id
     LEFT JOIN hotels room_hotel ON room_hotel.id = room.hotel_id
     LEFT JOIN offers offer ON offer.id = COALESCE(l.offer_id, room.offer_id)
     LEFT JOIN room_types type ON type.id = offer.room_type_id
     LEFT JOIN hotels hotel ON hotel.id = offer.hotel_id
     LEFT JOIN purchase_lines contract ON contract.id = l.purchase_line_id
     ${allotmentId ? "WHERE l.allotment_id = ?" : ""}
     ORDER BY l.sort_order, l.id`,
    allotmentId ? [allotmentId] : [],
  );
  return rows.map(mapAllotmentLine);
}

export async function listAllotments(filter?: { status?: AllotmentStatus }) {
  const rows = await query<AllotmentRow>(
    `SELECT a.*, g.name AS agency_name
     FROM allotments a
     JOIN agencies g ON g.id = a.agency_id
     ${filter?.status ? "WHERE a.status = ?" : ""}
     ORDER BY a.created_at DESC`,
    filter?.status ? [filter.status] : [],
  );
  const lines = await allotmentLines();
  const grouped = new Map<string, AllotmentLine[]>();
  for (const line of lines) {
    grouped.set(line.allotmentId, [...(grouped.get(line.allotmentId) ?? []), line]);
  }
  return rows.map((row) => mapAllotment(row, grouped.get(row.id) ?? []));
}

export async function getAllotment(id: string) {
  const rows = await query<AllotmentRow>(
    `SELECT a.*, g.name AS agency_name
     FROM allotments a
     JOIN agencies g ON g.id = a.agency_id
     WHERE a.id = ?`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return mapAllotment(row, await allotmentLines(id));
}

function allotmentPeriodError(checkIn: string, checkOut: string) {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 1) return "dates" as const;
  if (nights > maxAllotmentNights) return "span" as const;
  return null;
}

async function allotmentWindowError(
  checkIn: string,
  checkOut: string,
  roomIds: string[],
) {
  const unique = [...new Set(roomIds)];
  if (!unique.length) {
    const covered = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM rooms
       WHERE check_in IS NOT NULL
         AND check_out IS NOT NULL
         AND check_in <= ?
         AND check_out >= ?`,
      [checkIn, checkOut],
    );
    return Number(covered[0]?.count ?? 0) > 0 ? null : ("window" as const);
  }

  const rows = await query<{
    id: string;
    check_in: string | null;
    check_out: string | null;
  }>(
    `SELECT id, check_in, check_out
     FROM rooms
     WHERE id IN (${unique.map(() => "?").join(", ")})`,
    unique,
  );
  if (rows.length !== unique.length) return "missing-room" as const;
  const outside = rows.some(
    (row) => !stayInside(checkIn, checkOut, row.check_in, row.check_out),
  );
  return outside ? ("window" as const) : null;
}

async function nextAllotmentNumber(sql: Pick<SqlClient, "query">) {
  const rows = await sql.query<{ number: string }>(
    `SELECT number FROM allotments
     WHERE number ~ '^A[0-9]+$'
     ORDER BY number DESC
     LIMIT 1`,
  );
  const current = Number(rows[0]?.number?.slice(1) ?? 0);
  return `A${String(current + 1).padStart(5, "0")}`;
}

export async function ensureIndividualAgency(
  sql: SqlClient,
  input: {
    name: string;
    email: string;
    phone: string;
    country: string;
    createdAt: string;
  },
) {
  const existing = await sql.query<{ id: string }>(
    `SELECT id FROM agencies
     WHERE kind = 'individual' AND lower(email) = lower(?)
     ORDER BY created_at
     LIMIT 1`,
    [input.email],
  );
  if (existing[0]) return existing[0].id;
  const id = crypto.randomUUID();
  await sql.execute(
    `INSERT INTO agencies
      (id, name, kind, country, contact_name, email, phone, created_at)
     VALUES (?, ?, 'individual', ?, '', ?, ?, ?)`,
    [
      id,
      input.name,
      input.country,
      input.email,
      input.phone,
      input.createdAt,
    ],
  );
  return id;
}

export async function insertWebsiteSale(
  sql: SqlClient,
  input: {
    channel: "b2c" | "b2b";
    agencyId: string;
    checkIn: string;
    checkOut: string;
    notes: string;
    createdAt: string;
    bookingId?: string | null;
    submissionId?: string | null;
    status?: AllotmentStatus;
    confirmedAt?: string | null;
    lines?: AllotmentLineInput[];
  },
) {
  const id = crypto.randomUUID();
  const number = await nextAllotmentNumber(sql);
  const status = input.status ?? "request";
  await sql.execute(
    `INSERT INTO allotments
      (id, number, agency_id, status, check_in, check_out, notes, created_at,
       confirmed_at, channel, booking_id, submission_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      number,
      input.agencyId,
      status,
      input.checkIn,
      input.checkOut,
      input.notes.slice(0, 2000),
      input.createdAt,
      status === "confirmed" ? (input.confirmedAt ?? input.createdAt) : null,
      input.channel,
      input.bookingId ?? null,
      input.submissionId ?? null,
    ],
  );
  if (input.lines?.length) await insertAllotmentLines(sql, id, input.lines);
  return id;
}

export async function mirrorBookingSale(
  bookingId: string,
  status: "confirmed" | "cancelled",
  sql?: Pick<SqlClient, "execute">,
) {
  const run = sql ? sql.execute.bind(sql) : execute;
  const confirmedAt = new Date().toISOString();
  await run(
    `UPDATE allotments
     SET status = ?,
         confirmed_at = CASE
           WHEN ? = 'confirmed' THEN COALESCE(confirmed_at, ?)
           ELSE confirmed_at
         END
     WHERE booking_id = ?`,
    [status, status, confirmedAt, bookingId],
  );
  if (status !== "cancelled") return;
  await run(
    `DELETE FROM assignments
     WHERE allotment_id IN (SELECT id FROM allotments WHERE booking_id = ?)`,
    [bookingId],
  );
  await run(
    `UPDATE allotment_lines
     SET assignment_id = NULL
     WHERE allotment_id IN (SELECT id FROM allotments WHERE booking_id = ?)`,
    [bookingId],
  );
}

export async function countWebsiteDraftSales() {
  const rows = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM allotments
     WHERE channel IN ('b2c', 'b2b') AND status IN ('request', 'provisional')`,
  );
  return Number(rows[0]?.count ?? 0);
}

export async function allotmentIdForBooking(bookingId: string) {
  const rows = await query<{ id: string }>(
    "SELECT id FROM allotments WHERE booking_id = ?",
    [bookingId],
  );
  return rows[0]?.id ?? null;
}

export async function allotmentIdForSubmission(submissionId: string) {
  const rows = await query<{ id: string }>(
    "SELECT id FROM allotments WHERE submission_id = ?",
    [submissionId],
  );
  return rows[0]?.id ?? null;
}

async function insertAllotmentLines(
  sql: Pick<SqlClient, "execute">,
  allotmentId: string,
  lines: AllotmentLineInput[],
) {
  for (const [index, line] of lines.entries()) {
    await sql.execute(
      `INSERT INTO allotment_lines
        (id, allotment_id, room_id, offer_id, purchase_line_id, quantity, cost_per_night, agency_price_per_night, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        allotmentId,
        line.roomId || null,
        line.offerId,
        line.purchaseLineId,
        line.quantity,
        line.costPerNight,
        line.agencyPricePerNight,
        index,
      ],
    );
  }
}

async function prepareSaleLines(
  lines: AllotmentLineInput[],
  checkIn: string,
  checkOut: string,
) {
  const ids = lines.map((line) => line.purchaseLineId).filter((id): id is string => Boolean(id));
  if (!ids.length || ids.length !== lines.length) {
    return { ok: false as const, error: "missing-room" as const };
  }
  const unique = [...new Set(ids)];
  const rows = await query<{
    id: string;
    offer_id: string | null;
    check_in: string;
    check_out: string;
    room_id: string | null;
  }>(
    `SELECT line.id, line.offer_id, line.check_in, line.check_out,
            (SELECT room.id FROM rooms AS room WHERE room.offer_id = line.offer_id LIMIT 1) AS room_id
     FROM purchase_lines AS line
     JOIN purchases AS purchase ON purchase.id = line.purchase_id
     WHERE purchase.status = 'confirmed'
       AND line.id IN (${unique.map(() => "?").join(", ")})`,
    unique,
  );
  if (rows.length !== unique.length) {
    return { ok: false as const, error: "missing-room" as const };
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  const prepared: AllotmentLineInput[] = [];
  for (const line of lines) {
    const contract = byId.get(line.purchaseLineId ?? "");
    if (!contract?.offer_id) {
      return { ok: false as const, error: "missing-room" as const };
    }
    if (checkIn < contract.check_in || checkOut > contract.check_out) {
      return { ok: false as const, error: "window" as const };
    }
    prepared.push({
      ...line,
      offerId: contract.offer_id,
      purchaseLineId: contract.id,
      roomId: contract.room_id ?? "",
    });
  }
  return { ok: true as const, lines: prepared };
}

export async function saveAllotment(input: {
  id?: string | null;
  agencyId: string;
  checkIn: string;
  checkOut: string;
  notes: string;
  lines: AllotmentLineInput[];
}) {
  const period = allotmentPeriodError(input.checkIn, input.checkOut);
  if (period) return { ok: false as const, error: period };
  const agency = await query<{ id: string }>(
    "SELECT id FROM agencies WHERE id = ?",
    [input.agencyId],
  );
  if (!agency[0]) return { ok: false as const, error: "agency" as const };

  const prepared = await prepareSaleLines(input.lines, input.checkIn, input.checkOut);
  if (!prepared.ok) return prepared;
  const lines = prepared.lines;

  if (input.id) {
    const existing = await getAllotment(input.id);
    if (!existing || existing.status !== "request" || existing.channel === "b2c") {
      return { ok: false as const, error: "allotment" as const };
    }
    const allotmentId = input.id;
    await transaction(async (sql) => {
      await sql.execute(
        `UPDATE allotments
         SET agency_id = ?, check_in = ?, check_out = ?, notes = ?
         WHERE id = ? AND status = 'request'`,
        [input.agencyId, input.checkIn, input.checkOut, input.notes, allotmentId],
      );
      await sql.execute("DELETE FROM allotment_lines WHERE allotment_id = ?", [
        allotmentId,
      ]);
      await insertAllotmentLines(sql, allotmentId, lines);
    });
    return { ok: true as const, id: allotmentId };
  }

  const id = crypto.randomUUID();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await transaction(async (sql) => {
        const number = await nextAllotmentNumber(sql);
        await sql.execute(
          `INSERT INTO allotments
            (id, number, agency_id, status, check_in, check_out, notes, created_at)
           VALUES (?, ?, ?, 'request', ?, ?, ?, ?)`,
          [
            id,
            number,
            input.agencyId,
            input.checkIn,
            input.checkOut,
            input.notes,
            new Date().toISOString(),
          ],
        );
        await insertAllotmentLines(sql, id, lines);
      });
      return { ok: true as const, id };
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 2) continue;
      throw error;
    }
  }
  return { ok: false as const, error: "allotment" as const };
}

class AllotmentConfirmError extends Error {
  constructor(
    readonly code: "quantity" | "missing-room" | "allotment",
    readonly remaining?: number,
  ) {
    super(code);
  }
}

async function heldForConfirm(
  sql: SqlClient,
  roomId: string,
  roomQuantity: number,
  checkIn: string,
  checkOut: string,
) {
  const room = await sql.query<{ check_in: string | null; check_out: string | null }>(
    "SELECT check_in, check_out FROM rooms WHERE id = ?",
    [roomId],
  );
  if (
    room[0]?.check_in &&
    room[0]?.check_out &&
    (checkIn < room[0].check_in || checkOut > room[0].check_out)
  ) {
    return 0;
  }
  const linked = await sql.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM purchase_lines WHERE room_id = ?",
    [roomId],
  );
  if (Number(linked[0]?.count ?? 0) === 0) return roomQuantity;
  const rows = await sql.query<{ held: number }>(
    `SELECT COALESCE(MIN(day_held), 0) AS held
     FROM (
       SELECT COALESCE((
         SELECT SUM(pl.quantity)
         FROM purchase_lines pl
         JOIN purchases p ON p.id = pl.purchase_id
         WHERE pl.room_id = ?
           AND p.status = 'confirmed'
           AND pl.check_in::date <= d.day::date
           AND pl.check_out::date > d.day::date
           AND (?::text IS NULL OR p.id <> ?::text)
       ), 0) AS day_held
       FROM generate_series(
         ?::timestamp,
         (?::date - INTERVAL '1 day')::timestamp,
         INTERVAL '1 day'
       ) AS d(day)
     ) days`,
    [roomId, null, null, checkIn, checkOut],
  );
  return Number(rows[0]?.held ?? 0);
}

async function assertSaleFits(
  allotment: Allotment,
  sql: SqlClient,
) {
  await releaseExpiredHolds();
  for (const line of allotment.lines) {
    if (!line.purchaseLineId || !line.offerId) {
      throw new AllotmentConfirmError("missing-room");
    }
    await sql.query(
      "SELECT id FROM purchase_lines WHERE id = ? FOR UPDATE",
      [line.purchaseLineId],
    );
    const onLine = await contractLineFree(
      line.purchaseLineId,
      allotment.checkIn,
      allotment.checkOut,
      sql,
      allotment.id,
    );
    const onOffer = await offerFree(
      line.offerId,
      allotment.checkIn,
      allotment.checkOut,
      sql,
      allotment.id,
    );
    const remaining = Math.min(onLine, onOffer);
    if (line.quantity > remaining) {
      throw new AllotmentConfirmError("quantity", remaining);
    }
  }
}

async function moveAllotment(
  id: string,
  next: "provisional" | "confirmed",
) {
  const allotment = await getAllotment(id);
  const from = next === "provisional" ? ["request"] : ["request", "provisional"];
  if (
    !allotment ||
    allotment.channel === "b2c" ||
    !from.includes(allotment.status)
  ) {
    return { ok: false as const, error: "allotment" as const };
  }
  if (!allotment.lines.length) {
    return { ok: false as const, error: "allotment-lines" as const };
  }
  const period = allotmentPeriodError(allotment.checkIn, allotment.checkOut);
  if (period) return { ok: false as const, error: period };

  try {
    await transaction(async (sql) => {
      const locked = await sql.query<{ status: string }>(
        "SELECT status FROM allotments WHERE id = ? FOR UPDATE",
        [id],
      );
      if (!locked[0] || !from.includes(locked[0].status)) {
        throw new AllotmentConfirmError("allotment");
      }
      await assertSaleFits(allotment, sql);
      await sql.execute(
        `UPDATE allotments
         SET status = ?,
             confirmed_at = CASE WHEN ? = 'confirmed' THEN ? ELSE confirmed_at END
         WHERE id = ?`,
        [next, next, new Date().toISOString(), id],
      );
    });
  } catch (error) {
    if (error instanceof AllotmentConfirmError) {
      return error.code === "quantity"
        ? { ok: false as const, error: "quantity" as const, remaining: error.remaining ?? 0 }
        : { ok: false as const, error: error.code };
    }
    throw error;
  }
  return { ok: true as const };
}

export async function holdAllotment(id: string) {
  return moveAllotment(id, "provisional");
}

export async function confirmAllotment(id: string) {
  return moveAllotment(id, "confirmed");
}

export async function markNoShow(id: string) {
  const allotment = await getAllotment(id);
  if (!allotment || allotment.status !== "confirmed") {
    return { ok: false as const, error: "allotment" as const };
  }
  await execute(
    "UPDATE allotments SET status = 'no_show' WHERE id = ? AND status = 'confirmed'",
    [id],
  );
  return { ok: true as const };
}

export async function cancelAllotment(id: string) {
  const allotment = await getAllotment(id);
  if (
    !allotment ||
    (allotment.status !== "confirmed" && allotment.status !== "provisional")
  ) {
    return { ok: false as const, error: "allotment" as const };
  }
  await transaction(async (sql) => {
    await sql.execute("DELETE FROM assignments WHERE allotment_id = ?", [id]);
    await sql.execute(
      "UPDATE allotment_lines SET assignment_id = NULL WHERE allotment_id = ?",
      [id],
    );
    if (allotment.bookingId) {
      await sql.execute(
        `UPDATE bookings
         SET status = 'cancelled'
         WHERE id = ? AND status IN ('pending', 'confirmed')`,
        [allotment.bookingId],
      );
    }
    await sql.execute(
      "UPDATE allotments SET status = 'cancelled' WHERE id = ? AND status IN ('confirmed', 'provisional')",
      [id],
    );
  });
  return { ok: true as const };
}

export async function deleteAllotment(id: string) {
  const allotment = await getAllotment(id);
  if (!allotment || (allotment.status !== "request" && allotment.status !== "cancelled")) {
    return false;
  }
  if (allotment.bookingId) {
    await execute("DELETE FROM bookings WHERE id = ?", [allotment.bookingId]);
  }
  await execute("DELETE FROM assignments WHERE allotment_id = ?", [id]);
  await execute("DELETE FROM allotment_lines WHERE allotment_id = ?", [id]);
  await execute(
    "DELETE FROM allotments WHERE id = ? AND status IN ('request', 'cancelled')",
    [id],
  );
  return true;
}

export async function reopenAllotment(id: string) {
  const allotment = await getAllotment(id);
  if (!allotment || allotment.status !== "cancelled" || allotment.channel === "b2c") {
    return false;
  }
  await execute(
    `UPDATE allotments
     SET status = 'request', confirmed_at = NULL
     WHERE id = ? AND status = 'cancelled'`,
    [id],
  );
  return true;
}

export async function hotelDailyChart(hotelId: string) {
  const stock = await loadContractStock();
  const offers = stock.offers.filter((offer) => offer.hotel_id === hotelId);
  return Promise.all(
    offers.map(async (offer) => {
      const lines = stock.byOffer.get(offer.id) ?? [];
      const window = chartWindow(
        lines.map((line) => ({ checkIn: line.checkIn, checkOut: line.checkOut })),
      );
      return {
        id: offer.id,
        name: offer.name,
        guests: Number(offer.guests),
        board: mealPlanCode(offer.board) ?? "room_only",
        view: offer.view,
        days: await offerChart(offer.id, window.from, window.to),
      };
    }),
  );
}

export async function listLineRates(purchaseId: string) {
  const rows = await query<{
    id: string;
    purchase_line_id: string;
    agency_id: string;
    agency_name: string;
    price_per_night: number;
  }>(
    `SELECT rate.id, rate.purchase_line_id, rate.agency_id, agency.name AS agency_name,
            rate.price_per_night
     FROM contract_rates AS rate
     JOIN agencies AS agency ON agency.id = rate.agency_id
     JOIN purchase_lines AS line ON line.id = rate.purchase_line_id
     WHERE line.purchase_id = ?
     ORDER BY agency.name`,
    [purchaseId],
  );
  return rows.map((row) => ({
    id: row.id,
    purchaseLineId: row.purchase_line_id,
    agencyId: row.agency_id,
    agencyName: row.agency_name,
    pricePerNight: Number(row.price_per_night),
  }));
}

export async function saveContractRate(input: {
  purchaseLineId: string;
  agencyId: string;
  pricePerNight: number;
}) {
  if (!Number.isInteger(input.pricePerNight) || input.pricePerNight < 1) return false;
  const line = await query<{ id: string }>(
    `SELECT line.id
     FROM purchase_lines AS line
     JOIN purchases AS purchase ON purchase.id = line.purchase_id
     WHERE line.id = ? AND purchase.status = 'confirmed'`,
    [input.purchaseLineId],
  );
  const agency = await query<{ id: string; kind: string | null }>(
    "SELECT id, kind FROM agencies WHERE id = ?",
    [input.agencyId],
  );
  if (!line[0] || !agency[0] || agency[0].kind === "individual") return false;
  await execute(
    `INSERT INTO contract_rates (id, purchase_line_id, agency_id, price_per_night)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (purchase_line_id, agency_id)
     DO UPDATE SET price_per_night = EXCLUDED.price_per_night`,
    [crypto.randomUUID(), input.purchaseLineId, input.agencyId, input.pricePerNight],
  );
  return true;
}

export async function deleteContractRate(id: string) {
  await execute("DELETE FROM contract_rates WHERE id = ?", [id]);
}

export async function listDeskRates() {
  const rows = await query<{
    purchase_line_id: string;
    agency_id: string;
    price_per_night: number;
  }>(
    `SELECT purchase_line_id, agency_id, price_per_night
     FROM contract_rates`,
  );
  return rows.map((row) => ({
    purchaseLineId: row.purchase_line_id,
    agencyId: row.agency_id,
    pricePerNight: Number(row.price_per_night),
  }));
}

export async function agencyPrices(agencyId: string) {
  const rows = await query<{
    purchase_line_id: string;
    offer_id: string | null;
    price_per_night: number;
    check_in: string;
    check_out: string;
  }>(
    `SELECT rate.purchase_line_id, line.offer_id, rate.price_per_night,
            line.check_in, line.check_out
     FROM contract_rates AS rate
     JOIN purchase_lines AS line ON line.id = rate.purchase_line_id
     JOIN purchases AS purchase ON purchase.id = line.purchase_id
     WHERE rate.agency_id = ?
       AND purchase.status = 'confirmed'`,
    [agencyId],
  );
  return rows.map((row) => ({
    purchaseLineId: row.purchase_line_id,
    offerId: row.offer_id,
    pricePerNight: Number(row.price_per_night),
    checkIn: row.check_in,
    checkOut: row.check_out,
  }));
}

export async function createAgencyReservation(input: {
  agencyId: string;
  offerId: string;
  checkIn: string;
  checkOut: string;
  quantity: number;
}) {
  const stay = parseStay(input.checkIn, input.checkOut);
  if (!stay) return { ok: false as const, error: "dates" as const };
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 5000) {
    return { ok: false as const, error: "quantity" as const };
  }
  const rates = await agencyPrices(input.agencyId);
  const rate = rates.find(
    (item) =>
      item.offerId === input.offerId &&
      item.checkIn <= stay.checkIn &&
      item.checkOut >= stay.checkOut,
  );
  if (!rate) return { ok: false as const, error: "rate" as const };
  const lines = await query<{
    id: string;
    cost_per_night: number;
    min_nights: number | null;
    sale_mode: string | null;
    room_id: string | null;
  }>(
    `SELECT line.id, line.cost_per_night, line.min_nights, line.sale_mode,
            (SELECT room.id FROM rooms AS room WHERE room.offer_id = line.offer_id LIMIT 1) AS room_id
     FROM purchase_lines AS line
     WHERE line.id = ?`,
    [rate.purchaseLineId],
  );
  const line = lines[0];
  if (!line) return { ok: false as const, error: "rate" as const };
  if (stay.nights < (Number(line.min_nights ?? 1) || 1)) {
    return { ok: false as const, error: "dates" as const };
  }
  await releaseExpiredHolds();
  const saleMode = saleModeCode(line.sale_mode ?? "") ?? "book";
  const createdAt = new Date().toISOString();
  let number = "";
  let status: "request" | "provisional" = "request";
  await transaction(async (sql) => {
    await sql.query("SELECT id FROM purchase_lines WHERE id = ? FOR UPDATE", [line.id]);
    const onLine = await contractLineFree(
      line.id,
      stay.checkIn,
      stay.checkOut,
      sql,
    );
    const onOffer = await offerFree(input.offerId, stay.checkIn, stay.checkOut, sql);
    const asksRequest =
      saleMode === "request" || input.quantity > Math.min(onLine, onOffer);
    status = asksRequest ? "request" : "provisional";
    const saleId = await insertWebsiteSale(sql, {
      channel: "b2b",
      agencyId: input.agencyId,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      notes: "",
      createdAt,
      status,
      lines: [
        {
          roomId: line.room_id ?? "",
          offerId: input.offerId,
          purchaseLineId: line.id,
          quantity: input.quantity,
          costPerNight: Number(line.cost_per_night),
          agencyPricePerNight: rate.pricePerNight,
        },
      ],
    });
    const saved = await sql.query<{ number: string }>(
      "SELECT number FROM allotments WHERE id = ?",
      [saleId],
    );
    number = saved[0]?.number ?? "";
  });
  return { ok: true as const, number, status };
}

export async function withAgencyRates<
  T extends { rooms: Array<{ id: string; agencyPricePerNight: number | null }> },
>(hotels: T[], agencyId: string, stay: { checkIn: string; checkOut: string } | null) {
  const prices = await agencyPrices(agencyId);
  return hotels
    .map((hotel) => ({
      ...hotel,
      rooms: hotel.rooms.flatMap((room) => {
        const matches = prices.filter(
          (price) =>
            price.offerId === room.id &&
            (!stay ||
              (price.checkIn <= stay.checkIn && price.checkOut >= stay.checkOut)),
        );
        if (!matches.length) return [];
        return [
          {
            ...room,
            agencyPricePerNight: Math.min(
              ...matches.map((item) => item.pricePerNight),
            ),
          },
        ];
      }),
    }))
    .filter((hotel) => hotel.rooms.length > 0);
}

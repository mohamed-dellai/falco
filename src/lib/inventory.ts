import { execute, query, transaction, type SqlClient } from "@/lib/db";
import { nightsBetween, todayInRiyadh } from "@/lib/money";
import { removeImages, saveImage } from "@/lib/uploads";

export const cities = ["makkah", "madinah", "jeddah"] as const;
export type City = (typeof cities)[number];

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
};

export function roomHasPeriod<
  T extends { checkIn: string | null; checkOut: string | null },
>(room: T): room is T & { checkIn: string; checkOut: string } {
  return Boolean(room.checkIn && room.checkOut);
}

export const clientKinds = ["agency", "individual"] as const;
export type ClientKind = (typeof clientKinds)[number];

export type Agency = {
  id: string;
  name: string;
  kind: ClientKind;
  country: string;
  contactName: string;
  email: string;
  phone: string;
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
  roomName: string;
  description: string;
  capacity: number;
  quantity: number;
  costPerNight: number;
  checkIn: string;
  checkOut: string;
  roomId: string | null;
};

export type PurchaseLineInput = {
  roomName: string;
  description: string;
  capacity: number;
  quantity: number;
  costPerNight: number;
  checkIn: string;
  checkOut: string;
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

export const allotmentStatuses = ["draft", "confirmed", "cancelled"] as const;
export type AllotmentStatus = (typeof allotmentStatuses)[number];

export type AllotmentLine = {
  id: string;
  allotmentId: string;
  roomId: string;
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
  name: string;
  description: string;
  capacity: number;
  quantity: number;
  cost_per_night: number;
  public_price_per_night: number | null;
  check_in: string | null;
  check_out: string | null;
  created_at: string;
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

function mapRoom(row: RoomRow, photos: string[]): Room {
  return {
    id: row.id,
    hotelId: row.hotel_id,
    name: row.name,
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
      ? "SELECT * FROM rooms WHERE hotel_id = ? ORDER BY lower(name), check_in NULLS LAST, created_at DESC"
      : "SELECT * FROM rooms ORDER BY lower(name), check_in NULLS LAST, created_at DESC",
    hotelId ? [hotelId] : [],
  );
  const photos = await photosFor("room_photos", "room_id");
  return rows.map((row) => mapRoom(row, photos.get(row.id) ?? []));
}

export async function getRoom(id: string) {
  const rows = await query<RoomRow>("SELECT * FROM rooms WHERE id = ?", [id]);
  const row = rows[0];
  if (!row) return null;
  const photos = await query<{ url: string }>(
    "SELECT url FROM room_photos WHERE room_id = ? ORDER BY sort_order, id",
    [id],
  );
  return mapRoom(
    row,
    photos.map((photo) => photo.url),
  );
}

type AgencyRow = {
  id: string;
  name: string;
  kind: string | null;
  country: string;
  contact_name: string;
  email: string;
  phone: string;
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

export async function listShowcase(stay: { checkIn: string; checkOut: string }) {
  const [hotels, listed] = await Promise.all([listHotels(), listRooms()]);
  const rooms = listed.filter(roomHasPeriod);
  const availability = new Map<string, number>();

  await Promise.all(
    rooms.map(async (room) => {
      availability.set(room.id, await openForStay(room, stay.checkIn, stay.checkOut));
    }),
  );

  return hotels
    .map((hotel) => ({
      ...hotel,
      rooms: rooms
        .filter((room) => room.hotelId === hotel.id)
        .map((room) => ({
          ...room,
          open: availability.get(room.id) ?? 0,
        }))
        .filter((room) => room.open > 0),
    }))
    .filter((hotel) => hotel.rooms.length > 0);
}

export async function listPublicStay(stay: { checkIn: string; checkOut: string }) {
  const [hotels, listed] = await Promise.all([listHotels(), listRooms()]);
  const priced = listed.filter(
    (room) => roomHasPeriod(room) && room.publicPricePerNight != null,
  );
  const availability = new Map<string, number>();
  await Promise.all(
    priced.map(async (room) => {
      availability.set(room.id, await openForStay(room, stay.checkIn, stay.checkOut));
    }),
  );

  return hotels
    .map((hotel) => ({
      ...hotel,
      rooms: priced
        .filter(
          (room) =>
            room.hotelId === hotel.id && (availability.get(room.id) ?? 0) > 0,
        )
        .map((room) => ({
          id: room.id,
          name: room.name,
          description: room.description,
          capacity: room.capacity,
          checkIn: room.checkIn,
          checkOut: room.checkOut,
          publicPricePerNight: room.publicPricePerNight ?? 0,
          photos: room.photos,
        })),
    }))
    .filter((hotel) => hotel.rooms.length > 0);
}

export async function getShowcaseHotel(
  id: string,
  stay: { checkIn: string; checkOut: string },
) {
  const hotel = await getHotel(id);
  if (!hotel) return null;
  const rooms = (await listRooms(id)).filter(roomHasPeriod);
  const detailed = await Promise.all(
    rooms.map(async (room) => ({
      ...room,
      open: await openForStay(room, stay.checkIn, stay.checkOut),
    })),
  );
  return { ...hotel, rooms: detailed.filter((room) => room.open > 0) };
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
  input: Omit<Room, "id" | "createdAt" | "photos">,
) {
  const id = crypto.randomUUID();
  await execute(
    `INSERT INTO rooms
      (id, hotel_id, name, room_type, description, capacity, quantity, cost_per_night, public_price_per_night, created_at, check_in, check_out)
     VALUES (?, ?, ?, lower(btrim(?)), ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.hotelId,
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
  name: string,
  checkIn: string,
  checkOut: string,
) {
  const room = await getRoom(roomId);
  if (!room) return { ok: false as const, error: "invalid" as const };
  const period = purchasePeriodError(checkIn, checkOut);
  if (period) return { ok: false as const, error: period };

  const clash = await query<{ id: string }>(
    `SELECT id FROM rooms
     WHERE hotel_id = ?
       AND id <> ?
       AND room_type = lower(btrim(?))
       AND check_in = ?
       AND check_out = ?
     LIMIT 1`,
    [room.hotelId, roomId, name, checkIn, checkOut],
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
     )::int AS count`,
    [roomId, checkIn, checkOut, roomId, checkIn, checkOut],
  );
  if (Number(outside[0]?.count ?? 0) > 0) {
    return { ok: false as const, error: "dates-sold" as const };
  }

  await execute(
    `UPDATE rooms
     SET name = ?, room_type = lower(btrim(?)), check_in = ?, check_out = ?
     WHERE id = ?`,
    [name, name, checkIn, checkOut, roomId],
  );
  await execute(
    `UPDATE purchase_lines AS line
     SET room_name = ?, check_in = ?, check_out = ?
     FROM purchases AS purchase
     WHERE line.purchase_id = purchase.id
       AND line.room_id = ?
       AND purchase.status = 'confirmed'`,
    [name, checkIn, checkOut, roomId],
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
  input: Omit<Room, "id" | "hotelId" | "createdAt" | "photos">,
) {
  await execute(
    `UPDATE rooms
     SET name = ?, room_type = lower(btrim(?)), description = ?, capacity = ?, quantity = ?, cost_per_night = ?, public_price_per_night = ?, check_in = ?, check_out = ?
     WHERE id = ?`,
    [
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
      (id, name, kind, country, contact_name, email, phone, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.kind,
      input.country,
      input.kind === "individual" ? "" : input.contactName,
      input.email,
      input.phone,
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
     SET name = ?, kind = ?, country = ?, contact_name = ?, email = ?, phone = ?
     WHERE id = ?`,
    [
      input.name,
      input.kind,
      input.country,
      input.kind === "individual" ? "" : input.contactName,
      input.email,
      input.phone,
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
  room_name: string;
  description: string;
  capacity: number;
  quantity: number;
  cost_per_night: number;
  check_in: string;
  check_out: string;
  room_id: string | null;
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
    roomName: row.room_name,
    description: row.description,
    capacity: Number(row.capacity),
    quantity: Number(row.quantity),
    costPerNight: Number(row.cost_per_night),
    checkIn: row.check_in,
    checkOut: row.check_out,
    roomId: row.room_id,
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
        (id, purchase_id, room_name, description, capacity, quantity, cost_per_night, sort_order, check_in, check_out)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        purchaseId,
        line.roomName,
        line.description,
        line.capacity,
        line.quantity,
        line.costPerNight,
        index,
        line.checkIn,
        line.checkOut,
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

export async function confirmPurchase(id: string) {
  const purchase = await getPurchase(id);
  if (!purchase || purchase.status !== "draft") {
    return { ok: false as const, error: "purchase" as const };
  }
  if (!purchase.lines.length) return { ok: false as const, error: "lines" as const };
  for (const line of purchase.lines) {
    const period = purchasePeriodError(line.checkIn, line.checkOut);
    if (period) return { ok: false as const, error: period };
  }

  await transaction(async (sql) => {
    const roomIds = new Map<string, string>();
    for (const line of purchase.lines) {
      const key = `${line.roomName.trim().toLowerCase()}|${line.checkIn}|${line.checkOut}`;
      let roomId = roomIds.get(key);
      if (!roomId) {
        const existing = await sql.query<{ id: string }>(
          `SELECT id FROM rooms
           WHERE hotel_id = ?
             AND room_type = lower(btrim(?))
             AND check_in = ?
             AND check_out = ?
           LIMIT 1`,
          [purchase.hotelId, line.roomName, line.checkIn, line.checkOut],
        );
        roomId = existing[0]?.id;
      }
      if (!roomId) {
        roomId = crypto.randomUUID();
        await sql.execute(
          `INSERT INTO rooms
            (id, hotel_id, name, room_type, description, capacity, quantity, cost_per_night, created_at, check_in, check_out)
           VALUES (?, ?, ?, lower(btrim(?)), ?, ?, ?, ?, ?, ?, ?)`,
          [
            roomId,
            purchase.hotelId,
            line.roomName,
            line.roomName,
            line.description,
            line.capacity,
            line.quantity,
            line.costPerNight,
            new Date().toISOString(),
            line.checkIn,
            line.checkOut,
          ],
        );
      } else {
        await sql.execute(
          `UPDATE rooms SET cost_per_night = ?, capacity = ? WHERE id = ?`,
          [line.costPerNight, line.capacity, roomId],
        );
      }
      roomIds.set(key, roomId);
      await sql.execute("UPDATE purchase_lines SET room_id = ? WHERE id = ?", [
        roomId,
        line.id,
      ]);
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
    if (!line.roomId) continue;
    const room = await getRoom(line.roomId);
    if (!room) continue;
    const [held, reserved] = await Promise.all([
      heldQuantity(room, line.checkIn, line.checkOut, purchase.id),
      reservedQuantity(line.roomId, line.checkIn, line.checkOut),
    ]);
    if (reserved > held) return { ok: false as const, error: "cancel" as const };
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
    check_in: string | null;
    check_out: string | null;
  }>(
    `SELECT r.id, r.name, r.cost_per_night, r.check_in, r.check_out, h.name AS hotel_name
     FROM rooms r
     JOIN hotels h ON h.id = r.hotel_id
     ORDER BY h.name, r.name, r.check_in NULLS LAST`,
  );
  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      hotelName: row.hotel_name,
      costPerNight: Number(row.cost_per_night),
      checkIn: row.check_in,
      checkOut: row.check_out,
    }))
    .filter(roomHasPeriod);
}

type AllotmentRow = {
  id: string;
  number: string;
  agency_id: string;
  agency_name: string;
  status: string;
  check_in: string;
  check_out: string;
  notes: string;
  created_at: string;
  confirmed_at: string | null;
};

type AllotmentLineRow = {
  id: string;
  allotment_id: string;
  room_id: string;
  hotel_name: string;
  room_name: string;
  room_check_in: string | null;
  room_check_out: string | null;
  quantity: number;
  cost_per_night: number;
  agency_price_per_night: number;
};

function asAllotmentStatus(value: string): AllotmentStatus {
  return allotmentStatuses.includes(value as AllotmentStatus)
    ? (value as AllotmentStatus)
    : "draft";
}

function mapAllotmentLine(row: AllotmentLineRow): AllotmentLine {
  return {
    id: row.id,
    allotmentId: row.allotment_id,
    roomId: row.room_id,
    hotelName: row.hotel_name,
    roomName: row.room_name,
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
    `SELECT l.*, r.name AS room_name, r.check_in AS room_check_in,
            r.check_out AS room_check_out, h.name AS hotel_name
     FROM allotment_lines l
     JOIN rooms r ON r.id = l.room_id
     JOIN hotels h ON h.id = r.hotel_id
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

async function insertAllotmentLines(
  sql: Pick<SqlClient, "execute">,
  allotmentId: string,
  lines: AllotmentLineInput[],
) {
  for (const [index, line] of lines.entries()) {
    await sql.execute(
      `INSERT INTO allotment_lines
        (id, allotment_id, room_id, quantity, cost_per_night, agency_price_per_night, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        allotmentId,
        line.roomId,
        line.quantity,
        line.costPerNight,
        line.agencyPricePerNight,
        index,
      ],
    );
  }
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

  const roomIds = [...new Set(input.lines.map((line) => line.roomId))];
  if (roomIds.length) {
    const found = await query<{ id: string }>(
      `SELECT id FROM rooms WHERE id IN (${roomIds.map(() => "?").join(", ")})`,
      roomIds,
    );
    if (found.length !== roomIds.length) {
      return { ok: false as const, error: "missing-room" as const };
    }
  }

  if (input.id) {
    const existing = await getAllotment(input.id);
    if (!existing || existing.status !== "draft") {
      return { ok: false as const, error: "allotment" as const };
    }
    const allotmentId = input.id;
    await transaction(async (sql) => {
      await sql.execute(
        `UPDATE allotments
         SET agency_id = ?, check_in = ?, check_out = ?, notes = ?
         WHERE id = ? AND status = 'draft'`,
        [input.agencyId, input.checkIn, input.checkOut, input.notes, allotmentId],
      );
      await sql.execute("DELETE FROM allotment_lines WHERE allotment_id = ?", [
        allotmentId,
      ]);
      await insertAllotmentLines(sql, allotmentId, input.lines);
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
           VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)`,
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
        await insertAllotmentLines(sql, id, input.lines);
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

export async function confirmAllotment(id: string) {
  const allotment = await getAllotment(id);
  if (!allotment || allotment.status !== "draft") {
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
      if (locked[0]?.status !== "draft") {
        throw new AllotmentConfirmError("allotment");
      }

      const freshLines = await sql.query<{
        id: string;
        room_id: string;
        quantity: number;
        cost_per_night: number;
        agency_price_per_night: number;
      }>(
        `SELECT id, room_id, quantity, cost_per_night, agency_price_per_night
         FROM allotment_lines
         WHERE allotment_id = ?
         ORDER BY sort_order, id`,
        [id],
      );
      if (!freshLines.length) throw new AllotmentConfirmError("allotment");

      const needed = new Map<string, number>();
      for (const line of freshLines) {
        needed.set(
          line.room_id,
          (needed.get(line.room_id) ?? 0) + Number(line.quantity),
        );
      }

      const rooms = new Map<string, number>();
      for (const roomId of [...needed.keys()].sort()) {
        const rows = await sql.query<{ id: string; quantity: number }>(
          "SELECT id, quantity FROM rooms WHERE id = ? FOR UPDATE",
          [roomId],
        );
        if (!rows[0]) throw new AllotmentConfirmError("missing-room");
        rooms.set(roomId, Number(rows[0].quantity));
      }

      for (const [roomId, quantity] of needed) {
        const held = await heldForConfirm(
          sql,
          roomId,
          rooms.get(roomId) ?? 0,
          allotment.checkIn,
          allotment.checkOut,
        );
        const reservedRows = await sql.query<{ reserved: number }>(
          `SELECT
             COALESCE((
               SELECT SUM(quantity)
               FROM assignments
               WHERE room_id = ?
                 AND check_in < ?
                 AND check_out > ?
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
            allotment.checkOut,
            allotment.checkIn,
            roomId,
            allotment.checkOut,
            allotment.checkIn,
          ],
        );
        const reserved = Number(reservedRows[0]?.reserved ?? 0);
        const remaining = Math.max(0, held - reserved);
        if (quantity > remaining) {
          throw new AllotmentConfirmError("quantity", remaining);
        }
      }

      for (const line of freshLines) {
        const assignmentId = crypto.randomUUID();
        await sql.execute(
          `INSERT INTO assignments
            (id, room_id, agency_id, quantity, check_in, check_out, cost_per_night, agency_price_per_night, notes, created_at, allotment_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            assignmentId,
            line.room_id,
            allotment.agencyId,
            Number(line.quantity),
            allotment.checkIn,
            allotment.checkOut,
            Number(line.cost_per_night),
            Number(line.agency_price_per_night),
            allotment.notes,
            new Date().toISOString(),
            allotment.id,
          ],
        );
        await sql.execute(
          "UPDATE allotment_lines SET assignment_id = ? WHERE id = ?",
          [assignmentId, line.id],
        );
      }

      await sql.execute(
        `UPDATE allotments
         SET status = 'confirmed', confirmed_at = ?
         WHERE id = ? AND status = 'draft'`,
        [new Date().toISOString(), id],
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

export async function cancelAllotment(id: string) {
  const allotment = await getAllotment(id);
  if (!allotment || allotment.status !== "confirmed") {
    return { ok: false as const, error: "allotment" as const };
  }
  await transaction(async (sql) => {
    await sql.execute("DELETE FROM assignments WHERE allotment_id = ?", [id]);
    await sql.execute(
      "UPDATE allotment_lines SET assignment_id = NULL WHERE allotment_id = ?",
      [id],
    );
    await sql.execute(
      "UPDATE allotments SET status = 'cancelled' WHERE id = ? AND status = 'confirmed'",
      [id],
    );
  });
  return { ok: true as const };
}

export async function deleteAllotment(id: string) {
  const allotment = await getAllotment(id);
  if (!allotment || (allotment.status !== "draft" && allotment.status !== "cancelled")) {
    return false;
  }
  await execute("DELETE FROM assignments WHERE allotment_id = ?", [id]);
  await execute("DELETE FROM allotment_lines WHERE allotment_id = ?", [id]);
  await execute(
    "DELETE FROM allotments WHERE id = ? AND status IN ('draft', 'cancelled')",
    [id],
  );
  return true;
}

import { activeCommercial } from "@/lib/client-crm";
import { clientCanBuy } from "@/lib/client-sale";
import { execute, query, transaction, type SqlClient } from "@/lib/db";
import { earliestCheckIn } from "@/lib/hotel-rules";
import { nightsBetween, stayInside, todayInRiyadh } from "@/lib/money";
import { cities, type City } from "@/lib/places";
import { mealPlanCode, saleModeCode, type MealPlan, type SaleMode } from "@/lib/room-types";
import {
  lockAndPrepareSelections,
  removeLegacyContractRate,
  syncLegacyContractRate,
} from "@/lib/contracts";
import {
  appendReservationEvent,
  cancelReservation,
  moveReservation,
  regretReservation,
  returnReservationToRequest,
} from "@/lib/reservations";
import {
  chartWindow,
  contractLineFree,
  contractLineRule,
  offerFree,
  releaseExpiredHolds,
} from "@/lib/stock";
import { removeImages, saveImage } from "@/lib/uploads";
import { reportFilters, reservationReport } from "@/lib/reports";

export { cities, type City } from "@/lib/places";

export type Hotel = {
  id: string;
  name: string;
  nameAr: string;
  city: City;
  placeId: string;
  address: string;
  description: string;
  descriptionAr: string;
  stars: number;
  distanceToHaram: string;
  reservationEmail: string;
  reservationPhone: string;
  reservationWhatsapp: string;
  latitude: number | null;
  longitude: number | null;
  publishedWebsite: boolean;
  publishedDesk: boolean;
  minAdvanceDays: number;
  cutoffTime: string;
  payOnArrival: boolean;
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
  nameAr: string;
  kind: ClientKind;
  country: string;
  contactName: string;
  email: string;
  phone: string;
  commercialRegistration: string;
  vatNumber: string;
  vatNotRequired: boolean;
  stopSale: boolean;
  disabled: boolean;
  groupId: string | null;
  isSupplier: boolean;
  nationalId: string;
  hasIdentityFile: boolean;
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
  nameAr: string;
  weekendCost: number;
  weekendPrice: number | null;
  primary: boolean;
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
  nameAr: string;
  weekendCost: number;
  weekendPrice: number | null;
  primary: boolean;
};

export type ContractType = "block" | "request";
export type SupplierType = "hotel_direct" | "wholesaler";

export type MealRate = {
  weekdayCost: number;
  weekendCost: number;
  weekdayPrice: number | null;
  weekendPrice: number | null;
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
  contractName: string;
  contractType: ContractType;
  contractCost: number | null;
  priority: number;
  supplierType: SupplierType;
  supplierAgencyId: string | null;
  contactHotel: boolean;
  active: boolean;
  mealCodes: string[];
  mealRates: Record<string, MealRate>;
  viewNames: string[];
  viewRates: Record<string, MealRate>;
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
  "unavailable",
  "regret",
] as const;

export const lineSupplierStatuses = [
  "new",
  "waiting",
  "provisional",
  "confirmed",
  "amended",
  "cancelled",
  "no_show",
] as const;
export type LineSupplierStatus = (typeof lineSupplierStatuses)[number];
export type AllotmentStatus = (typeof allotmentStatuses)[number];

export type AllotmentLine = {
  id: string;
  allotmentId: string;
  roomId: string;
  offerId: string | null;
  purchaseLineId: string | null;
  contractPeriodId: string | null;
  hotelName: string;
  roomName: string;
  roomCheckIn: string | null;
  roomCheckOut: string | null;
  boardSnapshot: MealPlan;
  viewSnapshot: string;
  termsSnapshot: Record<string, unknown>;
  quantity: number;
  costPerNight: number;
  agencyPricePerNight: number;
  amountBasis: "night" | "stay";
  priceIncludesVat: boolean;
  rateSnapshot: RateSnapshot;
  supplierStatus: LineSupplierStatus;
};

export type RateSnapshot = {
  room?: { cost: number; price: number };
  meal?: { code: string; cost: number; price: number };
  view?: { name: string; cost: number; price: number };
  meals?: string[];
  hotelId?: string;
  roomTypeId?: string;
};

export type AllotmentLineInput = {
  roomId: string;
  offerId: string | null;
  purchaseLineId: string | null;
  contractPeriodId?: string | null;
  boardSnapshot?: MealPlan;
  viewSnapshot?: string;
  termsSnapshot?: Record<string, unknown>;
  quantity: number;
  costPerNight: number;
  agencyPricePerNight: number;
  priceIncludesVat?: boolean;
  quote?: boolean;
  mealCode?: string;
  viewName?: string;
  amountBasis?: "night" | "stay";
  rateSnapshot?: RateSnapshot;
  directHotel?: string;
  directRoom?: string;
};

export type Allotment = {
  id: string;
  number: string;
  agencyId: string;
  agencyName: string;
  commercialId: string | null;
  commercialName: string;
  commissionPercent: number | null;
  status: AllotmentStatus;
  channel: SaleChannel;
  saleSource: "contract" | "direct";
  hotelId: string | null;
  hotelName: string;
  guestName: string;
  payBefore: string;
  payOnArrival: boolean;
  penaltyAmount: number;
  bookingId: string | null;
  submissionId: string | null;
  checkIn: string;
  checkOut: string;
  notes: string;
  createdAt: string;
  confirmedAt: string | null;
  holdUntil: string | null;
  termsAcceptedAt: string | null;
  termsAcceptedBy: string;
  termsVersion: string;
  cancellationRequestedAt: string | null;
  cancellationReason: string;
  supplierStatus: string;
  supplierReference: string;
  supplierSentAt: string | null;
  supplierConfirmedAt: string | null;
  supplierNotes: string;
  lines: AllotmentLine[];
};

type HotelRow = {
  id: string;
  name: string;
  name_ar: string | null;
  city: string;
  place_id: string | null;
  address: string;
  description: string;
  description_ar: string | null;
  stars: number;
  distance_to_haram: string;
  reservation_email: string;
  reservation_phone: string;
  reservation_whatsapp: string;
  latitude: number | null;
  longitude: number | null;
  published_website: boolean | null;
  published_desk: boolean | null;
  min_advance_days: number | null;
  cutoff_time: string | null;
  pay_on_arrival: boolean | null;
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
    nameAr: row.name_ar ?? "",
    city: asCity(row.city),
    placeId: row.place_id ?? "",
    address: row.address,
    description: row.description,
    descriptionAr: row.description_ar ?? "",
    stars: Number(row.stars),
    distanceToHaram: row.distance_to_haram,
    reservationEmail: row.reservation_email ?? "",
    reservationPhone: row.reservation_phone ?? "",
    reservationWhatsapp: row.reservation_whatsapp ?? "",
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    publishedWebsite: row.published_website !== false,
    publishedDesk: row.published_desk !== false,
    minAdvanceDays: Number(row.min_advance_days ?? 0),
    cutoffTime: row.cutoff_time ?? "",
    payOnArrival: Boolean(row.pay_on_arrival),
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
  childrenAllowed: boolean;
  maxChildAge: number | null;
  createdAt: string;
};

type RoomTypeRow = {
  id: string;
  name: string;
  guests: number;
  board: string;
  view: string;
  description: string;
  children_allowed: boolean | null;
  max_child_age: number | null;
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
    childrenAllowed: Boolean(row.children_allowed),
    maxChildAge: row.max_child_age == null ? null : Number(row.max_child_age),
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
  childrenAllowed: boolean;
  maxChildAge: number | null;
}) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) return null;
  if (!Number.isInteger(input.guests) || input.guests < 1 || input.guests > 20) {
    return null;
  }
  const maxChildAge = input.childrenAllowed ? input.maxChildAge : null;
  if (
    input.childrenAllowed &&
    (maxChildAge === null ||
      !Number.isInteger(maxChildAge) ||
      maxChildAge < 0 ||
      maxChildAge > 17)
  ) {
    return null;
  }
  const description = input.description.trim().slice(0, 2000);
  if (input.id) {
    const existing = await getRoomType(input.id);
    if (!existing) return null;
    await execute(
      `UPDATE room_types
       SET name = ?, guests = ?, description = ?,
           children_allowed = ?, max_child_age = ?
       WHERE id = ?`,
      [name, input.guests, description, input.childrenAllowed, maxChildAge, input.id],
    );
    return input.id;
  }
  const id = crypto.randomUUID();
  await execute(
    `INSERT INTO room_types
      (id, name, guests, board, view, description, children_allowed,
       max_child_age, created_at)
     VALUES (?, ?, ?, 'room_only', '', ?, ?, ?, ?)`,
    [
      id,
      name,
      input.guests,
      description,
      input.childrenAllowed,
      maxChildAge,
      new Date().toISOString(),
    ],
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
  name_ar: string | null;
  kind: string | null;
  country: string;
  contact_name: string;
  email: string;
  phone: string;
  commercial_registration: string | null;
  vat_number: string | null;
  vat_not_required: boolean | null;
  stop_sale: boolean | null;
  disabled: boolean | null;
  group_id: string | null;
  is_supplier: boolean | null;
  national_id: string | null;
  has_identity: boolean | null;
  created_at: string;
};

const agencyColumns = `id, name, name_ar, kind, country, contact_name, email, phone,
  commercial_registration, vat_number, vat_not_required, stop_sale, disabled,
  group_id, is_supplier, national_id,
  (identity_bytes IS NOT NULL) AS has_identity, created_at`;

function mapAgency(row: AgencyRow): Agency {
  return {
    id: row.id,
    name: row.name,
    nameAr: row.name_ar ?? "",
    kind: asClientKind(row.kind),
    country: row.country,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    commercialRegistration: row.commercial_registration ?? "",
    vatNumber: row.vat_number ?? "",
    vatNotRequired: Boolean(row.vat_not_required),
    stopSale: Boolean(row.stop_sale),
    disabled: Boolean(row.disabled),
    groupId: row.group_id,
    isSupplier: Boolean(row.is_supplier),
    nationalId: row.national_id ?? "",
    hasIdentityFile: Boolean(row.has_identity),
    createdAt: row.created_at,
  };
}

export async function listAgencies() {
  const rows = await query<AgencyRow>(
    `SELECT ${agencyColumns} FROM agencies ORDER BY lower(name)`,
  );
  return rows.map(mapAgency);
}

export async function getAgency(id: string) {
  const rows = await query<AgencyRow>(
    `SELECT ${agencyColumns} FROM agencies WHERE id = ?`,
    [id],
  );
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

  const rows = await query<{ held: number }>(
    `SELECT COALESCE(MIN(day_held), 0) AS held
     FROM (
       SELECT COALESCE((
         SELECT SUM(period.quantity)::int
         FROM contract_periods period
         JOIN purchase_lines pl ON pl.id = period.purchase_line_id
         JOIN purchases p ON p.id = pl.purchase_id
         WHERE p.status = 'confirmed'
           AND p.active = TRUE
           AND period.active = TRUE
           AND period.sale_mode <> 'request'
           AND period.stop_sale = FALSE
           AND period.check_in::date <= d.day::date
           AND period.check_out::date > d.day::date
           AND (?::text IS NULL OR p.id <> ?::text)
           AND (
             pl.room_id = ?
             OR (?::text IS NOT NULL AND pl.offer_id = ?::text)
           )
       ), 0) AS day_held
       FROM generate_series(
         ?::timestamp,
         (?::date - INTERVAL '1 day')::timestamp,
         INTERVAL '1 day'
       ) AS d(day)
     ) days`,
    [
      ignorePurchaseId ?? null,
      ignorePurchaseId ?? null,
      room.id,
      room.offerId,
      room.offerId,
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

  const rows = await db.query<{ open: number }>(
    `SELECT COALESCE(MIN(GREATEST(day_held - day_booked, 0)), 0)::int AS open
     FROM (
       SELECT
         COALESCE((
           SELECT SUM(period.quantity)::int
           FROM contract_periods period
           JOIN purchase_lines pl ON pl.id = period.purchase_line_id
           JOIN purchases p ON p.id = pl.purchase_id
           WHERE pl.room_id = ?
             AND p.status = 'confirmed'
             AND p.active = TRUE
             AND period.active = TRUE
             AND period.sale_mode <> 'request'
             AND period.stop_sale = FALSE
             AND period.check_in::date <= d.day::date
             AND period.check_out::date > d.day::date
         ), 0) AS day_held,
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
  purchaseLineId: string;
  offerId: string;
  checkIn: string;
  checkOut: string;
  costPerNight: number;
  publicPricePerNight: number | null;
  defaultAgencyPricePerNight: number | null;
  minNights: number;
  saleMode: SaleMode;
  stopSale: boolean;
  overbookLimit: number;
  holdMinutes: number;
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
    children_allowed: boolean;
    max_child_age: number | null;
  }>(
    `SELECT offer.id, offer.hotel_id, offer.room_type_id, offer.board, offer.view,
            offer.created_at, type.name, type.guests, type.description,
            type.children_allowed, type.max_child_age
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
    purchase_line_id: string;
    offer_id: string;
    check_in: string;
    check_out: string;
    cost_per_night: number;
    public_price_per_night: number | null;
    default_agency_price_per_night: number | null;
    min_nights: number;
    sale_mode: string;
    stop_sale: boolean;
    overbook_limit: number;
    hold_minutes: number;
    description: string;
  }>(
    `SELECT period.id, period.purchase_line_id, line.offer_id,
            period.check_in, period.check_out, period.cost_per_night,
            period.public_price_per_night, period.default_agency_price_per_night,
            period.min_nights, period.sale_mode, period.stop_sale,
            period.overbook_limit, period.hold_minutes, line.description
     FROM contract_periods AS period
     JOIN purchase_lines AS line ON line.id = period.purchase_line_id
     JOIN purchases AS purchase ON purchase.id = line.purchase_id
     WHERE purchase.status = 'confirmed'
       AND period.active = TRUE
       AND line.offer_id IS NOT NULL`,
  );
  const photos = await query<{ offer_id: string; url: string }>(
    `SELECT photo.offer_id, photo.url
     FROM offer_photos AS photo
     ORDER BY photo.sort_order, photo.id`,
  );
  const byOffer = new Map<string, ContractStock[]>();
  for (const line of lines) {
    const stock: ContractStock = {
      id: line.id,
      purchaseLineId: line.purchase_line_id,
      offerId: line.offer_id,
      checkIn: line.check_in,
      checkOut: line.check_out,
      costPerNight: Number(line.cost_per_night),
      publicPricePerNight:
        line.public_price_per_night == null
          ? null
          : Number(line.public_price_per_night),
      defaultAgencyPricePerNight:
        line.default_agency_price_per_night == null
          ? null
          : Number(line.default_agency_price_per_night),
      minNights: Number(line.min_nights ?? 1) || 1,
      saleMode: saleModeCode(line.sale_mode ?? "") ?? "book",
      stopSale: Boolean(line.stop_sale),
      overbookLimit: Number(line.overbook_limit),
      holdMinutes: Number(line.hold_minutes),
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
    children_allowed: boolean;
    max_child_age: number | null;
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
    ? covering.filter((line) => nights >= line.minNights && !line.stopSale)
    : covering.filter((line) => !line.stopSale);
  if (!eligible.length) return null;
  const priced = eligible.find(
    (line) => line.saleMode === "book" && line.publicPricePerNight != null,
  );
  const chosen = priced ?? eligible.find((line) => line.publicPricePerNight != null) ?? eligible[0];
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
    checkIn: chosen.checkIn,
    checkOut: chosen.checkOut,
    createdAt: offer.created_at,
    photos,
    board: mealPlanCode(offer.board) ?? "room_only",
    view: offer.view,
    typeDescription: offer.description,
    childrenAllowed: Boolean(offer.children_allowed),
    maxChildAge:
      offer.max_child_age == null ? null : Number(offer.max_child_age),
    offerId: offer.id,
    saleMode: chosen.saleMode,
    minNights: chosen.minNights,
    purchaseLineId: chosen.purchaseLineId,
    contractPeriodId: chosen.id,
    stopSale: chosen.stopSale,
    holdMinutes: chosen.holdMinutes,
    agencyPricePerNight: null as number | null,
  };
}

async function hotelsWithOffers(
  stay: { checkIn: string; checkOut: string } | null,
  options?: {
    requirePrice?: boolean;
    hideWhenFull?: boolean;
    keepWhenFull?: boolean;
    channel?: "website" | "desk";
  },
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
    .filter((hotel) => {
      if (options?.channel === "website" && !hotel.publishedWebsite) return false;
      if (options?.channel === "desk" && !hotel.publishedDesk) return false;
      if (stay && stay.checkIn < earliestCheckIn(hotel)) return false;
      return true;
    })
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
  const hotels = await hotelsWithOffers(stay, { channel: "website" });
  return hotels.filter((hotel) => hotel.rooms.length > 0);
}

export async function listAgencyCatalog(
  stay: { checkIn: string; checkOut: string } | null,
) {
  const hotels = await hotelsWithOffers(stay, { keepWhenFull: true, channel: "desk" });
  if (!stay) return hotels;
  return hotels.filter((hotel) => hotel.rooms.length > 0);
}

export async function listPublicStay(stay: { checkIn: string; checkOut: string }) {
  const hotels = await hotelsWithOffers(stay, { requirePrice: true, channel: "website" });
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
  channel: "website" | "desk" = "desk",
) {
  const hotels = await hotelsWithOffers(stay, { keepWhenFull: true, channel });
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
  const today = todayInRiyadh();
  const tomorrow = nextDay(today);
  const [hotels, activePeriods, activeReservations, drafts] = await Promise.all([
    listHotels(),
    query<{ offer_id: string; quantity: number }>(
      `SELECT line.offer_id, SUM(period.quantity)::int AS quantity
       FROM contract_periods AS period
       JOIN purchase_lines AS line ON line.id = period.purchase_line_id
       JOIN purchases AS purchase ON purchase.id = line.purchase_id
       WHERE period.active = TRUE
         AND period.sale_mode <> 'request'
         AND period.stop_sale = FALSE
         AND purchase.status = 'confirmed'
         AND purchase.active = TRUE
         AND period.check_in <= ?
         AND period.check_out > ?
       GROUP BY line.offer_id`,
      [today, today],
    ),
    query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM allotments
       WHERE status = 'confirmed' AND check_in <= ? AND check_out > ?`,
      [today, today],
    ),
    query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM purchases WHERE status = 'draft'",
    ),
  ]);
  const open = await Promise.all(
    activePeriods.map((period) =>
      offerFree(period.offer_id, today, tomorrow),
    ),
  );

  return {
    hotels: hotels.length,
    rooms: activePeriods.length,
    units: activePeriods.reduce(
      (sum, period) => sum + Number(period.quantity),
      0,
    ),
    openUnits: open.reduce((sum, quantity) => sum + quantity, 0),
    activeAssignments: Number(activeReservations[0]?.count ?? 0),
    draftPurchases: Number(drafts[0]?.count ?? 0),
  };
}

export type HotelIdentity = {
  name: string;
  nameAr: string;
  city: City;
  placeId: string;
  address: string;
  description: string;
  descriptionAr: string;
  stars: number;
  distanceToHaram: string;
  latitude: number | null;
  longitude: number | null;
};

export async function createHotel(input: HotelIdentity) {
  const id = crypto.randomUUID();
  await execute(
    `INSERT INTO hotels
      (id, name, name_ar, city, place_id, address, description, description_ar,
       stars, distance_to_haram, latitude, longitude,
       published_website, published_desk, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, FALSE, ?)`,
    [
      id,
      input.name,
      input.nameAr,
      input.city,
      input.placeId,
      input.address,
      input.description,
      input.descriptionAr,
      input.stars,
      input.distanceToHaram,
      input.latitude,
      input.longitude,
      new Date().toISOString(),
    ],
  );
  return id;
}

export async function updateHotel(id: string, input: HotelIdentity) {
  await execute(
    `UPDATE hotels
     SET name = ?, name_ar = ?, city = ?, place_id = ?, address = ?,
         description = ?, description_ar = ?, stars = ?,
         distance_to_haram = ?, latitude = ?, longitude = ?
     WHERE id = ?`,
    [
      input.name,
      input.nameAr,
      input.city,
      input.placeId,
      input.address,
      input.description,
      input.descriptionAr,
      input.stars,
      input.distanceToHaram,
      input.latitude,
      input.longitude,
      id,
    ],
  );
}

export async function updateHotelContact(
  id: string,
  input: {
    reservationEmail: string;
    reservationPhone: string;
    reservationWhatsapp: string;
  },
) {
  await execute(
    `UPDATE hotels
     SET reservation_email = ?, reservation_phone = ?, reservation_whatsapp = ?
     WHERE id = ?`,
    [
      input.reservationEmail,
      input.reservationPhone,
      input.reservationWhatsapp,
      id,
    ],
  );
}

export async function updateHotelVisibility(
  id: string,
  input: { publishedWebsite: boolean; publishedDesk: boolean },
) {
  await execute(
    `UPDATE hotels
     SET published_website = ?, published_desk = ?
     WHERE id = ?`,
    [input.publishedWebsite, input.publishedDesk, id],
  );
}

export async function updateHotelRules(
  id: string,
  input: { minAdvanceDays: number; cutoffTime: string; payOnArrival: boolean },
) {
  await execute(
    `UPDATE hotels
     SET min_advance_days = ?, cutoff_time = ?, pay_on_arrival = ?
     WHERE id = ?`,
    [input.minAdvanceDays, input.cutoffTime, input.payOnArrival, id],
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
      0,
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
     SET room_type_id = ?, name = ?, room_type = lower(btrim(?)), description = ?, capacity = ?, cost_per_night = ?, public_price_per_night = ?, check_in = ?, check_out = ?
     WHERE id = ?`,
    [
      input.roomTypeId,
      input.name,
      input.name,
      input.description,
      input.capacity,
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

export async function listPurchaseOfferPhotos(purchaseId: string) {
  return query<{ id: string; offer_id: string; url: string }>(
    `SELECT photo.id, photo.offer_id, photo.url
     FROM offer_photos AS photo
     WHERE EXISTS (
       SELECT 1 FROM purchase_lines AS line
       WHERE line.offer_id = photo.offer_id AND line.purchase_id = ?
     )
     ORDER BY photo.sort_order, photo.id`,
    [purchaseId],
  );
}

export async function addOfferPhoto(offerId: string, file: File) {
  const offer = await query<{ id: string }>(
    "SELECT id FROM offers WHERE id = ?",
    [offerId],
  );
  if (!offer[0]) throw new Error("offer");
  const url = await saveImage(file, `offers/${offerId}`);
  try {
    await execute(
      `INSERT INTO offer_photos
        (id, offer_id, url, sort_order, content_type)
       VALUES (?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), offerId, url, Date.now(), file.type],
    );
  } catch (error) {
    await removeImages([url]);
    throw error;
  }
}

export async function deleteOfferPhoto(photoId: string) {
  const rows = await query<{ url: string }>(
    "SELECT url FROM offer_photos WHERE id = ?",
    [photoId],
  );
  await execute("DELETE FROM offer_photos WHERE id = ?", [photoId]);
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

export async function createAgency(
  input: Omit<
    Agency,
    | "id"
    | "createdAt"
    | "stopSale"
    | "disabled"
    | "isSupplier"
    | "nationalId"
    | "hasIdentityFile"
  >,
) {
  const id = crypto.randomUUID();
  const company = input.kind === "agency";
  await execute(
    `INSERT INTO agencies
      (id, name, name_ar, kind, country, contact_name, email, phone,
       commercial_registration, vat_number, vat_not_required, group_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.nameAr,
      input.kind,
      input.country,
      company ? input.contactName : "",
      input.email,
      input.phone,
      company ? input.commercialRegistration : "",
      company ? input.vatNumber : "",
      company ? input.vatNotRequired : false,
      company ? input.groupId : null,
      new Date().toISOString(),
    ],
  );
  return id;
}

export async function updateAgency(
  id: string,
  input: Omit<
    Agency,
    | "id"
    | "createdAt"
    | "stopSale"
    | "disabled"
    | "isSupplier"
    | "nationalId"
    | "hasIdentityFile"
  >,
) {
  const company = input.kind === "agency";
  await execute(
    `UPDATE agencies
     SET name = ?, name_ar = ?, kind = ?, country = ?, contact_name = ?, email = ?,
         phone = ?, commercial_registration = ?, vat_number = ?,
         vat_not_required = ?, group_id = ?
     WHERE id = ?`,
    [
      input.name,
      input.nameAr,
      input.kind,
      input.country,
      company ? input.contactName : "",
      input.email,
      input.phone,
      company ? input.commercialRegistration : "",
      company ? input.vatNumber : "",
      company ? input.vatNotRequired : false,
      company ? input.groupId : null,
      id,
    ],
  );
  if (company) {
    await execute(
      `UPDATE agencies
       SET national_id = '', identity_bytes = NULL,
           identity_content_type = '', identity_filename = ''
       WHERE id = ?`,
      [id],
    );
  } else {
    await execute("UPDATE agencies SET is_supplier = FALSE WHERE id = ?", [id]);
    await execute("DELETE FROM supplier_codes WHERE agency_id = ?", [id]);
  }
}

export async function updateAgencySelling(
  id: string,
  input: { stopSale: boolean; disabled: boolean },
) {
  const rows = await query<{ id: string }>(
    `UPDATE agencies SET stop_sale = ?, disabled = ? WHERE id = ? RETURNING id`,
    [input.stopSale, input.disabled, id],
  );
  return Boolean(rows[0]);
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
  contract_name: string | null;
  contract_type: string | null;
  contract_cost: number | null;
  priority: number | null;
  supplier_type: string | null;
  supplier_agency_id: string | null;
  contact_hotel: boolean | null;
  active: boolean | null;
  rate_card: string | null;
  meal_codes: string | null;
  meal_rates: string | null;
  view_names: string | null;
  view_rates: string | null;
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
  name_ar: string | null;
  weekend_cost: number | null;
  weekend_price: number | null;
  is_primary: boolean | null;
};

export function storedList(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function storedMealRates(value: string | null | undefined) {
  const rates: Record<string, MealRate> = {};
  if (!value) return rates;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return rates;
    for (const [code, raw] of Object.entries(parsed)) {
      if (!code || !raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      const weekdayPrice = row.weekdayPrice;
      const weekendPrice = row.weekendPrice;
      rates[code] = {
        weekdayCost: Number(row.weekdayCost ?? 0) || 0,
        weekendCost: Number(row.weekendCost ?? 0) || 0,
        weekdayPrice:
          weekdayPrice == null || weekdayPrice === "" ? null : Number(weekdayPrice),
        weekendPrice:
          weekendPrice == null || weekendPrice === "" ? null : Number(weekendPrice),
      };
    }
  } catch {
    return rates;
  }
  return rates;
}

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
    nameAr: row.name_ar ?? "",
    weekendCost: Number(row.weekend_cost ?? 0),
    weekendPrice:
      row.weekend_price == null ? null : Number(row.weekend_price),
    primary: Boolean(row.is_primary),
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
    contractName: row.contract_name ?? "",
    contractType: row.contract_type === "request" ? "request" : "block",
    contractCost: row.contract_cost == null ? null : Number(row.contract_cost),
    priority: Number(row.priority ?? 1) || 1,
    supplierType:
      row.supplier_type === "wholesaler" ? "wholesaler" : "hotel_direct",
    supplierAgencyId: row.supplier_agency_id,
    contactHotel: Boolean(row.contact_hotel),
    active: row.active == null ? true : Boolean(row.active),
    mealCodes: storedList(row.meal_codes),
    mealRates: storedMealRates(row.meal_rates),
    viewNames: storedList(row.view_names),
    viewRates: storedMealRates(row.view_rates),
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

export function purchaseAmount(purchase: { contractCost: number | null }) {
  return purchase.contractCost ?? 0;
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
    active: row.active == null ? true : Boolean(row.active),
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
        (id, purchase_id, room_type_id, room_name, description, capacity, quantity,
         cost_per_night, public_price_per_night, sort_order, check_in, check_out,
         board, view, min_nights, sale_mode, name_ar, weekend_cost, weekend_price,
         is_primary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        line.nameAr,
        line.weekendCost,
        line.weekendPrice,
        line.primary,
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
  contractName: string;
  contractType: ContractType;
  contractCost: number | null;
  priority: number;
  supplierType: SupplierType;
  supplierAgencyId: string | null;
  contactHotel: boolean;
  active: boolean;
  mealCodes: string[];
  mealRates: Record<string, MealRate>;
  viewNames: string[];
  viewRates: Record<string, MealRate>;
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
         SET hotel_id = ?, check_in = ?, check_out = ?, notes = ?,
             contract_name = ?, contract_type = ?, contract_cost = ?,
             priority = ?, supplier_type = ?, supplier_agency_id = ?, contact_hotel = ?, active = ?,
             rate_card = ?, meal_codes = ?, meal_rates = ?, view_rates = ?, view_names = ?
         WHERE id = ? AND status = 'draft'`,
        [
          input.hotelId,
          checkIn,
          checkOut,
          input.notes,
          input.contractName,
          input.contractType,
          input.contractCost,
          input.priority,
          input.supplierType,
          input.supplierType === "wholesaler" ? input.supplierAgencyId : null,
          input.contactHotel,
          input.active,
          "",
          JSON.stringify(input.mealCodes),
          JSON.stringify(input.mealRates),
          JSON.stringify(input.viewRates),
          JSON.stringify(input.viewNames),
          purchaseId,
        ],
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
            (id, number, hotel_id, status, check_in, check_out, notes, created_at,
             contract_name, contract_type, contract_cost, priority, supplier_type,
             supplier_agency_id, contact_hotel, active, rate_card, meal_codes,
             meal_rates, view_rates, view_names)
           VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            number,
            input.hotelId,
            checkIn,
            checkOut,
            input.notes,
            new Date().toISOString(),
            input.contractName,
            input.contractType,
            input.contractCost,
            input.priority,
            input.supplierType,
            input.supplierType === "wholesaler" ? input.supplierAgencyId : null,
            input.contactHotel,
            input.active,
            "",
            JSON.stringify(input.mealCodes),
            JSON.stringify(input.mealRates),
            JSON.stringify(input.viewRates),
            JSON.stringify(input.viewNames),
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
    const policyId = crypto.randomUUID();
    const confirmedAt = new Date().toISOString();
    await sql.execute(
      `INSERT INTO contract_policies
        (id, purchase_id, name, general_terms, cancellation_terms,
         payment_terms, release_days, refundable, active, created_at)
       VALUES (?, ?, 'Standard', '', '', '', 0, TRUE, TRUE, ?)`,
      [policyId, id, confirmedAt],
    );
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
      await sql.execute(
        `INSERT INTO contract_periods
          (id, purchase_line_id, policy_id, check_in, check_out, quantity,
           cost_per_night, public_price_per_night,
           default_agency_price_per_night, min_nights, sale_mode, stop_sale,
           overbook_limit, hold_minutes, active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, 0, 1440, TRUE, ?)`,
        [
          crypto.randomUUID(),
          line.id,
          policyId,
          line.checkIn,
          line.checkOut,
          line.quantity,
          line.costPerNight,
          line.publicPricePerNight,
          line.publicPricePerNight,
          line.minNights,
          line.saleMode,
          confirmedAt,
        ],
      );
    }
    await sql.execute(
      `UPDATE purchases SET status = 'confirmed', confirmed_at = ? WHERE id = ? AND status = 'draft'`,
      [confirmedAt, id],
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

export async function unarchivePurchase(id: string) {
  const purchase = await getPurchase(id);
  if (!purchase || purchase.status !== "cancelled") {
    return { ok: false as const, error: "purchase" as const };
  }
  await execute(
    "UPDATE purchases SET status = 'confirmed' WHERE id = ? AND status = 'cancelled'",
    [id],
  );
  return { ok: true as const };
}

function contractLineKey(line: { primary: boolean; roomTypeId: string | null }) {
  return `${line.primary ? "p" : "v"}:${line.roomTypeId ?? ""}`;
}

async function lineHasSales(
  sql: Pick<SqlClient, "query">,
  line: { id: string; offerId: string | null },
) {
  const sold = await sql.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM allotment_lines AS sale
     JOIN allotments AS allotment ON allotment.id = sale.allotment_id
     WHERE allotment.status IN ('provisional', 'confirmed')
       AND (
         sale.purchase_line_id = ?
         OR (sale.purchase_line_id IS NULL AND sale.offer_id = ?)
       )`,
    [line.id, line.offerId],
  );
  return Number(sold[0]?.count ?? 0) > 0;
}

async function salesOutsideWindow(
  sql: Pick<SqlClient, "query">,
  line: { id: string; offerId: string | null },
  checkIn: string,
  checkOut: string,
) {
  const sold = await sql.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM allotment_lines AS sale
     JOIN allotments AS allotment ON allotment.id = sale.allotment_id
     WHERE allotment.status IN ('provisional', 'confirmed')
       AND (
         sale.purchase_line_id = ?
         OR (sale.purchase_line_id IS NULL AND sale.offer_id = ?)
       )
       AND (allotment.check_in < ? OR allotment.check_out > ?)`,
    [line.id, line.offerId, checkIn, checkOut],
  );
  return Number(sold[0]?.count ?? 0) > 0;
}

async function takenOnLine(
  sql: Pick<SqlClient, "query">,
  purchaseLineId: string,
  checkIn: string,
  checkOut: string,
) {
  const rows = await sql.query<{ taken: number }>(
    `SELECT COALESCE(MAX(day_taken), 0)::int AS taken
     FROM (
       SELECT COALESCE((
         SELECT SUM(sale.quantity)::int
         FROM allotment_lines AS sale
         JOIN allotments AS reservation ON reservation.id = sale.allotment_id
         WHERE sale.purchase_line_id = ?
           AND reservation.status IN ('provisional', 'confirmed')
           AND reservation.check_in::date <= day.day::date
           AND reservation.check_out::date > day.day::date
       ), 0) AS day_taken
       FROM generate_series(
         ?::timestamp,
         (?::date - INTERVAL '1 day')::timestamp,
         INTERVAL '1 day'
       ) AS day(day)
     ) AS nights`,
    [purchaseLineId, checkIn, checkOut],
  );
  return Number(rows[0]?.taken ?? 0);
}

async function activePolicyId(sql: SqlClient, purchaseId: string) {
  const rows = await sql.query<{ id: string }>(
    `SELECT id FROM contract_policies
     WHERE purchase_id = ? AND active = TRUE
     ORDER BY created_at
     LIMIT 1`,
    [purchaseId],
  );
  if (rows[0]) return rows[0].id;
  const id = crypto.randomUUID();
  await sql.execute(
    `INSERT INTO contract_policies
      (id, purchase_id, name, general_terms, cancellation_terms,
       payment_terms, release_days, refundable, active, created_at)
     VALUES (?, ?, 'Standard', '', '', '', 0, TRUE, TRUE, ?)`,
    [id, purchaseId, new Date().toISOString()],
  );
  return id;
}

async function insertConfirmedLine(
  sql: SqlClient,
  purchaseId: string,
  line: PurchaseLineInput,
  offerId: string,
) {
  const id = crypto.randomUUID();
  await sql.execute(
    `INSERT INTO purchase_lines
      (id, purchase_id, room_type_id, room_name, description, capacity, quantity,
       cost_per_night, public_price_per_night, sort_order, check_in, check_out,
       board, view, min_nights, sale_mode, name_ar, weekend_cost, weekend_price,
       is_primary, offer_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      purchaseId,
      line.roomTypeId,
      line.roomName,
      line.description,
      line.capacity,
      line.quantity,
      line.costPerNight,
      line.publicPricePerNight,
      line.checkIn,
      line.checkOut,
      line.board,
      line.view,
      line.minNights,
      line.saleMode,
      line.nameAr,
      line.weekendCost,
      line.weekendPrice,
      line.primary,
      offerId,
    ],
  );
  return id;
}

async function openPeriod(
  sql: SqlClient,
  lineId: string,
  policyId: string,
  line: PurchaseLineInput,
) {
  await sql.execute(
    `INSERT INTO contract_periods
      (id, purchase_line_id, policy_id, check_in, check_out, quantity,
       cost_per_night, public_price_per_night, default_agency_price_per_night,
       min_nights, sale_mode, stop_sale, overbook_limit, hold_minutes,
       active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, 0, 1440, TRUE, ?)`,
    [
      crypto.randomUUID(),
      lineId,
      policyId,
      line.checkIn,
      line.checkOut,
      line.quantity,
      line.costPerNight,
      line.publicPricePerNight,
      line.publicPricePerNight,
      line.minNights,
      line.saleMode,
      new Date().toISOString(),
    ],
  );
}

async function rewriteLinePeriods(
  sql: SqlClient,
  lineId: string,
  policyId: string,
  line: PurchaseLineInput,
  previousPublic: number | null,
) {
  const periods = await sql.query<{
    id: string;
    check_in: string;
    check_out: string;
    default_agency_price_per_night: number | null;
  }>(
    `SELECT id, check_in, check_out, default_agency_price_per_night
     FROM contract_periods
     WHERE purchase_line_id = ? AND active = TRUE
     ORDER BY check_in, id
     FOR UPDATE`,
    [lineId],
  );
  const surviving: Array<{
    id: string;
    checkIn: string;
    checkOut: string;
    agency: number | null;
  }> = [];
  for (const period of periods) {
    if (period.check_out <= line.checkIn || period.check_in >= line.checkOut) {
      await sql.execute(
        "UPDATE contract_periods SET active = FALSE WHERE id = ?",
        [period.id],
      );
      continue;
    }
    const agency = period.default_agency_price_per_night;
    const followsPublic =
      agency == null ||
      (previousPublic != null && Number(agency) === Number(previousPublic));
    surviving.push({
      id: period.id,
      checkIn: period.check_in < line.checkIn ? line.checkIn : period.check_in,
      checkOut: period.check_out > line.checkOut ? line.checkOut : period.check_out,
      agency: followsPublic ? line.publicPricePerNight : agency,
    });
  }
  if (!surviving.length) {
    await openPeriod(sql, lineId, policyId, line);
    return;
  }
  surviving.sort((left, right) => left.checkIn.localeCompare(right.checkIn));
  if (surviving[0].checkIn > line.checkIn) surviving[0].checkIn = line.checkIn;
  const last = surviving[surviving.length - 1];
  if (last.checkOut < line.checkOut) last.checkOut = line.checkOut;
  for (const period of surviving) {
    await sql.execute(
      `UPDATE contract_periods
       SET check_in = ?, check_out = ?, quantity = ?, cost_per_night = ?,
           public_price_per_night = ?, default_agency_price_per_night = ?,
           sale_mode = ?
       WHERE id = ?`,
      [
        period.checkIn,
        period.checkOut,
        line.quantity,
        line.costPerNight,
        line.publicPricePerNight,
        period.agency,
        line.saleMode,
        period.id,
      ],
    );
  }
}

export async function reviseConfirmedPurchase(
  existing: Purchase,
  input: {
    hotelId: string;
    notes: string;
    lines: PurchaseLineInput[];
    contractName: string;
    contractType: ContractType;
    contractCost: number | null;
    priority: number;
    supplierType: SupplierType;
    supplierAgencyId: string | null;
    contactHotel: boolean;
    active: boolean;
    mealCodes: string[];
    mealRates: Record<string, MealRate>;
    viewNames: string[];
    viewRates: Record<string, MealRate>;
  },
) {
  if (existing.status !== "confirmed") {
    return { ok: false as const, error: "purchase" as const };
  }
  for (const line of input.lines) {
    const period = purchasePeriodError(line.checkIn, line.checkOut);
    if (period) return { ok: false as const, error: period };
  }
  if (!(await getHotel(input.hotelId))) {
    return { ok: false as const, error: "invalid" as const };
  }

  const previousByKey = new Map(
    existing.lines.map((line) => [contractLineKey(line), line]),
  );
  const nextKeys = new Set(input.lines.map((line) => contractLineKey(line)));
  const removed = existing.lines.filter((line) => !nextKeys.has(contractLineKey(line)));
  const hotelChanged = input.hotelId !== existing.hotelId;

  return transaction(async (sql) => {
    const locked = await sql.query<{ id: string }>(
      "SELECT id FROM purchases WHERE id = ? AND status = 'confirmed' FOR UPDATE",
      [existing.id],
    );
    if (!locked[0]) return { ok: false as const, error: "purchase" as const };

    if (hotelChanged) {
      for (const line of existing.lines) {
        if (await lineHasSales(sql, line)) {
          return { ok: false as const, error: "sold" as const };
        }
      }
    }
    for (const line of removed) {
      if (await lineHasSales(sql, line)) {
        return { ok: false as const, error: "sold" as const };
      }
    }
    for (const line of input.lines) {
      const previous = previousByKey.get(contractLineKey(line));
      if (!previous) continue;
      if (await salesOutsideWindow(sql, previous, line.checkIn, line.checkOut)) {
        return { ok: false as const, error: "sold" as const };
      }
      const covered = await sql.query<{ overbook: number }>(
        `SELECT COALESCE(MAX(overbook_limit), 0)::int AS overbook
         FROM contract_periods
         WHERE purchase_line_id = ? AND active = TRUE`,
        [previous.id],
      );
      const taken = await takenOnLine(sql, previous.id, line.checkIn, line.checkOut);
      if (taken > line.quantity + Number(covered[0]?.overbook ?? 0)) {
        return { ok: false as const, error: "sold" as const };
      }
    }

    const span = input.lines.length
      ? headerDates(input.lines)
      : { checkIn: existing.checkIn, checkOut: existing.checkOut };
    await sql.execute(
      `UPDATE purchases
       SET hotel_id = ?, check_in = ?, check_out = ?, notes = ?,
           contract_name = ?, contract_type = ?, contract_cost = ?,
           priority = ?, supplier_type = ?, supplier_agency_id = ?, contact_hotel = ?, active = ?,
           meal_codes = ?, meal_rates = ?, view_rates = ?, view_names = ?
       WHERE id = ? AND status = 'confirmed'`,
      [
        input.hotelId,
        span.checkIn,
        span.checkOut,
        input.notes,
        input.contractName,
        input.contractType,
        input.contractCost,
        input.priority,
        input.supplierType,
        input.supplierType === "wholesaler" ? input.supplierAgencyId : null,
        input.contactHotel,
        input.active,
        JSON.stringify(input.mealCodes),
        JSON.stringify(input.mealRates),
        JSON.stringify(input.viewRates),
        JSON.stringify(input.viewNames),
        existing.id,
      ],
    );

    for (const line of removed) {
      await sql.execute(
        `UPDATE allotment_lines AS sale
         SET contract_period_id = NULL
         FROM allotments AS allotment
         WHERE sale.allotment_id = allotment.id
           AND allotment.status NOT IN ('provisional', 'confirmed')
           AND sale.contract_period_id IN (
             SELECT id FROM contract_periods WHERE purchase_line_id = ?
           )`,
        [line.id],
      );
      await sql.execute("DELETE FROM purchase_lines WHERE id = ?", [line.id]);
    }

    const policyId = await activePolicyId(sql, existing.id);
    for (const [index, line] of input.lines.entries()) {
      const offerId = await ensureOffer(sql, {
        hotelId: input.hotelId,
        roomTypeId: line.roomTypeId,
        board: line.board,
        view: line.view,
      });
      const previous = previousByKey.get(contractLineKey(line));
      if (!previous) {
        const lineId = await insertConfirmedLine(sql, existing.id, line, offerId);
        await sql.execute(
          "UPDATE purchase_lines SET sort_order = ? WHERE id = ?",
          [index, lineId],
        );
        await openPeriod(sql, lineId, policyId, line);
        continue;
      }
      await sql.execute(
        `UPDATE purchase_lines
         SET room_type_id = ?, room_name = ?, description = ?, capacity = ?, quantity = ?,
             cost_per_night = ?, public_price_per_night = ?, sort_order = ?,
             check_in = ?, check_out = ?, board = ?, view = ?, min_nights = ?,
             sale_mode = ?, name_ar = ?, weekend_cost = ?, weekend_price = ?,
             is_primary = ?, offer_id = ?
         WHERE id = ?`,
        [
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
          line.nameAr,
          line.weekendCost,
          line.weekendPrice,
          line.primary,
          offerId,
          previous.id,
        ],
      );
      await rewriteLinePeriods(
        sql,
        previous.id,
        policyId,
        line,
        previous.publicPricePerNight,
      );
    }
    return { ok: true as const, id: existing.id };
  });
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
    amountBasis?: "night" | "stay";
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
    purchase_line_id: string;
    name: string;
    hotel_name: string;
    cost_per_night: number;
    check_in: string;
    check_out: string;
    board: string;
    view: string;
    offer_id: string | null;
    min_nights: number;
    sale_mode: string;
    stop_sale: boolean;
    default_agency_price_per_night: number | null;
    public_price_per_night: number | null;
    meal_codes: string | null;
    meal_rates: string | null;
    view_names: string | null;
    view_rates: string | null;
    policy_name: string | null;
    general_terms: string | null;
    cancellation_terms: string | null;
    payment_terms: string | null;
    release_days: number | null;
    refundable: boolean | null;
  }>(
    `SELECT period.id, period.purchase_line_id, type.name,
            period.cost_per_night, period.check_in, period.check_out,
            offer.board, offer.view, line.offer_id, hotel.name AS hotel_name,
            period.min_nights, period.sale_mode, period.stop_sale,
            period.default_agency_price_per_night, period.public_price_per_night,
            purchase.meal_codes, purchase.meal_rates, purchase.view_names, purchase.view_rates,
            policy.name AS policy_name,
            policy.general_terms, policy.cancellation_terms,
            policy.payment_terms, policy.release_days, policy.refundable
     FROM contract_periods AS period
     JOIN purchase_lines AS line ON line.id = period.purchase_line_id
     JOIN purchases AS purchase ON purchase.id = line.purchase_id
     JOIN hotels AS hotel ON hotel.id = purchase.hotel_id
     JOIN offers AS offer ON offer.id = line.offer_id
     JOIN room_types AS type ON type.id = offer.room_type_id
     LEFT JOIN contract_policies AS policy ON policy.id = period.policy_id
     WHERE purchase.status = 'confirmed' AND period.active = TRUE
     ORDER BY hotel.name, type.name, offer.board, offer.view,
              period.check_in, period.check_out`,
  );
  return rows.map((row) => ({
    id: row.id,
    purchaseLineId: row.purchase_line_id,
    name: row.name,
    hotelName: row.hotel_name,
    costPerNight: Number(row.cost_per_night),
    checkIn: row.check_in,
    checkOut: row.check_out,
    board: mealPlanCode(row.board) ?? "room_only",
    view: row.view ?? "",
    offerId: row.offer_id,
    minNights: Number(row.min_nights),
    saleMode: saleModeCode(row.sale_mode) ?? "book",
    stopSale: Boolean(row.stop_sale),
    defaultAgencyPricePerNight:
      row.default_agency_price_per_night == null
        ? null
        : Number(row.default_agency_price_per_night),
    roomPrice:
      row.public_price_per_night == null
        ? row.default_agency_price_per_night == null
          ? 0
          : Number(row.default_agency_price_per_night)
        : Number(row.public_price_per_night),
    meals: storedList(row.meal_codes).map((code) => {
      const rate = storedMealRates(row.meal_rates)[code];
      return {
        code,
        cost: rate?.weekdayCost ?? 0,
        price: rate?.weekdayPrice ?? 0,
      };
    }),
    views: storedList(row.view_names).map((name) => {
      const rate = storedMealRates(row.view_rates)[name];
      return {
        name,
        cost: rate?.weekdayCost ?? 0,
        price: rate?.weekdayPrice ?? 0,
      };
    }),
    policyName: row.policy_name ?? "",
    generalTerms: row.general_terms ?? "",
    cancellationTerms: row.cancellation_terms ?? "",
    paymentTerms: row.payment_terms ?? "",
    releaseDays: Number(row.release_days ?? 0),
    refundable: row.refundable ?? true,
  }));
}

type AllotmentRow = {
  id: string;
  number: string;
  agency_id: string;
  agency_name: string;
  commercial_id: string | null;
  commercial_name: string | null;
  commission_percent: number | null;
  status: string;
  channel: string | null;
  booking_id: string | null;
  submission_id: string | null;
  check_in: string;
  check_out: string;
  notes: string;
  created_at: string;
  confirmed_at: string | null;
  hold_until: string | null;
  terms_accepted_at: string | null;
  terms_accepted_by: string | null;
  terms_version: string | null;
  cancel_requested_at: string | null;
  cancel_request_reason: string | null;
  supplier_status: string | null;
  supplier_reference: string | null;
  supplier_sent_at: string | null;
  supplier_confirmed_at: string | null;
  supplier_notes: string | null;
  sale_source: string | null;
  hotel_id: string | null;
  stay_hotel_name: string | null;
  guest_name: string | null;
  pay_before: string | null;
  pay_on_arrival: boolean | null;
  penalty_amount: number | null;
};

type AllotmentLineRow = {
  id: string;
  allotment_id: string;
  room_id: string | null;
  offer_id: string | null;
  purchase_line_id: string | null;
  contract_period_id: string | null;
  hotel_name: string | null;
  room_name: string | null;
  room_check_in: string | null;
  room_check_out: string | null;
  board_snapshot: string | null;
  view_snapshot: string | null;
  terms_snapshot: Record<string, unknown> | string | null;
  quantity: number;
  cost_per_night: number;
  agency_price_per_night: number;
  amount_basis: string | null;
  price_includes_vat: boolean | null;
  rate_snapshot: string | null;
  supplier_status: string | null;
};

function asAllotmentStatus(value: string): AllotmentStatus {
  if (value === "draft") return "request";
  return allotmentStatuses.includes(value as AllotmentStatus)
    ? (value as AllotmentStatus)
    : "request";
}

export function asLineSupplierStatus(value: string | null | undefined): LineSupplierStatus {
  return lineSupplierStatuses.includes(value as LineSupplierStatus)
    ? (value as LineSupplierStatus)
    : "new";
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
    contractPeriodId: row.contract_period_id,
    hotelName: row.hotel_name ?? "",
    roomName: row.room_name ?? "",
    roomCheckIn: row.room_check_in,
    roomCheckOut: row.room_check_out,
    boardSnapshot: mealPlanCode(row.board_snapshot ?? "") ?? "room_only",
    viewSnapshot: row.view_snapshot ?? "",
    termsSnapshot:
      typeof row.terms_snapshot === "string"
        ? (JSON.parse(row.terms_snapshot) as Record<string, unknown>)
        : (row.terms_snapshot ?? {}),
    quantity: Number(row.quantity),
    costPerNight: Number(row.cost_per_night),
    agencyPricePerNight: Number(row.agency_price_per_night),
    amountBasis: row.amount_basis === "stay" ? "stay" : "night",
    priceIncludesVat: Boolean(row.price_includes_vat),
    rateSnapshot: storedRateSnapshot(row.rate_snapshot),
    supplierStatus: asLineSupplierStatus(row.supplier_status),
  };
}

function storedRateSnapshot(value: string | null | undefined): RateSnapshot {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as RateSnapshot;
  } catch {
    return {};
  }
}

function mapAllotment(row: AllotmentRow, lines: AllotmentLine[]): Allotment {
  return {
    id: row.id,
    number: row.number,
    agencyId: row.agency_id,
    agencyName: row.agency_name,
    commercialId: row.commercial_id,
    commercialName: row.commercial_name ?? "",
    commissionPercent:
      row.commission_percent == null ? null : Number(row.commission_percent),
    status: asAllotmentStatus(row.status),
    channel: asSaleChannel(row.channel),
    saleSource: row.sale_source === "direct" ? "direct" : "contract",
    hotelId: row.hotel_id,
    hotelName: row.stay_hotel_name ?? "",
    guestName: row.guest_name ?? "",
    payBefore: row.pay_before ?? "",
    payOnArrival: Boolean(row.pay_on_arrival),
    penaltyAmount: Number(row.penalty_amount ?? 0),
    bookingId: row.booking_id,
    submissionId: row.submission_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    notes: row.notes,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
    holdUntil: row.hold_until,
    termsAcceptedAt: row.terms_accepted_at,
    termsAcceptedBy: row.terms_accepted_by ?? "",
    termsVersion: row.terms_version ?? "",
    cancellationRequestedAt: row.cancel_requested_at,
    cancellationReason: row.cancel_request_reason ?? "",
    supplierStatus: row.supplier_status ?? "not_requested",
    supplierReference: row.supplier_reference ?? "",
    supplierSentAt: row.supplier_sent_at,
    supplierConfirmedAt: row.supplier_confirmed_at,
    supplierNotes: row.supplier_notes ?? "",
    lines,
  };
}

async function allotmentLines(allotmentId?: string) {
  const rows = await query<AllotmentLineRow>(
    `SELECT l.id, l.allotment_id, l.room_id, l.offer_id, l.purchase_line_id,
            l.contract_period_id, l.board_snapshot, l.view_snapshot, l.terms_snapshot,
            l.quantity, l.cost_per_night, l.agency_price_per_night,
            l.amount_basis, l.price_includes_vat, l.rate_snapshot, l.supplier_status,
            COALESCE(hotel.name, room_hotel.name, l.direct_hotel, '') AS hotel_name,
            COALESCE(type.name, room.name, l.direct_room, '') AS room_name,
            COALESCE(period.check_in, contract.check_in, room.check_in) AS room_check_in,
            COALESCE(period.check_out, contract.check_out, room.check_out) AS room_check_out
     FROM allotment_lines l
     LEFT JOIN rooms room ON room.id = l.room_id
     LEFT JOIN hotels room_hotel ON room_hotel.id = room.hotel_id
     LEFT JOIN offers offer ON offer.id = COALESCE(l.offer_id, room.offer_id)
     LEFT JOIN room_types type ON type.id = offer.room_type_id
     LEFT JOIN hotels hotel ON hotel.id = offer.hotel_id
     LEFT JOIN purchase_lines contract ON contract.id = l.purchase_line_id
     LEFT JOIN contract_periods period ON period.id = l.contract_period_id
     ${allotmentId ? "WHERE l.allotment_id = ?" : ""}
     ORDER BY l.sort_order, l.id`,
    allotmentId ? [allotmentId] : [],
  );
  return rows.map(mapAllotmentLine);
}

export async function listAllotments(filter?: { status?: AllotmentStatus }) {
  const rows = await query<AllotmentRow>(
    `SELECT a.*, g.name AS agency_name, commercial.name AS commercial_name,
            stay_hotel.name AS stay_hotel_name
     FROM allotments a
     JOIN agencies g ON g.id = a.agency_id
     LEFT JOIN commercials AS commercial ON commercial.id = a.commercial_id
     LEFT JOIN hotels AS stay_hotel ON stay_hotel.id = a.hotel_id
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
    `SELECT a.*, g.name AS agency_name, commercial.name AS commercial_name,
            stay_hotel.name AS stay_hotel_name
     FROM allotments a
     JOIN agencies g ON g.id = a.agency_id
     LEFT JOIN commercials AS commercial ON commercial.id = a.commercial_id
     LEFT JOIN hotels AS stay_hotel ON stay_hotel.id = a.hotel_id
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
    holdUntil?: string | null;
    lines?: AllotmentLineInput[];
  },
) {
  const id = crypto.randomUUID();
  const number = await nextAllotmentNumber(sql);
  const status = input.status ?? "request";
  const holdUntil = status === "provisional" ? (input.holdUntil ?? null) : null;
  if (status === "provisional" && !holdUntil) {
    throw new Error("PROVISIONAL_HOLD_REQUIRED");
  }
  await sql.execute(
    `INSERT INTO allotments
      (id, number, agency_id, status, check_in, check_out, notes, created_at,
       confirmed_at, channel, booking_id, submission_id, hold_until)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      holdUntil,
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
  start = 0,
) {
  for (const [index, line] of lines.entries()) {
    await sql.execute(
      `INSERT INTO allotment_lines
        (id, allotment_id, room_id, offer_id, purchase_line_id,
         contract_period_id, quantity, cost_per_night,
         agency_price_per_night, sort_order, board_snapshot,
         view_snapshot, terms_snapshot, amount_basis, price_includes_vat, rate_snapshot,
         direct_hotel, direct_room)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        allotmentId,
        line.roomId || null,
        line.offerId,
        line.purchaseLineId,
        line.contractPeriodId ?? null,
        line.quantity,
        line.costPerNight,
        line.agencyPricePerNight,
        start + index,
        line.boardSnapshot ?? "room_only",
        line.viewSnapshot ?? "",
        JSON.stringify(line.termsSnapshot ?? {}),
        line.amountBasis ?? "night",
        Boolean(line.priceIncludesVat),
        JSON.stringify(line.rateSnapshot ?? {}),
        line.directHotel ?? "",
        line.directRoom ?? "",
      ],
    );
  }
}

async function prepareSaleLines(
  lines: AllotmentLineInput[],
  checkIn: string,
  checkOut: string,
) {
  const ids = lines
    .map((line) => line.contractPeriodId)
    .filter((id): id is string => Boolean(id));
  if (!ids.length || ids.length !== lines.length) {
    return { ok: false as const, error: "missing-room" as const };
  }
  const unique = [...new Set(ids)];
  const rows = await query<{
    id: string;
    purchase_line_id: string;
    offer_id: string | null;
    check_in: string;
    check_out: string;
    cost_per_night: number;
    board: string;
    view: string;
    policy_name: string | null;
    general_terms: string | null;
    cancellation_terms: string | null;
    payment_terms: string | null;
    release_days: number | null;
    refundable: boolean | null;
    public_price_per_night: number | null;
    default_agency_price_per_night: number | null;
    meal_codes: string | null;
    meal_rates: string | null;
    view_names: string | null;
    view_rates: string | null;
  }>(
    `SELECT period.id, period.purchase_line_id, line.offer_id,
            period.check_in, period.check_out, period.cost_per_night,
            period.public_price_per_night, period.default_agency_price_per_night,
            purchase.meal_codes, purchase.meal_rates, purchase.view_names, purchase.view_rates,
            offer.board, offer.view, policy.name AS policy_name,
            policy.general_terms, policy.cancellation_terms,
            policy.payment_terms, policy.release_days, policy.refundable
     FROM contract_periods AS period
     JOIN purchase_lines AS line ON line.id = period.purchase_line_id
     JOIN purchases AS purchase ON purchase.id = line.purchase_id
     JOIN offers AS offer ON offer.id = line.offer_id
     LEFT JOIN contract_policies AS policy ON policy.id = period.policy_id
     WHERE purchase.status = 'confirmed'
       AND period.active = TRUE
       AND period.id IN (${unique.map(() => "?").join(", ")})`,
    unique,
  );
  if (rows.length !== unique.length) {
    return { ok: false as const, error: "missing-room" as const };
  }
  const byId = new Map(rows.map((row) => [row.id, row]));
  const prepared: AllotmentLineInput[] = [];
  for (const line of lines) {
    const contract = byId.get(line.contractPeriodId ?? "");
    if (!contract?.offer_id) {
      return { ok: false as const, error: "missing-room" as const };
    }
    if (checkIn < contract.check_in || checkOut > contract.check_out) {
      return { ok: false as const, error: "window" as const };
    }
    let costPerNight = Number(contract.cost_per_night);
    let agencyPricePerNight = line.agencyPricePerNight;
    let boardSnapshot = mealPlanCode(contract.board) ?? "room_only";
    let viewSnapshot = contract.view ?? "";
    let amountBasis = line.amountBasis ?? "night";
    let rateSnapshot = line.rateSnapshot;
    if (line.quote) {
      const meals = storedList(contract.meal_codes);
      const mealRates = storedMealRates(contract.meal_rates);
      const views = storedList(contract.view_names);
      const viewRates = storedMealRates(contract.view_rates);
      const meal = mealPlanCode(line.mealCode ?? "") ?? boardSnapshot;
      const view = (line.viewName ?? "").trim().slice(0, 80);
      if ((meals.length && !meals.includes(meal)) || (views.length ? !views.includes(view) : Boolean(view))) {
        return { ok: false as const, error: "invalid" as const };
      }
      const mealPart = mealRates[meal];
      const viewPart = view ? viewRates[view] : undefined;
      const roomCost = Number(contract.cost_per_night);
      const roomPrice =
        contract.public_price_per_night == null
          ? contract.default_agency_price_per_night == null
            ? 0
            : Number(contract.default_agency_price_per_night)
          : Number(contract.public_price_per_night);
      const mealCost = mealPart?.weekdayCost ?? 0;
      const mealPrice = mealPart?.weekdayPrice ?? 0;
      const viewCost = viewPart?.weekdayCost ?? 0;
      const viewPrice = viewPart?.weekdayPrice ?? 0;
      costPerNight = roomCost + mealCost + viewCost;
      agencyPricePerNight = roomPrice + mealPrice + viewPrice;
      boardSnapshot = meal;
      viewSnapshot = view;
      amountBasis = "night";
      rateSnapshot = {
        room: { cost: roomCost, price: roomPrice },
        meal: { code: meal, cost: mealCost, price: mealPrice },
        view: { name: view, cost: viewCost, price: viewPrice },
      };
    }
    prepared.push({
      ...line,
      offerId: contract.offer_id,
      purchaseLineId: contract.purchase_line_id,
      contractPeriodId: contract.id,
      roomId: "",
      costPerNight,
      agencyPricePerNight,
      boardSnapshot,
      viewSnapshot,
      amountBasis,
      rateSnapshot,
      termsSnapshot: {
        name: contract.policy_name ?? "",
        generalTerms: contract.general_terms ?? "",
        cancellationTerms: contract.cancellation_terms ?? "",
        paymentTerms: contract.payment_terms ?? "",
        releaseDays: Number(contract.release_days ?? 0),
        refundable: contract.refundable ?? true,
      },
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
  termsAccepted?: boolean;
  termsAcceptedBy?: string;
  saleSource?: "contract" | "direct";
  commercialId?: string | null;
  lines: AllotmentLineInput[];
}) {
  const period = allotmentPeriodError(input.checkIn, input.checkOut);
  if (period) return { ok: false as const, error: period };
  const agency = await query<{ id: string }>(
    "SELECT id FROM agencies WHERE id = ?",
    [input.agencyId],
  );
  if (!agency[0]) return { ok: false as const, error: "agency" as const };
  if (!input.id && !(await clientCanBuy(input.agencyId))) {
    return { ok: false as const, error: "client" as const };
  }
  const commission = await activeCommercial(input.commercialId ?? "");
  if (!commission.ok) return { ok: false as const, error: "commercial" as const };
  const saleSource = input.saleSource === "direct" ? "direct" : "contract";

  if (input.id) {
    const existing = await getAllotment(input.id);
    if (!existing || existing.status !== "request" || existing.channel === "b2c") {
      return { ok: false as const, error: "allotment" as const };
    }
    const allotmentId = input.id;
    await transaction(async (sql) => {
      await sql.execute(
        `UPDATE allotments
         SET agency_id = ?, check_in = ?, check_out = ?, notes = ?,
             sale_source = ?,
             terms_accepted_at = ?,
             terms_accepted_by = ?,
             commercial_id = ?,
             commission_percent = ?
         WHERE id = ? AND status = 'request'`,
        [
          input.agencyId,
          input.checkIn,
          input.checkOut,
          input.notes,
          saleSource,
          input.termsAccepted ? new Date().toISOString() : null,
          input.termsAccepted ? (input.termsAcceptedBy ?? "") : null,
          commission.id,
          commission.percent,
          allotmentId,
        ],
      );
      await appendReservationEvent(sql, {
        allotmentId,
        eventType: "reservation_updated",
        actorType: "admin",
      });
    });
    return { ok: true as const, id: allotmentId };
  }

  const prepared =
    saleSource === "direct"
      ? { ok: true as const, lines: input.lines }
      : await prepareSaleLines(input.lines, input.checkIn, input.checkOut);
  if (!prepared.ok) return prepared;
  const lines = prepared.lines;

  const id = crypto.randomUUID();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await transaction(async (sql) => {
        const number = await nextAllotmentNumber(sql);
        await sql.execute(
          `INSERT INTO allotments
            (id, number, agency_id, status, check_in, check_out, notes,
             created_at, sale_source, terms_accepted_at, terms_accepted_by,
             commercial_id, commission_percent)
           VALUES (?, ?, ?, 'request', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            number,
            input.agencyId,
            input.checkIn,
            input.checkOut,
            input.notes,
            new Date().toISOString(),
            saleSource,
            input.termsAccepted ? new Date().toISOString() : null,
            input.termsAccepted ? (input.termsAcceptedBy ?? "") : null,
            commission.id,
            commission.percent,
          ],
        );
        await insertAllotmentLines(sql, id, lines);
        await appendReservationEvent(sql, {
          allotmentId: id,
          eventType: "reservation_created",
          actorType: "admin",
        });
      });
      return { ok: true as const, id };
    } catch (error) {
      if (isUniqueViolation(error) && attempt < 2) continue;
      throw error;
    }
  }
  return { ok: false as const, error: "allotment" as const };
}

export async function holdAllotment(id: string, allowOverbook = false) {
  return moveReservation(id, "provisional", { type: "admin", allowOverbook });
}

export async function confirmAllotment(id: string, allowOverbook = false) {
  return moveReservation(id, "confirmed", { type: "admin", allowOverbook });
}

type HoldingLine = {
  contractPeriodId: string | null;
  quantity: number;
  supplierStatus: string;
};

async function guardHoldingLines(
  sql: SqlClient,
  allotment: {
    id: string;
    status: string;
    channel: string;
    checkIn: string;
    checkOut: string;
    saleSource: "contract" | "direct";
  },
  lines: HoldingLine[],
  allowOverbook: boolean,
) {
  if (allotment.channel === "b2c") {
    return { ok: false as const, error: "allotment" as const };
  }
  if (allotment.status !== "provisional" && allotment.status !== "confirmed") {
    return { ok: true as const };
  }
  if (allotment.saleSource === "direct") return { ok: true as const };
  const holding = lines.filter(
    (line) =>
      line.contractPeriodId &&
      line.supplierStatus !== "cancelled" &&
      line.supplierStatus !== "no_show",
  );
  if (!holding.length) return { ok: true as const };
  const prepared = await lockAndPrepareSelections(
    sql,
    holding.map((line) => ({
      contractPeriodId: line.contractPeriodId ?? "",
      quantity: line.quantity,
    })),
    allotment.checkIn,
    allotment.checkOut,
    {
      ignoreAllotmentId: allotment.id,
      allowStopSale: true,
      allowOverbook,
    },
  );
  if (!prepared.ok) return prepared;
  if (prepared.selections.some((item) => item.period.saleMode === "request")) {
    return { ok: false as const, error: "request" as const };
  }
  return { ok: true as const };
}

async function lineHotels(sql: Pick<SqlClient, "query">, allotmentId: string) {
  return sql.query<{ hotel_id: string | null }>(
    `SELECT COALESCE(offer.hotel_id, room.hotel_id) AS hotel_id
     FROM allotment_lines AS line
     LEFT JOIN offers AS offer ON offer.id = line.offer_id
     LEFT JOIN rooms AS room ON room.id = line.room_id
     WHERE line.allotment_id = ?`,
    [allotmentId],
  );
}

export async function saveReservationHeader(input: {
  id?: string | null;
  agencyId: string;
  hotelId: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  notes: string;
  supplierReference?: string;
  supplierNotes?: string;
  saleSource?: "contract" | "direct";
  commercialId?: string | null;
  payBefore?: string;
  payOnArrival?: boolean;
}) {
  const period = allotmentPeriodError(input.checkIn, input.checkOut);
  if (period) return { ok: false as const, error: period };
  const hotelId = input.hotelId.trim();
  if (!hotelId) return { ok: false as const, error: "hotel" as const };
  const hotel = await getHotel(hotelId);
  if (!hotel) return { ok: false as const, error: "hotel" as const };
  const agency = await query<{ id: string }>(
    "SELECT id FROM agencies WHERE id = ?",
    [input.agencyId],
  );
  if (!agency[0]) return { ok: false as const, error: "agency" as const };
  const commission = await activeCommercial(input.commercialId ?? "");
  if (!commission.ok) return { ok: false as const, error: "commercial" as const };
  const saleSource = input.saleSource === "direct" ? "direct" : "contract";
  const guestName = input.guestName.trim().slice(0, 160);
  const notes = input.notes.trim().slice(0, 2000);
  const supplierReference = (input.supplierReference ?? "").trim().slice(0, 160);
  const supplierNotes = (input.supplierNotes ?? "").trim().slice(0, 2000);
  const payBefore = input.payBefore ?? "";
  const payOnArrival = Boolean(input.payOnArrival);

  if (!input.id) {
    if (!(await clientCanBuy(input.agencyId))) {
      return { ok: false as const, error: "client" as const };
    }
    const created = crypto.randomUUID();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await transaction(async (sql) => {
          const number = await nextAllotmentNumber(sql);
          await sql.execute(
            `INSERT INTO allotments
              (id, number, agency_id, status, check_in, check_out, notes,
               created_at, sale_source, hotel_id, guest_name,
               commercial_id, commission_percent, pay_before, pay_on_arrival)
             VALUES (?, ?, ?, 'request', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              created,
              number,
              input.agencyId,
              input.checkIn,
              input.checkOut,
              notes,
              new Date().toISOString(),
              saleSource,
              hotelId,
              guestName,
              commission.id,
              commission.percent,
              payBefore,
              payOnArrival,
            ],
          );
          await appendReservationEvent(sql, {
            allotmentId: created,
            eventType: "reservation_created",
            actorType: "admin",
          });
        });
        return { ok: true as const, id: created };
      } catch (error) {
        if (isUniqueViolation(error) && attempt < 2) continue;
        throw error;
      }
    }
    return { ok: false as const, error: "allotment" as const };
  }

  return transaction(async (sql) => {
    const rows = await sql.query<{
      id: string;
      status: string;
      channel: string;
      sale_source: string | null;
      hotel_id: string | null;
      check_in: string;
      check_out: string;
    }>(
      `SELECT id, status, channel, sale_source, hotel_id, check_in, check_out
       FROM allotments WHERE id = ? FOR UPDATE`,
      [input.id],
    );
    const existing = rows[0];
    if (!existing || existing.channel === "b2c") {
      return { ok: false as const, error: "allotment" as const };
    }
    if (
      existing.status === "cancelled" ||
      existing.status === "no_show" ||
      existing.status === "unavailable" ||
      existing.status === "regret"
    ) {
      return { ok: false as const, error: "allotment" as const };
    }
    const allotmentId = existing.id;
    if (existing.status === "confirmed") {
      await sql.execute(
        `UPDATE allotments
         SET guest_name = ?, notes = ?, supplier_reference = ?, supplier_notes = ?,
             pay_before = ?, pay_on_arrival = ?
         WHERE id = ?`,
        [guestName, notes, supplierReference, supplierNotes, payBefore, payOnArrival, allotmentId],
      );
    } else {
      const hotels = await lineHotels(sql, allotmentId);
      const foreign = hotels.some(
        (line) => line.hotel_id && line.hotel_id !== hotelId,
      );
      if (foreign) return { ok: false as const, error: "hotel" as const };
      const currentSource = existing.sale_source === "direct" ? "direct" : "contract";
      if (hotels.length && currentSource !== saleSource) {
        return { ok: false as const, error: "allotment" as const };
      }
      if (
        existing.status === "provisional" &&
        (existing.check_in !== input.checkIn || existing.check_out !== input.checkOut)
      ) {
        const lines = await sql.query<HoldingLine & { supplier_status: string }>(
          `SELECT contract_period_id AS "contractPeriodId", quantity,
                  supplier_status AS "supplierStatus"
           FROM allotment_lines WHERE allotment_id = ?`,
          [allotmentId],
        );
        const guarded = await guardHoldingLines(
          sql,
          {
            id: allotmentId,
            status: existing.status,
            channel: existing.channel,
            checkIn: input.checkIn,
            checkOut: input.checkOut,
            saleSource: currentSource,
          },
          lines,
          true,
        );
        if (!guarded.ok) return guarded;
      }
      await sql.execute(
        `UPDATE allotments
         SET agency_id = ?, hotel_id = ?, check_in = ?, check_out = ?,
             guest_name = ?, notes = ?, sale_source = ?,
             commercial_id = ?, commission_percent = ?,
             supplier_reference = ?, supplier_notes = ?,
             pay_before = ?, pay_on_arrival = ?
         WHERE id = ?`,
        [
          input.agencyId,
          hotelId,
          input.checkIn,
          input.checkOut,
          guestName,
          notes,
          saleSource,
          commission.id,
          commission.percent,
          supplierReference,
          supplierNotes,
          payBefore,
          payOnArrival,
          allotmentId,
        ],
      );
    }
    await appendReservationEvent(sql, {
      allotmentId,
      eventType: "reservation_updated",
      actorType: "admin",
    });
    return { ok: true as const, id: allotmentId };
  });
}

export type StayRoomChoice = {
  periodId: string;
  purchaseLineId: string;
  roomTypeId: string;
  roomName: string;
  board: MealPlan;
  view: string;
  saleMode: SaleMode;
  quantityLeft: number;
  overbookLeft: number;
  costPerNight: number;
  pricePerNight: number;
};

export async function listStayRoomChoices(
  hotelId: string,
  checkIn: string,
  checkOut: string,
  ignoreAllotmentId?: string,
) {
  if (nightsBetween(checkIn, checkOut) < 1) return [];
  const rows = await query<{
    id: string;
    purchase_line_id: string;
    sale_mode: string;
    cost_per_night: number;
    public_price_per_night: number | null;
    default_agency_price_per_night: number | null;
    room_type_id: string;
    room_name: string;
    board: string;
    view: string;
  }>(
    `SELECT period.id, period.purchase_line_id, period.sale_mode,
            period.cost_per_night, period.public_price_per_night,
            period.default_agency_price_per_night,
            offer.room_type_id, type.name AS room_name, offer.board, offer.view
     FROM contract_periods AS period
     JOIN purchase_lines AS line ON line.id = period.purchase_line_id
     JOIN purchases AS purchase ON purchase.id = line.purchase_id
     JOIN offers AS offer ON offer.id = line.offer_id
     JOIN room_types AS type ON type.id = offer.room_type_id
     WHERE offer.hotel_id = ?
       AND purchase.status = 'confirmed'
       AND purchase.active = TRUE
       AND period.active = TRUE
       AND period.stop_sale = FALSE
       AND period.check_in::date <= ?::date
       AND period.check_out::date >= ?::date
     ORDER BY type.name, offer.board, offer.view, period.check_in`,
    [hotelId, checkIn, checkOut],
  );
  const rules = new Map<string, { quantityLeft: number; overbookLeft: number }>();
  const choices: StayRoomChoice[] = [];
  for (const row of rows) {
    let rule = rules.get(row.purchase_line_id);
    if (!rule) {
      const loaded = await contractLineRule(
        row.purchase_line_id,
        checkIn,
        checkOut,
        { query },
        ignoreAllotmentId,
      );
      rule = {
        quantityLeft: loaded.quantityLeft,
        overbookLeft: loaded.overbookLeft,
      };
      rules.set(row.purchase_line_id, rule);
    }
    const saleMode = saleModeCode(row.sale_mode) ?? "book";
    choices.push({
      periodId: row.id,
      purchaseLineId: row.purchase_line_id,
      roomTypeId: row.room_type_id,
      roomName: row.room_name,
      board: mealPlanCode(row.board) ?? "room_only",
      view: row.view ?? "",
      saleMode,
      quantityLeft: saleMode === "request" ? 0 : rule.quantityLeft,
      overbookLeft: saleMode === "request" ? 0 : rule.overbookLeft,
      costPerNight: Number(row.cost_per_night),
      pricePerNight:
        row.public_price_per_night == null
          ? Number(row.default_agency_price_per_night ?? 0)
          : Number(row.public_price_per_night),
    });
  }
  return choices;
}

function openDeskStatus(status: string) {
  return status === "request" || status === "provisional" || status === "confirmed";
}

export async function addReservationLine(input: {
  allotmentId: string;
  quantity: number;
  allowOverbook?: boolean;
  contractPeriodId?: string | null;
  roomTypeId?: string;
  mealCode?: string;
  viewName?: string;
  direct?: {
    roomTypeId: string;
    mealCode: string;
    viewName: string;
    costPerNight: number;
    pricePerNight: number;
    hotelName: string;
    roomName: string;
    priceIncludesVat?: boolean;
  };
  priceIncludesVat?: boolean;
}) {
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 5000) {
    return { ok: false as const, error: "quantity" as const };
  }
  return transaction(async (sql) => {
    const rows = await sql.query<{
      id: string;
      status: string;
      channel: string;
      sale_source: string | null;
      hotel_id: string | null;
      check_in: string;
      check_out: string;
    }>(
      `SELECT id, status, channel, sale_source, hotel_id, check_in, check_out
       FROM allotments WHERE id = ? FOR UPDATE`,
      [input.allotmentId],
    );
    const allotment = rows[0];
    if (!allotment || allotment.channel === "b2c" || !openDeskStatus(allotment.status)) {
      return { ok: false as const, error: "allotment" as const };
    }
    if (!allotment.hotel_id) return { ok: false as const, error: "hotel" as const };
    const saleSource = allotment.sale_source === "direct" ? "direct" : "contract";
    const existing = await sql.query<HoldingLine>(
      `SELECT contract_period_id AS "contractPeriodId", quantity,
              supplier_status AS "supplierStatus"
       FROM allotment_lines WHERE allotment_id = ?`,
      [allotment.id],
    );
    let preparedLine: AllotmentLineInput;
    if (saleSource === "direct") {
      const direct = input.direct;
      if (
        !direct ||
        !Number.isInteger(direct.costPerNight) ||
        !Number.isInteger(direct.pricePerNight) ||
        direct.costPerNight < 0 ||
        direct.pricePerNight < 0
      ) {
        return { ok: false as const, error: "invalid" as const };
      }
      preparedLine = {
        roomId: "",
        offerId: null,
        purchaseLineId: null,
        contractPeriodId: null,
        quantity: input.quantity,
        costPerNight: direct.costPerNight,
        agencyPricePerNight: direct.pricePerNight,
        priceIncludesVat: Boolean(direct.priceIncludesVat),
        amountBasis: "night",
        boardSnapshot: mealPlanCode(direct.mealCode) ?? "room_only",
        viewSnapshot: direct.viewName.trim().slice(0, 80),
        directHotel: direct.hotelName,
        directRoom: direct.roomName,
        rateSnapshot: {
          hotelId: allotment.hotel_id,
          roomTypeId: direct.roomTypeId,
          view: { name: direct.viewName.trim().slice(0, 80), cost: 0, price: 0 },
        },
      };
    } else {
      const choices = await listStayRoomChoices(
        allotment.hotel_id,
        allotment.check_in,
        allotment.check_out,
        allotment.id,
      );
      const roomTypeId = input.roomTypeId ?? "";
      const meal = mealPlanCode(input.mealCode ?? "") ?? "room_only";
      const view = (input.viewName ?? "").trim();
      const matching = choices.filter(
        (choice) =>
          choice.roomTypeId === roomTypeId &&
          choice.board === meal &&
          choice.view === view,
      );
      const pickedId = input.contractPeriodId?.trim();
      const bookable = matching.filter((choice) => choice.saleMode !== "request");
      const pool = bookable.length ? bookable : matching.filter((choice) => choice.saleMode === "request");
      const chosen = pickedId
        ? matching.find((choice) => choice.periodId === pickedId)
        : pool.reduce<StayRoomChoice | undefined>((best, choice) => {
            if (!best || choice.quantityLeft > best.quantityLeft) return choice;
            return best;
          }, undefined);
      if (!chosen) return { ok: false as const, error: "missing-room" as const };
      if (
        (allotment.status === "provisional" || allotment.status === "confirmed") &&
        chosen.saleMode === "request"
      ) {
        return { ok: false as const, error: "request" as const };
      }
      const prepared = await prepareSaleLines(
        [
          {
            roomId: "",
            offerId: null,
            purchaseLineId: null,
            contractPeriodId: chosen.periodId,
            quantity: input.quantity,
            costPerNight: chosen.costPerNight,
            agencyPricePerNight: chosen.pricePerNight,
            priceIncludesVat: Boolean(input.priceIncludesVat),
          },
        ],
        allotment.check_in,
        allotment.check_out,
      );
      if (!prepared.ok) return prepared;
      preparedLine = prepared.lines[0];
    }
    const guarded = await guardHoldingLines(
      sql,
      {
        id: allotment.id,
        status: allotment.status,
        channel: allotment.channel,
        checkIn: allotment.check_in,
        checkOut: allotment.check_out,
        saleSource,
      },
      [
        ...existing,
        {
          contractPeriodId: preparedLine.contractPeriodId ?? null,
          quantity: input.quantity,
          supplierStatus: "new",
        },
      ],
      Boolean(input.allowOverbook),
    );
    if (!guarded.ok) return guarded;
    const order = await sql.query<{ next: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
       FROM allotment_lines WHERE allotment_id = ?`,
      [allotment.id],
    );
    await insertAllotmentLines(
      sql,
      allotment.id,
      [preparedLine],
      Number(order[0]?.next ?? 0),
    );
    await appendReservationEvent(sql, {
      allotmentId: allotment.id,
      eventType: "reservation_updated",
      actorType: "admin",
      details: { line: "added", quantity: input.quantity },
    });
    return { ok: true as const, id: allotment.id };
  });
}

export async function updateReservationLine(input: {
  allotmentId: string;
  lineId: string;
  quantity: number;
  supplierStatus: LineSupplierStatus;
  allowOverbook?: boolean;
  priceIncludesVat?: boolean;
  agencyPricePerNight?: number;
}) {
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 5000) {
    return { ok: false as const, error: "quantity" as const };
  }
  if (
    input.agencyPricePerNight !== undefined &&
    (!Number.isInteger(input.agencyPricePerNight) || input.agencyPricePerNight < 0)
  ) {
    return { ok: false as const, error: "invalid" as const };
  }
  if (!lineSupplierStatuses.includes(input.supplierStatus)) {
    return { ok: false as const, error: "invalid" as const };
  }
  return transaction(async (sql) => {
    const rows = await sql.query<{
      id: string;
      status: string;
      channel: string;
      sale_source: string | null;
      check_in: string;
      check_out: string;
    }>(
      `SELECT id, status, channel, sale_source, check_in, check_out
       FROM allotments WHERE id = ? FOR UPDATE`,
      [input.allotmentId],
    );
    const allotment = rows[0];
    if (!allotment || allotment.channel === "b2c" || !openDeskStatus(allotment.status)) {
      return { ok: false as const, error: "allotment" as const };
    }
    const lines = await sql.query<{
      id: string;
      contractPeriodId: string | null;
      quantity: number;
      supplierStatus: string;
    }>(
      `SELECT id, contract_period_id AS "contractPeriodId", quantity,
              supplier_status AS "supplierStatus"
       FROM allotment_lines WHERE allotment_id = ?`,
      [allotment.id],
    );
    if (!lines.some((line) => line.id === input.lineId)) {
      return { ok: false as const, error: "allotment-lines" as const };
    }
    const next = lines.map((line) =>
      line.id === input.lineId
        ? {
            contractPeriodId: line.contractPeriodId,
            quantity: input.quantity,
            supplierStatus: input.supplierStatus,
          }
        : line,
    );
    const guarded = await guardHoldingLines(
      sql,
      {
        id: allotment.id,
        status: allotment.status,
        channel: allotment.channel,
        checkIn: allotment.check_in,
        checkOut: allotment.check_out,
        saleSource: allotment.sale_source === "direct" ? "direct" : "contract",
      },
      next,
      Boolean(input.allowOverbook),
    );
    if (!guarded.ok) return guarded;
    const sets = ["quantity = ?", "supplier_status = ?"];
    const values: Array<string | number | boolean> = [input.quantity, input.supplierStatus];
    if (input.priceIncludesVat !== undefined) {
      sets.push("price_includes_vat = ?");
      values.push(input.priceIncludesVat);
    }
    if (input.agencyPricePerNight !== undefined) {
      sets.push("agency_price_per_night = ?");
      values.push(input.agencyPricePerNight);
    }
    values.push(input.lineId, allotment.id);
    await sql.execute(
      `UPDATE allotment_lines
       SET ${sets.join(", ")}
       WHERE id = ? AND allotment_id = ?`,
      values,
    );
    await appendReservationEvent(sql, {
      allotmentId: allotment.id,
      eventType: input.supplierStatus === "no_show" ? "reservation_no_show" : "line_supplier",
      actorType: "admin",
      details: {
        lineId: input.lineId,
        quantity: input.quantity,
        supplierStatus: input.supplierStatus,
      },
    });
    return { ok: true as const };
  });
}

export async function removeReservationLine(allotmentId: string, lineId: string) {
  return transaction(async (sql) => {
    const rows = await sql.query<{ status: string; channel: string }>(
      `SELECT status, channel FROM allotments WHERE id = ? FOR UPDATE`,
      [allotmentId],
    );
    const allotment = rows[0];
    if (!allotment || allotment.channel === "b2c" || !openDeskStatus(allotment.status)) {
      return { ok: false as const, error: "allotment" as const };
    }
    const line = await sql.query<{ id: string }>(
      `SELECT id FROM allotment_lines WHERE id = ? AND allotment_id = ?`,
      [lineId, allotmentId],
    );
    if (!line[0]) return { ok: false as const, error: "allotment-lines" as const };
    await sql.execute(
      `DELETE FROM allotment_lines WHERE id = ? AND allotment_id = ?`,
      [lineId, allotmentId],
    );
    await appendReservationEvent(sql, {
      allotmentId,
      eventType: "reservation_updated",
      actorType: "admin",
      details: { line: "removed", lineId },
    });
    return { ok: true as const };
  });
}

export async function returnAllotmentToProvisional(id: string) {
  return moveReservation(id, "provisional", {
    type: "admin",
    allowOverbook: true,
    from: ["confirmed"],
  });
}

export async function returnAllotmentToRequest(id: string) {
  return returnReservationToRequest(id, { type: "admin" });
}

export async function cancelAllotment(id: string, penalty = 0) {
  return cancelReservation(id, { type: "admin" }, penalty);
}

export async function regretAllotment(id: string) {
  return regretReservation(id, { type: "admin" });
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
  return transaction(async (sql) => {
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
    if (!reservation || reservation.channel === "b2c") {
      return { ok: false as const, error: "allotment" as const };
    }
    if (reservation.status === "request" || reservation.status === "provisional") {
      return {
        ok: true as const,
        status: reservation.status,
        idempotent: true as const,
      };
    }
    if (reservation.status !== "cancelled") {
      return { ok: false as const, error: "allotment" as const };
    }
    if (nightsBetween(reservation.check_in, reservation.check_out) < 1) {
      return { ok: false as const, error: "dates" as const };
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
    if (!lines.length) return { ok: false as const, error: "missing-room" as const };
    if (reservation.sale_source === "direct") {
      const now = new Date();
      await sql.execute(
        `UPDATE allotments
         SET status = 'request',
             hold_until = NULL,
             confirmed_at = NULL,
             supplier_status = 'not_requested',
             cancel_requested_at = NULL,
             cancel_request_reason = ''
         WHERE id = ? AND status = 'cancelled'`,
        [id],
      );
      await sql.execute(
        `UPDATE allotment_lines
         SET supplier_status = 'new'
         WHERE allotment_id = ? AND supplier_status = 'cancelled'`,
        [id],
      );
      await appendReservationEvent(sql, {
        allotmentId: id,
        eventType: "reservation_reopened",
        actorType: "admin",
        details: { status: "request", stockEffect: "none" },
        createdAt: now.toISOString(),
      });
      return { ok: true as const, status: "request" as const, idempotent: false as const };
    }
    if (lines.some((line) => !line.contract_period_id)) {
      return { ok: false as const, error: "missing-room" as const };
    }
    const prepared = await lockAndPrepareSelections(
      sql,
      lines.map((line) => ({
        contractPeriodId: line.contract_period_id ?? "",
        quantity: Number(line.quantity),
      })),
      reservation.check_in,
      reservation.check_out,
      { ignoreAllotmentId: id, allowInsufficient: true },
    );
    if (!prepared.ok) return prepared;
    const requiresRequest = prepared.selections.some(
      (item) => item.period.saleMode === "request",
    );
    if (!requiresRequest && !prepared.available) {
      return {
        ok: false as const,
        error: "quantity" as const,
        remaining: prepared.remaining,
      };
    }
    const now = new Date();
    const status = requiresRequest ? "request" : "provisional";
    const holdMinutes = Math.min(
      ...prepared.selections.map((item) => item.period.holdMinutes),
    );
    const holdUntil =
      status === "provisional"
        ? new Date(now.getTime() + holdMinutes * 60_000).toISOString()
        : null;
    await sql.execute(
      `UPDATE allotments
       SET status = ?,
           hold_until = ?,
           confirmed_at = NULL,
           supplier_status = 'not_requested',
           cancel_requested_at = NULL,
           cancel_request_reason = ''
       WHERE id = ? AND status = 'cancelled'`,
      [status, holdUntil, id],
    );
    await sql.execute(
      `UPDATE allotment_lines
       SET supplier_status = 'new'
       WHERE allotment_id = ? AND supplier_status = 'cancelled'`,
      [id],
    );
    await appendReservationEvent(sql, {
      allotmentId: id,
      eventType: "reservation_reopened",
      actorType: "admin",
      details: {
        status,
        holdUntil,
        stockEffect: status === "provisional" ? "held" : "none",
      },
      createdAt: now.toISOString(),
    });
    return { ok: true as const, status, idempotent: false as const };
  });
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
        days: (
          await reservationReport(
            reportFilters({
              hotelId,
              offerId: offer.id,
              from: window.from,
              to: window.to,
            }),
          )
        ).days.map((day) => ({
          day: day.day,
          held: day.contracted,
          overbook: day.overbook,
          taken: day.reserved,
          free: day.free,
        })),
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
  actorId?: string | null;
}) {
  return syncLegacyContractRate(input);
}

export async function deleteContractRate(id: string, actorId?: string | null) {
  return removeLegacyContractRate(id, actorId);
}

export async function listDeskRates() {
  const rows = await query<{
    contract_period_id: string;
    agency_id: string;
    price_per_night: number;
  }>(
    `SELECT contract_period_id, agency_id, price_per_night
     FROM contract_period_rates`,
  );
  return rows.map((row) => ({
    contractPeriodId: row.contract_period_id,
    agencyId: row.agency_id,
    pricePerNight: Number(row.price_per_night),
  }));
}

export async function agencyPrices(agencyId: string) {
  const rows = await query<{
    contract_period_id: string;
    purchase_line_id: string;
    offer_id: string | null;
    price_per_night: number;
    check_in: string;
    check_out: string;
    min_nights: number;
    sale_mode: string;
  }>(
    `SELECT period.id AS contract_period_id, period.purchase_line_id,
            line.offer_id,
            COALESCE(private.price_per_night, group_rate.price_per_night,
                     period.default_agency_price_per_night) AS price_per_night,
            period.check_in, period.check_out, period.min_nights,
            period.sale_mode
     FROM contract_periods AS period
     JOIN purchase_lines AS line ON line.id = period.purchase_line_id
     JOIN purchases AS purchase ON purchase.id = line.purchase_id
     LEFT JOIN contract_period_rates AS private
       ON private.contract_period_id = period.id
      AND private.agency_id = ?
     LEFT JOIN agencies AS rate_buyer ON rate_buyer.id = ?
     LEFT JOIN contract_group_rates AS group_rate
       ON group_rate.contract_period_id = period.id
      AND group_rate.group_id = rate_buyer.group_id
     WHERE purchase.status = 'confirmed'
       AND period.active = TRUE
       AND period.stop_sale = FALSE
       AND COALESCE(private.price_per_night, group_rate.price_per_night,
                    period.default_agency_price_per_night) IS NOT NULL`,
    [agencyId, agencyId],
  );
  return rows.map((row) => ({
    contractPeriodId: row.contract_period_id,
    purchaseLineId: row.purchase_line_id,
    offerId: row.offer_id,
    pricePerNight: Number(row.price_per_night),
    checkIn: row.check_in,
    checkOut: row.check_out,
    minNights: Number(row.min_nights),
    saleMode: saleModeCode(row.sale_mode) ?? "book",
  }));
}

export async function withAgencyRates<
  T extends {
    rooms: Array<{
      id: string;
      agencyPricePerNight: number | null;
      open?: number | null;
    }>;
  },
>(hotels: T[], agencyId: string, stay: { checkIn: string; checkOut: string } | null) {
  const prices = await agencyPrices(agencyId);
  const pricedHotels = await Promise.all(
    hotels.map(async (hotel) => ({
      ...hotel,
      rooms: (
        await Promise.all(
          hotel.rooms.map(async (room) => {
            const matches = prices
              .filter(
                (price) =>
                  price.offerId === room.id &&
                  (!stay ||
                    (price.checkIn <= stay.checkIn &&
                      price.checkOut >= stay.checkOut &&
                      nightsBetween(stay.checkIn, stay.checkOut) >=
                        price.minNights)),
              )
              .sort(
                (left, right) =>
                  left.pricePerNight - right.pricePerNight ||
                  left.contractPeriodId.localeCompare(right.contractPeriodId),
              );
            if (!matches.length) return null;
            const availability = stay
              ? await Promise.all(
                  matches.map(async (price) => ({
                    price,
                    open: await contractLineFree(
                      price.purchaseLineId,
                      stay.checkIn,
                      stay.checkOut,
                    ),
                  })),
                )
              : matches.map((price) => ({ price, open: null }));
            const selected =
              availability.find(
                (item) => item.price.saleMode === "request" || (item.open ?? 0) > 0,
              ) ?? availability[0];
            return {
              ...room,
              contractPeriodId: selected.price.contractPeriodId,
              purchaseLineId: selected.price.purchaseLineId,
              checkIn: selected.price.checkIn,
              checkOut: selected.price.checkOut,
              minNights: selected.price.minNights,
              saleMode: selected.price.saleMode,
              agencyPricePerNight: selected.price.pricePerNight,
              open:
                selected.open == null
                  ? room.open
                  : Math.min(room.open ?? selected.open, selected.open),
            };
          }),
        )
      ).filter((room): room is NonNullable<typeof room> => Boolean(room)),
    })),
  );
  return pricedHotels.filter((hotel) => hotel.rooms.length > 0);
}

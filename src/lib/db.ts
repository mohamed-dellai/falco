import { Pool, type QueryResultRow } from "pg";
import { siteConfig } from "@/lib/site";
import { nightsBetween, shiftIsoDate, todayInRiyadh } from "@/lib/money";

const globalForDb = globalThis as unknown as { falcoPool?: Pool };

function connectionString() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");

  const url = new URL(raw);
  url.searchParams.delete("channel_binding");
  url.searchParams.set("sslmode", "verify-full");
  return url.toString();
}

function pool() {
  globalForDb.falcoPool ??= new Pool({
    connectionString: connectionString(),
    max: 5,
  });
  return globalForDb.falcoPool;
}

function placeholders(sql: string) {
  let index = 0;
  return sql.replaceAll("?", () => `$${++index}`);
}

let ready: Promise<void> | null = null;

async function ensurePhotoColumns(table: "hotel_photos" | "room_photos") {
  const info = await pool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  const names = new Set(info.rows.map((row) => row.column_name));
  if (!names.has("content_type")) {
    await pool().query(
      `ALTER TABLE ${table} ADD COLUMN content_type TEXT NOT NULL DEFAULT 'image/jpeg'`,
    );
  }
  if (!names.has("bytes")) {
    await pool().query(`ALTER TABLE ${table} ADD COLUMN bytes BYTEA`);
  }
}

async function migrate() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS hotels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      stars INTEGER NOT NULL DEFAULT 4,
      distance_to_haram TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS hotel_photos (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL REFERENCES hotels (id),
      url TEXT NOT NULL,
      sort_order BIGINT NOT NULL DEFAULT 0,
      content_type TEXT NOT NULL DEFAULT 'image/jpeg',
      bytes BYTEA
    )`,
    `CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL REFERENCES hotels (id),
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      capacity INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      cost_per_night INTEGER NOT NULL,
      public_price_per_night INTEGER,
      room_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS room_photos (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms (id),
      url TEXT NOT NULL,
      sort_order BIGINT NOT NULL DEFAULT 0,
      content_type TEXT NOT NULL DEFAULT 'image/jpeg',
      bytes BYTEA
    )`,
    `CREATE TABLE IF NOT EXISTS agencies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'agency',
      country TEXT NOT NULL DEFAULT '',
      contact_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      commercial_registration TEXT NOT NULL DEFAULT '',
      vat_number TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms (id),
      agency_id TEXT NOT NULL REFERENCES agencies (id),
      quantity INTEGER NOT NULL,
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      cost_per_night INTEGER NOT NULL,
      agency_price_per_night INTEGER NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL UNIQUE,
      hotel_id TEXT NOT NULL REFERENCES hotels (id),
      status TEXT NOT NULL,
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      confirmed_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      reference TEXT NOT NULL UNIQUE,
      agency_id TEXT REFERENCES agencies (id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      requirements TEXT NOT NULL DEFAULT '',
      agency_name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT '',
      agency_website TEXT NOT NULL DEFAULT '',
      annual_pilgrims INTEGER,
      markets TEXT NOT NULL DEFAULT '',
      arrival TEXT NOT NULL DEFAULT '',
      departure TEXT NOT NULL DEFAULT '',
      travellers INTEGER,
      room_count INTEGER,
      package_slug TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS purchase_lines (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL REFERENCES purchases (id),
      room_name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      capacity INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      cost_per_night INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      room_id TEXT REFERENCES rooms (id),
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      public_price_per_night INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS allotments (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL UNIQUE,
      agency_id TEXT NOT NULL REFERENCES agencies (id),
      status TEXT NOT NULL,
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      confirmed_at TEXT,
      channel TEXT NOT NULL DEFAULT 'desk',
      booking_id TEXT,
      submission_id TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL UNIQUE,
      room_id TEXT NOT NULL REFERENCES rooms (id),
      status TEXT NOT NULL,
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      travellers INTEGER NOT NULL,
      public_price_per_night INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      locale TEXT NOT NULL DEFAULT 'en',
      stripe_session_id TEXT,
      stripe_payment_intent TEXT,
      hold_until TEXT NOT NULL,
      created_at TEXT NOT NULL,
      confirmed_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS allotment_lines (
      id TEXT PRIMARY KEY,
      allotment_id TEXT NOT NULL REFERENCES allotments (id),
      room_id TEXT NOT NULL REFERENCES rooms (id),
      quantity INTEGER NOT NULL,
      cost_per_night INTEGER NOT NULL,
      agency_price_per_night INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      assignment_id TEXT
    )`,
  ];

  for (const statement of statements) {
    await pool().query(statement);
  }
  await ensurePhotoColumns("hotel_photos");
  await ensurePhotoColumns("room_photos");
  await ensurePurchaseLineDates();
  await ensurePurchaseLinePublicPrice();
  await ensureSubmissionStayColumns();
  await ensureSubmissionStatus();
  await ensureAssignmentAllotment();
  await ensureRoomPublicPrice();
  await ensureRoomStays();
  await ensureAgencyKind();
  await ensureSaleChannel();
  await ensureRoomCatalog();
  await ensureAdminUsers();
  await ensureCompanyProfile();
  await ensureContracts();
}

async function ensureAgencyKind() {
  const info = await pool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'agencies'`,
  );
  const names = new Set(info.rows.map((row) => row.column_name));
  if (!names.has("kind")) {
    await pool().query(
      `ALTER TABLE agencies ADD COLUMN kind TEXT NOT NULL DEFAULT 'agency'`,
    );
  }
  await pool().query(
    `UPDATE agencies SET kind = 'agency' WHERE kind IS NULL OR btrim(kind) = ''`,
  );
  await pool().query(
    `ALTER TABLE agencies ALTER COLUMN kind SET DEFAULT 'agency'`,
  );
  await pool().query(`ALTER TABLE agencies ALTER COLUMN kind SET NOT NULL`);
  if (!names.has("commercial_registration")) {
    await pool().query(
      `ALTER TABLE agencies
       ADD COLUMN commercial_registration TEXT NOT NULL DEFAULT ''`,
    );
  }
  if (!names.has("vat_number")) {
    await pool().query(
      `ALTER TABLE agencies ADD COLUMN vat_number TEXT NOT NULL DEFAULT ''`,
    );
  }
}

async function ensureSubmissionStatus() {
  const info = await pool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'submissions'`,
  );
  const names = new Set(info.rows.map((row) => row.column_name));
  if (!names.has("status")) {
    await pool().query(
      `ALTER TABLE submissions ADD COLUMN status TEXT NOT NULL DEFAULT 'new'`,
    );
  }
}

async function ensureRoomPublicPrice() {
  const info = await pool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'rooms'`,
  );
  const names = new Set(info.rows.map((row) => row.column_name));
  if (!names.has("public_price_per_night")) {
    await pool().query(
      `ALTER TABLE rooms ADD COLUMN public_price_per_night INTEGER`,
    );
  }
}

async function ensureAssignmentAllotment() {
  const info = await pool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'assignments'`,
  );
  const names = new Set(info.rows.map((row) => row.column_name));
  if (!names.has("allotment_id")) {
    await pool().query(`ALTER TABLE assignments ADD COLUMN allotment_id TEXT`);
  }
}

async function ensureSubmissionStayColumns() {
  const info = await pool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'submissions'`,
  );
  const names = new Set(info.rows.map((row) => row.column_name));
  if (!names.has("departure")) {
    await pool().query(
      `ALTER TABLE submissions ADD COLUMN departure TEXT NOT NULL DEFAULT ''`,
    );
  }
  if (!names.has("room_count")) {
    await pool().query(`ALTER TABLE submissions ADD COLUMN room_count INTEGER`);
  }
}

function stayNights(checkIn: string, checkOut: string) {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Number.MAX_SAFE_INTEGER;
  return Math.round((end - start) / 86_400_000);
}

function stayContains(
  windowIn: string,
  windowOut: string,
  stayIn: string,
  stayOut: string,
) {
  return windowIn <= stayIn && windowOut >= stayOut;
}

async function ensureRoomStays() {
  const info = await pool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'rooms'`,
  );
  const names = new Set(info.rows.map((row) => row.column_name));
  if (!names.has("check_in")) {
    await pool().query(`ALTER TABLE rooms ADD COLUMN check_in TEXT`);
  }
  if (!names.has("check_out")) {
    await pool().query(`ALTER TABLE rooms ADD COLUMN check_out TEXT`);
  }
  if (!names.has("room_type")) {
    await pool().query(`ALTER TABLE rooms ADD COLUMN room_type TEXT`);
  }
  await pool().query(
    `UPDATE rooms
     SET room_type = lower(btrim(name))
     WHERE room_type IS NULL OR btrim(room_type) = ''`,
  );
  await pool().query(`ALTER TABLE rooms ALTER COLUMN room_type SET NOT NULL`);
  await pool().query(`DROP INDEX IF EXISTS rooms_hotel_room_type_key`);
  await pool().query(`DROP INDEX IF EXISTS rooms_hotel_name_stay_key`);

  const rooms = await pool().query<{
    id: string;
    hotel_id: string;
    name: string;
    room_type: string;
    description: string;
    capacity: number;
    quantity: number;
    cost_per_night: number;
    public_price_per_night: number | null;
    created_at: string;
    check_in: string | null;
    check_out: string | null;
  }>("SELECT * FROM rooms");

  for (const room of rooms.rows) {
    const spans = await pool().query<{
      check_in: string;
      check_out: string;
      quantity: number;
      cost: number;
    }>(
      `SELECT pl.check_in, pl.check_out,
              SUM(pl.quantity)::int AS quantity,
              MAX(pl.cost_per_night)::int AS cost
       FROM purchase_lines pl
       JOIN purchases p ON p.id = pl.purchase_id
       WHERE pl.room_id = $1 AND p.status = 'confirmed'
       GROUP BY pl.check_in, pl.check_out
       ORDER BY pl.check_in, pl.check_out`,
      [room.id],
    );
    let checkIn = room.check_in;
    let checkOut = room.check_out;
    for (const span of spans.rows) {
      if (checkIn === span.check_in && checkOut === span.check_out) continue;
      const existing = await pool().query<{ id: string }>(
        `SELECT id FROM rooms
         WHERE hotel_id = $1
           AND room_type = $2
           AND check_in = $3
           AND check_out = $4
         LIMIT 1`,
        [room.hotel_id, room.room_type, span.check_in, span.check_out],
      );
      let targetId = existing.rows[0]?.id;
      if (!targetId && !checkIn && !checkOut) {
        await pool().query(
          `UPDATE rooms SET check_in = $1, check_out = $2, quantity = $3 WHERE id = $4`,
          [span.check_in, span.check_out, span.quantity, room.id],
        );
        checkIn = span.check_in;
        checkOut = span.check_out;
        targetId = room.id;
      }
      if (!targetId) {
        targetId = crypto.randomUUID();
        await pool().query(
          `INSERT INTO rooms
            (id, hotel_id, name, room_type, description, capacity, quantity, cost_per_night, public_price_per_night, created_at, check_in, check_out)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            targetId,
            room.hotel_id,
            room.name,
            room.room_type,
            room.description,
            room.capacity,
            span.quantity,
            span.cost,
            room.public_price_per_night,
            room.created_at,
            span.check_in,
            span.check_out,
          ],
        );
      }
      if (targetId !== room.id) {
        await pool().query(
          `UPDATE purchase_lines
           SET room_id = $1
           WHERE room_id = $2 AND check_in = $3 AND check_out = $4`,
          [targetId, room.id, span.check_in, span.check_out],
        );
      }
    }
  }

  const windows = await pool().query<{
    id: string;
    hotel_id: string;
    room_type: string;
    check_in: string;
    check_out: string;
  }>(
    `SELECT id, hotel_id, room_type, check_in, check_out
     FROM rooms
     WHERE check_in IS NOT NULL AND check_out IS NOT NULL`,
  );
  const byType = new Map<string, typeof windows.rows>();
  for (const window of windows.rows) {
    const key = `${window.hotel_id}|${window.room_type}`;
    byType.set(key, [...(byType.get(key) ?? []), window]);
  }

  async function rehome(
    table: "assignments" | "bookings" | "allotment_lines",
    stayTable: "assignments" | "bookings" | "allotments",
    idColumn: string,
  ) {
    const stays =
      table === "allotment_lines"
        ? await pool().query<{
            id: string;
            room_id: string;
            hotel_id: string;
            room_type: string;
            check_in: string;
            check_out: string;
          }>(
            `SELECT line.id, line.room_id, room.hotel_id, room.room_type,
                    stay.check_in, stay.check_out
             FROM allotment_lines AS line
             JOIN allotments AS stay ON stay.id = line.allotment_id
             JOIN rooms AS room ON room.id = line.room_id`,
          )
        : await pool().query<{
            id: string;
            room_id: string;
            hotel_id: string;
            room_type: string;
            check_in: string;
            check_out: string;
          }>(
            `SELECT stay.id, stay.room_id, room.hotel_id, room.room_type,
                    stay.check_in, stay.check_out
             FROM ${stayTable} AS stay
             JOIN rooms AS room ON room.id = stay.room_id`,
          );
    for (const stay of stays.rows) {
      const choices = byType.get(`${stay.hotel_id}|${stay.room_type}`) ?? [];
      const fit = choices
        .filter((choice) =>
          stayContains(
            choice.check_in,
            choice.check_out,
            stay.check_in,
            stay.check_out,
          ),
        )
        .sort(
          (left, right) =>
            stayNights(left.check_in, left.check_out) -
            stayNights(right.check_in, right.check_out),
        )[0];
      if (fit && fit.id !== stay.room_id) {
        await pool().query(`UPDATE ${table} SET room_id = $1 WHERE ${idColumn} = $2`, [
          fit.id,
          stay.id,
        ]);
      }
    }
  }

  await rehome("assignments", "assignments", "id");
  await rehome("bookings", "bookings", "id");
  await rehome("allotment_lines", "allotments", "id");

  await pool().query(
    `CREATE UNIQUE INDEX IF NOT EXISTS rooms_hotel_type_stay_key
     ON rooms (hotel_id, room_type, check_in, check_out)
     WHERE check_in IS NOT NULL AND check_out IS NOT NULL`,
  );
  await pool().query(
    `CREATE UNIQUE INDEX IF NOT EXISTS rooms_hotel_type_open_key
     ON rooms (hotel_id, room_type)
     WHERE check_in IS NULL AND check_out IS NULL`,
  );
}

async function ensurePurchaseLineDates() {
  const info = await pool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'purchase_lines'`,
  );
  const names = new Set(info.rows.map((row) => row.column_name));
  if (!names.has("check_in")) {
    await pool().query(`ALTER TABLE purchase_lines ADD COLUMN check_in TEXT`);
  }
  if (!names.has("check_out")) {
    await pool().query(`ALTER TABLE purchase_lines ADD COLUMN check_out TEXT`);
  }
  await pool().query(
    `UPDATE purchase_lines AS pl
     SET check_in = p.check_in,
         check_out = p.check_out
     FROM purchases AS p
     WHERE pl.purchase_id = p.id
       AND (pl.check_in IS NULL OR pl.check_out IS NULL)`,
  );
  await pool().query(
    `ALTER TABLE purchase_lines
       ALTER COLUMN check_in SET NOT NULL,
       ALTER COLUMN check_out SET NOT NULL`,
  );
}

async function ensurePurchaseLinePublicPrice() {
  const info = await pool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'purchase_lines'
       AND column_name = 'public_price_per_night'`,
  );
  if (info.rows[0]) return;
  await pool().query(
    `ALTER TABLE purchase_lines ADD COLUMN public_price_per_night INTEGER`,
  );
}

function stayOrPlaceholder(arrival: string, departure: string) {
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(arrival) &&
    /^\d{4}-\d{2}-\d{2}$/.test(departure) &&
    nightsBetween(arrival, departure) >= 1
  ) {
    return { checkIn: arrival, checkOut: departure };
  }
  const checkIn = todayInRiyadh();
  return { checkIn, checkOut: shiftIsoDate(checkIn, 1) };
}

async function nextSaleNumber() {
  const rows = await pool().query<{ number: string }>(
    `SELECT number FROM allotments
     WHERE number ~ '^A[0-9]+$'
     ORDER BY number DESC
     LIMIT 1`,
  );
  return Number(rows.rows[0]?.number?.slice(1) ?? 0);
}

async function individualAgency(input: {
  name: string;
  email: string;
  phone: string;
  country: string;
  createdAt: string;
}) {
  const existing = await pool().query<{ id: string }>(
    `SELECT id FROM agencies
     WHERE kind = 'individual' AND lower(email) = lower($1)
     ORDER BY created_at
     LIMIT 1`,
    [input.email],
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const id = crypto.randomUUID();
  await pool().query(
    `INSERT INTO agencies
      (id, name, kind, country, contact_name, email, phone, created_at)
     VALUES ($1, $2, 'individual', $3, '', $4, $5, $6)`,
    [id, input.name, input.country, input.email, input.phone, input.createdAt],
  );
  return id;
}

async function backfillWebsiteSales() {
  let sequence = await nextSaleNumber();
  const bookings = await pool().query<{
    id: string;
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
    created_at: string;
    confirmed_at: string | null;
    room_id: string;
    cost_per_night: number;
  }>(
    `SELECT b.id, b.status, b.check_in, b.check_out, b.quantity, b.travellers,
            b.public_price_per_night, b.name, b.email, b.phone, b.country,
            b.created_at, b.confirmed_at, b.room_id, r.cost_per_night
     FROM bookings b
     JOIN rooms r ON r.id = b.room_id
     WHERE NOT EXISTS (
       SELECT 1 FROM allotments a WHERE a.booking_id = b.id
     )
     ORDER BY b.created_at`,
  );

  for (const booking of bookings.rows) {
    sequence += 1;
    const allotmentId = crypto.randomUUID();
    const agencyId = await individualAgency({
      name: booking.name,
      email: booking.email,
      phone: booking.phone,
      country: booking.country,
      createdAt: booking.created_at,
    });
    const status =
      booking.status === "confirmed"
        ? "confirmed"
        : booking.status === "cancelled"
          ? "cancelled"
          : booking.status === "pending"
            ? "provisional"
            : "request";
    await pool().query(
      `INSERT INTO allotments
        (id, number, agency_id, status, check_in, check_out, notes, created_at,
         confirmed_at, channel, booking_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'b2c', $10)`,
      [
        allotmentId,
        `A${String(sequence).padStart(5, "0")}`,
        agencyId,
        status,
        booking.check_in,
        booking.check_out,
        [booking.name, booking.email, booking.phone, booking.country]
          .filter(Boolean)
          .join("\n")
          .slice(0, 2000),
        booking.created_at,
        status === "confirmed" ? booking.confirmed_at : null,
        booking.id,
      ],
    );
    await pool().query(
      `INSERT INTO allotment_lines
        (id, allotment_id, room_id, quantity, cost_per_night, agency_price_per_night, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, 0)`,
      [
        crypto.randomUUID(),
        allotmentId,
        booking.room_id,
        booking.quantity,
        booking.cost_per_night,
        booking.public_price_per_night,
      ],
    );
  }

  const submissions = await pool().query<{
    id: string;
    kind: string;
    status: string | null;
    agency_id: string | null;
    requirements: string;
    arrival: string;
    departure: string;
    travellers: number | null;
    room_count: number | null;
    package_slug: string;
    role: string;
    agency_website: string;
    annual_pilgrims: number | null;
    markets: string;
    created_at: string;
  }>(
    `SELECT id, kind, status, agency_id, requirements, arrival, departure,
            travellers, room_count, package_slug, role, agency_website,
            annual_pilgrims, markets, created_at
     FROM submissions
     WHERE agency_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM allotments a WHERE a.submission_id = submissions.id
       )
     ORDER BY created_at`,
  );

  for (const submission of submissions.rows) {
    if (!submission.agency_id) continue;
    sequence += 1;
    const stay = stayOrPlaceholder(submission.arrival, submission.departure);
    const declined = submission.status === "declined";
    const notes =
      submission.kind === "quote"
        ? [
            submission.travellers == null ? "" : String(submission.travellers),
            submission.room_count == null ? "" : String(submission.room_count),
            submission.requirements,
            submission.package_slug,
          ]
            .filter((part) => part.trim())
            .join("\n")
        : [
            submission.role,
            submission.agency_website,
            submission.annual_pilgrims == null
              ? ""
              : String(submission.annual_pilgrims),
            submission.markets,
            submission.requirements,
          ]
            .filter((part) => part.trim())
            .join("\n");
    await pool().query(
      `INSERT INTO allotments
        (id, number, agency_id, status, check_in, check_out, notes, created_at,
         channel, submission_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'b2b', $9)`,
      [
        crypto.randomUUID(),
        `A${String(sequence).padStart(5, "0")}`,
        submission.agency_id,
        declined ? "cancelled" : "request",
        stay.checkIn,
        stay.checkOut,
        notes.slice(0, 2000),
        submission.created_at,
        submission.id,
      ],
    );
  }
}

async function ensureSaleChannel() {
  const info = await pool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'allotments'`,
  );
  const names = new Set(info.rows.map((row) => row.column_name));
  if (!names.has("channel")) {
    await pool().query(
      `ALTER TABLE allotments ADD COLUMN channel TEXT NOT NULL DEFAULT 'desk'`,
    );
  }
  if (!names.has("booking_id")) {
    await pool().query(`ALTER TABLE allotments ADD COLUMN booking_id TEXT`);
  }
  if (!names.has("submission_id")) {
    await pool().query(`ALTER TABLE allotments ADD COLUMN submission_id TEXT`);
  }
  await pool().query(
    `CREATE UNIQUE INDEX IF NOT EXISTS allotments_booking_id_key
     ON allotments (booking_id) WHERE booking_id IS NOT NULL`,
  );
  await pool().query(
    `CREATE UNIQUE INDEX IF NOT EXISTS allotments_submission_id_key
     ON allotments (submission_id) WHERE submission_id IS NOT NULL`,
  );
  await backfillWebsiteSales();
}

async function ensureRoomCatalog() {
  await pool().query(
    `CREATE TABLE IF NOT EXISTS room_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      guests INTEGER NOT NULL,
      board TEXT NOT NULL DEFAULT 'room_only',
      view TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`,
  );

  const seeds = [
    ["solo", 1],
    ["double", 2],
    ["triple", 3],
    ["quad", 4],
  ] as const;
  const createdAt = new Date().toISOString();
  for (const [name, guests] of seeds) {
    const existing = await pool().query<{ id: string }>(
      `SELECT id FROM room_types
       WHERE lower(btrim(name)) = $1
         AND board = 'room_only'
         AND btrim(view) = ''
       LIMIT 1`,
      [name],
    );
    if (existing.rows[0]) continue;
    await pool().query(
      `INSERT INTO room_types
        (id, name, guests, board, view, description, created_at)
       VALUES ($1, $2, $3, 'room_only', '', '', $4)`,
      [crypto.randomUUID(), name, guests, createdAt],
    );
  }

  const roomColumns = await pool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'rooms'`,
  );
  if (!roomColumns.rows.some((row) => row.column_name === "room_type_id")) {
    await pool().query(`ALTER TABLE rooms ADD COLUMN room_type_id TEXT`);
  }
  const lineColumns = await pool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'purchase_lines'`,
  );
  if (!lineColumns.rows.some((row) => row.column_name === "room_type_id")) {
    await pool().query(`ALTER TABLE purchase_lines ADD COLUMN room_type_id TEXT`);
  }

  await pool().query(
    `UPDATE rooms AS room
     SET room_type_id = type.id
     FROM room_types AS type
     WHERE room.room_type_id IS NULL
       AND lower(btrim(type.name)) = lower(btrim(room.room_type))
       AND type.board = 'room_only'
       AND btrim(type.view) = ''`,
  );

  const unmatchedRooms = await pool().query<{
    room_type: string;
    capacity: number;
  }>(
    `SELECT lower(btrim(room_type)) AS room_type, MAX(capacity)::int AS capacity
     FROM rooms
     WHERE room_type_id IS NULL AND btrim(room_type) <> ''
     GROUP BY lower(btrim(room_type))`,
  );
  for (const row of unmatchedRooms.rows) {
    const id = crypto.randomUUID();
    const guests = Math.min(20, Math.max(1, Number(row.capacity) || 1));
    await pool().query(
      `INSERT INTO room_types
        (id, name, guests, board, view, description, created_at)
       VALUES ($1, $2, $3, 'room_only', '', '', $4)`,
      [id, row.room_type, guests, createdAt],
    );
    await pool().query(
      `UPDATE rooms
       SET room_type_id = $1
       WHERE room_type_id IS NULL AND lower(btrim(room_type)) = $2`,
      [id, row.room_type],
    );
  }

  await pool().query(
    `UPDATE purchase_lines AS line
     SET room_type_id = room.room_type_id
     FROM rooms AS room
     WHERE line.room_id = room.id
       AND line.room_type_id IS NULL
       AND room.room_type_id IS NOT NULL`,
  );
  await pool().query(
    `UPDATE purchase_lines AS line
     SET room_type_id = type.id
     FROM room_types AS type
     WHERE line.room_type_id IS NULL
       AND lower(btrim(type.name)) = lower(btrim(line.room_name))
       AND type.board = 'room_only'
       AND btrim(type.view) = ''`,
  );

  const unmatchedLines = await pool().query<{
    room_name: string;
    capacity: number;
  }>(
    `SELECT lower(btrim(room_name)) AS room_name, MAX(capacity)::int AS capacity
     FROM purchase_lines
     WHERE room_type_id IS NULL AND btrim(room_name) <> ''
     GROUP BY lower(btrim(room_name))`,
  );
  for (const row of unmatchedLines.rows) {
    const id = crypto.randomUUID();
    const guests = Math.min(20, Math.max(1, Number(row.capacity) || 1));
    await pool().query(
      `INSERT INTO room_types
        (id, name, guests, board, view, description, created_at)
       VALUES ($1, $2, $3, 'room_only', '', '', $4)`,
      [id, row.room_name, guests, createdAt],
    );
    await pool().query(
      `UPDATE purchase_lines
       SET room_type_id = $1
       WHERE room_type_id IS NULL AND lower(btrim(room_name)) = $2`,
      [id, row.room_name],
    );
  }

  await pool().query(`DROP INDEX IF EXISTS rooms_hotel_type_stay_key`);
  await pool().query(`DROP INDEX IF EXISTS rooms_hotel_type_open_key`);
  await pool().query(
    `CREATE UNIQUE INDEX IF NOT EXISTS rooms_hotel_catalog_stay_key
     ON rooms (hotel_id, room_type_id, check_in, check_out)
     WHERE room_type_id IS NOT NULL
       AND check_in IS NOT NULL
       AND check_out IS NOT NULL`,
  );
  await pool().query(
    `CREATE UNIQUE INDEX IF NOT EXISTS rooms_hotel_catalog_open_key
     ON rooms (hotel_id, room_type_id)
     WHERE room_type_id IS NOT NULL
       AND check_in IS NULL
       AND check_out IS NULL`,
  );
}

async function ensureCompanyProfile() {
  await pool().query(
    `CREATE TABLE IF NOT EXISTS company_profile (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      legal_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL,
      phone_display TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      commercial_registration TEXT NOT NULL DEFAULT '',
      vat_number TEXT NOT NULL DEFAULT '',
      address_en TEXT NOT NULL DEFAULT '',
      address_ar TEXT NOT NULL DEFAULT '',
      address_fr TEXT NOT NULL DEFAULT '',
      address_it TEXT NOT NULL DEFAULT ''
    )`,
  );
  const existing = await pool().query(
    "SELECT id FROM company_profile WHERE id = 'default'",
  );
  if (existing.rows[0]) return;
  await pool().query(
    `INSERT INTO company_profile
      (id, name, legal_name, email, phone_display, whatsapp, commercial_registration, vat_number,
       address_en, address_ar, address_fr, address_it)
     VALUES ('default', $1, '', $2, $3, $4, '', '', $5, $6, $7, $8)`,
    [
      siteConfig.name,
      siteConfig.email,
      siteConfig.phoneDisplay,
      siteConfig.whatsapp.replace(/\D/g, ""),
      siteConfig.company.address.en,
      siteConfig.company.address.ar,
      siteConfig.company.address.fr,
      siteConfig.company.address.it,
    ],
  );
}

async function ensureAdminUsers() {
  await pool().query(
    `CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
  );
  await pool().query(
    `CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_key
     ON admin_users (lower(email))`,
  );
}

async function addColumn(table: string, column: string, definition: string) {
  const info = await pool().query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  );
  if (info.rows[0]) return;
  await pool().query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function ensureContracts() {
  await pool().query(
    `CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      hotel_id TEXT NOT NULL REFERENCES hotels (id),
      room_type_id TEXT NOT NULL REFERENCES room_types (id),
      board TEXT NOT NULL DEFAULT 'room_only',
      view TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`,
  );
  await pool().query(
    `CREATE UNIQUE INDEX IF NOT EXISTS offers_product_key
     ON offers (hotel_id, room_type_id, board, view)`,
  );
  await addColumn("purchase_lines", "offer_id", "TEXT");
  await addColumn("purchase_lines", "board", "TEXT NOT NULL DEFAULT 'room_only'");
  await addColumn("purchase_lines", "view", "TEXT NOT NULL DEFAULT ''");
  await addColumn("purchase_lines", "min_nights", "INTEGER NOT NULL DEFAULT 1");
  await addColumn("purchase_lines", "sale_mode", "TEXT NOT NULL DEFAULT 'book'");
  await addColumn("allotment_lines", "offer_id", "TEXT");
  await addColumn("allotment_lines", "purchase_line_id", "TEXT");
  await addColumn("bookings", "offer_id", "TEXT");
  await addColumn("rooms", "offer_id", "TEXT");
  await pool().query(`ALTER TABLE allotment_lines ALTER COLUMN room_id DROP NOT NULL`);
  await pool().query(`ALTER TABLE bookings ALTER COLUMN room_id DROP NOT NULL`);
  await pool().query(
    `CREATE TABLE IF NOT EXISTS contract_rates (
      id TEXT PRIMARY KEY,
      purchase_line_id TEXT NOT NULL REFERENCES purchase_lines (id) ON DELETE CASCADE,
      agency_id TEXT NOT NULL REFERENCES agencies (id),
      price_per_night INTEGER NOT NULL
    )`,
  );
  await pool().query(
    `CREATE UNIQUE INDEX IF NOT EXISTS contract_rates_line_agency_key
     ON contract_rates (purchase_line_id, agency_id)`,
  );
  await pool().query(
    `CREATE TABLE IF NOT EXISTS agency_logins (
      agency_id TEXT PRIMARY KEY REFERENCES agencies (id),
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
  );
  await pool().query(
    `CREATE UNIQUE INDEX IF NOT EXISTS agency_logins_email_key
     ON agency_logins (lower(email))`,
  );
  await pool().query(
    `CREATE TABLE IF NOT EXISTS schema_flags (
      name TEXT PRIMARY KEY
    )`,
  );

  const flagged = await pool().query<{ name: string }>(
    `SELECT name FROM schema_flags WHERE name = 'contract_lines'`,
  );
  if (flagged.rows[0]) return;

  await pool().query(
    `UPDATE purchase_lines AS line
     SET board = type.board,
         view = COALESCE(type.view, '')
     FROM room_types AS type
     WHERE line.room_type_id = type.id`,
  );

  const products = await pool().query<{
    hotel_id: string;
    room_type_id: string;
    board: string;
    view: string;
  }>(
    `SELECT DISTINCT hotel_id, room_type_id, board, view
     FROM (
       SELECT room.hotel_id,
              room.room_type_id,
              COALESCE(NULLIF(btrim(type.board), ''), 'room_only') AS board,
              COALESCE(type.view, '') AS view
       FROM rooms AS room
       JOIN room_types AS type ON type.id = room.room_type_id
       WHERE room.room_type_id IS NOT NULL
       UNION
       SELECT purchase.hotel_id,
              line.room_type_id,
              COALESCE(NULLIF(btrim(line.board), ''), 'room_only') AS board,
              COALESCE(line.view, '') AS view
       FROM purchase_lines AS line
       JOIN purchases AS purchase ON purchase.id = line.purchase_id
       WHERE line.room_type_id IS NOT NULL
     ) AS product`,
  );
  const createdAt = new Date().toISOString();
  for (const product of products.rows) {
    await pool().query(
      `INSERT INTO offers (id, hotel_id, room_type_id, board, view, created_at)
       SELECT $1, $2, $3, $4, $5, $6
       WHERE NOT EXISTS (
         SELECT 1 FROM offers
         WHERE hotel_id = $2
           AND room_type_id = $3
           AND board = $4
           AND view = $5
       )`,
      [
        crypto.randomUUID(),
        product.hotel_id,
        product.room_type_id,
        product.board,
        product.view,
        createdAt,
      ],
    );
  }

  await pool().query(
    `UPDATE rooms AS room
     SET offer_id = offer.id
     FROM room_types AS type, offers AS offer
     WHERE room.room_type_id = type.id
       AND offer.hotel_id = room.hotel_id
       AND offer.room_type_id = room.room_type_id
       AND offer.board = COALESCE(NULLIF(btrim(type.board), ''), 'room_only')
       AND offer.view = COALESCE(type.view, '')`,
  );
  await pool().query(
    `UPDATE purchase_lines AS line
     SET offer_id = offer.id
     FROM purchases AS purchase, offers AS offer
     WHERE purchase.id = line.purchase_id
       AND offer.hotel_id = purchase.hotel_id
       AND offer.room_type_id = line.room_type_id
       AND offer.board = line.board
       AND offer.view = COALESCE(line.view, '')`,
  );
  await pool().query(
    `UPDATE allotment_lines AS line
     SET offer_id = room.offer_id
     FROM rooms AS room
     WHERE line.room_id = room.id
       AND line.offer_id IS NULL
       AND room.offer_id IS NOT NULL`,
  );
  await pool().query(
    `UPDATE bookings AS booking
     SET offer_id = room.offer_id
     FROM rooms AS room
     WHERE booking.room_id = room.id
       AND booking.offer_id IS NULL
       AND room.offer_id IS NOT NULL`,
  );
  await pool().query(
    `UPDATE allotment_lines AS line
     SET purchase_line_id = picked.id
     FROM (
       SELECT DISTINCT ON (sale.id) sale.id AS sale_id, contract.id
       FROM allotment_lines AS sale
       JOIN allotments AS allotment ON allotment.id = sale.allotment_id
       JOIN purchase_lines AS contract ON contract.offer_id = sale.offer_id
       JOIN purchases AS purchase ON purchase.id = contract.purchase_id
       WHERE sale.purchase_line_id IS NULL
         AND sale.offer_id IS NOT NULL
         AND purchase.status = 'confirmed'
         AND contract.check_in <= allotment.check_in
         AND contract.check_out >= allotment.check_out
       ORDER BY sale.id, contract.check_in
     ) AS picked
     WHERE line.id = picked.sale_id`,
  );
  await pool().query(
    `UPDATE allotments
     SET status = 'provisional'
     WHERE status = 'draft'
       AND booking_id IN (SELECT id FROM bookings WHERE status = 'pending')`,
  );
  await pool().query(
    `UPDATE allotments SET status = 'request' WHERE status = 'draft'`,
  );
  await pool().query(
    `INSERT INTO schema_flags (name) VALUES ('contract_lines')
     ON CONFLICT (name) DO NOTHING`,
  );
}

export function ensureDatabase() {
  ready ??= migrate();
  return ready;
}

export async function query<T extends QueryResultRow>(
  sql: string,
  args: unknown[] = [],
) {
  await ensureDatabase();
  const result = await pool().query<T>(placeholders(sql), args);
  return result.rows;
}

export async function execute(sql: string, args: unknown[] = []) {
  await ensureDatabase();
  return pool().query(placeholders(sql), args);
}

export type SqlClient = {
  query<T extends QueryResultRow>(sql: string, args?: unknown[]): Promise<T[]>;
  execute(sql: string, args?: unknown[]): Promise<void>;
};

export async function transaction<T>(run: (sql: SqlClient) => Promise<T>) {
  await ensureDatabase();
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const sql: SqlClient = {
      async query<R extends QueryResultRow>(statement: string, args: unknown[] = []) {
        const result = await client.query<R>(placeholders(statement), args);
        return result.rows;
      },
      async execute(statement, args = []) {
        await client.query(placeholders(statement), args);
      },
    };
    const value = await run(sql);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

import { Pool, type QueryResultRow } from "pg";

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
      check_out TEXT NOT NULL
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
      confirmed_at TEXT
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
  await ensureSubmissionStayColumns();
  await ensureSubmissionStatus();
  await ensureAssignmentAllotment();
  await ensureRoomPublicPrice();
  await ensureRoomStays();
  await ensureAgencyKind();
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

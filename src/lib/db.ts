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
      created_at TEXT NOT NULL
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

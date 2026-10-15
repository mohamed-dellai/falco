// JavaScript, scripts/verify-protected-records.mjs, Node.js 22+
import process from "node:process";
import nextEnv from "@next/env";
import pg from "pg";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const url = new URL(raw);
url.searchParams.delete("channel_binding");
url.searchParams.set("sslmode", "verify-full");
const pool = new pg.Pool({ connectionString: url.toString(), max: 1 });

const checks = [
  {
    name: "purchase P00001",
    sql: "SELECT COUNT(*)::int AS count FROM purchases WHERE number = 'P00001'",
    required: true,
  },
  {
    name: "legacy reservation A00001 (absent before this migration)",
    sql: `SELECT (
            (SELECT COUNT(*) FROM allotments WHERE number = 'A00001')
            + (SELECT COUNT(*) FROM bookings WHERE number = 'A00001')
          )::int AS count`,
    informational: true,
  },
  {
    name: "website reservations",
    sql: "SELECT COUNT(*)::int AS count FROM allotments WHERE channel IN ('b2b', 'b2c')",
    required: true,
  },
  {
    name: "Quad room type",
    sql: "SELECT COUNT(*)::int AS count FROM room_types WHERE lower(btrim(name)) = 'quad'",
    required: true,
  },
  {
    name: "temporary test room type (deleted before this migration)",
    sql: `SELECT (
            (SELECT COUNT(*) FROM room_types WHERE lower(btrim(name)) = 'test')
            + (SELECT COUNT(*) FROM rooms WHERE lower(btrim(name)) = 'test')
          )::int AS count`,
    informational: true,
  },
  {
    name: "purchases",
    sql: "SELECT COUNT(*)::int AS count FROM purchases",
    required: true,
  },
  {
    name: "reservations",
    sql: "SELECT COUNT(*)::int AS count FROM allotments",
    required: true,
  },
  {
    name: "legacy rooms",
    sql: "SELECT COUNT(*)::int AS count FROM rooms",
    required: true,
  },
  {
    name: "legacy room photos",
    sql: "SELECT COUNT(*)::int AS count FROM room_photos",
    informational: true,
  },
  {
    name: "offer photos",
    sql: "SELECT COUNT(*)::int AS count FROM offer_photos",
    informational: true,
  },
  {
    name: "website bookings",
    sql: "SELECT COUNT(*)::int AS count FROM bookings",
    required: true,
  },
  {
    name: "contract periods",
    sql: "SELECT COUNT(*)::int AS count FROM contract_periods",
    required: true,
  },
  {
    name: "reservation events",
    sql: "SELECT COUNT(*)::int AS count FROM reservation_events",
    required: true,
  },
  {
    name: "unlinked confirmed contract lines",
    sql: `SELECT COUNT(*)::int AS count
          FROM purchase_lines AS line
          JOIN purchases AS purchase ON purchase.id = line.purchase_id
          WHERE purchase.status = 'confirmed'
            AND NOT EXISTS (
              SELECT 1 FROM contract_periods AS period
              WHERE period.purchase_line_id = line.id
            )`,
    expected: 0,
  },
  {
    name: "missing reservation snapshots",
    sql: `SELECT COUNT(*)::int AS count
          FROM allotment_lines
          WHERE purchase_line_id IS NOT NULL
            AND (
              contract_period_id IS NULL
              OR board_snapshot = ''
              OR terms_snapshot = '{}'::jsonb
            )`,
    expected: 0,
  },
];

let failed = false;
try {
  for (const check of checks) {
    const result = await pool.query(check.sql);
    const count = Number(result.rows[0]?.count ?? 0);
    const passes =
      check.expected !== undefined
        ? count === check.expected
        : !check.required || count > 0;
    const status = check.informational ? "INFO" : passes ? "PASS" : "FAIL";
    console.log(`${status}  ${check.name}: ${count}`);
    if (!passes) failed = true;
  }
} finally {
  await pool.end();
}

if (failed) process.exit(1);

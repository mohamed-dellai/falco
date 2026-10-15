import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { execute, query } from "@/lib/db";
import { deliverAdminCode } from "@/lib/email";

const revealMinutes = 15;
const codeMinutes = 10;

function secret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "falco-development-session"
  );
}

function codeHash(adminId: string, code: string) {
  return createHmac("sha256", secret())
    .update(`${adminId}.${code}`)
    .digest("hex");
}

export async function contactRevealed(adminId: string) {
  const rows = await query<{ revealed_until: string }>(
    "SELECT revealed_until FROM contact_reveals WHERE admin_id = ?",
    [adminId],
  );
  const until = rows[0]?.revealed_until ?? "";
  return Boolean(until) && until > new Date().toISOString();
}

export async function requestContactReveal(adminId: string, email: string) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expires = new Date(Date.now() + codeMinutes * 60_000).toISOString();
  await execute(
    `INSERT INTO contact_reveals
      (admin_id, code_hash, code_expires_at, revealed_until)
     VALUES (?, ?, ?, '')
     ON CONFLICT (admin_id) DO UPDATE
       SET code_hash = EXCLUDED.code_hash,
           code_expires_at = EXCLUDED.code_expires_at`,
    [adminId, codeHash(adminId, code), expires],
  );
  try {
    await deliverAdminCode({ to: email, code });
  } catch {
    await execute(
      `UPDATE contact_reveals
       SET code_hash = '', code_expires_at = ''
       WHERE admin_id = ?`,
      [adminId],
    );
    return false;
  }
  return true;
}

export async function verifyContactReveal(adminId: string, code: string) {
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) return false;
  const rows = await query<{ code_hash: string; code_expires_at: string }>(
    `SELECT code_hash, code_expires_at
     FROM contact_reveals
     WHERE admin_id = ?`,
    [adminId],
  );
  const row = rows[0];
  if (!row?.code_hash || !row.code_expires_at) return false;
  if (row.code_expires_at <= new Date().toISOString()) return false;
  const expected = Buffer.from(row.code_hash);
  const actual = Buffer.from(codeHash(adminId, normalized));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return false;
  }
  const until = new Date(Date.now() + revealMinutes * 60_000).toISOString();
  await execute(
    `UPDATE contact_reveals
     SET code_hash = '', code_expires_at = '', revealed_until = ?
     WHERE admin_id = ?`,
    [until, adminId],
  );
  return true;
}

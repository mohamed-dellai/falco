import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { hashPassword, normalizeEmail, verifyPassword } from "@/lib/admin-users";
import { execute, query } from "@/lib/db";

const cookieName = "falco_agency_session";

function secret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "falco-development-session"
  );
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function readSession(cookie: string | undefined) {
  if (!cookie) return null;
  const [agencyId, expiresAt, digest] = cookie.split(".");
  if (!agencyId || !expiresAt || !digest) return null;
  if (Number(expiresAt) < Date.now()) return null;
  const expected = signature(`${agencyId}.${expiresAt}`);
  if (expected.length !== digest.length) return null;
  const valid = timingSafeEqual(Buffer.from(expected), Buffer.from(digest));
  return valid ? agencyId : null;
}

export type AgencySession = {
  id: string;
  name: string;
  email: string;
};

export async function currentAgency(): Promise<AgencySession | null> {
  const agencyId = readSession((await cookies()).get(cookieName)?.value);
  if (!agencyId) return null;
  const rows = await query<{ id: string; name: string; email: string }>(
    `SELECT agency.id, agency.name, login.email
     FROM agency_logins AS login
     JOIN agencies AS agency ON agency.id = login.agency_id
     WHERE login.agency_id = ?
       AND agency.kind = 'agency'`,
    [agencyId],
  );
  return rows[0] ?? null;
}

export async function createAgencySession(email: string, password: string) {
  const rows = await query<{
    agency_id: string;
    password_hash: string;
    kind: string | null;
  }>(
    `SELECT login.agency_id, login.password_hash, agency.kind
     FROM agency_logins AS login
     JOIN agencies AS agency ON agency.id = login.agency_id
     WHERE lower(login.email) = lower(?)`,
    [normalizeEmail(email)],
  );
  const account = rows[0];
  if (!account || account.kind !== "agency") return false;
  if (!(await verifyPassword(password, account.password_hash))) return false;
  const expiresAt = String(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const payload = `${account.agency_id}.${expiresAt}`;
  const store = await cookies();
  store.set(cookieName, `${payload}.${signature(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Number(expiresAt)),
  });
  return true;
}

export async function clearAgencySession() {
  (await cookies()).delete(cookieName);
}

export async function agencyLoginEmail(agencyId: string) {
  const rows = await query<{ email: string }>(
    "SELECT email FROM agency_logins WHERE agency_id = ?",
    [agencyId],
  );
  return rows[0]?.email ?? "";
}

export async function saveAgencyLogin(input: {
  agencyId: string;
  kind: string;
  email: string;
  password: string;
}) {
  if (input.kind !== "agency") {
    await execute("DELETE FROM agency_logins WHERE agency_id = ?", [input.agencyId]);
    return { ok: true as const };
  }
  const email = normalizeEmail(input.email);
  const existing = await agencyLoginEmail(input.agencyId);
  if (!email && !input.password) return { ok: true as const };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, error: "invalid" as const };
  }
  if (!existing && input.password.length < 8) {
    return { ok: false as const, error: "password" as const };
  }
  if (input.password && (input.password.length < 8 || input.password.length > 200)) {
    return { ok: false as const, error: "password" as const };
  }
  const taken = await query<{ agency_id: string }>(
    `SELECT agency_id FROM agency_logins
     WHERE lower(email) = lower(?) AND agency_id <> ?`,
    [email, input.agencyId],
  );
  if (taken[0]) return { ok: false as const, error: "invalid" as const };
  if (existing) {
    if (input.password) {
      await execute(
        `UPDATE agency_logins
         SET email = ?, password_hash = ?
         WHERE agency_id = ?`,
        [email, await hashPassword(input.password), input.agencyId],
      );
    } else {
      await execute(
        "UPDATE agency_logins SET email = ? WHERE agency_id = ?",
        [email, input.agencyId],
      );
    }
    return { ok: true as const };
  }
  await execute(
    `INSERT INTO agency_logins (agency_id, email, password_hash, created_at)
     VALUES (?, ?, ?, ?)`,
    [input.agencyId, email, await hashPassword(input.password), new Date().toISOString()],
  );
  return { ok: true as const };
}

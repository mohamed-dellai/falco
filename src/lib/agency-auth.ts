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
  nameAr: string;
  email: string;
};

export function agencyPortalName(
  agency: { name: string; nameAr: string },
  locale: string,
) {
  const arabic = agency.nameAr.trim();
  return locale === "ar" && arabic ? arabic : agency.name;
}

export function agencyReturnPath(locale: string, value: string) {
  const fallback = `/${locale}/hotels`;
  if (!value.startsWith(`/${locale}/hotels`)) return fallback;
  if (value.startsWith(`/${locale}/hotels/login`)) return fallback;
  if (value.includes("://") || value.includes("\\") || value.includes("//")) {
    return fallback;
  }
  return value;
}

export async function currentAgency(): Promise<AgencySession | null> {
  const agencyId = readSession((await cookies()).get(cookieName)?.value);
  if (!agencyId) return null;
  const rows = await query<{
    id: string;
    name: string;
    name_ar: string | null;
    email: string;
  }>(
    `SELECT agency.id, agency.name, agency.name_ar, login.email
     FROM agency_logins AS login
     JOIN agencies AS agency ON agency.id = login.agency_id
     WHERE login.agency_id = ?
       AND agency.kind = 'agency'
       AND agency.disabled = FALSE`,
    [agencyId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    nameAr: row.name_ar ?? "",
    email: row.email,
  };
}

export async function createAgencySession(email: string, password: string) {
  const rows = await query<{
    agency_id: string;
    password_hash: string;
    kind: string | null;
    disabled: boolean;
  }>(
    `SELECT login.agency_id, login.password_hash, agency.kind, agency.disabled
     FROM agency_logins AS login
     JOIN agencies AS agency ON agency.id = login.agency_id
     WHERE lower(login.email) = lower(?)`,
    [normalizeEmail(email)],
  );
  const account = rows[0];
  if (!account || account.kind !== "agency" || account.disabled) return false;
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
  const agency = await query<{ disabled: boolean }>(
    "SELECT disabled FROM agencies WHERE id = ?",
    [input.agencyId],
  );
  if (agency[0]?.disabled) return { ok: false as const, error: "client" as const };
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

export async function getAgencyProfile(agencyId: string) {
  const rows = await query<{
    id: string;
    name: string;
    country: string;
    contact_name: string;
    email: string;
    phone: string;
    commercial_registration: string;
    name_ar: string | null;
    vat_number: string;
    login_email: string;
  }>(
    `SELECT agency.id, agency.name, agency.name_ar, agency.country, agency.contact_name,
            agency.email, agency.phone, agency.commercial_registration,
            agency.vat_number, login.email AS login_email
     FROM agencies AS agency
     JOIN agency_logins AS login ON login.agency_id = agency.id
     WHERE agency.id = ? AND agency.kind = 'agency'`,
    [agencyId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    nameAr: row.name_ar ?? "",
    country: row.country,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    commercialRegistration: row.commercial_registration,
    vatNumber: row.vat_number,
    loginEmail: row.login_email,
  };
}

export async function updateAgencyProfile(input: {
  agencyId: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
}) {
  const email = normalizeEmail(input.email);
  if (
    input.contactName.trim().length > 140 ||
    input.phone.trim().length > 80 ||
    input.country.trim().length > 100 ||
    (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return false;
  }
  const result = await execute(
    `UPDATE agencies
     SET contact_name = ?, email = ?, phone = ?, country = ?
     WHERE id = ? AND kind = 'agency'`,
    [
      input.contactName.trim(),
      email,
      input.phone.trim(),
      input.country.trim(),
      input.agencyId,
    ],
  );
  return (result.rowCount ?? 0) > 0;
}

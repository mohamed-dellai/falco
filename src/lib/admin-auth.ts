import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const cookieName = "falco_admin_session";

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

function sameSecret(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function adminPasswordConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export async function isAdmin() {
  const cookie = (await cookies()).get(cookieName)?.value;
  if (!cookie) return false;

  const [expiresAt, digest] = cookie.split(".");
  if (!expiresAt || !digest) return false;
  if (Number(expiresAt) < Date.now()) return false;

  const expected = signature(expiresAt);
  if (expected.length !== digest.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(digest));
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function createAdminSession(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !sameSecret(password, expected)) return false;

  const expiresAt = String(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const store = await cookies();
  store.set(cookieName, `${expiresAt}.${signature(expiresAt)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Number(expiresAt)),
  });
  return true;
}

export async function clearAdminSession() {
  (await cookies()).delete(cookieName);
}

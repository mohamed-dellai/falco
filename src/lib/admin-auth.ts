import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  findAdminByEmail,
  getAdminUser,
  verifyPassword,
  type AdminUser,
} from "@/lib/admin-users";

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

function readSession(cookie: string | undefined) {
  if (!cookie) return null;
  const [userId, expiresAt, digest] = cookie.split(".");
  if (!userId || !expiresAt || !digest) return null;
  if (Number(expiresAt) < Date.now()) return null;
  const expected = signature(`${userId}.${expiresAt}`);
  if (expected.length !== digest.length) return null;
  const valid = timingSafeEqual(Buffer.from(expected), Buffer.from(digest));
  return valid ? userId : null;
}

export async function currentAdmin(): Promise<AdminUser | null> {
  const userId = readSession((await cookies()).get(cookieName)?.value);
  if (!userId) return null;
  return getAdminUser(userId);
}

export async function isAdmin() {
  return Boolean(await currentAdmin());
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function createAdminSession(email: string, password: string) {
  const account = await findAdminByEmail(email);
  if (!account || !(await verifyPassword(password, account.password_hash))) {
    return false;
  }

  const expiresAt = String(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const payload = `${account.id}.${expiresAt}`;
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

export async function clearAdminSession() {
  (await cookies()).delete(cookieName);
}

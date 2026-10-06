import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { execute, query, transaction } from "@/lib/db";

const scryptAsync = promisify(scrypt);

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
};

function mapUser(row: AdminUserRow): AdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  };
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validEmail(email: string) {
  return email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function accountDraft(input: {
  name: string;
  email: string;
  password: string;
  passwordRequired: boolean;
}) {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const password = input.password;
  if (name.length < 2 || name.length > 80 || !validEmail(email)) {
    return { ok: false as const, error: "invalid" as const };
  }
  if (input.passwordRequired || password.length > 0) {
    if (password.length < 8 || password.length > 200) {
      return { ok: false as const, error: "password" as const };
    }
  }
  return { ok: true as const, name, email, password };
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scryptAsync(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
  )) as Buffer;
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export async function countAdminUsers() {
  const rows = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM admin_users",
  );
  return Number(rows[0]?.count ?? 0);
}

export async function listAdminUsers() {
  const rows = await query<AdminUserRow>(
    "SELECT id, name, email, password_hash, created_at FROM admin_users ORDER BY lower(name), lower(email)",
  );
  return rows.map(mapUser);
}

export async function getAdminUser(id: string) {
  const rows = await query<AdminUserRow>(
    "SELECT id, name, email, password_hash, created_at FROM admin_users WHERE id = ?",
    [id],
  );
  return rows[0] ? mapUser(rows[0]) : null;
}

export async function findAdminByEmail(email: string) {
  const rows = await query<AdminUserRow>(
    "SELECT id, name, email, password_hash, created_at FROM admin_users WHERE lower(email) = ?",
    [normalizeEmail(email)],
  );
  return rows[0] ?? null;
}

async function emailTaken(email: string, exceptId?: string) {
  const rows = await query<{ id: string }>(
    "SELECT id FROM admin_users WHERE lower(email) = ? AND id <> ? LIMIT 1",
    [email, exceptId ?? ""],
  );
  return Boolean(rows[0]);
}

export async function createFirstAdmin(input: {
  name: string;
  email: string;
  password: string;
}) {
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password);
  const created = await transaction(async (sql) => {
    const rows = await sql.query<{ count: number }>(
      "SELECT COUNT(*)::int AS count FROM admin_users",
    );
    if (Number(rows[0]?.count ?? 0) > 0) return false;
    await sql.execute(
      `INSERT INTO admin_users (id, name, email, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, input.name, input.email, passwordHash, new Date().toISOString()],
    );
    return true;
  });
  return created ? id : null;
}

export async function createAdminUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  if (await emailTaken(input.email)) return { ok: false as const, error: "email" as const };
  const id = crypto.randomUUID();
  try {
    await execute(
      `INSERT INTO admin_users (id, name, email, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        input.name,
        input.email,
        await hashPassword(input.password),
        new Date().toISOString(),
      ],
    );
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false as const, error: "email" as const };
    throw error;
  }
  return { ok: true as const, id };
}

export async function updateAdminUser(
  id: string,
  input: { name: string; email: string; password: string },
) {
  const existing = await getAdminUser(id);
  if (!existing) return { ok: false as const, error: "invalid" as const };
  if (await emailTaken(input.email, id)) {
    return { ok: false as const, error: "email" as const };
  }
  const passwordHash = input.password
    ? await hashPassword(input.password)
    : null;
  try {
    await execute(
      passwordHash
        ? `UPDATE admin_users
           SET name = ?, email = ?, password_hash = ?
           WHERE id = ?`
        : `UPDATE admin_users SET name = ?, email = ? WHERE id = ?`,
      passwordHash
        ? [input.name, input.email, passwordHash, id]
        : [input.name, input.email, id],
    );
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false as const, error: "email" as const };
    throw error;
  }
  return { ok: true as const };
}

export async function deleteAdminUser(id: string, actorId: string) {
  if (id === actorId) return { ok: false as const, error: "self" as const };
  if ((await countAdminUsers()) <= 1) {
    return { ok: false as const, error: "last" as const };
  }
  const rows = await query<{ id: string }>(
    "DELETE FROM admin_users WHERE id = ? RETURNING id",
    [id],
  );
  return rows[0]
    ? { ok: true as const }
    : { ok: false as const, error: "invalid" as const };
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

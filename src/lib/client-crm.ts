import crypto from "crypto";
import { execute, query } from "@/lib/db";

export type ClientGroup = {
  id: string;
  name: string;
};

export type Commercial = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  percent: number;
  disabled: boolean;
  createdAt: string;
};

export type SupplierCode = {
  id: string;
  agencyId: string;
  provider: string;
  externalCode: string;
};

type CommercialRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  percent: number;
  disabled: boolean;
  created_at: string;
};

function mapCommercial(row: CommercialRow): Commercial {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    percent: Number(row.percent),
    disabled: Boolean(row.disabled),
    createdAt: row.created_at,
  };
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function listClientGroups() {
  const rows = await query<{ id: string; name: string }>(
    "SELECT id, name FROM client_groups ORDER BY lower(name)",
  );
  return rows;
}

export async function createClientGroup(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return null;
  const id = crypto.randomUUID();
  try {
    await execute(
      `INSERT INTO client_groups (id, name, created_at) VALUES (?, ?, ?)`,
      [id, trimmed, new Date().toISOString()],
    );
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
  return id;
}

export async function renameClientGroup(id: string, name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return false;
  try {
    const result = await execute(
      "UPDATE client_groups SET name = ? WHERE id = ?",
      [trimmed, id],
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
}

export async function deleteClientGroup(id: string) {
  const used = await query<{ id: string }>(
    `SELECT id FROM agencies WHERE group_id = ?
     UNION ALL
     SELECT id FROM contract_group_rates WHERE group_id = ?
     LIMIT 1`,
    [id, id],
  );
  if (used[0]) return false;
  const rows = await query<{ id: string }>(
    "DELETE FROM client_groups WHERE id = ? RETURNING id",
    [id],
  );
  return Boolean(rows[0]);
}

export async function listCommercials() {
  const rows = await query<CommercialRow>(
    "SELECT * FROM commercials ORDER BY lower(name)",
  );
  return rows.map(mapCommercial);
}

export async function getCommercial(id: string) {
  const rows = await query<CommercialRow>(
    "SELECT * FROM commercials WHERE id = ?",
    [id],
  );
  return rows[0] ? mapCommercial(rows[0]) : null;
}

export async function activeCommercial(id: string) {
  if (!id) return { ok: true as const, id: null, percent: null };
  const rows = await query<{ id: string; percent: number }>(
    `SELECT id, percent FROM commercials
     WHERE id = ? AND disabled = FALSE`,
    [id],
  );
  const percent = rows[0] ? Number(rows[0].percent) : null;
  if (!rows[0] || percent == null || percent < 0 || percent > 100) {
    return { ok: false as const };
  }
  return { ok: true as const, id: rows[0].id, percent };
}

export async function saveCommercial(input: {
  id?: string | null;
  name: string;
  email: string;
  phone: string;
  country: string;
  percent: number;
  disabled: boolean;
}) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (
    name.length < 2 ||
    name.length > 140 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !Number.isInteger(input.percent) ||
    input.percent < 0 ||
    input.percent > 100
  ) {
    return { ok: false as const, error: "invalid" as const };
  }
  const phone = input.phone.trim().slice(0, 40);
  const country = input.country.trim().slice(0, 80);
  try {
    if (input.id) {
      const result = await execute(
        `UPDATE commercials
         SET name = ?, email = ?, phone = ?, country = ?, percent = ?, disabled = ?
         WHERE id = ?`,
        [name, email, phone, country, input.percent, input.disabled, input.id],
      );
      if ((result.rowCount ?? 0) < 1) {
        return { ok: false as const, error: "invalid" as const };
      }
      return { ok: true as const, id: input.id };
    }
    const id = crypto.randomUUID();
    await execute(
      `INSERT INTO commercials
        (id, name, email, phone, country, percent, disabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        email,
        phone,
        country,
        input.percent,
        input.disabled,
        new Date().toISOString(),
      ],
    );
    return { ok: true as const, id };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false as const, error: "email" as const };
    }
    throw error;
  }
}

export async function listSupplierCodes(agencyId: string) {
  const rows = await query<{
    id: string;
    agency_id: string;
    provider: string;
    external_code: string;
  }>(
    `SELECT id, agency_id, provider, external_code
     FROM supplier_codes
     WHERE agency_id = ?
     ORDER BY lower(provider)`,
    [agencyId],
  );
  return rows.map(
    (row): SupplierCode => ({
      id: row.id,
      agencyId: row.agency_id,
      provider: row.provider,
      externalCode: row.external_code,
    }),
  );
}

export async function setAgencySupplier(agencyId: string, isSupplier: boolean) {
  const rows = await query<{ id: string }>(
    `UPDATE agencies SET is_supplier = ?
     WHERE id = ? AND kind = 'agency'
     RETURNING id`,
    [isSupplier, agencyId],
  );
  if (!rows[0]) return false;
  if (!isSupplier) {
    await execute("DELETE FROM supplier_codes WHERE agency_id = ?", [agencyId]);
  }
  return true;
}

export async function addSupplierCode(input: {
  agencyId: string;
  provider: string;
  externalCode: string;
}) {
  const provider = input.provider.trim().slice(0, 80);
  const externalCode = input.externalCode.trim().slice(0, 80);
  if (provider.length < 2 || externalCode.length < 1) return false;
  const agency = await query<{ id: string }>(
    `SELECT id FROM agencies
     WHERE id = ? AND kind = 'agency' AND is_supplier = TRUE`,
    [input.agencyId],
  );
  if (!agency[0]) return false;
  try {
    await execute(
      `INSERT INTO supplier_codes (id, agency_id, provider, external_code)
       VALUES (?, ?, ?, ?)`,
      [crypto.randomUUID(), input.agencyId, provider, externalCode],
    );
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
  return true;
}

export async function deleteSupplierCode(id: string, agencyId: string) {
  const rows = await query<{ id: string }>(
    `DELETE FROM supplier_codes WHERE id = ? AND agency_id = ? RETURNING id`,
    [id, agencyId],
  );
  return Boolean(rows[0]);
}

const identityTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["application/pdf", "pdf"],
]);

export function identityFile(file: File) {
  const extension = identityTypes.get(file.type);
  if (!extension) return { ok: false as const, error: "invalid" as const };
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false as const, error: "invalid" as const };
  }
  const filename = file.name.replace(/[^\w.\- ]+/g, "").slice(0, 80) || `identity.${extension}`;
  return { ok: true as const, contentType: file.type, filename };
}

export async function saveNationalId(input: {
  agencyId: string;
  nationalId: string;
  file?: { bytes: Buffer; contentType: string; filename: string } | null;
}) {
  const nationalId = input.nationalId.trim().slice(0, 40);
  if (input.file) {
    const rows = await query<{ id: string }>(
      `UPDATE agencies
       SET national_id = ?, identity_bytes = ?, identity_content_type = ?,
           identity_filename = ?
       WHERE id = ? AND kind = 'individual'
       RETURNING id`,
      [
        nationalId,
        input.file.bytes,
        input.file.contentType,
        input.file.filename,
        input.agencyId,
      ],
    );
    return Boolean(rows[0]);
  }
  const rows = await query<{ id: string }>(
    `UPDATE agencies SET national_id = ?
     WHERE id = ? AND kind = 'individual'
     RETURNING id`,
    [nationalId, input.agencyId],
  );
  return Boolean(rows[0]);
}

export async function getIdentityFile(agencyId: string) {
  const rows = await query<{
    identity_bytes: Uint8Array | null;
    identity_content_type: string;
    identity_filename: string;
  }>(
    `SELECT identity_bytes, identity_content_type, identity_filename
     FROM agencies
     WHERE id = ? AND kind = 'individual'`,
    [agencyId],
  );
  const row = rows[0];
  if (!row?.identity_bytes) return null;
  return {
    bytes: Buffer.from(row.identity_bytes),
    contentType: row.identity_content_type || "application/octet-stream",
    filename: row.identity_filename || "identity",
  };
}

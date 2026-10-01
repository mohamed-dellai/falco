import { execute, query, transaction } from "@/lib/db";
import type { AgencyInput, QuoteInput } from "@/lib/forms";

export type SubmissionKind = "agency" | "quote";

export type Submission = {
  id: string;
  kind: SubmissionKind;
  reference: string;
  agencyId: string | null;
  name: string;
  email: string;
  phone: string;
  country: string;
  requirements: string;
  departure: string;
  roomCount: number | null;
  agencyName: string;
  role: string;
  agencyWebsite: string;
  annualPilgrims: number | null;
  markets: string;
  arrival: string;
  travellers: number | null;
  packageSlug: string;
  status: SubmissionStatus;
  createdAt: string;
};

export const submissionStatuses = ["new", "quoted", "confirmed", "declined"] as const;
export type SubmissionStatus = (typeof submissionStatuses)[number];

type SubmissionRow = {
  id: string;
  kind: string;
  reference: string;
  agency_id: string | null;
  name: string;
  email: string;
  phone: string;
  country: string;
  requirements: string;
  departure: string;
  room_count: number | null;
  agency_name: string;
  role: string;
  agency_website: string;
  annual_pilgrims: number | null;
  markets: string;
  arrival: string;
  travellers: number | null;
  package_slug: string;
  status: string | null;
  created_at: string;
};

function asKind(value: string): SubmissionKind {
  return value === "quote" ? "quote" : "agency";
}

function mapSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    kind: asKind(row.kind),
    reference: row.reference,
    agencyId: row.agency_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    requirements: row.requirements,
    departure: row.departure ?? "",
    roomCount: row.room_count === null ? null : Number(row.room_count),
    agencyName: row.agency_name,
    role: row.role,
    agencyWebsite: row.agency_website,
    annualPilgrims:
      row.annual_pilgrims === null ? null : Number(row.annual_pilgrims),
    markets: row.markets,
    arrival: row.arrival,
    travellers: row.travellers === null ? null : Number(row.travellers),
    packageSlug: row.package_slug,
    status: asSubmissionStatus(row.status),
    createdAt: row.created_at,
  };
}

function asSubmissionStatus(value: string | null): SubmissionStatus {
  return submissionStatuses.includes(value as SubmissionStatus)
    ? (value as SubmissionStatus)
    : "new";
}

export async function recordAgencyApplication(
  input: AgencyInput,
  reference: string,
) {
  const id = crypto.randomUUID();
  const agencyId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await transaction(async (sql) => {
    await sql.execute(
      `INSERT INTO agencies
        (id, name, country, contact_name, email, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        agencyId,
        input.agencyName,
        input.country,
        input.name,
        input.email,
        input.phone,
        createdAt,
      ],
    );
    await sql.execute(
      `INSERT INTO submissions
        (id, kind, reference, agency_id, name, email, phone, country, requirements,
         agency_name, role, agency_website, annual_pilgrims, markets, created_at)
       VALUES (?, 'agency', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        reference,
        agencyId,
        input.name,
        input.email,
        input.phone,
        input.country,
        input.requirements,
        input.agencyName,
        input.role,
        input.agencyWebsite,
        input.annualPilgrims,
        input.markets,
        createdAt,
      ],
    );
  });

  return { id, agencyId };
}

export async function recordQuote(input: QuoteInput, reference: string) {
  const id = crypto.randomUUID();
  const agencyId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await transaction(async (sql) => {
    await sql.execute(
      `INSERT INTO agencies
        (id, name, country, contact_name, email, phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        agencyId,
        input.agencyName,
        input.country,
        input.name,
        input.email,
        input.phone,
        createdAt,
      ],
    );
    await sql.execute(
      `INSERT INTO submissions
        (id, kind, reference, agency_id, name, email, phone, country, requirements,
         agency_name, arrival, departure, travellers, room_count, package_slug, created_at)
       VALUES (?, 'quote', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        reference,
        agencyId,
        input.name,
        input.email,
        input.phone,
        input.country,
        input.requirements,
        input.agencyName,
        input.arrival,
        input.departure,
        input.travellers,
        input.roomCount,
        input.packageSlug,
        createdAt,
      ],
    );
  });

  return id;
}

export async function listSubmissions(kind?: SubmissionKind) {
  const rows = await query<SubmissionRow>(
    `SELECT * FROM submissions
     ${kind ? "WHERE kind = ?" : ""}
     ORDER BY created_at DESC`,
    kind ? [kind] : [],
  );
  return rows.map(mapSubmission);
}

export async function setSubmissionStatus(id: string, status: SubmissionStatus) {
  await execute(
    "UPDATE submissions SET status = ? WHERE id = ?",
    [status, id],
  );
}

export async function countNewSubmissions() {
  const rows = await query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM submissions WHERE status = 'new'",
  );
  return Number(rows[0]?.count ?? 0);
}

export async function getSubmission(id: string) {
  const rows = await query<SubmissionRow>(
    "SELECT * FROM submissions WHERE id = ?",
    [id],
  );
  return rows[0] ? mapSubmission(rows[0]) : null;
}

import crypto from "crypto";
import { query, transaction } from "@/lib/db";
import { getAllotment, type Allotment, type AllotmentLine } from "@/lib/inventory";
import { nightsBetween, roomVatSplit } from "@/lib/money";
import { listDeskServices, serviceTotals, type DeskService } from "@/lib/services";

export type InvoiceLineKind = "room" | "service";

export type InvoiceLine = {
  id: string;
  allotmentId: string;
  kind: InvoiceLineKind;
  label: string;
  detail: string;
  quantity: number;
  net: number;
  vat: number;
  gross: number;
};

export type InvoiceStay = {
  allotmentId: string;
  number: string;
  hotelName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  lines: InvoiceLine[];
};

export type IssuedInvoice = {
  id: string;
  number: number;
  agencyId: string;
  agencyName: string;
  issuedOn: string;
  kind: "single" | "grouped";
  net: number;
  vat: number;
  gross: number;
  stays: InvoiceStay[];
};

export type InvoiceSummary = {
  id: string;
  number: number;
  issuedOn: string;
  agencyName: string;
  stayCount: number;
  stayNumbers: string;
  net: number;
  vat: number;
  gross: number;
};

export type DraftLine = {
  kind: InvoiceLineKind;
  label: string;
  detail: string;
  quantity: number;
  net: number;
  vat: number;
  gross: number;
  priceIncludesVat: boolean;
};

export type DraftStay = {
  id: string;
  number: string;
  hotelName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  lines: DraftLine[];
};

function riyadhToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
}

function roomNet(allotment: Allotment, line: AllotmentLine) {
  const nights = Math.max(1, nightsBetween(allotment.checkIn, allotment.checkOut));
  return line.agencyPricePerNight * nights * line.quantity;
}

function serviceLine(service: DeskService): DraftLine {
  const totals = serviceTotals(service);
  const vat = totals.vat;
  const gross = totals.gross;
  return {
    kind: "service",
    label: service.typeName,
    detail: service.guestName || service.description,
    quantity: service.quantity,
    net: gross - vat,
    vat,
    gross,
    priceIncludesVat: false,
  };
}

export function buildInvoiceLines(allotment: Allotment, services: DeskService[], vatCharge: boolean): DraftLine[] {
  const rooms = allotment.lines.filter(
    (line) => line.supplierStatus !== "cancelled" && line.supplierStatus !== "no_show",
  );
  const roomLines = rooms.map((line) => {
    const amount = roomNet(allotment, line);
    const split = roomVatSplit(amount, line.priceIncludesVat, vatCharge);
    return {
      kind: "room" as const,
      label: line.roomName,
      detail: [line.boardSnapshot, line.viewSnapshot].filter(Boolean).join(" · "),
      quantity: line.quantity,
      net: split.net,
      vat: split.vat,
      gross: split.gross,
      priceIncludesVat: line.priceIncludesVat,
    };
  });
  const extras = services
    .filter((service) => service.clientStatus !== "cancelled")
    .map(serviceLine);
  return [...roomLines, ...extras];
}

function totals(lines: DraftLine[]) {
  return lines.reduce(
    (sum, line) => ({
      net: sum.net + line.net,
      vat: sum.vat + line.vat,
      gross: sum.gross + line.gross,
    }),
    { net: 0, vat: 0, gross: 0 },
  );
}

async function priceStay(allotment: Allotment, vatCharge: boolean): Promise<DraftStay> {
  const services = await listDeskServices({ allotmentId: allotment.id });
  return {
    id: allotment.id,
    number: allotment.number,
    hotelName: allotment.hotelName,
    guestName: allotment.guestName,
    checkIn: allotment.checkIn,
    checkOut: allotment.checkOut,
    lines: buildInvoiceLines(allotment, services, vatCharge),
  };
}

export async function getInvoiceForAllotment(allotmentId: string) {
  const rows = await query<{ invoice_id: string; number: number }>(
    `SELECT stay.invoice_id, invoice.number
     FROM invoice_stays stay
     JOIN issued_invoices invoice ON invoice.id = stay.invoice_id
     WHERE stay.allotment_id = ?`,
    [allotmentId],
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.invoice_id, number: Number(row.number) };
}

export async function invoiceCandidates(anchorId: string) {
  const anchor = await getAllotment(anchorId);
  if (!anchor) return null;
  const issued = await getInvoiceForAllotment(anchorId);
  const rows = await query<{ id: string }>(
    `SELECT allotment.id
     FROM allotments allotment
     WHERE allotment.agency_id = ?
       AND allotment.status = 'confirmed'
       AND allotment.channel <> 'b2c'
       AND NOT EXISTS (
         SELECT 1 FROM invoice_stays stay WHERE stay.allotment_id = allotment.id
       )
     ORDER BY allotment.number`,
    [anchor.agencyId],
  );
  const stays: DraftStay[] = [];
  for (const row of rows) {
    const allotment = row.id === anchor.id ? anchor : await getAllotment(row.id);
    if (!allotment) continue;
    stays.push(await priceStay(allotment, true));
  }
  if (!issued && anchor.status === "confirmed" && anchor.channel !== "b2c" && !stays.some((stay) => stay.id === anchor.id)) {
    stays.unshift(await priceStay(anchor, true));
  }
  return { anchor, issued, stays };
}

function takenError() {
  const error = new Error("taken");
  error.name = "StayTaken";
  return error;
}

export async function createIssuedInvoice(ids: string[], vatCharge: boolean) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return { ok: false as const, error: "invalid" as const };
  const loaded: Allotment[] = [];
  for (const id of unique) {
    const allotment = await getAllotment(id);
    if (!allotment || allotment.status !== "confirmed" || allotment.channel === "b2c") {
      return { ok: false as const, error: "invalid" as const };
    }
    loaded.push(allotment);
  }
  const agencyId = loaded[0].agencyId;
  if (loaded.some((item) => item.agencyId !== agencyId)) {
    return { ok: false as const, error: "client" as const };
  }
  const priced: DraftStay[] = [];
  for (const allotment of loaded) priced.push(await priceStay(allotment, vatCharge));
  const money = priced.reduce(
    (sum, stay) => {
      const stayMoney = totals(stay.lines);
      return {
        net: sum.net + stayMoney.net,
        vat: sum.vat + stayMoney.vat,
        gross: sum.gross + stayMoney.gross,
      };
    },
    { net: 0, vat: 0, gross: 0 },
  );
  try {
    const invoice = await transaction(async (sql) => {
      await sql.execute(
        `INSERT INTO invoice_counters (id, next_number) VALUES ('sales', 1) ON CONFLICT (id) DO NOTHING`,
      );
      const counters = await sql.query<{ next_number: number }>(
        `SELECT next_number FROM invoice_counters WHERE id = 'sales' FOR UPDATE`,
      );
      const number = Number(counters[0]?.next_number ?? 1);
      await sql.execute(`UPDATE invoice_counters SET next_number = ? WHERE id = 'sales'`, [number + 1]);
      const locked = await sql.query<{ id: string; status: string; agency_id: string }>(
        `SELECT id, status, agency_id FROM allotments WHERE id = ANY(?::text[]) FOR UPDATE`,
        [unique],
      );
      if (locked.length !== unique.length) throw new Error("invalid");
      if (locked.some((row) => row.status !== "confirmed" || row.agency_id !== agencyId)) {
        throw new Error("invalid");
      }
      const existing = await sql.query<{ allotment_id: string }>(
        `SELECT allotment_id FROM invoice_stays WHERE allotment_id = ANY(?::text[])`,
        [unique],
      );
      if (existing.length) throw takenError();
      const invoiceId = crypto.randomUUID();
      await sql.execute(
        `INSERT INTO issued_invoices (
           id, number, agency_id, agency_name, issued_on, kind, net, vat, gross, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          number,
          agencyId,
          loaded[0].agencyName,
          riyadhToday(),
          unique.length > 1 ? "grouped" : "single",
          money.net,
          money.vat,
          money.gross,
          new Date().toISOString(),
        ],
      );
      for (const stay of priced) {
        const source = loaded.find((item) => item.id === stay.id);
        if (!source) throw new Error("invalid");
        await sql.execute(
          `INSERT INTO invoice_stays (
             invoice_id, allotment_id, booking_number, hotel_name, guest_name, check_in, check_out
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [invoiceId, stay.id, source.number, source.hotelName, source.guestName, source.checkIn, source.checkOut],
        );
        for (const [index, line] of stay.lines.entries()) {
          await sql.execute(
            `INSERT INTO invoice_lines (
               id, invoice_id, allotment_id, sort_order, kind, label, detail, quantity, net, vat, gross
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              crypto.randomUUID(),
              invoiceId,
              stay.id,
              index,
              line.kind,
              line.label,
              line.detail,
              line.quantity,
              line.net,
              line.vat,
              line.gross,
            ],
          );
        }
      }
      return { id: invoiceId, number };
    });
    return { ok: true as const, invoice };
  } catch (error) {
    if (error instanceof Error && (error.name === "StayTaken" || error.message === "invalid")) {
      return { ok: false as const, error: error.name === "StayTaken" ? ("taken" as const) : ("invalid" as const) };
    }
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    if (code === "23505") return { ok: false as const, error: "taken" as const };
    throw error;
  }
}

export async function updateIssuedInvoice(
  invoiceId: string,
  lines: Array<{ id: string; label: string; detail: string; quantity: number; net: number; vat: number }>,
) {
  if (!lines.length) return { ok: false as const, error: "invalid" as const };
  const ids = lines.map((line) => line.id);
  if (new Set(ids).size !== ids.length) return { ok: false as const, error: "invalid" as const };
  for (const line of lines) {
    if (!line.id || !line.label.trim()) return { ok: false as const, error: "invalid" as const };
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 5000) {
      return { ok: false as const, error: "invalid" as const };
    }
    if (!Number.isInteger(line.net) || line.net < 0 || !Number.isInteger(line.vat) || line.vat < 0) {
      return { ok: false as const, error: "invalid" as const };
    }
  }
  return transaction(async (sql) => {
    const header = await sql.query<{ id: string }>(
      `SELECT id FROM issued_invoices WHERE id = ? FOR UPDATE`,
      [invoiceId],
    );
    if (!header[0]) return { ok: false as const, error: "invalid" as const };
    const existing = await sql.query<{ id: string }>(
      `SELECT id FROM invoice_lines WHERE invoice_id = ?`,
      [invoiceId],
    );
    const known = new Set(existing.map((row) => row.id));
    if (lines.some((line) => !known.has(line.id))) return { ok: false as const, error: "invalid" as const };
    const keep = new Set(ids);
    for (const row of existing) {
      if (keep.has(row.id)) continue;
      await sql.execute(`DELETE FROM invoice_lines WHERE id = ? AND invoice_id = ?`, [row.id, invoiceId]);
    }
    for (const line of lines) {
      await sql.execute(
        `UPDATE invoice_lines
         SET label = ?, detail = ?, quantity = ?, net = ?, vat = ?, gross = ?
         WHERE id = ? AND invoice_id = ?`,
        [
          line.label.trim().slice(0, 200),
          line.detail.trim().slice(0, 400),
          line.quantity,
          line.net,
          line.vat,
          line.net + line.vat,
          line.id,
          invoiceId,
        ],
      );
    }
    const net = lines.reduce((sum, line) => sum + line.net, 0);
    const vat = lines.reduce((sum, line) => sum + line.vat, 0);
    await sql.execute(`UPDATE issued_invoices SET net = ?, vat = ?, gross = ? WHERE id = ?`, [
      net,
      vat,
      net + vat,
      invoiceId,
    ]);
    return { ok: true as const };
  });
}

type InvoiceHeaderRow = {
  id: string;
  number: number;
  agency_id: string;
  agency_name: string;
  issued_on: string;
  kind: string;
  net: number;
  vat: number;
  gross: number;
};

type StayRow = {
  allotment_id: string;
  booking_number: string;
  hotel_name: string;
  guest_name: string;
  check_in: string;
  check_out: string;
};

type LineRow = {
  id: string;
  allotment_id: string;
  kind: string;
  label: string;
  detail: string;
  quantity: number;
  net: number;
  vat: number;
  gross: number;
};

function asKind(value: string): "single" | "grouped" {
  return value === "grouped" ? "grouped" : "single";
}

function asLineKind(value: string): InvoiceLineKind {
  return value === "service" ? "service" : "room";
}

export async function getInvoice(id: string): Promise<IssuedInvoice | null> {
  const headers = await query<InvoiceHeaderRow>(
    `SELECT id, number, agency_id, agency_name, issued_on, kind, net, vat, gross
     FROM issued_invoices
     WHERE id = ?`,
    [id],
  );
  const header = headers[0];
  if (!header) return null;
  const [stays, lines] = await Promise.all([
    query<StayRow>(
      `SELECT allotment_id, booking_number, hotel_name, guest_name, check_in, check_out
       FROM invoice_stays
       WHERE invoice_id = ?
       ORDER BY booking_number`,
      [id],
    ),
    query<LineRow>(
      `SELECT id, allotment_id, kind, label, detail, quantity, net, vat, gross
       FROM invoice_lines
       WHERE invoice_id = ?
       ORDER BY sort_order`,
      [id],
    ),
  ]);
  return {
    id: header.id,
    number: Number(header.number),
    agencyId: header.agency_id,
    agencyName: header.agency_name,
    issuedOn: header.issued_on,
    kind: asKind(header.kind),
    net: Number(header.net),
    vat: Number(header.vat),
    gross: Number(header.gross),
    stays: stays.map((stay) => ({
      allotmentId: stay.allotment_id,
      number: stay.booking_number,
      hotelName: stay.hotel_name,
      guestName: stay.guest_name,
      checkIn: stay.check_in,
      checkOut: stay.check_out,
      lines: lines
        .filter((line) => line.allotment_id === stay.allotment_id)
        .map((line) => ({
          id: line.id,
          allotmentId: line.allotment_id,
          kind: asLineKind(line.kind),
          label: line.label,
          detail: line.detail,
          quantity: Number(line.quantity),
          net: Number(line.net),
          vat: Number(line.vat),
          gross: Number(line.gross),
        })),
    })),
  };
}

export async function listInvoices(filter: { number?: string; client?: string; from?: string; to?: string }) {
  const where: string[] = [];
  const args: string[] = [];
  const number = filter.number?.trim() ?? "";
  if (number) {
    where.push("CAST(invoice.number AS TEXT) LIKE ?");
    args.push(`%${number}%`);
  }
  const client = filter.client?.trim() ?? "";
  if (client) {
    where.push("invoice.agency_name ILIKE ?");
    args.push(`%${client}%`);
  }
  if (filter.from) {
    where.push("invoice.issued_on >= ?");
    args.push(filter.from);
  }
  if (filter.to) {
    where.push("invoice.issued_on <= ?");
    args.push(filter.to);
  }
  const rows = await query<{
    id: string;
    number: number;
    issued_on: string;
    agency_name: string;
    stay_count: number;
    stay_numbers: string | null;
    net: number;
    vat: number;
    gross: number;
  }>(
    `SELECT invoice.id, invoice.number, invoice.issued_on, invoice.agency_name,
            COUNT(stay.allotment_id)::int AS stay_count,
            string_agg(stay.booking_number, ', ' ORDER BY stay.booking_number) AS stay_numbers,
            invoice.net, invoice.vat, invoice.gross
     FROM issued_invoices invoice
     LEFT JOIN invoice_stays stay ON stay.invoice_id = invoice.id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     GROUP BY invoice.id
     ORDER BY invoice.number DESC`,
    args,
  );
  return rows.map((row) => ({
    id: row.id,
    number: Number(row.number),
    issuedOn: row.issued_on,
    agencyName: row.agency_name,
    stayCount: Number(row.stay_count),
    stayNumbers: row.stay_numbers ?? "",
    net: Number(row.net),
    vat: Number(row.vat),
    gross: Number(row.gross),
  }));
}

export type PaymentListRow = {
  id: string;
  allotmentId: string;
  code: string;
  kind: string;
  method: string;
  amount: number;
  paidOn: string;
  posted: boolean;
  bookingNumber: string;
  client: string;
};

export async function listAllPayments(filter: {
  code?: string;
  client?: string;
  booking?: string;
  from?: string;
  to?: string;
}) {
  const where: string[] = [];
  const args: string[] = [];
  const code = filter.code?.trim() ?? "";
  if (code) {
    where.push("payment.code ILIKE ?");
    args.push(`%${code}%`);
  }
  const client = filter.client?.trim() ?? "";
  if (client) {
    where.push("agency.name ILIKE ?");
    args.push(`%${client}%`);
  }
  const booking = filter.booking?.trim() ?? "";
  if (booking) {
    where.push("allotment.number ILIKE ?");
    args.push(`%${booking}%`);
  }
  if (filter.from) {
    where.push("payment.paid_on >= ?");
    args.push(filter.from);
  }
  if (filter.to) {
    where.push("payment.paid_on <= ?");
    args.push(filter.to);
  }
  const rows = await query<{
    id: string;
    allotment_id: string;
    code: string;
    kind: string;
    method: string;
    amount: number;
    paid_on: string;
    posted: boolean;
    booking_number: string;
    client: string | null;
  }>(
    `SELECT payment.id, payment.allotment_id, payment.code, payment.kind, payment.method,
            payment.amount, payment.paid_on, payment.posted,
            allotment.number AS booking_number,
            agency.name AS client
     FROM reservation_payments payment
     JOIN allotments allotment ON allotment.id = payment.allotment_id
     LEFT JOIN agencies agency ON agency.id = allotment.agency_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY payment.paid_on DESC, payment.created_at DESC`,
    args,
  );
  return rows.map((row) => ({
    id: row.id,
    allotmentId: row.allotment_id,
    code: row.code,
    kind: row.kind,
    method: row.method,
    amount: Number(row.amount),
    paidOn: row.paid_on,
    posted: Boolean(row.posted),
    bookingNumber: row.booking_number,
    client: row.client ?? "",
  }));
}

export async function invoiceParties(allotmentIds: string[]) {
  const ids = [...new Set(allotmentIds.filter(Boolean))];
  if (!ids.length) {
    return { clientAr: "", vat: "", phone: "", email: "", hotels: {} as Record<string, string> };
  }
  const rows = await query<{
    id: string;
    hotel_ar: string;
    agency_ar: string;
    vat: string;
    phone: string;
    email: string;
  }>(
    `SELECT allotment.id,
            COALESCE(hotel.name_ar, '') AS hotel_ar,
            COALESCE(agency.name_ar, '') AS agency_ar,
            COALESCE(agency.vat_number, '') AS vat,
            COALESCE(agency.phone, '') AS phone,
            COALESCE(NULLIF(agency.email, ''), login.email, '') AS email
     FROM allotments allotment
     JOIN agencies agency ON agency.id = allotment.agency_id
     LEFT JOIN agency_logins login ON login.agency_id = agency.id
     LEFT JOIN hotels hotel ON hotel.id = allotment.hotel_id
     WHERE allotment.id = ANY(?::text[])`,
    [ids],
  );
  const hotels: Record<string, string> = {};
  for (const row of rows) hotels[row.id] = row.hotel_ar;
  const first = rows[0];
  return {
    clientAr: first?.agency_ar ?? "",
    vat: first?.vat ?? "",
    phone: first?.phone ?? "",
    email: first?.email ?? "",
    hotels,
  };
}

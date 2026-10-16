import type { CompanyProfile } from "@/lib/company";
import type { Allotment, AllotmentLine } from "@/lib/inventory";
import { nightsBetween } from "@/lib/money";
import { createPdfSheet, type PdfRaster } from "@/lib/plain-pdf";
import type { DocumentSheet, SupplierDocumentKind } from "@/lib/reservation-documents";
import { create as createQr } from "qrcode/lib/core/qrcode";

type Parties = {
  hotelCity: string;
  hotelAddress: string;
  hotelPhone: string;
  agencyPhone: string;
  agencyEmail: string;
  agencyVat: string;
};

type Labels = {
  room: string;
  view: string;
  meal: string;
  checkIn: string;
  checkOut: string;
  nights: string;
  rooms: string;
  rate: string;
  total: string;
  hotel: string;
  client: string;
  guest: string;
  vat: string;
  paid: string;
  refund: string;
  due: string;
  hotelConf: string;
  status: string;
};

const leads: Record<string, string> = {
  confirmation: "This reservation is confirmed.",
  client_cancel: "This reservation is cancelled.",
  regret: "This reservation is a regret.",
  unavailable: "These rooms are not available.",
  amendment: "This reservation has been amended.",
  option_date: "This option is held until the date on the booking.",
  no_show: "This booking is recorded as a no-show.",
  voucher: "Voucher for arrival.",
  invoice: "Invoice for this stay.",
  non_refundable: "This booking is non-refundable.",
  supplier_voucher: "Hotel voucher for this stay.",
  rooming_list: "Rooming list for this stay.",
  lease: "Lease for this stay.",
  price_offer: "Price offer for this stay.",
  request: "Please confirm these rooms.",
  request_block: "Please take these rooms from the contract.",
  supplier_amendment: "Please apply this change to the booking.",
  supplier_voucher_send: "The guest voucher is ready for arrival.",
  cancel: "Please cancel this booking.",
};

function money(halalas: number) {
  const sign = halalas < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(halalas));
  const whole = Math.trunc(abs / 100).toLocaleString("en-GB");
  const fraction = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${fraction}`;
}

function gregorian(iso: string) {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

function hijri(iso: string) {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00+03:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB-u-ca-islamic-umalqura", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  })
    .format(date)
    .replace(" AH", "");
}

function meal(code: string) {
  return code.replaceAll("_", " ");
}

function stayNights(allotment: Allotment, line: AllotmentLine) {
  return Math.max(1, nightsBetween(line.roomCheckIn || allotment.checkIn, line.roomCheckOut || allotment.checkOut));
}

function lineAmount(allotment: Allotment, line: AllotmentLine, side: "cost" | "sell") {
  const nights = stayNights(allotment, line);
  const rate = side === "cost" ? line.costPerNight : line.agencyPricePerNight;
  if (line.amountBasis === "stay") return rate * line.quantity;
  return rate * nights * line.quantity;
}

const black = [0.1, 0.12, 0.14] as const;
const muted = [0.35, 0.39, 0.44] as const;
const rule = [0.75, 0.78, 0.82] as const;
const head = [0.93, 0.94, 0.95] as const;
const paidColor = [0.05, 0.5, 0.28] as const;
const refundColor = [0.75, 0.15, 0.16] as const;
const dueColor = [0.16, 0.38, 0.75] as const;
const navy = [0.08, 0.22, 0.37] as const;

type Sheet = ReturnType<typeof createPdfSheet>;

function wrapLines(value: string, width: number) {
  const rows: string[] = [];
  for (const part of value.split(/\n+/)) {
    let rest = part.trim();
    while (rest.length > width) {
      const breakAt = rest.lastIndexOf(" ", width);
      const cut = breakAt > 12 ? breakAt : width;
      rows.push(rest.slice(0, cut));
      rest = rest.slice(cut).trim();
    }
    if (rest) rows.push(rest);
  }
  return rows;
}

function paintLogo(sheet: Sheet, logo: PdfRaster | null | undefined, name: string, left: number, top: number) {
  const box = 58;
  if (logo) {
    const scale = Math.min(box / logo.width, box / logo.height);
    const width = logo.width * scale;
    const height = logo.height * scale;
    sheet.image(logo, left + (box - width) / 2, top - (box - height) / 2, width, height);
    return;
  }
  sheet.fill(left, top - box, box, box, navy);
  sheet.place((name.trim()[0] || "F").toUpperCase(), left + box / 2, top - 36, 18, true, [1, 1, 1], "center");
}

function paintBrand(sheet: Sheet, logo: PdfRaster | null | undefined, name: string, left: number, top: number) {
  paintLogo(sheet, logo, name, left, top);
  const lines = wrapLines(name, 34).slice(0, 2);
  lines.forEach((line, index) => {
    sheet.place(line, left, top - 72 - index * 11, 8, true, black, "start", 210);
  });
  return 72 + Math.max(lines.length, 1) * 11;
}

function paintFooter(
  sheet: Sheet,
  company: CompanyProfile,
  today: string,
) {
  const bottom = 28;
  const height = 46;
  sheet.stamp(() => {
    sheet.fill(sheet.left, bottom, sheet.right - sheet.left, height, [0.98, 0.985, 0.99]);
    sheet.stroke(sheet.left, bottom, sheet.right - sheet.left, height, rule);
    sheet.place(
      `Official Business Name: ${company.legalName || company.name}`,
      sheet.left + 8,
      bottom + 30,
      8,
      true,
      black,
      "start",
      280,
    );
    sheet.place(`Date: ${gregorian(today)}`, sheet.right - 8, bottom + 30, 8, false, muted, "end");
    sheet.place(`Hijri Date: ${hijri(today)}`, sheet.right - 8, bottom + 16, 8, false, muted, "end");
    sheet.place(`CR N°: ${company.commercialRegistration}`, sheet.left + 8, bottom + 8, 8, false, black, "start", 180);
    sheet.place(`VAT N°: ${company.vatNumber}`, sheet.left + 200, bottom + 8, 8, false, black, "start", 160);
  });
}

function paintQr(sheet: Sheet, text: string, left: number, top: number, size: number) {
  if (!text.trim()) return;
  let symbol;
  try {
    symbol = createQr(text, { errorCorrectionLevel: "M" });
  } catch {
    return;
  }
  const count = symbol.modules.size;
  const cell = size / count;
  sheet.fill(left, top - size, size, size, [1, 1, 1]);
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (!symbol.modules.get(row, col)) continue;
      sheet.fill(left + col * cell, top - (row + 1) * cell, cell + 0.15, cell + 0.15, black);
    }
  }
}

export function clientDocumentPdf(input: {
  allotment: Allotment;
  kind: string;
  sheet: DocumentSheet;
  parties: Parties;
  company: CompanyProfile;
  title: string;
  status: string;
  labels: Labels;
  paid: number | null;
  refunded: number | null;
  due: number | null;
  logo?: PdfRaster | null;
}) {
  const priced = input.sheet.amountLabel !== "none";
  const side = input.sheet.amountLabel === "cost" ? "cost" : "sell";
  const active = input.allotment.lines.filter((line) => {
    if (line.supplierStatus === "cancelled") return false;
    if (input.kind === "no_show") return true;
    return line.supplierStatus !== "no_show";
  });
  const sheet = createPdfSheet();
  sheet.margin(86);
  const today = new Date().toISOString().slice(0, 10);
  const top = sheet.y();
  const below = top - paintBrand(sheet, input.logo, input.company.name, sheet.left, top) - 8;
  sheet.place(input.title.toUpperCase(), 230, top - 16, 16, true, black, "start", 210);
  sheet.place(input.allotment.number, sheet.right, top - 16, 13, true, black, "end");
  sheet.place(leads[input.kind] ?? input.title, 230, top - 32, 9, true, black, "start", 250);
  sheet.place(`Booking Status: ${input.status}`, 230, top - 46, 8, false, muted, "start", 250);
  sheet.place(input.allotment.hotelName, sheet.left, below, 11, true, black, "start", 340);
  sheet.place(`Date: ${gregorian(today)}    Hijri Date: ${hijri(today)}`, sheet.left, below - 16, 8, false, muted);

  const address = wrapLines(input.company.address.en, 34);
  if (input.company.vatNumber) address.push(`VAT number: ${input.company.vatNumber}`);
  address.forEach((line, index) => {
    sheet.place(line, sheet.right, below - index * 11, 7, false, muted, "end", 168);
  });

  const facts = [
    [input.labels.hotel, input.allotment.hotelName],
    [input.labels.client, input.allotment.agencyName],
    ["Guest Name", input.allotment.guestName],
    ["Mail", input.parties.agencyEmail],
    ["Mobile", input.parties.agencyPhone],
    ["VAT number", input.parties.agencyVat],
    [input.labels.hotelConf, input.sheet.hotelConfirmation],
  ].filter((row) => row[1]);
  let cursor = below - 36;
  for (const [label, value] of facts) {
    sheet.place(label, sheet.left, cursor, 8, false, muted, "start", 84);
    sheet.place(`:  ${value}`, sheet.left + 88, cursor, 8, true, black, "start", 250);
    cursor -= 13;
  }
  const addressBottom = below - Math.max(address.length, 1) * 11;
  sheet.setY(Math.min(cursor, addressBottom) - 8);

  const widths = priced ? [118, 72, 68, 62, 62, 42, 49, 50] : [150, 90, 80, 70, 70, 63];
  const headers = priced
    ? ["ROOM TYPE", "VIEW", "MEAL", "IN", "OUT", "NIGHTS", "RATE", "TOTAL"]
    : ["ROOM TYPE", "VIEW", "MEAL", "IN", "OUT", "NIGHTS"];
  const aligns = priced
    ? [false, false, false, false, false, true, true, true]
    : [false, false, false, false, false, true];
  const drawRow = (cells: string[], header: boolean) => {
    const rowTop = sheet.reserve(16);
    const bottom = rowTop - 16;
    if (header) sheet.fill(sheet.left, bottom, sheet.right - sheet.left, 16, head);
    let x = sheet.left;
    cells.forEach((text, index) => {
      const end = aligns[index];
      sheet.place(
        text,
        end ? x + widths[index] - 3 : x + 3,
        bottom + 4,
        7,
        header || end,
        black,
        end ? "end" : "start",
        widths[index] - 6,
      );
      sheet.line(x, rowTop, x, bottom, rule);
      x += widths[index];
    });
    sheet.line(sheet.right, rowTop, sheet.right, bottom, rule);
    sheet.line(sheet.left, rowTop, sheet.right, rowTop, rule);
    sheet.line(sheet.left, bottom, sheet.right, bottom, rule);
  };
  drawRow(headers, true);
  if (!active.length) drawRow(headers.map(() => ""), false);
  for (const line of active) {
    const nights = stayNights(input.allotment, line);
    const checkIn = gregorian(line.roomCheckIn || input.allotment.checkIn);
    const checkOut = gregorian(line.roomCheckOut || input.allotment.checkOut);
    const cells = [
      `${line.quantity} ${line.roomName}`,
      line.viewSnapshot,
      meal(line.boardSnapshot),
      checkIn,
      checkOut,
      String(nights),
    ];
    if (priced) {
      cells.push(
        money(side === "cost" ? line.costPerNight : line.agencyPricePerNight),
        money(lineAmount(input.allotment, line, side)),
      );
    }
    drawRow(cells, false);
  }

  if (priced && input.sheet.total !== null) {
    sheet.reserve(8);
    const vat = input.sheet.vatAmount;
    const rows: Array<[string, number, readonly [number, number, number], boolean]> = [
      ["Net Accommodation Charge", input.sheet.total, black, false],
    ];
    if (vat !== null) rows.push(["VAT Charge", vat, black, false]);
    rows.push(["(SAR) TOTAL", input.sheet.total + (vat ?? 0), black, true]);
    if (input.paid !== null) rows.push([input.labels.paid.toUpperCase(), input.paid, paidColor, true]);
    if (input.refunded !== null) rows.push([input.labels.refund.toUpperCase(), input.refunded, refundColor, true]);
    if (input.due !== null) rows.push(["REMAINING", input.due, dueColor, true]);
    for (const [label, amount, color, bold] of rows) {
      const rowTop = sheet.reserve(14);
      sheet.place(label, sheet.right - 78, rowTop - 11, 8, false, color, "end", 220);
      sheet.place(money(amount), sheet.right, rowTop - 11, bold ? 9 : 8, bold, color, "end", 72);
    }
  }

  const qrTop = sheet.reserve(96);
  paintQr(sheet, input.allotment.number, sheet.left + (sheet.right - sheet.left - 78) / 2, qrTop - 6, 78);

  if (input.sheet.terms.length) {
    sheet.reserve(6);
    const heading = sheet.reserve(16);
    sheet.place("Terms & Conditions", sheet.left, heading - 12, 10, true, black);
    for (const term of input.sheet.terms) {
      for (const part of term.split(/\n+/)) {
        for (const row of wrapLines(part, 96)) {
          const lineTop = sheet.reserve(11);
          sheet.place(row, sheet.left, lineTop - 9, 8, false, muted, "start", sheet.right - sheet.left);
        }
      }
    }
  }

  paintFooter(sheet, input.company, today);
  return sheet.toBuffer();
}

export function supplierDocumentPdf(input: {
  allotment: Allotment;
  kind: SupplierDocumentKind;
  lines: AllotmentLine[];
  parties: Parties;
  company: CompanyProfile;
  title: string;
  labels: Labels;
  amendment: string;
  logo?: PdfRaster | null;
}) {
  const leadKey =
    input.kind === "amendment"
      ? "supplier_amendment"
      : input.kind === "voucher"
        ? "supplier_voucher_send"
        : input.kind;
  const sheet = createPdfSheet();
  const top = sheet.y();
  const today = new Date().toISOString().slice(0, 10);
  paintLogo(sheet, input.logo, input.company.name, sheet.left, top);
  sheet.place(input.title.toUpperCase(), 230, top - 16, 14, true, black, "start", 210);
  sheet.place(input.allotment.number, sheet.right, top - 16, 12, true, black, "end");
  sheet.place(`Date: ${gregorian(today)}    Hijri Date: ${hijri(today)}`, 230, top - 34, 8, false, muted);
  sheet.place(input.allotment.hotelName, sheet.left, top - 72, 11, true, black, "start", 400);
  sheet.setY(top - 90);
  const columns = [
    { text: input.labels.hotel, width: 110 },
    { text: input.labels.room, width: 100 },
    { text: input.labels.view, width: 70 },
    { text: input.labels.meal, width: 58 },
    { text: input.labels.rooms, width: 32, align: "end" as const },
    { text: input.labels.checkIn, width: 58 },
    { text: input.labels.nights, width: 32, align: "end" as const },
    { text: input.labels.checkOut, width: 63 },
  ];
  sheet.text(leads[leadKey] ?? input.title);
  sheet.gap(6);
  sheet.band(columns);
  for (const line of input.lines) {
    const nights = stayNights(input.allotment, line);
    sheet.columns(
      [
        input.allotment.hotelName,
        line.roomName,
        line.viewSnapshot,
        meal(line.boardSnapshot),
        String(line.quantity),
        (line.roomCheckIn || input.allotment.checkIn).slice(0, 10),
        String(nights),
        (line.roomCheckOut || input.allotment.checkOut).slice(0, 10),
      ].map((text, index) => ({
        text,
        width: columns[index].width,
        align: columns[index].align,
      })),
    );
  }
  sheet.rule();
  sheet.text(`${input.labels.guest}: ${input.allotment.guestName}`);
  sheet.text(`${input.labels.client}: ${input.allotment.agencyName}`);
  if (input.parties.hotelPhone) sheet.caption(input.parties.hotelPhone);
  if (input.amendment) {
    sheet.gap(6);
    let rest = input.amendment.trim();
    while (rest) {
      sheet.caption(rest.slice(0, 110));
      rest = rest.slice(110).trim();
    }
  }
  return sheet.toBuffer();
}

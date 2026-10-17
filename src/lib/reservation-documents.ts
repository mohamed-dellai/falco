import { query } from "@/lib/db";
import { type Allotment, type AllotmentStatus } from "@/lib/inventory";
import { formatMoney, nightsBetween, roomVatSplit } from "@/lib/money";
import { paymentTotals, listReservationPayments } from "@/lib/reservation-payments";
import { listReservationPolicies } from "@/lib/policies";

export const clientDocumentKinds = [
  "amendment",
  "option_date",
  "no_show",
  "voucher",
  "invoice",
  "non_refundable",
  "supplier_voucher",
  "rooming_list",
  "lease",
  "price_offer",
] as const;

export const supplierDocumentKinds = [
  "request",
  "request_block",
  "amendment",
  "voucher",
  "cancel",
] as const;

export type ClientDocumentKind = (typeof clientDocumentKinds)[number];
export type SupplierDocumentKind = (typeof supplierDocumentKinds)[number];

export function clientDocumentsFor(_status: AllotmentStatus): ClientDocumentKind[] {
  return [...clientDocumentKinds];
}

export function isClientDocument(value: string): value is ClientDocumentKind {
  return clientDocumentKinds.includes(value as ClientDocumentKind);
}

export function isSupplierDocument(value: string): value is SupplierDocumentKind {
  return supplierDocumentKinds.includes(value as SupplierDocumentKind);
}

export const documentToggles: Record<ClientDocumentKind, string[]> = {
  amendment: ["terms", "vat"],
  option_date: ["terms", "vat"],
  no_show: ["terms", "vat"],
  voucher: ["arabic", "terms", "vat", "groupRooms"],
  invoice: ["arabic", "terms", "vat", "vatCharge"],
  non_refundable: ["hotelConf", "terms", "vat"],
  supplier_voucher: ["vat", "sellingPrices"],
  rooming_list: ["vat", "groupRoomNumber"],
  lease: [],
  price_offer: ["terms"],
};

export type DocumentOptions = {
  arabic: boolean;
  hotelConf: boolean;
  terms: boolean;
  vat: boolean;
  remaining: boolean;
  vatCharge: boolean;
  groupRooms: boolean;
  sellingPrices: boolean;
  groupRoomNumber: boolean;
};

export function documentOptions(
  kind: ClientDocumentKind,
  source: Record<string, string | undefined>,
): DocumentOptions {
  const allowed = new Set(documentToggles[kind]);
  const tuned = source.tuned === "1";
  const on = (key: string, fallback: boolean) => {
    if (!allowed.has(key)) return false;
    if (source[key] === "on" || source[key] === "1") return true;
    return tuned ? false : fallback;
  };
  return {
    arabic: on("arabic", false),
    hotelConf: on("hotelConf", true),
    terms: on("terms", true),
    vat: on("vat", false),
    remaining: on("remaining", false),
    vatCharge: on("vatCharge", true),
    groupRooms: on("groupRooms", false),
    sellingPrices: on("sellingPrices", false),
    groupRoomNumber: on("groupRoomNumber", false),
  };
}

export type DocumentLine = {
  room: string;
  board: string;
  view: string;
  quantity: number;
  guests: string;
  amount: number | null;
};

export type DocumentSheet = {
  titleKey: ClientDocumentKind | SupplierDocumentKind;
  hotel: string;
  guest: string;
  stay: string;
  reference: string;
  lines: DocumentLine[];
  amountLabel: "sell" | "cost" | "none";
  total: number | null;
  paid: number | null;
  due: number | null;
  vatAmount: number | null;
  terms: string[];
  hotelConfirmation: string;
};

function termText(line: Allotment["lines"][number]) {
  const terms = line.termsSnapshot;
  return [terms.generalTerms, terms.cancellationTerms, terms.paymentTerms]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

export async function buildClientSheet(
  allotment: Allotment,
  kind: ClientDocumentKind,
  options: DocumentOptions,
  hotelNameAr: string,
  policyIds?: string[],
): Promise<DocumentSheet> {
  const payments = await listReservationPayments(allotment.id);
  const totals = paymentTotals(allotment, payments);
  const showCost = kind === "supplier_voucher" && !options.sellingPrices;
  const amountLabel: DocumentSheet["amountLabel"] =
    kind === "rooming_list" ? "none" : showCost ? "cost" : "sell";
  const active = allotment.lines.filter(
    (line) => line.supplierStatus !== "cancelled" && line.supplierStatus !== "no_show",
  );
  const source = options.groupRooms
    ? groupLines(active, (line) => `${line.roomName}|${line.boardSnapshot}|${line.viewSnapshot}|${line.priceIncludesVat ? "vat" : "net"}`)
    : active;
  let vatAmount = 0;
  let vatShown = false;
  const lines = source.map((line) => {
    if (amountLabel === "none") {
      return {
        room: line.roomName,
        board: line.boardSnapshot,
        view: line.viewSnapshot,
        quantity: line.quantity,
        guests: allotment.guestName,
        amount: null,
      };
    }
    if (amountLabel === "cost") {
      return {
        room: line.roomName,
        board: line.boardSnapshot,
        view: line.viewSnapshot,
        quantity: line.quantity,
        guests: allotment.guestName,
        amount: lineMoney(allotment, line, "cost"),
      };
    }
    const sell = lineMoney(allotment, line, "sell");
    if (!options.vatCharge && !line.priceIncludesVat) {
      return {
        room: line.roomName,
        board: line.boardSnapshot,
        view: line.viewSnapshot,
        quantity: line.quantity,
        guests: allotment.guestName,
        amount: sell,
      };
    }
    const split = roomVatSplit(sell, line.priceIncludesVat, options.vatCharge);
    vatShown = true;
    vatAmount += split.vat;
    return {
      room: line.roomName,
      board: line.boardSnapshot,
      view: line.viewSnapshot,
      quantity: line.quantity,
      guests: allotment.guestName,
      amount: split.net,
    };
  });
  const total =
    amountLabel === "none"
      ? null
      : lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
  const vatTotal = vatShown ? vatAmount : null;
  const listed =
    policyIds !== undefined || options.terms ? await listReservationPolicies(allotment.id) : [];
  const chosen = new Set(policyIds);
  const policies = policyIds !== undefined ? listed.filter((policy) => chosen.has(policy.id)) : listed;
  const policyText = policies
    .map((policy) => [policy.name.trim(), policy.content.trim()].filter(Boolean).join("\n"))
    .filter(Boolean);
  return {
    titleKey: kind,
    hotel: options.arabic && hotelNameAr ? hotelNameAr : allotment.hotelName,
    guest: allotment.guestName,
    stay: `${allotment.checkIn} → ${allotment.checkOut}`,
    reference: allotment.number,
    lines,
    amountLabel,
    total,
    paid: options.remaining ? totals.paid - totals.refunded : null,
    due: options.remaining ? totals.due : null,
    vatAmount: vatTotal,
    terms: [
      ...new Set([...(options.terms ? active.flatMap(termText) : []), ...policyText]),
    ],
    hotelConfirmation: options.hotelConf ? allotment.supplierReference : "",
  };
}

function lineMoney(
  allotment: Allotment,
  line: Allotment["lines"][number],
  side: "cost" | "sell",
) {
  const nights = Math.max(1, nightsBetween(allotment.checkIn, allotment.checkOut));
  const rate = side === "cost" ? line.costPerNight : line.agencyPricePerNight;
  if (line.amountBasis === "stay") return rate * line.quantity;
  return rate * nights * line.quantity;
}

function groupLines(lines: Allotment["lines"], key: (line: Allotment["lines"][number]) => string) {
  const grouped = new Map<string, Allotment["lines"][number]>();
  for (const line of lines) {
    const id = key(line);
    const current = grouped.get(id);
    if (!current) {
      grouped.set(id, { ...line });
      continue;
    }
    current.quantity += line.quantity;
  }
  return [...grouped.values()];
}

export function sheetText(sheet: DocumentSheet, moneyLocale: string, labels: Record<string, string>) {
  const rows = sheet.lines.map((line) => {
    const money = line.amount === null ? "" : ` · ${formatMoney(line.amount, moneyLocale)}`;
    return `- ${line.quantity} × ${line.room} · ${line.board} · ${line.view || "—"}${money}`;
  });
  return [
    labels.title,
    sheet.reference,
    sheet.hotel,
    sheet.guest,
    sheet.stay,
    ...rows,
    sheet.total !== null ? `${labels.total}: ${formatMoney(sheet.total, moneyLocale)}` : "",
    sheet.vatAmount !== null ? `${labels.vat}: ${formatMoney(sheet.vatAmount, moneyLocale)}` : "",
    sheet.paid !== null ? `${labels.paid}: ${formatMoney(sheet.paid, moneyLocale)}` : "",
    sheet.due !== null ? `${labels.due}: ${formatMoney(sheet.due, moneyLocale)}` : "",
    sheet.hotelConfirmation ? `${labels.hotelConf}: ${sheet.hotelConfirmation}` : "",
    ...sheet.terms,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function reservationMailbox(allotmentId: string) {
  const rows = await query<{
    hotel_email: string;
    agency_email: string;
    hotel_name: string;
    name_ar: string;
  }>(
    `SELECT COALESCE(hotel.reservation_email, '') AS hotel_email,
            COALESCE(NULLIF(agency.email, ''), login.email, '') AS agency_email,
            COALESCE(hotel.name, '') AS hotel_name,
            COALESCE(hotel.name_ar, '') AS name_ar
     FROM allotments AS reservation
     JOIN agencies AS agency ON agency.id = reservation.agency_id
     LEFT JOIN agency_logins AS login ON login.agency_id = agency.id
     LEFT JOIN hotels AS hotel ON hotel.id = reservation.hotel_id
     WHERE reservation.id = ?`,
    [allotmentId],
  );
  return {
    hotelEmail: rows[0]?.hotel_email ?? "",
    agencyEmail: rows[0]?.agency_email ?? "",
    hotelNameAr: rows[0]?.name_ar ?? "",
  };
}

export async function documentParties(allotmentId: string) {
  const rows = await query<{
    city: string;
    address: string;
    hotel_phone: string;
    agency_phone: string;
    agency_email: string;
    agency_vat: string;
  }>(
    `SELECT COALESCE(hotel.city, '') AS city,
            COALESCE(hotel.address, '') AS address,
            COALESCE(hotel.reservation_phone, '') AS hotel_phone,
            COALESCE(agency.phone, '') AS agency_phone,
            COALESCE(NULLIF(agency.email, ''), login.email, '') AS agency_email,
            COALESCE(agency.vat_number, '') AS agency_vat
     FROM allotments AS reservation
     JOIN agencies AS agency ON agency.id = reservation.agency_id
     LEFT JOIN agency_logins AS login ON login.agency_id = agency.id
     LEFT JOIN hotels AS hotel ON hotel.id = reservation.hotel_id
     WHERE reservation.id = ?`,
    [allotmentId],
  );
  return {
    hotelCity: rows[0]?.city ?? "",
    hotelAddress: rows[0]?.address ?? "",
    hotelPhone: rows[0]?.hotel_phone ?? "",
    agencyPhone: rows[0]?.agency_phone ?? "",
    agencyEmail: rows[0]?.agency_email ?? "",
    agencyVat: rows[0]?.agency_vat ?? "",
  };
}

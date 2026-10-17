import { adminCopy } from "@/lib/admin-copy";
import { documentLogo, getCompanyProfile } from "@/lib/company";
import { deliverDeskMail } from "@/lib/email";
import { getAllotment } from "@/lib/inventory";
import { mailErrorCode } from "@/lib/mail";
import {
  defaultMailTemplate,
  fillMailPlaceholders,
  type MailTemplateKind,
} from "@/lib/mail-templates";
import { listReservationPolicies, type PolicyText } from "@/lib/policies";
import {
  buildClientSheet,
  documentOptions,
  documentParties,
  reservationMailbox,
} from "@/lib/reservation-documents";
import { clientDocumentPdf, receiptDocumentPdf, supplierDocumentPdf } from "@/lib/reservation-pdf";
import { getReservationPayment, type PaymentMethod } from "@/lib/reservation-payments";
import { listDeskServices, serviceTotals, type DeskService } from "@/lib/services";
import { formatMoney } from "@/lib/money";

const noticeKind = {
  "client.confirmation": "confirmation",
  "client.cancel": "client_cancel",
  "client.regret": "regret",
  "client.unavailable": "unavailable",
  "client.no_show": "no_show",
} as const;

const noticeFile = {
  "client.confirmation": "confirmation",
  "client.cancel": "cancel",
  "client.regret": "regret",
  "client.unavailable": "unavailable",
  "client.no_show": "no-show",
} as const;

function serviceLetter(services: DeskService[], side: "sell" | "cost") {
  if (!services.length) return "";
  const lines = services.map((service) => {
    const totals = serviceTotals(service);
    const amount = side === "sell" ? totals.gross : totals.cost;
    return `${service.quantity} x ${service.typeName} — ${formatMoney(amount, "en")}`;
  });
  return ["Services", ...lines].join("\n");
}

const noticeTitle = {
  "client.confirmation": "mailNoticeConfirm",
  "client.cancel": "mailNoticeCancel",
  "client.regret": "mailNoticeRegret",
  "client.unavailable": "mailNoticeUnavailable",
  "client.no_show": "docNoShow",
} as const;

const noticeStatus = {
  "client.confirmation": "confirmed",
  "client.cancel": "cancelled",
  "client.regret": "statusRegret",
  "client.unavailable": "statusUnavailable",
  "client.no_show": "statusNoShow",
} as const;

function address(value: string) {
  const email = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

export type NoticeMailKind = keyof typeof noticeKind;

export type NoticePolicyPreview = {
  id: string;
  name: string;
  content: string;
  contentAr: string;
};

export type NoticePreview = {
  to: string;
  subject: string;
  english: string;
  arabic: string;
  policies: NoticePolicyPreview[];
  filename: string;
  pdfBase64: string;
};

function policyIdsOf(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter((value) => /^[0-9a-f-]{16,64}$/i.test(value)))].slice(
    0,
    40,
  );
}

function policyBlock(policy: Pick<PolicyText, "name" | "content" | "contentAr">) {
  const english = [policy.name.trim(), policy.content.trim()].filter(Boolean).join("\n");
  const arabic = policy.contentAr.trim();
  return [english, arabic].filter(Boolean).join("\n\n");
}

export async function composeReservationNotice(
  allotmentId: string,
  kind: NoticeMailKind,
  policyIds: string[] = [],
): Promise<{ ok: true; preview: NoticePreview } | { ok: false; error: string }> {
  const allotment = await getAllotment(allotmentId);
  if (!allotment) return { ok: false, error: "allotment" };
  const chosen = policyIdsOf(policyIds);
  const [mailbox, parties, company, template, policies, logo, bookedServices] = await Promise.all([
    reservationMailbox(allotment.id),
    documentParties(allotment.id),
    getCompanyProfile(),
    defaultMailTemplate(kind satisfies MailTemplateKind),
    listReservationPolicies(allotment.id),
    documentLogo(),
    listDeskServices({ allotmentId }),
  ]);
  if (!template) return { ok: false, error: "mail-missing" };
  const selected = policies.filter((policy) => chosen.includes(policy.id));
  const copy = adminCopy("en");
  const rooms = allotment.lines
    .filter((line) => line.supplierStatus !== "cancelled")
    .map((line) => `${line.quantity} x ${line.roomName}`)
    .join(", ");
  const values = {
    number: allotment.number,
    hotel: allotment.hotelName,
    guest: allotment.guestName,
    stay: `${allotment.checkIn} → ${allotment.checkOut}`,
    rooms,
  };
  const subject =
    fillMailPlaceholders(template.subjectEn || template.subjectAr, values) ||
    `${copy[noticeTitle[kind]]} ${allotment.number}`;
  const noticeServices =
    kind === "client.cancel" || kind === "client.regret" || kind === "client.unavailable"
      ? bookedServices
      : bookedServices.filter((service) => service.clientStatus !== "cancelled");
  const english = [fillMailPlaceholders(template.bodyEn, values).trim(), serviceLetter(noticeServices, "sell")]
    .filter(Boolean)
    .join("\n\n");
  const arabic = fillMailPlaceholders(template.bodyAr, values).trim();
  const sheetKind = kind === "client.no_show" ? "no_show" : "voucher";
  const sheet = await buildClientSheet(
    allotment,
    sheetKind,
    documentOptions(sheetKind, {}),
    mailbox.hotelNameAr,
    selected.map((policy) => policy.id),
  );
  const pdf = clientDocumentPdf({
    allotment,
    kind: noticeKind[kind],
    sheet,
    parties,
    company,
    title: copy[noticeTitle[kind]],
    status: copy[noticeStatus[kind]],
    paid: null,
    refunded: null,
    due: null,
    logo,
    services: noticeServices,
    labels: {
      room: copy.roomType,
      view: copy.viewName,
      meal: copy.mealPlan,
      checkIn: copy.checkIn,
      checkOut: copy.checkOut,
      nights: copy.nights,
      rooms: copy.rooms,
      rate: copy.pdfRate,
      total: copy.total,
      hotel: copy.hotel,
      client: copy.client,
      guest: copy.guest,
      vat: copy.docVatCharge,
      paid: copy.paymentPaid,
      refund: copy.paymentRefund,
      due: copy.paymentDue,
      hotelConf: copy.docHotelConf,
      status: copy.status,
    },
  });
  const filename = `${allotment.number}-${noticeFile[kind]}.pdf`;
  return {
    ok: true,
    preview: {
      to: address(mailbox.agencyEmail),
      subject,
      english,
      arabic,
      policies: selected.map((policy) => ({
        id: policy.id,
        name: policy.name,
        content: policy.content.trim(),
        contentAr: policy.contentAr.trim(),
      })),
      filename,
      pdfBase64: pdf.toString("base64"),
    },
  };
}

export type NoticeDraft = {
  to: string;
  cc: string;
  subject: string;
  body: string;
};

function mailList(value: string) {
  const parts = [...new Set(value.split(/[,;\s]+/).map((part) => part.trim()).filter(Boolean))];
  if (parts.some((part) => !address(part))) return null;
  return parts;
}

const receiptMethod: Record<PaymentMethod, "paymentCash" | "paymentCheque" | "paymentTransfer" | "paymentCompany" | "paymentCard"> = {
  cash: "paymentCash",
  cheque: "paymentCheque",
  transfer: "paymentTransfer",
  company: "paymentCompany",
  card: "paymentCard",
};

function cardName(value: string) {
  if (value === "amex") return "Amex";
  if (value === "mada") return "Mada";
  if (!value) return "";
  return value[0].toUpperCase() + value.slice(1);
}

export async function composeReceiptNotice(
  allotmentId: string,
  paymentId: string,
  policyIds: string[] = [],
): Promise<{ ok: true; preview: NoticePreview } | { ok: false; error: string }> {
  const allotment = await getAllotment(allotmentId);
  const payment = allotment ? await getReservationPayment(allotment.id, paymentId) : null;
  if (!allotment || !payment) return { ok: false, error: "allotment" };
  const chosen = policyIdsOf(policyIds);
  const [mailbox, parties, company, template, policies, logo] = await Promise.all([
    reservationMailbox(allotment.id),
    documentParties(allotment.id),
    getCompanyProfile(),
    defaultMailTemplate("client.receipt"),
    listReservationPolicies(allotment.id),
    documentLogo(),
  ]);
  if (!template) return { ok: false, error: "mail-missing" };
  const selected = policies.filter((policy) => chosen.includes(policy.id));
  const copy = adminCopy("en");
  const rooms = allotment.lines
    .filter((line) => line.supplierStatus !== "cancelled")
    .map((line) => `${line.quantity} x ${line.roomName}`)
    .join(", ");
  const values = {
    number: allotment.number,
    hotel: allotment.hotelName,
    guest: allotment.guestName,
    stay: `${allotment.checkIn} → ${allotment.checkOut}`,
    rooms,
  };
  const subject =
    fillMailPlaceholders(template.subjectEn || template.subjectAr, values) ||
    `${copy.paymentReceipt} ${payment.code}`;
  const amount = formatMoney(payment.amount, "en");
  const english = [
    fillMailPlaceholders(template.bodyEn, values).trim(),
    `${payment.kind === "refund" ? copy.addRefund : copy.paymentReceipt} ${payment.code} — ${amount}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const arabic = fillMailPlaceholders(template.bodyAr, values).trim();
  const rows: Array<[string, string]> = [
    [copy.guest, allotment.guestName],
    [copy.client, allotment.agencyName],
    [copy.hotel, allotment.hotelName],
    [copy.paymentDate, payment.paidOn],
    [copy.paymentMethod, copy[receiptMethod[payment.method]]],
  ];
  if (payment.cardType) rows.push([copy.paymentCardType, cardName(payment.cardType)]);
  if (payment.reference) rows.push([copy.paymentReference, payment.reference]);
  if (payment.chequeDate) rows.push([copy.paymentChequeDate, payment.chequeDate]);
  if (payment.note) rows.push([copy.paymentNote, payment.note]);
  if (parties.agencyEmail) rows.push(["Mail", parties.agencyEmail]);
  const terms = selected
    .map((policy) => [policy.name.trim(), policy.content.trim()].filter(Boolean).join("\n"))
    .filter(Boolean);
  const pdf = receiptDocumentPdf({
    allotment,
    company,
    logo,
    title: copy.paymentReceipt,
    code: payment.code,
    rows: rows.filter((row) => row[1]),
    amountLabel: payment.kind === "refund" ? copy.addRefund : copy.paymentAmount,
    amount,
    terms,
  });
  return {
    ok: true,
    preview: {
      to: address(mailbox.agencyEmail),
      subject,
      english,
      arabic,
      policies: selected.map((policy) => ({
        id: policy.id,
        name: policy.name,
        content: policy.content.trim(),
        contentAr: policy.contentAr.trim(),
      })),
      filename: `${allotment.number}-${payment.code}.pdf`,
      pdfBase64: pdf.toString("base64"),
    },
  };
}

export async function sendReceiptNotice(
  allotmentId: string,
  paymentId: string,
  policyIds: string[] = [],
  draft?: NoticeDraft,
) {
  const composed = await composeReceiptNotice(allotmentId, paymentId, policyIds);
  if (!composed.ok) return composed;
  return deliverNotice(composed.preview, draft);
}

export async function sendReservationNotice(
  allotmentId: string,
  kind: NoticeMailKind,
  policyIds: string[] = [],
  draft?: NoticeDraft,
) {
  const composed = await composeReservationNotice(allotmentId, kind, policyIds);
  if (!composed.ok) return composed;
  return deliverNotice(composed.preview, draft);
}

async function deliverPrepared(
  preview: NoticePreview,
  recipients: string[],
  cc: string[],
  subject: string,
  written: string,
  policyText: string,
) {
  const text = [written, policyText].filter(Boolean).join("\n\n");
  try {
    await deliverDeskMail({
      to: recipients,
      cc,
      subject,
      text: text || subject,
      attachments: [
        {
          filename: preview.filename,
          content: Buffer.from(preview.pdfBase64, "base64"),
          contentType: "application/pdf",
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("FORM_DELIVERY_NOT_CONFIGURED")) {
      return { ok: false as const, error: "mail-missing" };
    }
    return { ok: false as const, error: mailErrorCode(error) };
  }
  return { ok: true as const };
}

async function deliverNotice(preview: NoticePreview, draft?: NoticeDraft) {
  const recipients = mailList(draft?.to ?? preview.to);
  if (!recipients?.length) return { ok: false as const, error: "mail-missing" };
  const copies = mailList(draft?.cc ?? "");
  if (!copies) return { ok: false as const, error: "invalid" };
  const subject = (draft?.subject ?? preview.subject).replace(/\u0000/g, "").trim().slice(0, 200);
  if (!subject) return { ok: false as const, error: "invalid" };
  const written = (draft?.body ?? [preview.english, preview.arabic].filter(Boolean).join("\n\n"))
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, 20000);
  const policyText = preview.policies
    .map((policy) => policyBlock(policy))
    .filter(Boolean)
    .join("\n\n");
  return deliverPrepared(preview, recipients, copies.filter((email) => !recipients.includes(email)), subject, written, policyText);
}

const hotelRoomTemplate = {
  request: "hotel.request",
  amendment: "hotel.amendment",
  voucher: "hotel.voucher",
} as const;

const hotelRoomTitle = {
  request: "supplierRequest",
  amendment: "supplierAmendmentMail",
  voucher: "supplierVoucherSend",
} as const;

export type HotelRoomMailKind = keyof typeof hotelRoomTemplate;

export async function composeHotelRoomNotice(input: {
  allotmentId: string;
  kind: HotelRoomMailKind;
  lineIds: string[];
  policyIds?: string[];
  amendment?: string;
  rooming?: boolean;
}) {
  const allotment = await getAllotment(input.allotmentId);
  if (!allotment) return { ok: false as const, error: "allotment" };
  const wanted = new Set(input.lineIds);
  const lines = allotment.lines.filter((line) => wanted.has(line.id));
  if (!lines.length) return { ok: false as const, error: "invalid" };
  const chosen = policyIdsOf(input.policyIds ?? []);
  const templateKind = hotelRoomTemplate[input.kind];
  const [mailbox, parties, company, template, policies, logo, bookedServices] = await Promise.all([
    reservationMailbox(allotment.id),
    documentParties(allotment.id),
    getCompanyProfile(),
    defaultMailTemplate(templateKind satisfies MailTemplateKind),
    listReservationPolicies(allotment.id),
    documentLogo(),
    listDeskServices({ allotmentId: allotment.id }),
  ]);
  if (!template) return { ok: false as const, error: "mail-missing" };
  const selected = policies.filter((policy) => chosen.includes(policy.id));
  const copy = adminCopy("en");
  const rooms = lines.map((line) => `${line.quantity} x ${line.roomName}`).join(", ");
  const values = {
    number: allotment.number,
    hotel: allotment.hotelName,
    guest: allotment.guestName,
    stay: `${allotment.checkIn} → ${allotment.checkOut}`,
    rooms,
  };
  const subject =
    fillMailPlaceholders(template.subjectEn || template.subjectAr, values) ||
    `${copy[hotelRoomTitle[input.kind]]} ${allotment.number}`;
  const hotelServices = input.kind === "amendment"
    ? []
    : bookedServices.filter((service) => service.hotelId === allotment.hotelId && service.providerStatus !== "cancelled");
  const english = [fillMailPlaceholders(template.bodyEn, values).trim(), serviceLetter(hotelServices, "cost")]
    .filter(Boolean)
    .join("\n\n");
  const arabic = fillMailPlaceholders(template.bodyAr, values).trim();
  const rooming = input.rooming
    ? lines.map((line) => `${line.quantity} x ${line.roomName} | ${allotment.guestName}`).join("\n")
    : "";
  const policyNote = selected
    .map((policy) => [policy.name.trim(), policy.content.trim()].filter(Boolean).join("\n"))
    .filter(Boolean)
    .join("\n\n");
  const pdf = supplierDocumentPdf({
    allotment,
    kind: input.kind,
    lines,
    parties,
    company,
    title: copy[hotelRoomTitle[input.kind]],
    amendment: [(input.amendment ?? "").slice(0, 2000), rooming, policyNote].filter(Boolean).join("\n\n"),
    logo,
    services: hotelServices,
    labels: {
      room: copy.roomType,
      view: copy.viewName,
      meal: copy.mealPlan,
      checkIn: copy.checkIn,
      checkOut: copy.checkOut,
      nights: copy.nights,
      rooms: copy.rooms,
      rate: copy.pdfRate,
      total: copy.total,
      hotel: copy.hotel,
      client: copy.client,
      guest: copy.guest,
      vat: copy.docVatCharge,
      paid: copy.paymentPaid,
      refund: copy.paymentRefund,
      due: copy.paymentDue,
      hotelConf: copy.docHotelConf,
      status: copy.status,
    },
  });
  return {
    ok: true as const,
    preview: {
      to: address(mailbox.hotelEmail),
      subject,
      english,
      arabic,
      policies: selected.map((policy) => ({
        id: policy.id,
        name: policy.name,
        content: policy.content.trim(),
        contentAr: policy.contentAr.trim(),
      })),
      filename: `${allotment.number}-${input.kind}.pdf`,
      pdfBase64: pdf.toString("base64"),
    },
  };
}

export async function sendHotelRoomNotice(
  input: {
    allotmentId: string;
    kind: HotelRoomMailKind;
    lineIds: string[];
    policyIds?: string[];
    amendment?: string;
    rooming?: boolean;
  },
  draft?: NoticeDraft,
) {
  const composed = await composeHotelRoomNotice(input);
  if (!composed.ok) return composed;
  return deliverNotice(composed.preview, draft);
}

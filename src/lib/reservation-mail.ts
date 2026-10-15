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
import { clientDocumentPdf, supplierDocumentPdf } from "@/lib/reservation-pdf";

const noticeKind = {
  "client.confirmation": "confirmation",
  "client.cancel": "client_cancel",
  "client.regret": "regret",
  "client.unavailable": "unavailable",
} as const;

const noticeFile = {
  "client.confirmation": "confirmation",
  "client.cancel": "cancel",
  "client.regret": "regret",
  "client.unavailable": "unavailable",
} as const;

const noticeTitle = {
  "client.confirmation": "mailNoticeConfirm",
  "client.cancel": "mailNoticeCancel",
  "client.regret": "mailNoticeRegret",
  "client.unavailable": "mailNoticeUnavailable",
} as const;

const noticeStatus = {
  "client.confirmation": "confirmed",
  "client.cancel": "cancelled",
  "client.regret": "statusRegret",
  "client.unavailable": "statusUnavailable",
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
  const [mailbox, parties, company, template, policies, logo] = await Promise.all([
    reservationMailbox(allotment.id),
    documentParties(allotment.id),
    getCompanyProfile(),
    defaultMailTemplate(kind satisfies MailTemplateKind),
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
    `${copy[noticeTitle[kind]]} ${allotment.number}`;
  const english = fillMailPlaceholders(template.bodyEn, values).trim();
  const arabic = fillMailPlaceholders(template.bodyAr, values).trim();
  const sheet = await buildClientSheet(
    allotment,
    "voucher",
    documentOptions("voucher", {}),
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
  const [mailbox, parties, company, template, policies, logo] = await Promise.all([
    reservationMailbox(allotment.id),
    documentParties(allotment.id),
    getCompanyProfile(),
    defaultMailTemplate(templateKind satisfies MailTemplateKind),
    listReservationPolicies(allotment.id),
    documentLogo(),
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
  const english = fillMailPlaceholders(template.bodyEn, values).trim();
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

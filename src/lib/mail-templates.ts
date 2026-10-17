import { execute, query } from "@/lib/db";

export const mailTemplateKinds = [
  { kind: "hotel.request", audience: "hotel", label: "supplierRequest" },
  { kind: "hotel.request_block", audience: "hotel", label: "supplierRequestBlock" },
  { kind: "hotel.amendment", audience: "hotel", label: "supplierAmendmentMail" },
  { kind: "hotel.voucher", audience: "hotel", label: "supplierVoucherSend" },
  { kind: "hotel.cancel", audience: "hotel", label: "supplierCancelSend" },
  { kind: "client.confirmation", audience: "client", label: "mailNoticeConfirm" },
  { kind: "client.cancel", audience: "client", label: "mailNoticeCancel" },
  { kind: "client.regret", audience: "client", label: "mailNoticeRegret" },
  { kind: "client.unavailable", audience: "client", label: "mailNoticeUnavailable" },
  { kind: "client.amendment", audience: "client", label: "docAmendment" },
  { kind: "client.option_date", audience: "client", label: "docOptionDate" },
  { kind: "client.no_show", audience: "client", label: "docNoShow" },
  { kind: "client.voucher", audience: "client", label: "docVoucher" },
  { kind: "client.invoice", audience: "client", label: "docInvoice" },
  { kind: "client.non_refundable", audience: "client", label: "docNonRefundable" },
  { kind: "client.supplier_voucher", audience: "client", label: "docSupplierVoucher" },
  { kind: "client.rooming_list", audience: "client", label: "docRoomingList" },
  { kind: "client.lease", audience: "client", label: "docLease" },
  { kind: "client.price_offer", audience: "client", label: "docPriceOffer" },
  { kind: "client.receipt", audience: "client", label: "paymentReceipt" },
] as const;

export type MailTemplateKind = (typeof mailTemplateKinds)[number]["kind"];
export type MailTemplateAudience = (typeof mailTemplateKinds)[number]["audience"];

export type MailTemplate = {
  id: string;
  kind: MailTemplateKind;
  name: string;
  subjectEn: string;
  bodyEn: string;
  subjectAr: string;
  bodyAr: string;
  isDefault: boolean;
};

type MailTemplateRow = {
  id: string;
  kind: string;
  name: string;
  subject_en: string;
  body_en: string;
  subject_ar: string;
  body_ar: string;
  is_default: boolean;
  created_at: string;
};

const openings: Record<MailTemplateKind, { en: string; ar: string }> = {
  "hotel.request": { en: "Please confirm these rooms.", ar: "نرجو تأكيد هذه الغرف." },
  "hotel.request_block": {
    en: "Please take these rooms from the contract.",
    ar: "نرجو اعتماد هذه الغرف من العقد.",
  },
  "hotel.amendment": {
    en: "Please apply this change to the booking.",
    ar: "نرجو تطبيق هذا التعديل على الحجز.",
  },
  "hotel.voucher": {
    en: "The guest voucher is ready for arrival.",
    ar: "قسيمة الضيف جاهزة للوصول.",
  },
  "hotel.cancel": { en: "Please cancel this booking.", ar: "نرجو إلغاء هذا الحجز." },
  "client.confirmation": { en: "Your stay is confirmed.", ar: "تم تأكيد إقامتكم." },
  "client.cancel": { en: "Your booking has been cancelled.", ar: "تم إلغاء حجزكم." },
  "client.regret": { en: "We cannot accept this booking.", ar: "لا يمكننا قبول هذا الحجز." },
  "client.unavailable": { en: "These rooms are not available.", ar: "هذه الغرف غير متاحة." },
  "client.amendment": { en: "Your booking has been amended.", ar: "تم تعديل حجزكم." },
  "client.option_date": {
    en: "This option is held until the date on the booking.",
    ar: "هذا الخيار قائم حتى التاريخ المذكور في الحجز.",
  },
  "client.no_show": {
    en: "This booking was recorded as a no-show.",
    ar: "سُجّل هذا الحجز كعدم حضور.",
  },
  "client.voucher": { en: "Your voucher for arrival.", ar: "قسيمة وصولكم." },
  "client.invoice": { en: "Your invoice is ready.", ar: "فاتورتكم جاهزة." },
  "client.non_refundable": {
    en: "This booking is non-refundable.",
    ar: "هذا الحجز غير قابل للاسترداد.",
  },
  "client.supplier_voucher": {
    en: "The hotel voucher for your stay.",
    ar: "قسيمة الفندق لإقامتكم.",
  },
  "client.rooming_list": { en: "The rooming list for your group.", ar: "قائمة الغرف لمجموعتكم." },
  "client.lease": { en: "The lease for your stay.", ar: "عقد الإيجار لإقامتكم." },
  "client.price_offer": { en: "A price offer for your stay.", ar: "عرض سعر لإقامتكم." },
  "client.receipt": { en: "Your payment receipt.", ar: "إيصال دفعتكم." },
};

export function isMailTemplateKind(value: string): value is MailTemplateKind {
  return mailTemplateKinds.some((item) => item.kind === value);
}

export function mailTemplateKind(value: string | undefined): MailTemplateKind {
  return value && isMailTemplateKind(value) ? value : mailTemplateKinds[0].kind;
}

function letter(kind: MailTemplateKind) {
  const opening = openings[kind];
  const subject = (sentence: string) => `${sentence.replace(/\.$/, "")} — {number}`;
  return {
    name: "Standard",
    subjectEn: subject(opening.en),
    bodyEn: [opening.en, "", "{guest}", "{hotel}", "{stay}", "{rooms}", "Reference {number}", "", "Falco"].join("\n"),
    subjectAr: subject(opening.ar),
    bodyAr: [opening.ar, "", "{guest}", "{hotel}", "{stay}", "{rooms}", "المرجع {number}", "", "فالكو"].join("\n"),
  };
}

function mapTemplate(row: MailTemplateRow): MailTemplate | null {
  if (!isMailTemplateKind(row.kind)) return null;
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    subjectEn: row.subject_en,
    bodyEn: row.body_en,
    subjectAr: row.subject_ar,
    bodyAr: row.body_ar,
    isDefault: row.is_default,
  };
}

async function seedMissing() {
  const rows = await query<{ kind: string }>("SELECT DISTINCT kind FROM mail_templates");
  const present = new Set(rows.map((row) => row.kind));
  const now = new Date().toISOString();
  for (const item of mailTemplateKinds) {
    if (present.has(item.kind)) continue;
    const seed = letter(item.kind);
    try {
      await execute(
        `INSERT INTO mail_templates
          (id, kind, name, subject_en, body_en, subject_ar, body_ar, is_default, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        [crypto.randomUUID(), item.kind, seed.name, seed.subjectEn, seed.bodyEn, seed.subjectAr, seed.bodyAr, now],
      );
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") throw error;
    }
  }
}

export function fillMailPlaceholders(source: string, values: Record<string, string>) {
  return source.replace(/\{(number|hotel|guest|stay|rooms)\}/g, (_, key: string) => values[key] ?? "");
}

export async function defaultMailTemplate(kind: MailTemplateKind) {
  const templates = await listMailTemplates(kind);
  return templates.find((template) => template.isDefault) ?? templates[0] ?? null;
}

export async function listMailTemplates(kind: MailTemplateKind) {
  await seedMissing();
  const rows = await query<MailTemplateRow>(
    `SELECT id, kind, name, subject_en, body_en, subject_ar, body_ar, is_default, created_at
     FROM mail_templates
     WHERE kind = ?
     ORDER BY is_default DESC, created_at ASC`,
    [kind],
  );
  return rows.flatMap((row) => {
    const template = mapTemplate(row);
    return template ? [template] : [];
  });
}

function clean(value: string, max: number) {
  return value.replace(/\u0000/g, "").slice(0, max);
}

export async function saveMailTemplate(
  id: string,
  input: { name: string; subjectEn: string; bodyEn: string; subjectAr: string; bodyAr: string },
) {
  const name = clean(input.name.trim(), 80);
  if (name.length < 1) return false;
  const result = await execute(
    `UPDATE mail_templates
     SET name = ?, subject_en = ?, body_en = ?, subject_ar = ?, body_ar = ?
     WHERE id = ?`,
    [
      name,
      clean(input.subjectEn.trim(), 180),
      clean(input.bodyEn, 4000),
      clean(input.subjectAr.trim(), 180),
      clean(input.bodyAr, 4000),
      id,
    ],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function addMailTemplate(kind: MailTemplateKind, name: string) {
  const rows = await query<MailTemplateRow>(
    `SELECT id, kind, name, subject_en, body_en, subject_ar, body_ar, is_default, created_at
     FROM mail_templates WHERE kind = ? ORDER BY is_default DESC, created_at ASC`,
    [kind],
  );
  const source = rows[0];
  if (!source) return null;
  const id = crypto.randomUUID();
  await execute(
    `INSERT INTO mail_templates
      (id, kind, name, subject_en, body_en, subject_ar, body_ar, is_default, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?)`,
    [
      id,
      kind,
      clean(name.trim(), 80) || "Template",
      source.subject_en,
      source.body_en,
      source.subject_ar,
      source.body_ar,
      new Date().toISOString(),
    ],
  );
  return id;
}

export async function setDefaultMailTemplate(id: string, kind: MailTemplateKind) {
  const rows = await query<{ id: string }>(
    "SELECT id FROM mail_templates WHERE id = ? AND kind = ?",
    [id, kind],
  );
  if (!rows[0]) return false;
  await execute("UPDATE mail_templates SET is_default = FALSE WHERE kind = ?", [kind]);
  await execute("UPDATE mail_templates SET is_default = TRUE WHERE id = ?", [id]);
  return true;
}

export async function deleteMailTemplate(id: string, kind: MailTemplateKind) {
  const rows = await query<{ id: string; is_default: boolean }>(
    "SELECT id, is_default FROM mail_templates WHERE kind = ? ORDER BY created_at ASC",
    [kind],
  );
  if (rows.length < 2 || !rows.some((row) => row.id === id)) return "last" as const;
  const removing = rows.find((row) => row.id === id);
  await execute("DELETE FROM mail_templates WHERE id = ? AND kind = ?", [id, kind]);
  if (removing?.is_default) {
    const next = rows.find((row) => row.id !== id);
    if (next) await execute("UPDATE mail_templates SET is_default = TRUE WHERE id = ?", [next.id]);
  }
  return "deleted" as const;
}

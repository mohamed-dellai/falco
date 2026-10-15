import crypto from "crypto";
import { query, transaction } from "@/lib/db";
import { allotmentValue, type Allotment } from "@/lib/inventory";

export const paymentMethods = ["cash", "cheque", "transfer", "company", "card"] as const;
export const cardTypes = ["visa", "mastercard", "amex", "mada"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];
export type CardType = (typeof cardTypes)[number];
export type PaymentKind = "payment" | "refund";

export type ReservationPayment = {
  id: string;
  allotmentId: string;
  lineId: string | null;
  code: string;
  kind: PaymentKind;
  method: PaymentMethod;
  cardType: string;
  reference: string;
  amount: number;
  paidOn: string;
  chequeDate: string;
  note: string;
  downPayment: boolean;
  posted: boolean;
  createdAt: string;
};

export type PayTerms = {
  payBefore: string;
  payOnArrival: boolean;
  lines: Array<{ id: string; payBefore: string }>;
};

type PaymentRow = {
  id: string;
  allotment_id: string;
  line_id: string | null;
  code: string;
  kind: string;
  method: string;
  card_type: string;
  reference_no: string;
  amount: number;
  paid_on: string;
  cheque_date: string;
  note: string;
  down_payment: boolean;
  posted: boolean;
  created_at: string;
};

function asMethod(value: string): PaymentMethod {
  return paymentMethods.includes(value as PaymentMethod) ? (value as PaymentMethod) : "cash";
}

function mapPayment(row: PaymentRow): ReservationPayment {
  return {
    id: row.id,
    allotmentId: row.allotment_id,
    lineId: row.line_id,
    code: row.code,
    kind: row.kind === "refund" ? "refund" : "payment",
    method: asMethod(row.method),
    cardType: row.card_type,
    reference: row.reference_no,
    amount: Number(row.amount),
    paidOn: row.paid_on,
    chequeDate: row.cheque_date,
    note: row.note,
    downPayment: row.down_payment,
    posted: row.posted,
    createdAt: row.created_at,
  };
}

export async function listReservationPayments(allotmentId: string) {
  const rows = await query<PaymentRow>(
    `SELECT id, allotment_id, line_id, code, kind, method, card_type, reference_no,
            amount, paid_on, cheque_date, note, down_payment, posted, created_at
     FROM reservation_payments
     WHERE allotment_id = ?
     ORDER BY paid_on, created_at`,
    [allotmentId],
  );
  return rows.map(mapPayment);
}

export type PaymentRollup = {
  paid: number;
  refunded: number;
  posted: boolean;
  codes: string;
};

export type PaymentListStatus = "unpaid" | "partial" | "paid" | "refund_due";

export function paymentListStatus(
  total: number,
  rollup: PaymentRollup | undefined,
): PaymentListStatus {
  const net = (rollup?.paid ?? 0) - (rollup?.refunded ?? 0);
  if (net > total) return "refund_due";
  if (net <= 0) return "unpaid";
  if (net < total) return "partial";
  return "paid";
}

export async function listPaymentRollups() {
  const rows = await query<{
    allotment_id: string;
    paid: number | string;
    refunded: number | string;
    posted: boolean | null;
    codes: string | null;
  }>(
    `SELECT allotment_id,
            COALESCE(SUM(amount) FILTER (WHERE kind = 'payment'), 0) AS paid,
            COALESCE(SUM(amount) FILTER (WHERE kind = 'refund'), 0) AS refunded,
            BOOL_OR(posted) AS posted,
            string_agg(code, ',') AS codes
     FROM reservation_payments
     GROUP BY allotment_id`,
  );
  return new Map(
    rows.map((row) => [
      row.allotment_id,
      {
        paid: Number(row.paid),
        refunded: Number(row.refunded),
        posted: Boolean(row.posted),
        codes: row.codes ?? "",
      } satisfies PaymentRollup,
    ]),
  );
}

export function paymentTotals(allotment: Allotment, payments: ReservationPayment[]) {
  const total = allotmentValue(allotment).revenue;
  const paid = payments
    .filter((payment) => payment.kind === "payment")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const refunded = payments
    .filter((payment) => payment.kind === "refund")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const net = paid - refunded;
  return {
    total,
    paid,
    refunded,
    due: Math.max(0, total - net),
    refundDue: Math.max(0, net - total),
    net,
  };
}

export async function getPayTerms(allotmentId: string): Promise<PayTerms> {
  const header = await query<{ pay_before: string; pay_on_arrival: boolean }>(
    `SELECT pay_before, pay_on_arrival FROM allotments WHERE id = ?`,
    [allotmentId],
  );
  const lines = await query<{ id: string; pay_before: string }>(
    `SELECT id, pay_before FROM allotment_lines
     WHERE allotment_id = ? ORDER BY sort_order, id`,
    [allotmentId],
  );
  return {
    payBefore: header[0]?.pay_before ?? "",
    payOnArrival: Boolean(header[0]?.pay_on_arrival),
    lines: lines.map((line) => ({
      id: line.id,
      payBefore: line.pay_before ?? "",
    })),
  };
}

export async function savePayTerms(input: {
  allotmentId: string;
  payBefore: string;
  payOnArrival: boolean;
  lineDates: Array<{ id: string; payBefore: string }>;
}) {
  await transaction(async (sql) => {
    await sql.execute(
      `UPDATE allotments SET pay_before = ?, pay_on_arrival = ? WHERE id = ?`,
      [input.payBefore, input.payOnArrival, input.allotmentId],
    );
    for (const line of input.lineDates) {
      await sql.execute(
        `UPDATE allotment_lines SET pay_before = ? WHERE id = ? AND allotment_id = ?`,
        [line.payBefore, line.id, input.allotmentId],
      );
    }
  });
}

export async function addReservationPayment(input: {
  allotmentId: string;
  lineId?: string | null;
  kind: PaymentKind;
  method: PaymentMethod;
  cardType: string;
  reference: string;
  amount: number;
  paidOn: string;
  chequeDate: string;
  note: string;
  downPayment: boolean;
  due: number;
  net: number;
}) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return { ok: false as const, error: "invalid" as const };
  }
  if (input.kind === "payment" && input.amount > input.due) {
    return { ok: false as const, error: "quantity" as const };
  }
  if (input.kind === "refund" && input.amount > input.net) {
    return { ok: false as const, error: "quantity" as const };
  }
  const id = crypto.randomUUID();
  const code = `P${id.slice(0, 6).toUpperCase()}`;
  await transaction(async (sql) => {
    await sql.execute(
      `INSERT INTO reservation_payments
        (id, allotment_id, line_id, code, kind, method, card_type, reference_no,
         amount, paid_on, cheque_date, note, down_payment, posted, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?)`,
      [
        id,
        input.allotmentId,
        input.lineId || null,
        code,
        input.kind,
        input.method,
        input.cardType,
        input.reference.slice(0, 80),
        input.amount,
        input.paidOn,
        input.chequeDate,
        input.note.slice(0, 1000),
        input.downPayment,
        new Date().toISOString(),
      ],
    );
  });
  return { ok: true as const, id };
}

export async function setPaymentPosted(allotmentId: string, paymentId: string, posted: boolean) {
  const rows = await query<{ id: string }>(
    `SELECT id FROM reservation_payments WHERE id = ? AND allotment_id = ?`,
    [paymentId, allotmentId],
  );
  if (!rows[0]) return { ok: false as const, error: "allotment" as const };
  await transaction(async (sql) => {
    await sql.execute(
      `UPDATE reservation_payments SET posted = ? WHERE id = ? AND allotment_id = ?`,
      [posted, paymentId, allotmentId],
    );
  });
  return { ok: true as const };
}

export async function deleteReservationPayment(allotmentId: string, paymentId: string) {
  const rows = await query<{ id: string; posted: boolean }>(
    `SELECT id, posted FROM reservation_payments WHERE id = ? AND allotment_id = ?`,
    [paymentId, allotmentId],
  );
  if (!rows[0]) return { ok: false as const, error: "allotment" as const };
  if (rows[0].posted) return { ok: false as const, error: "sold" as const };
  await transaction(async (sql) => {
    await sql.execute(
      `DELETE FROM reservation_payments WHERE id = ? AND allotment_id = ?`,
      [paymentId, allotmentId],
    );
  });
  return { ok: true as const };
}

export async function getReservationPayment(allotmentId: string, paymentId: string) {
  const rows = await query<PaymentRow>(
    `SELECT id, allotment_id, line_id, code, kind, method, card_type, reference_no,
            amount, paid_on, cheque_date, note, down_payment, posted, created_at
     FROM reservation_payments
     WHERE id = ? AND allotment_id = ?`,
    [paymentId, allotmentId],
  );
  return rows[0] ? mapPayment(rows[0]) : null;
}

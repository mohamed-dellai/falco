"use client";

import { useState } from "react";
import { addReservationPaymentAction } from "@/app/admin/actions";
import { DateField } from "@/components/calendar-date-field";
import { adminButtonClass, adminFieldClass } from "@/components/admin-ui";
import type { AdminCopy } from "@/lib/admin-copy";

const paymentMethods = ["cash", "cheque", "transfer", "company", "card"] as const;
const cardTypes = ["visa", "mastercard", "amex", "mada"] as const;
type PaymentMethod = (typeof paymentMethods)[number];

const methodLabel: Record<PaymentMethod, keyof AdminCopy> = {
  cash: "paymentCash",
  cheque: "paymentCheque",
  transfer: "paymentTransfer",
  company: "paymentCompany",
  card: "paymentCard",
};

export function ReservationPaymentForm({
  allotmentId,
  kind,
  copy,
  locale,
  today,
}: {
  allotmentId: string;
  kind: "payment" | "refund";
  copy: AdminCopy;
  locale: string;
  today: string;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const showCard = method === "card";
  const showReference = method !== "cash";
  const showCheque = method === "cheque";

  return (
    <form
      action={addReservationPaymentAction}
      className="grid gap-3 rounded-lg border border-[var(--desk-line)] bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="allotmentId" value={allotmentId} />
      <input type="hidden" name="kind" value={kind} />
      <p className="text-sm font-bold text-[var(--desk-ink)]">
        {kind === "refund" ? copy.addRefund : copy.addPayment}
      </p>
      <label className="grid gap-1 text-sm font-semibold text-[var(--desk-text)]">
        {copy.paymentAmount}
        <input name="amount" inputMode="decimal" required className={`${adminFieldClass} font-plex tabular-nums`} />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-[var(--desk-text)]">
        {copy.paymentDate}
        <DateField name="paidOn" label={copy.paymentDate} locale={locale} defaultValue={today} required />
      </label>
      <fieldset className="grid gap-1.5">
        <legend className="text-sm font-semibold text-[var(--desk-text)]">{copy.paymentMethod}</legend>
        <div className="flex flex-wrap gap-1.5">
          {paymentMethods.map((item) => {
            const selected = method === item;
            return (
              <label key={item} className="relative">
                <input
                  type="radio"
                  name="method"
                  value={item}
                  checked={selected}
                  onChange={() => setMethod(item)}
                  className="peer sr-only"
                />
                <span
                  className={`inline-flex h-8 cursor-pointer items-center rounded-lg border px-2.5 text-[13px] font-bold whitespace-nowrap transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--desk-primary)] ${
                    selected
                      ? "border-[var(--desk-ink)] bg-[var(--desk-ink)] text-white"
                      : "border-[var(--desk-line)] bg-white text-[var(--desk-muted)] hover:border-[var(--desk-ink)] hover:text-[var(--desk-ink)]"
                  }`}
                >
                  {copy[methodLabel[item]]}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {showCard ? (
        <label className="grid gap-1 text-sm font-semibold text-[var(--desk-text)]">
          {copy.paymentCardType}
          <select name="cardType" className={adminFieldClass} defaultValue="visa">
            {cardTypes.map((card) => (
              <option key={card} value={card}>
                {card === "amex" ? "Amex" : card === "mada" ? "Mada" : card[0].toUpperCase() + card.slice(1)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showReference ? (
        <label className="grid gap-1 text-sm font-semibold text-[var(--desk-text)]">
          {copy.paymentReference}
          <input name="reference" className={adminFieldClass} />
        </label>
      ) : null}
      {showCheque ? (
        <label className="grid gap-1 text-sm font-semibold text-[var(--desk-text)]">
          {copy.paymentChequeDate}
          <DateField name="chequeDate" label={copy.paymentChequeDate} locale={locale} />
        </label>
      ) : null}
      <label className="grid gap-1 text-sm font-semibold text-[var(--desk-text)]">
        {copy.paymentNote}
        <input name="note" className={adminFieldClass} />
      </label>
      {kind === "payment" ? (
        <label className="flex items-center gap-2 text-sm font-semibold text-[var(--desk-text)]">
          <input type="checkbox" name="downPayment" />
          {copy.paymentDown}
        </label>
      ) : null}
      <button type="submit" className={`${adminButtonClass} w-fit`}>
        {kind === "refund" ? copy.addRefund : copy.addPayment}
      </button>
    </form>
  );
}

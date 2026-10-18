"use client";

import Link from "next/link";
import { useState } from "react";
import { updateInvoiceAction } from "@/app/admin/accounting/actions";
import { adminButtonClass, adminButtonGhostClass, adminFieldClass } from "@/components/admin-ui";
import type { AdminCopy } from "@/lib/admin-copy";
import type { IssuedInvoice } from "@/lib/invoices";
import { formatMoney, moneyInput, parseMoney } from "@/lib/money";

type Draft = {
  id: string;
  stay: string;
  label: string;
  detail: string;
  quantity: string;
  net: string;
  vat: string;
};

export function InvoiceEditForm({
  invoice,
  copy,
  locale,
  error,
}: {
  invoice: IssuedInvoice;
  copy: AdminCopy;
  locale: string;
  error?: string;
}) {
  const [lines, setLines] = useState<Draft[]>(
    invoice.stays.flatMap((stay) =>
      stay.lines.map((line) => ({
        id: line.id,
        stay: stay.number,
        label: line.label,
        detail: line.detail,
        quantity: String(line.quantity),
        net: moneyInput(line.net),
        vat: moneyInput(line.vat),
      })),
    ),
  );
  const money = lines.reduce(
    (sum, line) => {
      const net = parseMoney(line.net) ?? 0;
      const vat = parseMoney(line.vat) ?? 0;
      return { net: sum.net + net, vat: sum.vat + vat, gross: sum.gross + net + vat };
    },
    { net: 0, vat: 0, gross: 0 },
  );

  function patch(id: string, field: "label" | "detail" | "quantity" | "net" | "vat", value: string) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, [field]: value } : line)));
  }

  return (
    <form action={updateInvoiceAction} className="grid gap-4">
      <input type="hidden" name="invoiceId" value={invoice.id} />
      <p className="text-sm text-[var(--desk-text)]">{copy.invoiceEditLead}</p>
      {error ? (
        <p className="rounded-lg bg-[var(--desk-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--desk-danger)]">
          {copy.invoiceEditInvalid}
        </p>
      ) : null}
      {lines.map((line) => {
        const net = parseMoney(line.net);
        const vat = parseMoney(line.vat);
        const gross = net === null || vat === null ? null : net + vat;
        return (
          <section key={line.id} className="rounded-lg border border-[var(--desk-line)] bg-white p-4 shadow-sm">
            <input type="hidden" name="lineId" value={line.id} />
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold tabular-nums text-[var(--desk-ink)]">{line.stay}</p>
              {lines.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                  className="desk-focus text-sm font-semibold text-[var(--desk-danger)]"
                >
                  {copy.invoiceRemoveLine}
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm sm:col-span-2">
                <span className="text-[13px] font-medium text-[var(--desk-muted)]">{copy.serviceDescription}</span>
                <input
                  name="label"
                  required
                  maxLength={200}
                  value={line.label}
                  onChange={(event) => patch(line.id, "label", event.target.value)}
                  className={adminFieldClass}
                />
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">
                <span className="text-[13px] font-medium text-[var(--desk-muted)]">{copy.invoiceLineDetail}</span>
                <input
                  name="detail"
                  maxLength={400}
                  value={line.detail}
                  onChange={(event) => patch(line.id, "detail", event.target.value)}
                  className={adminFieldClass}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[13px] font-medium text-[var(--desk-muted)]">{copy.serviceQty}</span>
                <input
                  name="quantity"
                  type="number"
                  min={1}
                  max={5000}
                  required
                  value={line.quantity}
                  onChange={(event) => patch(line.id, "quantity", event.target.value)}
                  className={`${adminFieldClass} tabular-nums`}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[13px] font-medium text-[var(--desk-muted)]">{copy.invoiceNet}</span>
                <input
                  name="net"
                  inputMode="decimal"
                  required
                  value={line.net}
                  onChange={(event) => patch(line.id, "net", event.target.value)}
                  className={`${adminFieldClass} tabular-nums`}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-[13px] font-medium text-[var(--desk-muted)]">{copy.invoiceVat}</span>
                <input
                  name="vat"
                  inputMode="decimal"
                  required
                  value={line.vat}
                  onChange={(event) => patch(line.id, "vat", event.target.value)}
                  className={`${adminFieldClass} tabular-nums`}
                />
              </label>
              <div className="grid content-end gap-1 text-sm">
                <span className="text-[13px] font-medium text-[var(--desk-muted)]">{copy.invoiceGross}</span>
                <p className="tabular-nums text-base font-bold text-[var(--desk-ink)]">
                  {gross === null ? "—" : formatMoney(gross, locale)}
                </p>
              </div>
            </div>
          </section>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/accounting/invoices/${invoice.id}`} className={adminButtonGhostClass}>
          {copy.invoiceBack}
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="tabular-nums text-[var(--desk-muted)]">
            {copy.invoiceNet} {formatMoney(money.net, locale)}
          </span>
          <span className="tabular-nums text-[var(--desk-muted)]">
            {copy.invoiceVat} {formatMoney(money.vat, locale)}
          </span>
          <span className="tabular-nums font-bold text-[var(--desk-ink)]">
            {copy.invoiceGross} {formatMoney(money.gross, locale)}
          </span>
          <button type="submit" className={adminButtonClass}>
            {copy.invoiceSave}
          </button>
        </div>
      </div>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { createInvoiceAction } from "@/app/admin/accounting/actions";
import { adminButtonClass, adminButtonGhostClass } from "@/components/admin-ui";
import { DualDate } from "@/components/calendar-date-field";
import type { AdminCopy } from "@/lib/admin-copy";
import type { DraftLine, DraftStay } from "@/lib/invoices";
import { formatMoney, roomVatSplit } from "@/lib/money";

function charged(line: DraftLine, vatOnRooms: boolean): DraftLine {
  if (line.kind !== "room") return line;
  const amount = line.priceIncludesVat ? line.gross : line.net;
  const split = roomVatSplit(amount, line.priceIncludesVat, vatOnRooms);
  return { ...line, ...split };
}

export function InvoicePreview({
  anchorId,
  clientName,
  stays,
  copy,
  locale,
  error,
}: {
  anchorId: string;
  clientName: string;
  stays: DraftStay[];
  copy: AdminCopy;
  locale: string;
  error?: string;
}) {
  const [vatOnRooms, setVatOnRooms] = useState(true);
  const [picked, setPicked] = useState<string[]>([anchorId]);
  const selected = stays.filter((stay) => picked.includes(stay.id));
  const money = selected.reduce(
    (sum, stay) => {
      for (const line of stay.lines) {
        const shown = charged(line, vatOnRooms);
        sum.net += shown.net;
        sum.vat += shown.vat;
        sum.gross += shown.gross;
      }
      return sum;
    },
    { net: 0, vat: 0, gross: 0 },
  );
  const notice =
    error === "taken" ? copy.invoiceTaken : error === "client" ? copy.invoiceOneClient : error ? copy.invoiceInvalid : "";

  return (
    <form action={createInvoiceAction} className="rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
      <input type="hidden" name="anchor" value={anchorId} />
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--desk-line)] px-4 py-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--desk-ink)]">{copy.invoiceCreate}</h2>
          <p className="mt-1 text-sm text-[var(--desk-text)]">{clientName}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-[var(--desk-ink)]">
          <input
            type="checkbox"
            name="vatCharge"
            checked={vatOnRooms}
            onChange={(event) => setVatOnRooms(event.target.checked)}
          />
          {copy.invoiceChargeVat}
        </label>
      </div>
      {notice ? (
        <p className="border-b border-[var(--desk-line)] bg-[var(--desk-danger-soft)] px-4 py-2 text-sm font-semibold text-[var(--desk-danger)]">
          {notice}
        </p>
      ) : null}
      <ul className="divide-y divide-[var(--desk-line)]">
        {stays.map((stay) => {
          const locked = stay.id === anchorId;
          const on = picked.includes(stay.id);
          const lines = stay.lines.map((line) => charged(line, vatOnRooms));
          const stayGross = lines.reduce((sum, line) => sum + line.gross, 0);
          return (
            <li key={stay.id} className="px-4 py-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="stay"
                  value={stay.id}
                  checked={on}
                  disabled={locked}
                  className="mt-1"
                  onChange={(event) => {
                    setPicked((current) =>
                      event.target.checked ? [...current, stay.id] : current.filter((id) => id !== stay.id),
                    );
                  }}
                />
                {locked ? <input type="hidden" name="stay" value={stay.id} /> : null}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-[var(--desk-ink)]">
                      {stay.number}
                      <span className="ms-2 font-semibold text-[var(--desk-text)]">{stay.hotelName}</span>
                    </span>
                    <span className="tabular-nums text-sm font-bold text-[var(--desk-ink)]">
                      {formatMoney(stayGross, locale)}
                    </span>
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--desk-muted)]">
                    <span>{stay.guestName || "—"}</span>
                    <DualDate iso={stay.checkIn} locale={locale} />
                    <DualDate iso={stay.checkOut} locale={locale} />
                  </span>
                </span>
              </label>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-start text-xs font-bold text-[var(--desk-muted)]">
                    <th className="py-1 text-start font-bold">{copy.serviceType}</th>
                    <th className="py-1 text-end font-bold">{copy.serviceQty}</th>
                    <th className="py-1 text-end font-bold">{copy.invoiceNet}</th>
                    <th className="py-1 text-end font-bold">{copy.invoiceVat}</th>
                    <th className="py-1 text-end font-bold">{copy.invoiceGross}</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={`${stay.id}-${index}`} className="border-t border-[var(--desk-line)]">
                      <td className="py-1.5 text-[var(--desk-text)]">
                        {line.label}
                        {line.detail ? <span className="text-[var(--desk-muted)]"> · {line.detail}</span> : null}
                      </td>
                      <td className="py-1.5 text-end tabular-nums">{line.quantity}</td>
                      <td className="py-1.5 text-end tabular-nums">{formatMoney(line.net, locale)}</td>
                      <td className="py-1.5 text-end tabular-nums">{formatMoney(line.vat, locale)}</td>
                      <td className="py-1.5 text-end tabular-nums">{formatMoney(line.gross, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          );
        })}
      </ul>
      {stays.length > 1 ? (
        <p className="border-t border-[var(--desk-line)] px-4 py-2 text-xs text-[var(--desk-muted)]">{copy.invoiceSameClient}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--desk-line)] px-4 py-4">
        <Link href={`/admin/allotments/${anchorId}/details`} className={adminButtonGhostClass}>
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
            {copy.invoiceCreate}
          </button>
        </div>
      </div>
    </form>
  );
}

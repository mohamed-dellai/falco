import type { ReactNode } from "react";
import Link from "next/link";
import { AdminEmptyState, adminFieldClass } from "@/components/admin-ui";
import { DualDate } from "@/components/calendar-date-field";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listInvoices } from "@/lib/invoices";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-[var(--desk-muted)]">{label}</span>
      {children}
    </label>
  );
}

export default async function InvoiceListPage({
  searchParams,
}: {
  searchParams: Promise<{ number?: string; client?: string; from?: string; to?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const number = query.number?.trim() ?? "";
  const client = query.client?.trim() ?? "";
  const from = query.from?.trim() ?? "";
  const to = query.to?.trim() ?? "";
  const open = Boolean(number || client || from || to);
  const invoices = await listInvoices({ number, client, from, to });

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--desk-line)] px-4 py-3">
        <h2 className="text-sm font-bold text-[var(--desk-ink)]">{copy.invoicePhase1}</h2>
        <span className="tabular-nums text-xs font-semibold text-[var(--desk-muted)]">{invoices.length}</span>
      </div>
      <details open={open} className="border-b border-[var(--desk-line)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-[var(--desk-ink)] [&::-webkit-details-marker]:hidden">
          {copy.searchOptions}
        </summary>
        <form action="/admin/accounting/invoices" method="get" className="grid gap-3 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label={copy.invoiceNumber}>
            <input name="number" defaultValue={number} className={adminFieldClass} />
          </Field>
          <Field label={copy.client}>
            <input name="client" defaultValue={client} className={adminFieldClass} />
          </Field>
          <Field label={copy.listCreatedFrom}>
            <input type="date" name="from" defaultValue={from} className={adminFieldClass} />
          </Field>
          <Field label={copy.listCreatedTo}>
            <input type="date" name="to" defaultValue={to} className={adminFieldClass} />
          </Field>
          <div className="sm:col-span-2 xl:col-span-4">
            <button type="submit" className="desk-focus h-9 rounded-lg bg-[var(--desk-ink)] px-3 text-xs font-bold text-white">
              {copy.searchOptions}
            </button>
          </div>
        </form>
      </details>
      {invoices.length === 0 ? (
        <div className="p-6">
          <AdminEmptyState title={copy.invoiceEmpty} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[var(--desk-line)] text-start text-xs font-bold text-[var(--desk-muted)]">
                <th className="px-4 py-2 text-start">{copy.invoiceNumber}</th>
                <th className="px-4 py-2 text-start">{copy.paymentDate}</th>
                <th className="px-4 py-2 text-start">{copy.client}</th>
                <th className="px-4 py-2 text-start">{copy.invoiceStays}</th>
                <th className="px-4 py-2 text-end">{copy.invoiceNet}</th>
                <th className="px-4 py-2 text-end">{copy.invoiceVat}</th>
                <th className="px-4 py-2 text-end">{copy.invoiceGross}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-[var(--desk-line)] last:border-b-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/accounting/invoices/${invoice.id}`}
                      className="font-bold tabular-nums text-[var(--desk-primary)]"
                    >
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <DualDate iso={invoice.issuedOn} locale={locale} />
                  </td>
                  <td className="px-4 py-3 text-[var(--desk-text)]">{invoice.agencyName}</td>
                  <td className="px-4 py-3 text-[var(--desk-text)]">
                    <span className="tabular-nums">{invoice.stayCount}</span>
                    <span className="mt-0.5 block text-xs text-[var(--desk-muted)]">{invoice.stayNumbers}</span>
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums">{formatMoney(invoice.net, locale)}</td>
                  <td className="px-4 py-3 text-end tabular-nums">{formatMoney(invoice.vat, locale)}</td>
                  <td className="px-4 py-3 text-end font-bold tabular-nums">{formatMoney(invoice.gross, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

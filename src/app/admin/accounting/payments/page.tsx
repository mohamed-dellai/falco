import type { ReactNode } from "react";
import Link from "next/link";
import { AdminEmptyState, adminFieldClass } from "@/components/admin-ui";
import { DualDate } from "@/components/calendar-date-field";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, type AdminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listAllPayments } from "@/lib/invoices";
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

function methodLabel(copy: AdminCopy, method: string) {
  if (method === "cash") return copy.paymentCash;
  if (method === "cheque") return copy.paymentCheque;
  if (method === "transfer") return copy.paymentTransfer;
  if (method === "company") return copy.paymentCompany;
  if (method === "card") return copy.paymentCard;
  return method;
}

export default async function AllPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; client?: string; booking?: string; from?: string; to?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const code = query.code?.trim() ?? "";
  const client = query.client?.trim() ?? "";
  const booking = query.booking?.trim() ?? "";
  const from = query.from?.trim() ?? "";
  const to = query.to?.trim() ?? "";
  const open = Boolean(code || client || booking || from || to);
  const payments = await listAllPayments({ code, client, booking, from, to });

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--desk-line)] px-4 py-3">
        <h2 className="text-sm font-bold text-[var(--desk-ink)]">{copy.allPayments}</h2>
        <span className="tabular-nums text-xs font-semibold text-[var(--desk-muted)]">{payments.length}</span>
      </div>
      <details open={open} className="border-b border-[var(--desk-line)]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-[var(--desk-ink)] [&::-webkit-details-marker]:hidden">
          {copy.searchOptions}
        </summary>
        <form action="/admin/accounting/payments" method="get" className="grid gap-3 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label={copy.listPaymentNo}>
            <input name="code" defaultValue={code} className={adminFieldClass} />
          </Field>
          <Field label={copy.client}>
            <input name="client" defaultValue={client} className={adminFieldClass} />
          </Field>
          <Field label={copy.invoiceBooking}>
            <input name="booking" defaultValue={booking} className={adminFieldClass} />
          </Field>
          <Field label={copy.listCreatedFrom}>
            <input name="from" type="date" defaultValue={from} className={adminFieldClass} />
          </Field>
          <Field label={copy.listCreatedTo}>
            <input name="to" type="date" defaultValue={to} className={adminFieldClass} />
          </Field>
          <div className="sm:col-span-2 xl:col-span-4">
            <button type="submit" className="desk-focus h-9 rounded-lg bg-[var(--desk-ink)] px-3 text-xs font-bold text-white">
              {copy.searchOptions}
            </button>
          </div>
        </form>
      </details>
      {payments.length === 0 ? (
        <div className="p-6">
          <AdminEmptyState title={copy.paymentsEmpty} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[var(--desk-line)] text-xs font-bold text-[var(--desk-muted)]">
                <th className="px-4 py-2 text-start">{copy.paymentDate}</th>
                <th className="px-4 py-2 text-start">{copy.listPaymentNo}</th>
                <th className="px-4 py-2 text-start">{copy.client}</th>
                <th className="px-4 py-2 text-start">{copy.invoiceBooking}</th>
                <th className="px-4 py-2 text-start">{copy.paymentMethod}</th>
                <th className="px-4 py-2 text-end">{copy.paymentAmount}</th>
                <th className="px-4 py-2 text-start">{copy.paymentPosted}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-[var(--desk-line)] last:border-b-0">
                  <td className="px-4 py-3">
                    <DualDate iso={payment.paidOn} locale={locale} />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-[var(--desk-text)]">{payment.code}</td>
                  <td className="px-4 py-3 text-[var(--desk-text)]">{payment.client || "—"}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/allotments/${payment.allotmentId}/payments`}
                      className="font-bold text-[var(--desk-primary)]"
                    >
                      {payment.bookingNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--desk-text)]">
                    {payment.kind === "refund" ? `${copy.paymentRefund} · ` : ""}
                    {methodLabel(copy, payment.method)}
                  </td>
                  <td className="px-4 py-3 text-end tabular-nums">{formatMoney(payment.amount, locale)}</td>
                  <td className="px-4 py-3 text-[var(--desk-text)]">
                    {payment.posted ? copy.paymentPosted : copy.paymentNotPosted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

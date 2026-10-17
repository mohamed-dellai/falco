import { notFound } from "next/navigation";
import {
  deleteReservationPaymentAction,
  savePayTermsAction,
  setPaymentPostedAction,
} from "@/app/admin/actions";
import { AdminError } from "@/components/admin-shell";
import { DateField } from "@/components/calendar-date-field";
import { adminButtonDangerClass, adminButtonSecondaryClass } from "@/components/admin-ui";
import { PaymentReceiptButton } from "@/components/payment-receipt-button";
import { ReservationPaymentForm } from "@/components/reservation-payment-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, type AdminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAllotment } from "@/lib/inventory";
import { listReservationPolicies } from "@/lib/policies";
import { formatMoney } from "@/lib/money";
import {
  getPayTerms,
  listReservationPayments,
  paymentTotals,
  type PaymentMethod,
} from "@/lib/reservation-payments";

const methodLabel: Record<PaymentMethod, keyof AdminCopy> = {
  cash: "paymentCash",
  cheque: "paymentCheque",
  transfer: "paymentTransfer",
  company: "paymentCompany",
  card: "paymentCard",
};

export const dynamic = "force-dynamic";

export default async function ReservationPaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; remaining?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const { id } = await params;
  const query = await searchParams;
  const allotment = await getAllotment(id);
  if (!allotment) notFound();
  const [payments, terms, policies] = await Promise.all([
    listReservationPayments(allotment.id),
    getPayTerms(allotment.id),
    listReservationPolicies(allotment.id),
  ]);
  const totals = paymentTotals(allotment, payments);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <>
      <AdminError code={query.error} remaining={query.remaining} />
      <dl className="mb-4 grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm sm:grid-cols-5">
        <div className="border-b border-[var(--desk-line)] px-4 py-3 sm:border-b-0 sm:border-e">
          <dt className="text-[13px] font-medium text-[var(--desk-muted)]">
            {copy.paymentTotal}
          </dt>
          <dd className="font-plex text-lg font-semibold">{formatMoney(totals.total, locale)}</dd>
        </div>
        <div className="border-b border-[var(--desk-line)] px-4 py-3 sm:border-b-0 sm:border-e">
          <dt className="text-[13px] font-medium text-[var(--desk-muted)]">
            {copy.paymentPaid}
          </dt>
          <dd className="font-plex text-lg font-semibold">{formatMoney(totals.paid, locale)}</dd>
        </div>
        <div className="border-b border-[var(--desk-line)] px-4 py-3 sm:border-b-0 sm:border-e">
          <dt className="text-[13px] font-medium text-[var(--desk-muted)]">
            {copy.paymentRefunded}
          </dt>
          <dd className="font-plex text-lg font-semibold">{formatMoney(totals.refunded, locale)}</dd>
        </div>
        <div className="border-b border-[var(--desk-line)] px-4 py-3 sm:border-b-0 sm:border-e">
          <dt className="text-[13px] font-medium text-[var(--desk-muted)]">
            {copy.paymentDue}
          </dt>
          <dd className="font-plex text-lg font-semibold text-[var(--desk-primary)]">
            {formatMoney(totals.due, locale)}
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-[13px] font-medium text-[var(--desk-muted)]">
            {copy.paymentRefundDue}
          </dt>
          <dd className="font-plex text-lg font-semibold">{formatMoney(totals.refundDue, locale)}</dd>
        </div>
      </dl>
      <form action={savePayTermsAction} className="mb-4 grid gap-3 rounded-lg border border-[var(--desk-line)] bg-white p-4 shadow-sm">
        <input type="hidden" name="allotmentId" value={allotment.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            {copy.payBefore}
            <DateField name="payBefore" label={copy.payBefore} locale={locale} defaultValue={terms.payBefore} />
          </label>
          <label className="flex items-center gap-2 self-end text-sm">
            <input type="checkbox" name="payOnArrival" defaultChecked={terms.payOnArrival} />
            {copy.payOnArrival}
          </label>
        </div>
        <button type="submit" className={`${adminButtonSecondaryClass} w-fit`}>
          {copy.saveReservation}
        </button>
      </form>
      {payments.length ? (
      <ul className="mb-4 divide-y divide-[var(--desk-line)] overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
        {payments.map((payment) => (
          <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-semibold">
                {payment.code} · {payment.kind === "refund" ? copy.addRefund : copy.addPayment} ·{" "}
                {formatMoney(payment.amount, locale)}
              </p>
              <p className="text-[var(--desk-muted)]">
                {payment.paidOn} · {copy[methodLabel[payment.method]]}
                {payment.reference ? ` · ${payment.reference}` : ""} ·{" "}
                {payment.posted ? copy.paymentPosted : copy.paymentNotPosted}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PaymentReceiptButton
                allotmentId={allotment.id}
                paymentId={payment.id}
                policies={policies.map((policy) => ({ id: policy.id, name: policy.name }))}
                copy={copy}
              />
              <form action={setPaymentPostedAction}>
                <input type="hidden" name="allotmentId" value={allotment.id} />
                <input type="hidden" name="paymentId" value={payment.id} />
                <input type="hidden" name="posted" value={payment.posted ? "0" : "1"} />
                <button type="submit" className={adminButtonSecondaryClass}>
                  {payment.posted ? copy.paymentUnpost : copy.paymentMarkPosted}
                </button>
              </form>
              {payment.posted ? null : (
                <form action={deleteReservationPaymentAction}>
                  <input type="hidden" name="allotmentId" value={allotment.id} />
                  <input type="hidden" name="paymentId" value={payment.id} />
                  <button type="submit" className={adminButtonDangerClass}>
                    {copy.paymentDelete}
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {totals.due > 0 ? (
          <ReservationPaymentForm
            allotmentId={allotment.id}
            kind="payment"
            copy={copy}
            locale={locale}
            today={today}
          />
        ) : null}
        {totals.net > 0 ? (
          <ReservationPaymentForm
            allotmentId={allotment.id}
            kind="refund"
            copy={copy}
            locale={locale}
            today={today}
          />
        ) : null}
      </div>
    </>
  );
}

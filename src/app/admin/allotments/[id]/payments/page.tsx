import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addReservationPaymentAction,
  deleteReservationPaymentAction,
  savePayTermsAction,
  setPaymentPostedAction,
} from "@/app/admin/actions";
import { AdminError } from "@/components/admin-shell";
import { DateField } from "@/components/calendar-date-field";
import {
  adminButtonClass,
  adminButtonDangerClass,
  adminButtonSecondaryClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, type AdminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAllotment } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import {
  cardTypes,
  getPayTerms,
  listReservationPayments,
  paymentMethods,
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
  const [payments, terms] = await Promise.all([
    listReservationPayments(allotment.id),
    getPayTerms(allotment.id),
  ]);
  const totals = paymentTotals(allotment, payments);
  const roomNames = new Map(allotment.lines.map((line) => [line.id, line.roomName]));

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
        {terms.lines.map((line) => (
          <label key={line.id} className="grid gap-1 text-sm">
            {copy.paymentRoomDue}: {roomNames.get(line.id) || copy.rooms}
            <input type="hidden" name="lineId" value={line.id} />
            <DateField
              name={`payBefore-${line.id}`}
              label={copy.paymentRoomDue}
              locale={locale}
              defaultValue={line.payBefore}
            />
          </label>
        ))}
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
              <Link href={`/admin/allotments/${allotment.id}/payments/${payment.id}`} className={adminButtonSecondaryClass}>
                {copy.paymentReceipt}
              </Link>
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
          <PaymentForm allotmentId={allotment.id} kind="payment" copy={copy} locale={locale} />
        ) : null}
        {totals.net > 0 ? (
          <PaymentForm allotmentId={allotment.id} kind="refund" copy={copy} locale={locale} />
        ) : null}
      </div>
    </>
  );
}

function PaymentForm({
  allotmentId,
  kind,
  copy,
  locale,
}: {
  allotmentId: string;
  kind: "payment" | "refund";
  copy: AdminCopy;
  locale: string;
}) {
  return (
    <form action={addReservationPaymentAction} className="grid gap-3 rounded-lg border border-[var(--desk-line)] bg-white p-4 shadow-sm">
      <input type="hidden" name="allotmentId" value={allotmentId} />
      <input type="hidden" name="kind" value={kind} />
      <p className="font-semibold">{kind === "refund" ? copy.addRefund : copy.addPayment}</p>
      <label className="grid gap-1 text-sm">
        {copy.paymentDate}
        <DateField name="paidOn" label={copy.paymentDate} locale={locale} required />
      </label>
      <label className="grid gap-1 text-sm">
        {copy.paymentAmount}
        <input name="amount" inputMode="decimal" required className={adminFieldClass} />
      </label>
      <label className="grid gap-1 text-sm">
        {copy.paymentMethod}
        <select name="method" className={adminFieldClass} defaultValue="cash">
          {paymentMethods.map((method) => (
            <option key={method} value={method}>
              {copy[methodLabel[method]]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        {copy.paymentCardType}
        <select name="cardType" className={adminFieldClass} defaultValue="">
          <option value="" />
          {cardTypes.map((card) => (
            <option key={card} value={card}>
              {card === "amex" ? "Amex" : card === "mada" ? "Mada" : card[0].toUpperCase() + card.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        {copy.paymentReference}
        <input name="reference" className={adminFieldClass} />
      </label>
      <label className="grid gap-1 text-sm">
        {copy.paymentChequeDate}
        <DateField name="chequeDate" label={copy.paymentChequeDate} locale={locale} />
      </label>
      <label className="grid gap-1 text-sm">
        {copy.paymentNote}
        <input name="note" className={adminFieldClass} />
      </label>
      {kind === "payment" ? (
        <label className="flex items-center gap-2 text-sm">
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

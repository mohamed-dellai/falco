import { notFound } from "next/navigation";
import { ReservationPrintButton } from "@/components/reservation-print-button";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, type AdminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAllotment } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { getReservationPayment, type PaymentMethod } from "@/lib/reservation-payments";

const methodLabel: Record<PaymentMethod, keyof AdminCopy> = {
  cash: "paymentCash",
  cheque: "paymentCheque",
  transfer: "paymentTransfer",
  company: "paymentCompany",
  card: "paymentCard",
};

export const dynamic = "force-dynamic";

export default async function PaymentReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; paymentId: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  await requireAdmin();
  const { id, paymentId } = await params;
  const query = await searchParams;
  const locale = query.lang === "ar" ? "ar" : await getAdminLocale();
  const copy = adminCopy(locale === "ar" ? "en" : locale);
  const allotment = await getAllotment(id);
  const payment = allotment ? await getReservationPayment(allotment.id, paymentId) : null;
  if (!allotment || !payment) notFound();

  return (
    <article className="mx-auto grid max-w-xl gap-3 bg-white p-8 text-sm">
      <p className="text-xs font-semibold tracking-wide uppercase">{copy.paymentReceipt}</p>
      <h1 className="text-2xl font-semibold">{payment.code}</h1>
      <p>{allotment.number}</p>
      <p>{allotment.hotelName}</p>
      <p>{allotment.guestName}</p>
      <p>
        {payment.paidOn} · {copy[methodLabel[payment.method]]}
        {payment.cardType ? ` · ${payment.cardType}` : ""}
      </p>
      <p className="text-lg font-semibold">{formatMoney(payment.amount, locale === "ar" ? "ar" : locale)}</p>
      {payment.reference ? <p>{payment.reference}</p> : null}
      {payment.note ? <p>{payment.note}</p> : null}
      <ReservationPrintButton label={copy.docPrint} />
    </article>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminError } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, type AdminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAllotment } from "@/lib/inventory";
import { clientDocumentsFor, type ClientDocumentKind } from "@/lib/reservation-documents";

const titles: Record<ClientDocumentKind, keyof AdminCopy> = {
  amendment: "docAmendment",
  option_date: "docOptionDate",
  no_show: "docNoShow",
  voucher: "docVoucher",
  invoice: "docInvoice",
  non_refundable: "docNonRefundable",
  supplier_voucher: "docSupplierVoucher",
  rooming_list: "docRoomingList",
  lease: "docLease",
  price_offer: "docPriceOffer",
};

export const dynamic = "force-dynamic";

export default async function ReservationDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const { id } = await params;
  const query = await searchParams;
  const allotment = await getAllotment(id);
  if (!allotment) notFound();
  const kinds = clientDocumentsFor(allotment.status);

  return (
    <>
      <AdminError code={query.error} />
      <section className="overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
        <p className="border-b border-[var(--desk-line)] px-4 py-3 text-sm text-[var(--desk-muted)]">
          {copy.docDownloadNote}
        </p>
        <ul className="divide-y divide-[var(--desk-line)]">
          {kinds.map((kind) => (
            <li key={kind}>
              <Link
                href={`/admin/allotments/${allotment.id}/documents/${kind}`}
                className="desk-focus flex items-center justify-between px-4 py-3 text-sm hover:bg-[var(--desk-canvas)]"
              >
                <span className="font-medium text-[var(--desk-ink)]">{copy[titles[kind]]}</span>
                <span className="text-xs text-[var(--desk-muted)]">{copy.docPreview}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

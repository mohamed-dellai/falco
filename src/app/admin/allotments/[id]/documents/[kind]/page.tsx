import { notFound } from "next/navigation";
import { AdminError } from "@/components/admin-shell";
import { ReservationDocumentSheet } from "@/components/reservation-document-sheet";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAllotment } from "@/lib/inventory";
import {
  buildClientSheet,
  clientDocumentsFor,
  documentOptions,
  isClientDocument,
  reservationMailbox,
} from "@/lib/reservation-documents";

export const dynamic = "force-dynamic";

export default async function ReservationDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; kind: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const { id, kind } = await params;
  const query = await searchParams;
  if (!isClientDocument(kind)) notFound();
  const allotment = await getAllotment(id);
  if (!allotment || !clientDocumentsFor(allotment.status).includes(kind)) notFound();
  const mailbox = await reservationMailbox(allotment.id);
  const options = documentOptions(kind, query);
  const sheet = await buildClientSheet(allotment, kind, options, mailbox.hotelNameAr);

  return (
    <>
      <AdminError code={query.error} />
      <ReservationDocumentSheet
        allotmentId={allotment.id}
        kind={kind}
        options={options}
        sheet={sheet}
        copy={copy}
        locale={locale}
      />
    </>
  );
}

import { notFound, redirect } from "next/navigation";
import { InvoicePreview } from "@/components/invoice-preview";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { invoiceCandidates } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export default async function CreateInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const draft = await invoiceCandidates(id);
  if (!draft) notFound();
  if (draft.anchor.status !== "confirmed" || draft.anchor.channel === "b2c") notFound();
  if (draft.issued) redirect(`/admin/accounting/invoices/${draft.issued.id}`);
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const stays = [...draft.stays].sort((left, right) => {
    if (left.id === id) return -1;
    if (right.id === id) return 1;
    return left.number.localeCompare(right.number);
  });
  return (
    <InvoicePreview
      anchorId={id}
      clientName={draft.anchor.agencyName}
      stays={stays}
      copy={copy}
      locale={locale}
      error={query.error}
    />
  );
}

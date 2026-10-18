import { notFound } from "next/navigation";
import { InvoiceEditForm } from "@/components/invoice-edit-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getInvoice } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  return (
    <div className="grid gap-3">
      <h2 className="text-base font-bold text-[var(--desk-ink)]">
        {copy.invoiceNumber} <span className="tabular-nums">{invoice.number}</span>
      </h2>
      <InvoiceEditForm invoice={invoice} copy={copy} locale={locale} error={query.error} />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { IssuedInvoiceSheet } from "@/components/issued-invoice-sheet";
import { adminButtonClass, adminButtonGhostClass, adminButtonSecondaryClass } from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getCompanyProfile } from "@/lib/company";
import { getInvoice, invoiceParties } from "@/lib/invoices";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ format?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  const format = query.format === "ar" ? "ar" : "en";
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const [company, parties] = await Promise.all([
    getCompanyProfile(),
    invoiceParties(invoice.stays.map((stay) => stay.allotmentId)),
  ]);
  const page = `/admin/accounting/invoices/${invoice.id}`;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link
            href={page}
            aria-current={format === "en" ? "page" : undefined}
            className={format === "en" ? adminButtonClass : adminButtonSecondaryClass}
          >
            {copy.invoiceEnglish}
          </Link>
          <Link
            href={`${page}?format=ar`}
            aria-current={format === "ar" ? "page" : undefined}
            className={format === "ar" ? adminButtonClass : adminButtonSecondaryClass}
          >
            {copy.docArabic}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/accounting/invoices" className={adminButtonGhostClass}>
            {copy.invoiceBack}
          </Link>
          <Link href={`${page}/edit`} className={adminButtonSecondaryClass}>
            {copy.invoiceEdit}
          </Link>
          <a href={`${page}/pdf`} className={adminButtonSecondaryClass}>
            {copy.invoicePrint}
          </a>
          <a href={`${page}/pdf?format=ar`} className={adminButtonClass}>
            {copy.docArabic}
          </a>
        </div>
      </div>
      <IssuedInvoiceSheet
        invoice={invoice}
        company={company}
        format={format}
        locale={locale}
        clientAr={parties.clientAr}
        clientVat={parties.vat}
        phone={parties.phone}
        email={parties.email}
        hotels={parties.hotels}
      />
    </div>
  );
}

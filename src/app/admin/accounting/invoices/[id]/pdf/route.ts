import { notFound } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import { documentLogo, getCompanyProfile } from "@/lib/company";
import { getInvoice, invoiceParties } from "@/lib/invoices";
import { pdfFile } from "@/lib/plain-pdf";
import { issuedInvoicePdf } from "@/lib/reservation-pdf";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await currentAdmin();
  if (!admin) notFound();
  const { id } = await context.params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  const format = new URL(request.url).searchParams.get("format") === "ar" ? "ar" : "en";
  const [company, logo, parties] = await Promise.all([
    getCompanyProfile(),
    documentLogo(),
    invoiceParties(invoice.stays.map((stay) => stay.allotmentId)),
  ]);
  const body = issuedInvoicePdf({
    format,
    number: invoice.number,
    issuedOn: invoice.issuedOn,
    client: format === "ar" && parties.clientAr.trim() ? parties.clientAr.trim() : invoice.agencyName,
    clientVat: parties.vat,
    phone: parties.phone,
    email: parties.email,
    address: format === "ar" ? company.address.ar : company.address.en,
    net: invoice.net,
    vat: invoice.vat,
    gross: invoice.gross,
    company,
    logo,
    stays: invoice.stays.map((stay) => ({
      number: stay.number,
      hotel: format === "ar" && parties.hotels[stay.allotmentId]?.trim()
        ? parties.hotels[stay.allotmentId].trim()
        : stay.hotelName,
      guest: stay.guestName,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      lines: stay.lines,
    })),
  });
  const suffix = format === "ar" ? "-ar" : "";
  return pdfFile(`invoice-${invoice.number}${suffix}.pdf`, body);
}

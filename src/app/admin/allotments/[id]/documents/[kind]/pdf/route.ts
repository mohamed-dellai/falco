import { notFound } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { documentLogo, getCompanyProfile } from "@/lib/company";
import { transaction } from "@/lib/db";
import { getAllotment } from "@/lib/inventory";
import { pdfFile } from "@/lib/plain-pdf";
import {
  buildClientSheet,
  clientDocumentsFor,
  documentOptions,
  documentParties,
  isClientDocument,
  reservationMailbox,
} from "@/lib/reservation-documents";
import { getInvoice, getInvoiceForAllotment, invoiceParties } from "@/lib/invoices";
import { clientDocumentPdf, issuedInvoicePdf } from "@/lib/reservation-pdf";
import { listDeskServices } from "@/lib/services";
import { paymentTotals, listReservationPayments } from "@/lib/reservation-payments";
import { appendReservationEvent } from "@/lib/reservations";

export const dynamic = "force-dynamic";

const titles = {
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
} as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; kind: string }> },
) {
  const admin = await currentAdmin();
  if (!admin) notFound();
  const { id, kind } = await context.params;
  if (!isClientDocument(kind)) notFound();
  const allotment = await getAllotment(id);
  if (!allotment || !clientDocumentsFor(allotment.status).includes(kind)) notFound();
  if (kind === "invoice") {
    const link = await getInvoiceForAllotment(allotment.id);
    if (link) {
      const invoice = await getInvoice(link.id);
      if (invoice) {
        const arabic = new URL(request.url).searchParams.get("arabic") === "on" || new URL(request.url).searchParams.get("format") === "ar";
        const [company, logo, parties] = await Promise.all([
          getCompanyProfile(),
          documentLogo(),
          invoiceParties(invoice.stays.map((stay) => stay.allotmentId)),
        ]);
        const body = issuedInvoicePdf({
          format: arabic ? "ar" : "en",
          number: invoice.number,
          issuedOn: invoice.issuedOn,
          client: arabic && parties.clientAr.trim() ? parties.clientAr.trim() : invoice.agencyName,
          clientVat: parties.vat,
          phone: parties.phone,
          email: parties.email,
          address: arabic ? company.address.ar : company.address.en,
          net: invoice.net,
          vat: invoice.vat,
          gross: invoice.gross,
          company,
          logo,
          stays: invoice.stays.map((stay) => ({
            number: stay.number,
            hotel: arabic && parties.hotels[stay.allotmentId]?.trim()
              ? parties.hotels[stay.allotmentId].trim()
              : stay.hotelName,
            guest: stay.guestName,
            checkIn: stay.checkIn,
            checkOut: stay.checkOut,
            lines: stay.lines,
          })),
        });
        await transaction(async (sql) => {
          await appendReservationEvent(sql, {
            allotmentId: allotment.id,
            eventType: "pdf_downloaded",
            actorType: "admin",
            actorId: admin.id,
            details: { kind, invoice: invoice.number },
          });
        });
        return pdfFile(`invoice-${invoice.number}.pdf`, body);
      }
    }
  }
  const copy = adminCopy("en");
  const options = documentOptions(kind, Object.fromEntries(new URL(request.url).searchParams));
  const mailbox = await reservationMailbox(allotment.id);
  const [sheet, parties, company, payments, logo, services] = await Promise.all([
    buildClientSheet(allotment, kind, options, mailbox.hotelNameAr),
    documentParties(allotment.id),
    getCompanyProfile(),
    kind === "invoice" ? listReservationPayments(allotment.id) : Promise.resolve(null),
    documentLogo(),
    listDeskServices({ allotmentId: allotment.id }),
  ]);
  const moneyTotals = payments ? paymentTotals(allotment, payments) : null;
  const statusLabel = {
    request: copy.statusRequest,
    provisional: copy.statusProvisional,
    confirmed: copy.confirmed,
    cancelled: copy.cancelled,
    no_show: copy.statusNoShow,
    unavailable: copy.statusUnavailable,
    regret: copy.statusRegret,
  }[allotment.status];
  const body = clientDocumentPdf({
    allotment,
    kind,
    sheet,
    parties,
    company,
    title: copy[titles[kind]],
    status: statusLabel,
    paid: moneyTotals ? moneyTotals.paid : null,
    refunded: moneyTotals ? moneyTotals.refunded : null,
    due: moneyTotals ? moneyTotals.due : null,
    logo,
    services,
    labels: {
      room: copy.roomType,
      view: copy.viewName,
      meal: copy.mealPlan,
      checkIn: copy.checkIn,
      checkOut: copy.checkOut,
      nights: copy.nights,
      rooms: copy.rooms,
      rate: copy.pdfRate,
      total: copy.total,
      hotel: copy.hotel,
      client: copy.client,
      guest: copy.guest,
      vat: copy.docVatCharge,
      paid: copy.paymentPaid,
      refund: copy.paymentRefund,
      due: copy.paymentDue,
      hotelConf: copy.docHotelConf,
      status: copy.status,
    },
  });
  await transaction(async (sql) => {
    await appendReservationEvent(sql, {
      allotmentId: allotment.id,
      eventType: "pdf_downloaded",
      actorType: "admin",
      actorId: admin.id,
      details: { kind },
    });
  });
  return pdfFile(`${allotment.number}-${kind}.pdf`, body);
}

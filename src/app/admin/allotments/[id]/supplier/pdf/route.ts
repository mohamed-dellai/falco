import { notFound } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { documentLogo, getCompanyProfile } from "@/lib/company";
import { transaction } from "@/lib/db";
import { getAllotment } from "@/lib/inventory";
import { pdfFile } from "@/lib/plain-pdf";
import { documentParties, isSupplierDocument, type SupplierDocumentKind } from "@/lib/reservation-documents";
import { supplierDocumentPdf } from "@/lib/reservation-pdf";
import { appendReservationEvent } from "@/lib/reservations";

export const dynamic = "force-dynamic";

const titles: Record<SupplierDocumentKind, "supplierRequest" | "supplierRequestBlock" | "supplierAmendmentMail" | "supplierVoucherSend" | "supplierCancelSend"> = {
  request: "supplierRequest",
  request_block: "supplierRequestBlock",
  amendment: "supplierAmendmentMail",
  voucher: "supplierVoucherSend",
  cancel: "supplierCancelSend",
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await currentAdmin();
  if (!admin) notFound();
  const { id } = await context.params;
  const query = new URL(request.url).searchParams;
  const kind = query.get("kind") ?? "";
  if (!isSupplierDocument(kind)) notFound();
  const allotment = await getAllotment(id);
  if (!allotment) notFound();
  const lineIds = (query.get("lines") ?? "").split(",").filter(Boolean);
  const lines = allotment.lines.filter((line) => lineIds.includes(line.id));
  if (!lines.length) notFound();
  const copy = adminCopy("en");
  const [parties, company, logo] = await Promise.all([
    documentParties(allotment.id),
    getCompanyProfile(),
    documentLogo(),
  ]);
  const amendment = (query.get("amendmentDetails") ?? "").slice(0, 2000);
  const rooming = query.get("roomingList") === "on"
    ? lines.map((line) => `${line.quantity} x ${line.roomName} | ${allotment.guestName}`).join("\n")
    : "";
  const body = supplierDocumentPdf({
    allotment,
    kind,
    lines,
    parties,
    company,
    title: copy[titles[kind]],
    amendment: [amendment, rooming].filter(Boolean).join("\n"),
    logo,
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
  const nextStatus =
    kind === "amendment" ? "amended" : kind === "request" || kind === "request_block" ? "waiting" : "";
  await transaction(async (sql) => {
    if (nextStatus) {
      for (const line of lines) {
        if (nextStatus === "waiting" && line.supplierStatus !== "new") continue;
        await sql.execute(
          `UPDATE allotment_lines SET supplier_status = ? WHERE id = ? AND allotment_id = ?`,
          [nextStatus, line.id, allotment.id],
        );
      }
    }
    await appendReservationEvent(sql, {
      allotmentId: allotment.id,
      eventType: "pdf_downloaded",
      actorType: "admin",
      actorId: admin.id,
      details: { kind, lines: lines.length },
    });
  });
  return pdfFile(`${allotment.number}-${kind}.pdf`, body);
}

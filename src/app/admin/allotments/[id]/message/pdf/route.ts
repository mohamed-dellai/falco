import { notFound } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import { transaction } from "@/lib/db";
import { allotmentValue, getAllotment } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { pdfResponse } from "@/lib/plain-pdf";
import { appendReservationEvent } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await currentAdmin();
  if (!admin) notFound();
  const { id } = await context.params;
  const side = new URL(request.url).searchParams.get("side");
  if (side !== "hotel" && side !== "client") notFound();
  const allotment = await getAllotment(id);
  if (!allotment) notFound();
  const rooms = allotment.lines.map(
    (line) =>
      `${line.quantity} x ${line.roomName} | ${line.boardSnapshot}${line.viewSnapshot ? ` | ${line.viewSnapshot}` : ""}`,
  );
  const heading = side === "hotel" ? "Hotel" : "Client";
  const text = [
    "Falco",
    "",
    `${heading} ${allotment.number}`,
    allotment.agencyName,
    allotment.hotelName,
    allotment.guestName,
    `${allotment.checkIn} -> ${allotment.checkOut}`,
    allotment.status,
    "",
    ...rooms,
    "",
    formatMoney(allotmentValue(allotment).revenue, "en"),
    allotment.supplierReference ? `Hotel confirmation: ${allotment.supplierReference}` : "",
    allotment.supplierNotes ? allotment.supplierNotes : "",
    allotment.notes ? allotment.notes : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
  await transaction(async (sql) => {
    await appendReservationEvent(sql, {
      allotmentId: allotment.id,
      eventType: "pdf_downloaded",
      actorType: "admin",
      actorId: admin.id,
      details: { kind: side },
    });
  });
  return pdfResponse(`${allotment.number}-${side}.pdf`, text);
}

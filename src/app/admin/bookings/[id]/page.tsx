import { redirect } from "next/navigation";
import { allotmentIdForBooking } from "@/lib/inventory";

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await allotmentIdForBooking(id);
  redirect(sale ? `/admin/allotments/${sale}` : "/admin/allotments?channel=b2c");
}

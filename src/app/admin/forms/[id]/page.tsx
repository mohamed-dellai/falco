import { redirect } from "next/navigation";
import { allotmentIdForSubmission } from "@/lib/inventory";

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await allotmentIdForSubmission(id);
  redirect(sale ? `/admin/allotments/${sale}` : "/admin/allotments?channel=b2b");
}

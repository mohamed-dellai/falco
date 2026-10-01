import { notFound } from "next/navigation";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { AllotmentForm } from "@/components/allotment-form";
import { requireAdmin } from "@/lib/admin-auth";
import { getAllotment, listAgencies, listAllotmentRooms } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function AllotmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; remaining?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const [allotment, agencies, rooms] = await Promise.all([
    getAllotment(id),
    listAgencies(),
    listAllotmentRooms(),
  ]);
  if (!allotment) notFound();

  return (
    <AdminShell
      title={allotment.number}
      crumbs={[{ href: "/admin/assignments", label: "Allotments" }]}
    >
      <AdminError code={query.error} remaining={query.remaining} />
      {allotment.status === "confirmed" && (
        <p className="mb-3 text-sm text-[#334155]">
          Confirmed. These rooms are held for {allotment.agencyName} from{" "}
          {allotment.checkIn} to {allotment.checkOut}.
        </p>
      )}
      {allotment.status === "cancelled" && (
        <p className="mb-3 text-sm text-[#334155]">
          Cancelled. The rooms are free again for these dates.
        </p>
      )}
      <AllotmentForm agencies={agencies} rooms={rooms} allotment={allotment} />
    </AdminShell>
  );
}

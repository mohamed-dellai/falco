import { notFound } from "next/navigation";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { AllotmentForm } from "@/components/allotment-form";
import { AdminNotice } from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  getAllotment,
  listAgencies,
  listAllotmentRooms,
  listDeskRates,
} from "@/lib/inventory";
import { formatDate } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AllotmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; remaining?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const { id } = await params;
  const query = await searchParams;
  const [allotment, agencies, rooms, rates] = await Promise.all([
    getAllotment(id),
    listAgencies(),
    listAllotmentRooms(),
    listDeskRates(),
  ]);
  if (!allotment) notFound();

  return (
    <AdminShell
      title={allotment.number}
      crumbs={[{ href: "/admin/allotments", label: copy.allotments }]}
    >
      <AdminError code={query.error} remaining={query.remaining} />
      {allotment.status === "confirmed" && (
        <div className="mb-4">
          <AdminNotice tone="success">
            {fill(copy.allotmentConfirmedNotice, {
              agency: allotment.agencyName,
              checkIn: formatDate(allotment.checkIn, locale),
              checkOut: formatDate(allotment.checkOut, locale),
            })}
          </AdminNotice>
        </div>
      )}
      {allotment.status === "cancelled" && (
        <div className="mb-4">
          <AdminNotice>{copy.allotmentCancelledNotice}</AdminNotice>
        </div>
      )}
      <AllotmentForm
        agencies={agencies}
        rooms={rooms}
        allotment={allotment}
        rates={rates}
      />
    </AdminShell>
  );
}

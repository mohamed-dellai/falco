import Link from "next/link";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { AllotmentForm } from "@/components/allotment-form";
import { AdminEmptyState, adminButtonClass } from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listAgencies, listAllotmentRooms, listDeskRates } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function NewAllotmentPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    remaining?: string;
    room?: string;
    agency?: string;
    checkIn?: string;
    checkOut?: string;
  }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const query = await searchParams;
  const [agencies, rooms, rates] = await Promise.all([
    listAgencies(),
    listAllotmentRooms(),
    listDeskRates(),
  ]);

  return (
    <AdminShell
      title={copy.newAllotment}
      crumbs={[{ href: "/admin/allotments", label: copy.allotments }]}
    >
      <AdminError code={query.error} remaining={query.remaining} />
      {!agencies.length ? (
        <AdminEmptyState
          title={copy.noAgencies}
          description={copy.agencyBeforeAllotment}
          action={
            <Link href="/admin/agencies/new" className={adminButtonClass}>
              {copy.newAgency}
            </Link>
          }
        />
      ) : !rooms.length ? (
        <AdminEmptyState
          title={copy.noRoomsToAllot}
          description={copy.purchaseBeforeAllotment}
          action={
            <Link href="/admin/purchases/new" className={adminButtonClass}>
              {copy.newPurchase}
            </Link>
          }
        />
      ) : (
        <AllotmentForm
          agencies={agencies}
          rooms={rooms}
          roomId={query.room}
          agencyId={query.agency}
          initialCheckIn={query.checkIn}
          initialCheckOut={query.checkOut}
          rates={rates}
        />
      )}
    </AdminShell>
  );
}

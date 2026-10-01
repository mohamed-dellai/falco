import Link from "next/link";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { AllotmentForm } from "@/components/allotment-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listAgencies, listAllotmentRooms } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function NewAllotmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; remaining?: string; room?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const query = await searchParams;
  const [agencies, rooms] = await Promise.all([
    listAgencies(),
    listAllotmentRooms(),
  ]);

  return (
    <AdminShell
      title={copy.newAllotment}
      crumbs={[{ href: "/admin/assignments", label: copy.allotments }]}
    >
      <AdminError code={query.error} remaining={query.remaining} />
      {!agencies.length ? (
        <p className="rounded border border-[#d5dbe3] bg-white px-4 py-6 text-sm text-[#5c6776]">
          <Link href="/admin/agencies" className="font-semibold text-[#0e4d8c]">
            {copy.newAgency}
          </Link>{" "}
          before allotting rooms.
        </p>
      ) : !rooms.length ? (
        <p className="rounded border border-[#d5dbe3] bg-white px-4 py-6 text-sm text-[#5c6776]">
          <Link href="/admin/purchases/new" className="font-semibold text-[#0e4d8c]">
            Confirm a purchase
          </Link>{" "}
          so there is a room to allot.
        </p>
      ) : (
        <AllotmentForm
          agencies={agencies}
          rooms={rooms}
          roomId={query.room}
        />
      )}
    </AdminShell>
  );
}

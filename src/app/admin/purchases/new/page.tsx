import Link from "next/link";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { PurchaseForm } from "@/components/purchase-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listHotels } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; hotel?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const query = await searchParams;
  const hotels = await listHotels();

  return (
    <AdminShell
      title={copy.newPurchase}
      crumbs={[{ href: "/admin/purchases", label: copy.purchases }]}
    >
      <AdminError code={query.error} />
      {hotels.length ? (
        <PurchaseForm hotels={hotels} hotelId={query.hotel} />
      ) : (
        <p className="rounded border border-[#d5dbe3] bg-white px-4 py-6 text-sm text-[#5c6776]">
          <Link href="/admin/hotels/new" className="font-semibold text-[#0e4d8c]">
            {copy.newHotel}
          </Link>{" "}
          before purchasing rooms.
        </p>
      )}
    </AdminShell>
  );
}

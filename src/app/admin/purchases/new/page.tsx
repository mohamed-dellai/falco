import Link from "next/link";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { AdminEmptyState, adminButtonClass } from "@/components/admin-ui";
import { PurchaseForm } from "@/components/purchase-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  listHotelMealLinks,
  listHotelRoomLinks,
  listHotelViewLinks,
  listMealTypes,
  listViewTypes,
} from "@/lib/hotel-parameters";
import { listAgencies, listHotels, listRoomTypes } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; hotel?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const query = await searchParams;
  const [hotels, roomTypes, meals, views, hotelRooms, hotelMeals, hotelViews, agencies] = await Promise.all([
    listHotels(),
    listRoomTypes(),
    listMealTypes(),
    listViewTypes(),
    listHotelRoomLinks(),
    listHotelMealLinks(),
    listHotelViewLinks(),
    listAgencies(),
  ]);

  return (
    <AdminShell
      title={copy.newPurchase}
      crumbs={[{ href: "/admin/purchases", label: copy.purchases }]}
    >
      <AdminError code={query.error} />
      {hotels.length ? (
        <PurchaseForm
          hotels={hotels}
          hotelId={query.hotel}
          roomTypes={roomTypes}
          meals={meals}
          views={views.map((view) => view.name)}
          hotelRooms={hotelRooms}
          hotelMeals={hotelMeals}
          hotelViews={hotelViews}
          suppliers={agencies.filter(
            (agency) => agency.kind === "agency" && agency.isSupplier && !agency.disabled,
          )}
        />
      ) : (
        <AdminEmptyState
          title={copy.noHotels}
          description={copy.hotelBeforePurchase}
          action={
            <Link href="/admin/hotels/new" className={adminButtonClass}>
              {copy.newHotel}
            </Link>
          }
        />
      )}
    </AdminShell>
  );
}

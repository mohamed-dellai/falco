import { notFound } from "next/navigation";
import { AdminError } from "@/components/admin-shell";
import { AdminNotice } from "@/components/admin-ui";
import { HotelOfferingsForm } from "@/components/hotel-offerings-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listHotelOfferings, listMealTypes, listViewTypes } from "@/lib/hotel-parameters";
import { getHotel, listRoomTypes } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function HotelOffersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const { id } = await params;
  const query = await searchParams;
  const hotel = await getHotel(id);
  if (!hotel) notFound();
  const [roomTypes, meals, views, offerings] = await Promise.all([
    listRoomTypes(),
    listMealTypes(),
    listViewTypes(),
    listHotelOfferings(id),
  ]);

  return (
    <div className="grid gap-4">
      <AdminError code={query.error} />
      {query.saved === "offers" && <AdminNotice tone="success">{copy.offersSaved}</AdminNotice>}
      <HotelOfferingsForm
        copy={copy}
        hotelId={hotel.id}
        roomTypes={roomTypes}
        meals={meals}
        views={views}
        roomTypeIds={offerings.roomTypes.map((type) => type.id)}
        mealTypeIds={offerings.meals.map((meal) => meal.id)}
        viewTypeIds={offerings.views.map((view) => view.id)}
      />
    </div>
  );
}

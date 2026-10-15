import { notFound } from "next/navigation";
import { AdminError } from "@/components/admin-shell";
import { ReservationRooms } from "@/components/reservation-rooms";
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
import { allotmentValue, getAllotment, listRoomTypes, listStayRoomChoices } from "@/lib/inventory";
import { listReservationPolicies } from "@/lib/policies";

export const dynamic = "force-dynamic";

export default async function ReservationRoomsPage({
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
  const allotment = await getAllotment(id);
  if (!allotment) notFound();
  const [choices, roomTypes, meals, views, roomLinks, mealLinks, viewLinks, policies] = await Promise.all([
    allotment.hotelId
      ? listStayRoomChoices(allotment.hotelId, allotment.checkIn, allotment.checkOut, allotment.id)
      : Promise.resolve([]),
    listRoomTypes(),
    listMealTypes(),
    listViewTypes(),
    listHotelRoomLinks(),
    listHotelMealLinks(),
    listHotelViewLinks(),
    listReservationPolicies(id),
  ]);

  return (
    <>
      <AdminError code={query.error} remaining={query.remaining} />
      <ReservationRooms
        allotment={allotment}
        choices={choices}
        roomTypes={roomTypes.map((type) => ({ id: type.id, name: type.name }))}
        meals={meals.map((meal) => ({ code: meal.code, name: meal.name }))}
        views={views.map((view) => ({ name: view.name }))}
        hotelRoomTypeIds={roomLinks
          .filter((link) => link.hotelId === allotment.hotelId)
          .map((link) => link.roomTypeId)}
        hotelMealCodes={mealLinks
          .filter((link) => link.hotelId === allotment.hotelId)
          .map((link) => link.code)}
        hotelViewNames={viewLinks
          .filter((link) => link.hotelId === allotment.hotelId)
          .map((link) => link.name)}
        totals={allotmentValue(allotment)}
        copy={copy}
        locale={locale}
        openAdd={Boolean(query.error && !query.error.startsWith("mail"))}
        policies={policies.map((policy) => ({ id: policy.id, name: policy.name }))}
      />
    </>
  );
}

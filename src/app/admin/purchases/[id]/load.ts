import { notFound } from "next/navigation";
import {
  listContractGroupRates,
  listContractPeriodRates,
  listContractPeriods,
  listContractPolicies,
} from "@/lib/contracts";
import { listClientGroups } from "@/lib/client-crm";
import {
  listHotelMealLinks,
  listHotelRoomLinks,
  listHotelViewLinks,
  listMealTypes,
  listViewTypes,
} from "@/lib/hotel-parameters";
import {
  getPurchase,
  listAgencies,
  listHotels,
  listPurchaseOfferPhotos,
  listRoomTypes,
} from "@/lib/inventory";

export async function loadPurchasePage(id: string) {
  const purchase = await getPurchase(id);
  if (!purchase) notFound();
  const [
    hotels,
    roomTypes,
    agencies,
    periods,
    policies,
    periodRates,
    groupRates,
    groups,
    offerPhotos,
    meals,
    views,
    hotelRooms,
    hotelMeals,
    hotelViews,
  ] = await Promise.all([
    listHotels(),
    listRoomTypes(),
    listAgencies(),
    listContractPeriods(id),
    listContractPolicies(id),
    listContractPeriodRates(id),
    listContractGroupRates(id),
    listClientGroups(),
    listPurchaseOfferPhotos(id),
    listMealTypes(),
    listViewTypes(),
    listHotelRoomLinks(),
    listHotelMealLinks(),
    listHotelViewLinks(),
  ]);
  return {
    purchase,
    hotels,
    roomTypes,
    agencies,
    periods,
    policies,
    periodRates,
    groupRates,
    groups,
    offerPhotos,
    meals,
    views,
    hotelRooms,
    hotelMeals,
    hotelViews,
  };
}

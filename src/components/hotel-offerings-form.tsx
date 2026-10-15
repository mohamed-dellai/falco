import { saveHotelOfferingsAction } from "@/app/admin/actions";
import {
  AdminPanel,
  adminButtonClass,
} from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { fill, type AdminCopy } from "@/lib/admin-copy";
import { mealLabel, type MealType } from "@/lib/hotel-parameters";
import type { CatalogRoomType } from "@/lib/inventory";
import { roomTypeLabel, type MealPlan } from "@/lib/room-types";
import Link from "next/link";

export function HotelOfferingsForm({
  copy,
  hotelId,
  roomTypes,
  meals,
  roomTypeIds,
  mealTypeIds,
  views,
  viewTypeIds,
}: {
  copy: AdminCopy;
  hotelId: string;
  roomTypes: CatalogRoomType[];
  meals: MealType[];
  views: Array<{ id: string; name: string }>;
  roomTypeIds: string[];
  mealTypeIds: string[];
  viewTypeIds: string[];
}) {
  const selectedRooms = new Set(roomTypeIds);
  const selectedMeals = new Set(mealTypeIds);
  const selectedViews = new Set(viewTypeIds);
  const builtinLabels: Partial<Record<MealPlan, string>> = {
    room_only: copy.roomOnly,
    breakfast: copy.breakfastBoard,
    half_board: copy.halfBoard,
    full_board: copy.fullBoard,
  };

  return (
    <AdminPanel title={copy.hotelOffers} className="mt-4">
      <p className="text-sm text-[var(--desk-muted)]">{copy.hotelOffersHint}</p>
      <form action={saveHotelOfferingsAction} className="mt-4 grid gap-5">
        <input type="hidden" name="hotelId" value={hotelId} />
        <fieldset>
          <legend className="text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
            {copy.roomTypes}
          </legend>
          {roomTypes.length ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {roomTypes.map((type) => {
                const label = roomTypeLabel(type.name, (code) => copy[code]);
                return (
                  <label key={type.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="roomTypeId"
                      value={type.id}
                      defaultChecked={selectedRooms.has(type.id)}
                      className="mt-0.5 size-4"
                    />
                    <span>
                      <span className="font-semibold">{label}</span>
                      <span className="mt-0.5 block text-[var(--desk-muted)]">
                        {copy.guests} · {type.guests}
                        {" · "}
                        {type.childrenAllowed
                          ? fill(copy.childrenUpTo, { age: type.maxChildAge ?? 0 })
                          : copy.childrenNotAllowed}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--desk-muted)]">
              {copy.noRoomTypes}{" "}
              <Link href="/admin/settings?section=hotel" className="font-semibold text-[var(--desk-primary)] underline">
                {copy.hotelParameters}
              </Link>
            </p>
          )}
        </fieldset>
        <fieldset>
          <legend className="text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
            {copy.mealTypes}
          </legend>
          {meals.length ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {meals.map((meal) => (
                <label key={meal.id} className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    name="mealTypeId"
                    value={meal.id}
                    defaultChecked={selectedMeals.has(meal.id)}
                    className="size-4"
                  />
                  {mealLabel(meal, builtinLabels)}
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--desk-muted)]">{copy.noMeals}</p>
          )}
        </fieldset>
        <fieldset>
          <legend className="text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
            {copy.viewTypes}
          </legend>
          {views.length ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {views.map((view) => (
                <label key={view.id} className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    name="viewTypeId"
                    value={view.id}
                    defaultChecked={selectedViews.has(view.id)}
                    className="size-4"
                  />
                  {view.name}
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--desk-muted)]">
              {copy.noViews}{" "}
              <Link href="/admin/settings?section=hotel" className="font-semibold text-[var(--desk-primary)] underline">
                {copy.hotelParameters}
              </Link>
            </p>
          )}
        </fieldset>
        <AdminSubmitButton pendingLabel={copy.saving} className={`${adminButtonClass} w-fit`}>
          {copy.saveHotelOffers}
        </AdminSubmitButton>
      </form>
    </AdminPanel>
  );
}

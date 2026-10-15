import { AdminError, AdminShell } from "@/components/admin-shell";
import {
  AdminField,
  AdminPanel,
  adminButtonClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { CityPlaceFields } from "@/components/city-place-fields";
import { createHotelAction } from "@/app/admin/actions";
import { HotelMapField } from "@/components/hotel-map";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, type AdminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { cities, type City } from "@/lib/inventory";
import { places } from "@/lib/places";

export const dynamic = "force-dynamic";

export default async function NewHotelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);

  return (
    <AdminShell
      title={copy.addHotel}
      crumbs={[{ href: "/admin/hotels", label: copy.hotels }]}
    >
      <AdminError code={query.error} />
      <AdminPanel title={copy.hotelRecord} className="max-w-3xl">
        <form action={createHotelAction} className="grid gap-3">
          <HotelFields copy={copy} locale={locale} />
          <AdminSubmitButton
            pendingLabel={copy.saving}
            className={`${adminButtonClass} w-fit`}
          >
            {copy.saveHotel}
          </AdminSubmitButton>
        </form>
      </AdminPanel>
    </AdminShell>
  );
}

export function HotelFields({
  hotel,
  copy,
  locale,
}: {
  locale: "en" | "fr";
  hotel?: {
    name: string;
    nameAr: string;
    city: City;
    placeId: string;
    address: string;
    description: string;
    descriptionAr: string;
    stars: number;
    distanceToHaram: string;
    latitude: number | null;
    longitude: number | null;
  };
  copy: AdminCopy;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label={copy.hotelName}>
          <input
            name="name"
            required
            defaultValue={hotel?.name}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label={copy.hotelNameAr}>
          <input
            name="nameAr"
            dir="rtl"
            defaultValue={hotel?.nameAr}
            className={adminFieldClass}
          />
        </AdminField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CityPlaceFields
          cities={cities.map((city) => ({ id: city, label: copy[city] }))}
          places={places.map((place) => ({
            id: place.id,
            city: place.city,
            label: locale === "fr" ? place.fr : place.en,
          }))}
          city={hotel?.city ?? "makkah"}
          placeId={hotel?.placeId ?? ""}
          labels={{ city: copy.city, place: copy.place, noPlace: copy.noPlace }}
        />
        <AdminField label={copy.stars}>
          <input
            name="stars"
            type="number"
            min={1}
            max={5}
            required
            defaultValue={hotel?.stars ?? 4}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label={copy.distanceHaram}>
          <input
            name="distanceToHaram"
            defaultValue={hotel?.distanceToHaram}
            className={adminFieldClass}
          />
        </AdminField>
      </div>
      <AdminField label={copy.address}>
        <input
          name="address"
          defaultValue={hotel?.address}
          className={adminFieldClass}
        />
      </AdminField>
      <HotelMapField
        latitude={hotel?.latitude ?? null}
        longitude={hotel?.longitude ?? null}
        city={hotel?.city ?? "makkah"}
        labels={{
          title: copy.mapPosition,
          hint: copy.mapPositionHint,
          latitude: copy.latitude,
          longitude: copy.longitude,
          clear: copy.clearPosition,
        }}
      />
      <AdminField label={copy.description}>
        <textarea
          name="description"
          defaultValue={hotel?.description}
          className={`${adminFieldClass} !h-auto min-h-28 py-2`}
        />
      </AdminField>
      <AdminField label={copy.descriptionAr}>
        <textarea
          name="descriptionAr"
          dir="rtl"
          defaultValue={hotel?.descriptionAr}
          className={`${adminFieldClass} !h-auto min-h-28 py-2`}
        />
      </AdminField>
    </>
  );
}

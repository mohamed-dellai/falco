import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { bookAgencyOfferAction } from "@/app/[locale]/hotels/agency-actions";
import { HotelLocationMap } from "@/components/hotel-map";
import { RoomRequest } from "@/components/room-request";
import { StaySearch } from "@/components/stay-search";
import { Link } from "@/i18n/navigation";
import { localeAlternates, type Locale } from "@/i18n/routing";
import { currentAgency } from "@/lib/agency-auth";
import { catalogHref, parseCatalogFilters } from "@/lib/hotel-filters";
import { listHotelOfferings, mealLabel } from "@/lib/hotel-parameters";
import { getHotel, getShowcaseHotel, parseStay, withAgencyRates } from "@/lib/inventory";
import {
  earliestCheckIn,
  hotelDisplayDescription,
  hotelDisplayName,
} from "@/lib/hotel-rules";
import { placeName } from "@/lib/places";
import { formatMoney } from "@/lib/money";
import { mealPlanMessageKey, roomTypeLabel, type MealPlan } from "@/lib/room-types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const hotel = await getHotel(id);
  if (!hotel?.publishedDesk) return {};
  return {
    title: hotelDisplayName(hotel, locale),
    description: hotelDisplayDescription(hotel, locale),
    alternates: {
      canonical: `/${locale}/hotels/${id}`,
      languages: localeAlternates(`/hotels/${id}`),
    },
  };
}

export default async function HotelPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, id } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const filters = parseCatalogFilters(query);
  const stay = parseStay(filters.checkIn, filters.checkOut);
  const hotel = await getHotel(id);
  if (!hotel?.publishedDesk) notFound();
  const agency = await currentAgency();
  if (!agency) {
    const next = catalogHref(filters, `/${locale}/hotels/${id}`);
    redirect(`/${locale}/hotels/login?next=${encodeURIComponent(next)}`);
  }
  const listed = stay ? await getShowcaseHotel(id, stay) : null;
  const priced = listed ? await withAgencyRates([listed], agency.id, stay) : [];
  const rooms = priced[0]?.rooms ?? [];
  const booked = typeof query.booked === "string" ? query.booked : "";
  const kind = query.kind === "request" ? "request" : "provisional";
  const minDate = earliestCheckIn(hotel);
  const title = hotelDisplayName(hotel, locale);
  const description = hotelDisplayDescription(hotel, locale);
  const place = placeName(hotel.placeId, locale);
  const tooSoon = Boolean(stay && stay.checkIn < minDate);

  const offerings = await listHotelOfferings(id);
  const t = await getTranslations("Hotels");
  const mealNames = new Map(
    offerings.meals.map((meal) => [
      meal.id,
      mealLabel(meal, {
        room_only: t("roomOnly"),
        breakfast: t("breakfastBoard"),
        half_board: t("halfBoard"),
        full_board: t("fullBoard"),
      } satisfies Partial<Record<MealPlan, string>>),
    ]),
  );
  const search = await getTranslations("Search");
  const common = await getTranslations("Common");
  const gallery = [...hotel.photos, ...rooms.flatMap((room) => room.photos)];

  return (
    <section className="section-space">
      <div className="site-shell">
        <Link
          href={catalogHref(filters)}
          className="text-sm font-bold text-primary"
        >
          {t("back")}
        </Link>
        {agency && (
          <Link
            href="/hotels/basket"
            className="ms-5 text-sm font-bold text-gold underline"
          >
            {t("basket")}
          </Link>
        )}
        <p className="eyebrow mt-5">
          {common(hotel.city)}
          {place ? ` · ${place}` : ""} · {t("stars", { count: hotel.stars })}
        </p>
        <h1 className="font-display mt-2 text-4xl font-bold text-primary md:text-6xl">
          {title}
        </h1>
        {hotel.distanceToHaram && (
          <p className="mt-3 text-sm font-bold text-gold">
            {hotel.distanceToHaram}
          </p>
        )}
        {hotel.address && (
          <p className="mt-2 text-sm text-muted">{hotel.address}</p>
        )}
        {hotel.latitude != null && hotel.longitude != null && (
          <HotelLocationMap
            latitude={hotel.latitude}
            longitude={hotel.longitude}
            city={hotel.city}
            name={title}
            openLabel={t("openMap")}
          />
        )}
        {description && (
          <p className="mt-5 max-w-3xl text-base leading-8 text-muted">
            {description}
          </p>
        )}
        {hotel.payOnArrival && (
          <p className="mt-4 text-sm font-bold text-primary">{t("payOnArrival")}</p>
        )}

        {gallery.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {gallery.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo}
                src={photo}
                alt={title}
                className="h-40 w-full rounded-xl object-cover"
              />
            ))}
          </div>
        )}

        <h2 className="font-display mt-12 text-3xl font-bold text-primary">
          {t("hotelOffers")}
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white p-5">
            <h3 className="text-sm font-extrabold text-primary">{t("hotelRoomTypes")}</h3>
            {offerings.roomTypes.length ? (
              <ul className="mt-3 grid gap-3">
                {offerings.roomTypes.map((type) => (
                  <li key={type.id}>
                    <p className="font-bold text-primary">
                      {roomTypeLabel(type.name, (code) => t(code))}
                    </p>
                    <p className="text-sm text-muted">
                      {t("sleeps", { count: type.guests })}
                      {" · "}
                      {type.childrenAllowed && type.maxChildAge != null
                        ? t("childrenAllowed", { age: type.maxChildAge })
                        : t("childrenNotAllowed")}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">{t("noHotelRoomTypes")}</p>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <h3 className="text-sm font-extrabold text-primary">{t("hotelMeals")}</h3>
            {offerings.meals.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {offerings.meals.map((meal) => (
                  <li
                    key={meal.id}
                    className="rounded-full border border-line px-3 py-1 text-sm font-semibold text-primary"
                  >
                    {mealNames.get(meal.id)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">{t("noHotelMeals")}</p>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-white p-5">
            <h3 className="text-sm font-extrabold text-primary">{t("hotelViews")}</h3>
            {offerings.views.length ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {offerings.views.map((view) => (
                  <li
                    key={view.id}
                    className="rounded-full border border-line px-3 py-1 text-sm font-semibold text-primary"
                  >
                    {view.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">{t("noHotelViews")}</p>
            )}
          </div>
        </div>

        <h2 className="font-display mt-12 text-3xl font-bold text-primary">
          {t("roomsTitle")}
        </h2>
        {query.error === "cart-mismatch" && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {t("cartMismatch")}{" "}
            <Link href="/hotels/basket" className="underline">
              {t("basket")}
            </Link>
          </p>
        )}
        {(query.error === "quantity" || query.error === "rate") && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {t("cartQuantity")}
          </p>
        )}
        {query.error === "client" && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {t("clientBlocked")}
          </p>
        )}
        {(query.error === "window" || tooSoon) && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            {t("saleWindow")}
          </p>
        )}
        {booked ? (
          <p className="mt-4 text-sm font-semibold text-primary">
            {kind === "request"
              ? t("bookedRequest", { reference: booked })
              : t("bookedHold", { reference: booked })}
          </p>
        ) : null}
        <StaySearch
          key={`${filters.checkIn}:${filters.checkOut}`}
          pathname={`/hotels/${hotel.id}`}
          minDate={minDate}
          checkIn={filters.checkIn}
          checkOut={filters.checkOut}
        />
        {stay && rooms.length ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {rooms.map((room) => (
              <article
                key={room.id}
                className="overflow-hidden rounded-2xl border border-line bg-white"
              >
                {room.photos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={room.photos[0]}
                    alt={roomTypeLabel(room.name, (type) => t(type))}
                    className="h-56 w-full object-cover"
                  />
                )}
                <div className="p-5">
                  <h3 className="text-2xl font-bold text-primary">
                    {roomTypeLabel(room.name, (type) => t(type))}
                    {room.checkIn && room.checkOut && (
                      <span className="mt-1 block text-sm font-medium text-muted">
                        {room.checkIn} → {room.checkOut}
                      </span>
                    )}
                  </h3>
                  {room.description && (
                    <p className="mt-2 text-sm leading-7 text-muted">
                      {room.description}
                    </p>
                  )}
                  <p className="mt-4 text-sm font-bold">
                    {t("sleeps", { count: room.capacity })} ·{" "}
                    {room.childrenAllowed && room.maxChildAge != null
                      ? t("childrenAllowed", { age: room.maxChildAge })
                      : t("childrenNotAllowed")}
                    {" · "}
                    {t(mealPlanMessageKey(room.board))}
                    {room.view.trim() ? ` · ${room.view.trim()}` : ""} ·{" "}
                    {t("openForStay", { count: room.open ?? 0 })}
                  </p>
                  {room.typeDescription ? (
                    <p className="mt-2 text-sm leading-7 text-muted">
                      {room.typeDescription}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-muted">
                    {room.agencyPricePerNight != null
                      ? `${t("companyRate")} ${formatMoney(room.agencyPricePerNight, locale)}`
                      : t("rateOnRequest")}
                  </p>
                  {room.agencyPricePerNight != null &&
                  room.contractPeriodId &&
                  (room.saleMode === "request" || (room.open ?? 0) > 0) ? (
                    <form action={bookAgencyOfferAction} className="mt-4 flex flex-wrap items-end gap-3">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="hotelId" value={hotel.id} />
                      <input
                        type="hidden"
                        name="contractPeriodId"
                        value={room.contractPeriodId}
                      />
                      <input type="hidden" name="checkIn" value={stay.checkIn} />
                      <input type="hidden" name="checkOut" value={stay.checkOut} />
                      <label className="grid gap-1 text-xs font-semibold text-primary">
                        {t("openForStay", { count: room.open ?? 0 })}
                        <input
                          name="quantity"
                          type="number"
                          min={1}
                          max={room.saleMode === "request" ? 50 : room.open ?? 1}
                          defaultValue={1}
                          className="w-24 rounded-xl border border-line px-3 py-2 font-normal"
                        />
                      </label>
                      <button
                        type="submit"
                        className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white"
                      >
                        {t("addToBasket")}
                      </button>
                    </form>
                  ) : room.agencyPricePerNight != null ? (
                    <p className="mt-4 text-sm font-semibold text-muted">
                      {t("fullyAllotted")}
                    </p>
                  ) : (
                    <RoomRequest
                      hotelId={hotel.id}
                      roomId={room.id}
                      max={room.open ?? 0}
                      checkIn={stay.checkIn}
                      checkOut={stay.checkOut}
                    />
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : tooSoon ? null : (
          <p className="mt-4 text-sm leading-7 text-muted">
            {stay ? t("fullyAllotted") : search("prompt")}
          </p>
        )}
      </div>
    </section>
  );
}

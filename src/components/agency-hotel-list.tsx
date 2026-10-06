import { SearchX } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { catalogHref, type CatalogFilters } from "@/lib/hotel-filters";
import type { listAgencyCatalog } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { mealPlanMessageKey } from "@/lib/room-types";

type Catalog = Awaited<ReturnType<typeof listAgencyCatalog>>;

export async function AgencyHotelList({
  hotels,
  filters,
  dated,
  datesMiss,
}: {
  hotels: Catalog;
  filters: CatalogFilters;
  dated: boolean;
  datesMiss: boolean;
}) {
  const t = await getTranslations("Hotels");
  const search = await getTranslations("Search");
  const common = await getTranslations("Common");
  const locale = await getLocale();

  if (!hotels.length) {
    return (
      <div className="mt-5 flex max-w-3xl flex-col gap-4 rounded-2xl border border-line bg-white p-6 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-low text-primary">
          <SearchX aria-hidden="true" size={21} />
        </span>
        <div>
          <h3 className="font-bold text-ink">
            {datesMiss ? search("empty") : t("noMatches")}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            {datesMiss ? search("emptyHint") : t("noMatchesHint")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-4">
      {hotels.map((hotel) => {
        const image = hotel.photos[0] ?? hotel.rooms[0]?.photos[0];
        const open = hotel.rooms.reduce((sum, room) => sum + (room.open ?? 0), 0);
        const meals = [
          ...new Set(hotel.rooms.map((room) => mealPlanMessageKey(room.board))),
        ];
        const rates = hotel.rooms
          .map((room) => room.agencyPricePerNight)
          .filter((price): price is number => price != null);
        return (
          <article
            key={hotel.id}
            className="overflow-hidden rounded-2xl border border-line bg-white md:grid md:grid-cols-[16rem_minmax(0,1fr)]"
          >
            <div className="h-52 bg-primary-dark md:h-full md:min-h-52">
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={hotel.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex flex-col p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gold">
                {common(hotel.city)} · {t("stars", { count: hotel.stars })}
              </p>
              <h2 className="font-display mt-2 text-2xl font-bold text-primary">
                {hotel.name}
              </h2>
              {hotel.distanceToHaram && (
                <p className="mt-2 text-sm font-bold text-gold">
                  {hotel.distanceToHaram}
                </p>
              )}
              <p className="mt-3 text-sm font-bold text-primary">
                {dated
                  ? t("openForStay", { count: open })
                  : hotel.rooms.length
                    ? t("listedRooms", { count: hotel.rooms.length })
                    : t("noDatedRooms")}
              </p>
              {meals.length > 0 && (
                <p className="mt-2 text-sm text-muted">
                  {meals.map((meal) => t(meal)).join(" · ")}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href={catalogHref(filters, `/hotels/${hotel.id}`)}
                  className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark"
                >
                  {dated ? search("chooseHotel") : t("viewHotel")}
                </Link>
                <p className="text-xs text-muted">
                  {rates.length
                    ? `${t("companyRate")} ${formatMoney(Math.min(...rates), locale)}`
                    : t("rateOnRequest")}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

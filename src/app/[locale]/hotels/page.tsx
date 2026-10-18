import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { agencySignOutAction } from "@/app/[locale]/hotels/agency-actions";
import { AgencyHotelList } from "@/components/agency-hotel-list";
import { HotelCatalog } from "@/components/agency-hotel-browser";
import { AgencyPortalNav } from "@/components/agency-portal-nav";
import { localeAlternates, type Locale } from "@/i18n/routing";
import { agencyPortalName, currentAgency } from "@/lib/agency-auth";
import {
  catalogHref,
  catalogViews,
  filterCatalog,
  parseCatalogFilters,
  type SearchQuery,
} from "@/lib/hotel-filters";
import { listMealTypes, mealLabel } from "@/lib/hotel-parameters";
import { listAgencyCatalog, parseStay, withAgencyRates } from "@/lib/inventory";
import { todayInRiyadh } from "@/lib/money";
import type { MealPlan } from "@/lib/room-types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("hotelsTitle"),
    alternates: {
      canonical: `/${locale}/hotels`,
      languages: localeAlternates("/hotels"),
    },
  };
}

export default async function HotelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<SearchQuery>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Hotels");
  const filters = parseCatalogFilters(query);
  const mealTypes = await listMealTypes();
  const boards = mealTypes.map((meal) => ({
    code: meal.code as MealPlan,
    label: mealLabel(meal, {
      room_only: t("roomOnly"),
      breakfast: t("breakfastBoard"),
      half_board: t("halfBoard"),
      full_board: t("fullBoard"),
    }),
  }));
  const stay = parseStay(filters.checkIn, filters.checkOut);
  const agency = await currentAgency();
  if (!agency) {
    const next = `/${locale}${catalogHref(filters)}`;
    redirect(`/${locale}/hotels/login?next=${encodeURIComponent(next)}`);
  }
  const listed = await listAgencyCatalog(stay);
  const priced = await withAgencyRates(listed, agency.id, stay);
  const available = stay
    ? priced
        .map((hotel) => ({
          ...hotel,
          rooms: hotel.rooms.filter(
            (room) => room.saleMode === "request" || (room.open ?? 0) > 0,
          ),
        }))
        .filter((hotel) => hotel.rooms.length > 0)
    : priced;
  const hotels = stay ? filterCatalog(available, filters) : [];

  return (
    <section className="section-space">
      <div className="site-shell">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="font-display mt-3 max-w-3xl text-4xl font-bold text-primary md:text-6xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-muted">
          {t("description")}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span>{t("signedIn", { name: agencyPortalName(agency, locale) })}</span>
            <form action={agencySignOutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="font-semibold text-primary underline">
                {t("signOut")}
              </button>
            </form>
          </div>
          <AgencyPortalNav locale={locale} active="hotels" />
        </div>
        <div className="mt-8">
          <HotelCatalog
            key={JSON.stringify(filters)}
            filters={filters}
            views={catalogViews(priced)}
            boards={boards}
            minDate={todayInRiyadh()}
            count={hotels.length}
          >
            <AgencyHotelList
              hotels={hotels}
              filters={filters}
              dated={Boolean(stay)}
              needsDates={!stay}
              datesMiss={Boolean(stay) && available.length === 0}
            />
          </HotelCatalog>
        </div>
      </div>
    </section>
  );
}

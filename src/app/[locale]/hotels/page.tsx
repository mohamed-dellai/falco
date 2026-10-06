import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { agencySignOutAction } from "@/app/[locale]/hotels/agency-actions";
import { AgencyHotelList } from "@/components/agency-hotel-list";
import { HotelCatalog } from "@/components/agency-hotel-browser";
import { Link } from "@/i18n/navigation";
import { localeAlternates, type Locale } from "@/i18n/routing";
import { currentAgency } from "@/lib/agency-auth";
import {
  catalogViews,
  filterCatalog,
  parseCatalogFilters,
  type SearchQuery,
} from "@/lib/hotel-filters";
import { listAgencyCatalog, parseStay, withAgencyRates } from "@/lib/inventory";
import { todayInRiyadh } from "@/lib/money";

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
  const stay = parseStay(filters.checkIn, filters.checkOut);
  const agency = await currentAgency();
  const listed = await listAgencyCatalog(stay);
  const catalog = agency
    ? await withAgencyRates(listed, agency.id, stay)
    : listed;
  const hotels = filterCatalog(catalog, filters);

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
        <div className="mt-6 flex items-center gap-4 text-sm">
          {agency ? (
            <form action={agencySignOutAction} className="flex items-center gap-3">
              <input type="hidden" name="locale" value={locale} />
              <span>{t("signedIn", { name: agency.name })}</span>
              <button type="submit" className="font-semibold text-primary underline">
                {t("signOut")}
              </button>
            </form>
          ) : (
            <Link href="/hotels/login" className="font-semibold text-primary underline">
              {t("signIn")}
            </Link>
          )}
        </div>
        <div className="mt-8">
          <HotelCatalog
            filters={filters}
            views={catalogViews(catalog)}
            minDate={todayInRiyadh()}
            count={hotels.length}
          >
            <AgencyHotelList
              hotels={hotels}
              filters={filters}
              dated={Boolean(stay)}
              datesMiss={Boolean(stay) && catalog.length === 0}
            />
          </HotelCatalog>
        </div>
      </div>
    </section>
  );
}

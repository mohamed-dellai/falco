import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AvailableHotels } from "@/components/available-hotels";
import { FocusResults, StaySearch } from "@/components/stay-search";
import { localeAlternates, type Locale } from "@/i18n/routing";
import { listShowcase, parseStay } from "@/lib/inventory";
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
  searchParams: Promise<{ checkIn?: string; checkOut?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Hotels");
  const search = await getTranslations("Search");
  const stay = parseStay(query.checkIn, query.checkOut);
  const datesAttempted = Boolean(query.checkIn || query.checkOut);
  const hotels = stay ? await listShowcase(stay) : [];
  const minDate = todayInRiyadh();

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
        <StaySearch
          key={`${query.checkIn ?? ""}:${query.checkOut ?? ""}`}
          pathname="/hotels"
          minDate={minDate}
          checkIn={query.checkIn}
          checkOut={query.checkOut}
        />
        <div id="availability" className="scroll-mt-24">
          <FocusResults
            token={stay ? `${stay.checkIn}:${stay.checkOut}` : ""}
          />
          {stay ? (
            <>
              <p className="mt-6 text-sm font-bold text-muted">
                {stay.checkIn} → {stay.checkOut} ·{" "}
                {search("nights", { count: stay.nights })}
              </p>
              <AvailableHotels
                hotels={hotels}
                checkIn={stay.checkIn}
                checkOut={stay.checkOut}
              />
            </>
          ) : (
            <p className="mt-6 max-w-xl text-base leading-8 text-muted">
              {datesAttempted ? search("dates") : search("prompt")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

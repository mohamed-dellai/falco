import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FocusResults, StaySearch } from "@/components/stay-search";
import { PublicStay } from "@/components/public-stay";
import { localeAlternates, type Locale } from "@/i18n/routing";
import { listPublicStay, parseStay } from "@/lib/inventory";
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
    title: t("stayTitle"),
    description: t("stayDescription"),
    alternates: {
      canonical: `/${locale}/stay`,
      languages: localeAlternates("/stay"),
    },
  };
}

export default async function StayPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Traveller");
  const search = await getTranslations("Search");
  const stay = parseStay(query.checkIn, query.checkOut);
  const datesAttempted = Boolean(query.checkIn || query.checkOut);
  const hotels = stay ? await listPublicStay(stay) : [];

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
          pathname="/stay"
          minDate={todayInRiyadh()}
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
              <PublicStay
                hotels={hotels}
                checkIn={stay.checkIn}
                checkOut={stay.checkOut}
                nights={stay.nights}
              />
            </>
          ) : (
            <p className="mt-6 max-w-xl text-base leading-8 text-muted">
              {datesAttempted ? search("dates") : t("prompt")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

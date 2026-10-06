import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AvailableHotels } from "@/components/available-hotels";
import { LandingPage } from "@/components/landing-page";
import { StaySearch } from "@/components/stay-search";
import { localeAlternates, routing, type Locale } from "@/i18n/routing";
import { listShowcase, parseStay } from "@/lib/inventory";
import { todayInRiyadh } from "@/lib/money";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
    alternates: {
      canonical: `/${locale}/agent`,
      languages: localeAlternates("/agent"),
    },
  };
}

export default async function AgencyLandingPage({
  params,
  searchParams,
}: PageProps) {
  const { locale: requestedLocale } = await params;
  if (!hasLocale(routing.locales, requestedLocale)) notFound();
  const locale = requestedLocale as Locale;
  setRequestLocale(locale);
  const query = await searchParams;
  const stay = parseStay(query.checkIn, query.checkOut);
  const hotels = stay ? await listShowcase(stay) : [];

  return (
    <LandingPage
      namespace="Home"
      locale={locale}
      path="/agent"
      stepsHref="/contact"
      stay={stay}
      datesAttempted={Boolean(query.checkIn || query.checkOut)}
      search={
        <StaySearch
          key={`${query.checkIn ?? ""}:${query.checkOut ?? ""}`}
          pathname="/hotels"
          minDate={todayInRiyadh()}
          checkIn={query.checkIn}
          checkOut={query.checkOut}
          variant="bar"
        />
      }
      results={
        stay ? (
          <AvailableHotels
            hotels={hotels}
            checkIn={stay.checkIn}
            checkOut={stay.checkOut}
          />
        ) : null
      }
    />
  );
}

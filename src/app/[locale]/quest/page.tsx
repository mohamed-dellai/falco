import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { PublicStay } from "@/components/public-stay";
import { StaySearch } from "@/components/stay-search";
import { localeAlternates, routing, type Locale } from "@/i18n/routing";
import { listPublicStay, parseStay } from "@/lib/inventory";
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
    title: t("stayTitle"),
    description: t("stayDescription"),
    alternates: {
      canonical: `/${locale}/quest`,
      languages: localeAlternates("/quest"),
    },
  };
}

export default async function TravelerLandingPage({
  params,
  searchParams,
}: PageProps) {
  const { locale: requestedLocale } = await params;
  if (!hasLocale(routing.locales, requestedLocale)) notFound();
  const locale = requestedLocale as Locale;
  setRequestLocale(locale);
  const query = await searchParams;
  const stay = parseStay(query.checkIn, query.checkOut);
  const hotels = stay ? await listPublicStay(stay) : [];
  const t = await getTranslations("ClientHome");

  return (
    <LandingPage
      namespace="ClientHome"
      locale={locale}
      path="/quest"
      stepsHref="#room-search"
      stay={stay}
      datesAttempted={Boolean(query.checkIn || query.checkOut)}
      search={
        <StaySearch
          key={`${query.checkIn ?? ""}:${query.checkOut ?? ""}`}
          pathname="/quest"
          minDate={todayInRiyadh()}
          checkIn={query.checkIn}
          checkOut={query.checkOut}
          variant="bar"
          title={t("searchTitle")}
          hint={t("searchHint")}
        />
      }
      results={
        stay ? (
          <PublicStay
            hotels={hotels}
            checkIn={stay.checkIn}
            checkOut={stay.checkOut}
            nights={stay.nights}
          />
        ) : null
      }
    />
  );
}

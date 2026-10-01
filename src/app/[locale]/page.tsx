import type { Metadata } from "next";
import Image from "next/image";
import {
  BadgeDollarSign,
  BedDouble,
  CalendarRange,
  ChevronRight,
} from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AvailableHotels } from "@/components/available-hotels";
import { FocusResults, StaySearch } from "@/components/stay-search";
import { Link } from "@/i18n/navigation";
import { localeAlternates, routing, type Locale } from "@/i18n/routing";
import { listShowcase, parseStay } from "@/lib/inventory";
import { todayInRiyadh } from "@/lib/money";
import { siteConfig } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string }>;
};

const destinations = [
  {
    key: "makkah",
    image: "/marketing/makkah.jpg",
    position: "object-center",
  },
  {
    key: "madinah",
    image: "/marketing/madinah.jpg",
    position: "object-center",
  },
  {
    key: "jeddah",
    image: "/marketing/jeddah.jpg",
    position: "object-center",
  },
] as const;

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
      canonical: `/${locale}`,
      languages: localeAlternates(),
    },
  };
}

export default async function HomePage({ params, searchParams }: PageProps) {
  const { locale: requestedLocale } = await params;
  if (!hasLocale(routing.locales, requestedLocale)) notFound();
  const locale = requestedLocale as Locale;
  setRequestLocale(locale);
  const query = await searchParams;
  const stay = parseStay(query.checkIn, query.checkOut);
  const datesAttempted = Boolean(query.checkIn || query.checkOut);
  const minDate = todayInRiyadh();

  const t = await getTranslations("Home");
  const search = await getTranslations("Search");
  const common = await getTranslations("Common");
  const hotels = stay ? await listShowcase(stay) : [];
  const steps = [
    [t("stepOne"), t("stepOneCopy")],
    [t("stepTwo"), t("stepTwoCopy")],
    [t("stepThree"), t("stepThreeCopy")],
  ] as const;
  const benefits = [
    {
      icon: CalendarRange,
      title: t("dateBenefitTitle"),
      copy: t("dateBenefitCopy"),
    },
    {
      icon: BedDouble,
      title: t("quantityBenefitTitle"),
      copy: t("quantityBenefitCopy"),
    },
    {
      icon: BadgeDollarSign,
      title: t("rateBenefitTitle"),
      copy: t("rateBenefitCopy"),
    },
  ] as const;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const formatDate = (date: string) =>
    dateFormatter.format(new Date(`${date}T00:00:00Z`));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Falco Services",
    url: `${siteConfig.url}/${locale}`,
    areaServed: ["Makkah", "Madinah", "Jeddah"],
    description: t("subtitle"),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="home-hero relative overflow-hidden bg-primary-dark text-white">
        <div className="home-hero-visual">
          <Image
            src="/marketing/haram.jpg"
            alt={t("heroAlt")}
            fill
            priority
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="hero-drift object-cover object-center"
          />
          <div className="hero-scrim absolute inset-0" />
          <div className="hero-location absolute bottom-5 end-5 hidden items-center gap-2 rounded-full border border-white/20 bg-primary-dark/75 px-3 py-2 text-xs font-bold text-white backdrop-blur-md lg:flex">
            <span className="size-1.5 rounded-full bg-gold" />
            {t("heroLocation")}
          </div>
        </div>

        <div className="site-shell relative flex min-h-[calc(100svh-5rem)] items-center py-12 md:py-16 lg:min-h-[46rem] lg:py-20">
          <div className="home-hero-copy relative z-10 w-full">
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="font-display mt-4 max-w-3xl text-[2.65rem] font-bold leading-[1.06] tracking-[-0.03em] sm:text-5xl md:text-6xl lg:text-[4.6rem]">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/[0.82] md:text-lg">
              {t("subtitle")}
            </p>
            <p className="mt-5 flex items-center gap-2 text-sm font-bold text-white">
              <span className="size-2 rounded-full bg-gold" />
              {t("audience")}
            </p>

            <div>
              <StaySearch
                key={`${query.checkIn ?? ""}:${query.checkOut ?? ""}`}
                pathname="/"
                minDate={minDate}
                checkIn={query.checkIn}
                checkOut={query.checkOut}
                variant="bar"
              />
            </div>

            <a
              href="#how-it-works"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-white/80 transition hover:text-white"
            >
              {t("heroSecondary")}
              <ChevronRight
                aria-hidden="true"
                className="directional-icon"
                size={17}
              />
            </a>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="agency-benefits"
        className="border-b border-line bg-white"
      >
        <h2 id="agency-benefits" className="sr-only">
          {t("benefitsTitle")}
        </h2>
        <div className="site-shell grid md:grid-cols-3">
          {benefits.map(({ icon: Icon, title, copy }) => (
            <article
              key={title}
              className="flex gap-4 border-b border-line py-6 last:border-b-0 md:border-b-0 md:border-e md:px-7 md:first:ps-0 md:last:border-e-0 md:last:pe-0"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/[0.08] text-primary">
                <Icon aria-hidden="true" size={21} strokeWidth={1.8} />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {(stay || datesAttempted) && (
        <section id="availability" className="section-space scroll-mt-24">
          <div className="site-shell">
            <FocusResults
              token={stay ? `${stay.checkIn}:${stay.checkOut}` : ""}
            />
            <p className="eyebrow">{t("availableEyebrow")}</p>
            <h2 className="font-display mt-3 max-w-3xl text-4xl font-bold text-primary md:text-5xl">
              {t("availableTitle")}
            </h2>
            {stay ? (
              <>
                <p className="mt-4 text-sm font-bold text-muted">
                  {formatDate(stay.checkIn)} – {formatDate(stay.checkOut)}
                  <span className="mx-2 text-gold">•</span>
                  {search("nights", { count: stay.nights })}
                </p>
                <AvailableHotels
                  hotels={hotels}
                  checkIn={stay.checkIn}
                  checkOut={stay.checkOut}
                />
              </>
            ) : (
              <div className="mt-6 max-w-2xl rounded-2xl border border-line bg-white p-5 text-sm font-bold text-red-800">
                {search("dates")}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="bg-ink text-white">
        <div className="site-shell max-w-4xl pb-9 pt-16 md:pb-11 md:pt-20">
          <p className="eyebrow">{t("coverageEyebrow")}</p>
          <h2 className="font-display mt-3 text-3xl font-bold leading-tight md:text-5xl">
            {t("coverageTitle")}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-white/[0.65]">
            {t("coverageIntro")}
          </p>
        </div>
        <div className="grid md:grid-cols-3">
          {destinations.map((destination) => (
            <article
              key={destination.key}
              className="group relative h-80 overflow-hidden md:h-[32rem]"
            >
              <Image
                src={destination.image}
                alt={t(`${destination.key}Alt`)}
                fill
                sizes="(min-width: 768px) 34vw, 100vw"
                className={`${destination.position} object-cover transition duration-700 motion-safe:group-hover:scale-[1.04]`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                <h3 className="font-display text-2xl font-bold md:text-3xl">
                  {common(destination.key)}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-white/80">
                  {t(`${destination.key}Copy`)}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="section-space scroll-mt-24">
        <div className="site-shell grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-primary-dark">
            <Image
              src="/marketing/tawaf.jpg"
              alt={t("tawafAlt")}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover object-center"
            />
          </div>
          <div>
            <p className="eyebrow">{t("stepsEyebrow")}</p>
            <h2 className="font-display mt-3 max-w-xl text-4xl font-bold leading-tight text-primary md:text-5xl">
              {t("stepsTitle")}
            </h2>
            <ol className="mt-10 border-s border-gold/60">
              {steps.map(([title, copy], index) => (
                <li key={title} className="py-5 ps-6">
                  <p className="text-xs font-bold tracking-[0.16em] text-gold">
                    0{index + 1}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-ink">{title}</h3>
                  <p className="mt-2 max-w-lg text-sm leading-7 text-muted">
                    {copy}
                  </p>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex flex-col items-start gap-4 border-t border-line pt-7 sm:flex-row sm:items-center">
              <Link
                href="/contact"
                className="inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark"
              >
                {t("stepsCta")}
              </Link>
              <p className="max-w-sm text-sm leading-6 text-muted">
                {t("stepsNote")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative min-h-[30rem] overflow-hidden bg-primary-dark text-white">
        <Image
          src="/marketing/madinah.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[center_35%]"
        />
        <div className="absolute inset-0 bg-primary-dark/[0.78]" />
        <div className="site-shell relative flex min-h-[30rem] flex-col justify-center py-16">
          <p className="eyebrow">{t("closeEyebrow")}</p>
          <h2 className="font-display mt-3 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            {t("closeTitle")}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-8 text-white/75">
            {t("closeCopy")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#room-search"
              className="inline-flex w-fit rounded-lg bg-gold px-5 py-3 text-sm font-bold text-ink transition hover:bg-gold-light"
            >
              {t("closeCta")}
            </a>
            <Link
              href="/contact"
              className="inline-flex w-fit rounded-lg border border-white/30 bg-white/[0.08] px-5 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/[0.15]"
            >
              {t("closeSecondary")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { MapPinned, Users } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import {
  PackageCard,
  SectionHeading,
  ServicesGrid,
} from "@/components/marketing";
import { faqs, localize, packages } from "@/content/site";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: string }>;
};

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
      languages: { en: "/en", ar: "/ar" },
    },
  };
}

export default async function HomePage({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  if (!hasLocale(routing.locales, requestedLocale)) notFound();
  const locale = requestedLocale as Locale;
  setRequestLocale(locale);

  const t = await getTranslations("Home");
  const common = await getTranslations("Common");

  const metrics = [
    { value: t("locationValue"), label: t("locationLabel"), icon: MapPinned },
    { value: t("clientsValue"), label: t("clientsLabel"), icon: Users },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
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

      <section className="relative min-h-[650px] overflow-hidden bg-primary-dark text-white">
        <Image
          src="https://lh3.googleusercontent.com/aida/AEtjO1UzeNA4wDm_h9ZzKXXS1GVyDwCPVOmAa_Ng-Mrync_DrhPNzdMMdxXUB7HUM0VqKdx3nkraTMOX41GZUPY1l08km3A2rNmVZZylqo82gcxR4qHQ0gjss9_aLX83KaVnLGm-iUfW-7YxIMzlsRLDJbSx73TH8Y7lZewFxE4scOiBUaaZhZOiohCjwlEG0HeZaS3ZZ73QB3iNhe1XC9WTsutazXna_lpsgb1xDJ3XRbVo5mcbp6ze1kf0xCA"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-drift object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-dark via-primary-dark/70 to-black/25" />
        <div className="site-shell relative flex min-h-[650px] items-end pb-16 pt-28 md:pb-24">
          <div className="max-w-3xl">
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="font-display mt-3 text-4xl font-bold leading-[1.08] tracking-tight md:text-7xl">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-blue-50/90 md:text-lg">
              {t("subtitle")}
            </p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
              <Link
                href="/packages"
                className="rounded-lg bg-primary px-5 py-4 text-center text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-blue-700"
              >
                {t("pilgrimCta")}
              </Link>
              <Link
                href="/agencies"
                className="rounded-lg bg-gold px-5 py-4 text-center text-sm font-bold text-ink transition hover:bg-amber-500"
              >
                {t("agencyCta")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface-low py-8">
        <div className="site-shell">
          <p className="mb-5 text-xs font-extrabold uppercase tracking-wider text-muted">
            {t("metricsTitle")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-line bg-white p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="font-display text-2xl text-primary">
                    {metric.value}
                  </strong>
                  <metric.icon className="text-gold" size={21} />
                </div>
                <span className="mt-2 block text-xs text-muted">
                  {metric.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="site-shell">
          <SectionHeading
            eyebrow={t("servicesEyebrow")}
            title={t("servicesTitle")}
            copy={t("servicesCopy")}
          />
          <ServicesGrid locale={locale} />
          <Link
            href="/services"
            className="mt-8 inline-flex rounded-lg border border-primary px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary hover:text-white"
          >
            {common("learnMore")}
          </Link>
        </div>
      </section>

      <section className="section-space bg-surface-low">
        <div className="site-shell">
          <SectionHeading
            eyebrow={t("packagesEyebrow")}
            title={t("packagesTitle")}
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {packages.map((item) => (
              <PackageCard key={item.slug} item={item} locale={locale} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/packages"
              className="inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white"
            >
              {common("viewDetails")}
            </Link>
          </div>
        </div>
      </section>

      <section className="section-space bg-primary-dark text-white">
        <div className="site-shell grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="eyebrow">{t("agencyEyebrow")}</p>
            <h2 className="font-display mt-3 text-3xl font-bold md:text-5xl">
              {t("agencyTitle")}
            </h2>
            <p className="mt-5 max-w-xl leading-8 text-blue-100/80">
              {t("agencyCopy")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/agencies"
                className="rounded-lg bg-gold px-5 py-3 text-center text-sm font-bold text-ink"
              >
                {t("agencyPrimary")}
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-white/20 bg-white/5 px-5 py-3 text-center text-sm font-bold text-white"
              >
                {t("agencySecondary")}
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["hotel", "transport", "ziyara", "support"].map((item, index) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <span className="font-display text-3xl font-bold text-gold">
                  0{index + 1}
                </span>
                <p className="mt-2 text-sm text-blue-100/80">
                  {
                    [
                      common("makkah"),
                      common("madinah"),
                      common("jeddah"),
                      t("support"),
                    ][index]
                  }
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="site-shell">
          <SectionHeading eyebrow={t("faqEyebrow")} title={t("faqTitle")} />
          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            {faqs.map((faq) => (
              <details
                key={faq.question.en}
                className="group rounded-xl border border-line bg-white p-5"
              >
                <summary className="cursor-pointer list-none font-bold text-primary">
                  {localize(faq.question, locale)}
                </summary>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {localize(faq.answer, locale)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

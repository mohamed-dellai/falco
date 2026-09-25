import type { Metadata } from "next";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getPackage, localize, packages } from "@/content/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: Locale; slug: string }>;
};

export function generateStaticParams() {
  return packages.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const item = getPackage(slug);
  if (!item) return {};

  return {
    title: localize(item.title, locale),
    description: localize(item.summary, locale),
    alternates: {
      canonical: `/${locale}/packages/${slug}`,
      languages: {
        en: `/en/packages/${slug}`,
        ar: `/ar/packages/${slug}`,
      },
    },
  };
}

export default async function PackageDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const item = getPackage(slug);
  if (!item) notFound();

  const t = await getTranslations("PackageDetail");
  const common = await getTranslations("Common");
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  return (
    <>
      <section className="relative min-h-[480px] overflow-hidden bg-primary-dark text-white">
        <Image
          src={item.image}
          alt={localize(item.title, locale)}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-dark via-primary-dark/70 to-black/20" />
        <div className="site-shell relative flex min-h-[480px] items-end py-16">
          <div className="max-w-3xl">
            <Link
              href="/packages"
              className="inline-flex items-center gap-2 text-sm font-bold text-gold-light"
            >
              <BackIcon size={17} />
              {common("backToPackages")}
            </Link>
            <h1 className="font-display mt-5 text-4xl font-bold md:text-6xl">
              {localize(item.title, locale)}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-blue-50/85">
              {localize(item.description, locale)}
            </p>
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="site-shell grid gap-10 lg:grid-cols-[1fr_340px]">
          <div>
            <h2 className="font-display text-3xl font-bold text-primary">
              {t("included")}
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {item.features.map((feature) => (
                <div
                  key={feature.en}
                  className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 text-sm text-muted"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold-light/50 text-gold">
                    <Check size={16} />
                  </span>
                  {localize(feature, locale)}
                </div>
              ))}
            </div>

            <h2 className="font-display mt-14 text-3xl font-bold text-primary">
              {t("itinerary")}
            </h2>
            <ol className="mt-6 grid gap-4">
              {item.journeySteps.map((step, index) => (
                <li
                  key={step.title.en}
                  className="grid gap-4 rounded-xl border border-line bg-white p-5 sm:grid-cols-[48px_1fr]"
                >
                  <span className="font-display text-2xl font-bold text-gold">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-primary">
                      {localize(step.title, locale)}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-muted">
                      {localize(step.copy, locale)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <aside className="h-fit rounded-2xl border border-line bg-surface-low p-6 lg:sticky lg:top-28">
            <p className="font-display text-2xl font-bold text-primary">
              {t("tailoredTitle")}
            </p>
            <p className="mt-4 text-sm leading-7 text-muted">
              {t("customize")}
            </p>
            <Link
              href={`/contact?package=${item.slug}`}
              className="mt-6 inline-flex w-full justify-center rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white"
            >
              {t("request")}
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}

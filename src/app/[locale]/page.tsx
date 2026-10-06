import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { localeAlternates, routing, type Locale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("gateTitle"),
    description: t("gateDescription"),
    alternates: {
      canonical: `/${locale}`,
      languages: localeAlternates(),
    },
  };
}

const doorClass =
  "flex min-h-64 flex-col justify-center rounded-[2rem] px-8 py-10 transition sm:min-h-0 sm:px-10";

export default async function GatePage({ params }: PageProps) {
  const { locale: requestedLocale } = await params;
  if (!hasLocale(routing.locales, requestedLocale)) notFound();
  const locale = requestedLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("Gate");

  return (
    <section className="flex min-h-[calc(100svh-5rem)] flex-col bg-primary-dark text-white">
      <div className="site-shell flex flex-1 flex-col justify-center py-8 sm:py-10">
        <h1 className="font-display max-w-4xl text-4xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
          {t("title")}
        </h1>
        <div className="mt-8 grid flex-1 grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2">
          <Link
            href="/agent"
            className={`${doorClass} bg-gold text-ink hover:bg-gold-light`}
          >
            <span className="font-display text-4xl font-bold leading-tight sm:text-5xl">
              {t("agencyTitle")}
            </span>
            <span className="mt-4 max-w-sm text-base leading-7 text-ink/80">
              {t("agencyCopy")}
            </span>
          </Link>
          <Link
            href="/quest"
            className={`${doorClass} bg-white text-primary hover:bg-gold-light hover:text-ink`}
          >
            <span className="font-display text-4xl font-bold leading-tight sm:text-5xl">
              {t("travelerTitle")}
            </span>
            <span className="mt-4 max-w-sm text-base leading-7 text-primary/75">
              {t("travelerCopy")}
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

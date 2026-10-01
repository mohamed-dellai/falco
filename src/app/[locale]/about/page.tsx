import type { Metadata } from "next";
import Image from "next/image";
import { MapPin, Target } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("aboutTitle"),
    alternates: {
      canonical: `/${locale}/about`,
      languages: localeAlternates("/about"),
    },
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("About");
  const common = await getTranslations("Common");

  return (
    <section className="section-space">
      <div className="site-shell">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-primary md:text-6xl">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted">
              {t("description")}
            </p>
          </div>
          <div className="mx-auto w-full max-w-sm rounded-3xl border border-line bg-white p-7">
            <Image
              src="/falco-logo.png"
              alt={common("brand")}
              width={320}
              height={320}
              className="h-auto w-full rounded-2xl"
              priority
            />
          </div>
        </div>

        <div className="mt-16 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-line bg-white p-7">
            <Target className="text-gold" size={28} />
            <h2 className="font-display mt-5 text-2xl font-bold text-primary">
              {t("missionTitle")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">{t("mission")}</p>
          </article>
          <article className="rounded-2xl border border-gold/30 bg-gold-light/20 p-7">
            <MapPin className="text-gold" size={28} />
            <h2 className="font-display mt-5 text-2xl font-bold text-primary">
              {t("locationTitle")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              {siteConfig.company.address[locale]}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

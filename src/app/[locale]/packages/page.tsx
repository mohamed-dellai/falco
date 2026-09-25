import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PackageExplorer } from "@/components/package-explorer";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("packagesTitle"),
    alternates: {
      canonical: `/${locale}/packages`,
      languages: { en: "/en/packages", ar: "/ar/packages" },
    },
  };
}

export default async function PackagesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Packages");

  return (
    <section className="section-space">
      <div className="site-shell">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="font-display mt-3 max-w-3xl text-4xl font-bold tracking-tight text-primary md:text-6xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-muted">
          {t("description")}
        </p>
        <PackageExplorer />
      </div>
    </section>
  );
}

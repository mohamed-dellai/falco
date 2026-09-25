import type { Metadata } from "next";
import { Building2, Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgencyForm } from "@/components/forms";
import { agencyBenefits, localize } from "@/content/site";
import type { Locale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: Locale }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("agenciesTitle"),
    alternates: {
      canonical: `/${locale}/agencies`,
      languages: { en: "/en/agencies", ar: "/ar/agencies" },
    },
  };
}

export default async function AgenciesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Agencies");

  return (
    <>
      <section className="section-space bg-primary-dark text-white">
        <div className="site-shell grid items-center gap-10 lg:grid-cols-[1fr_0.75fr]">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="font-display mt-3 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
              {t("title")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-blue-100/80">
              {t("description")}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
            <Building2 className="text-gold" size={34} />
            <p className="mt-5 text-sm leading-7 text-blue-100/80">
              {t("operationsLabel")}
            </p>
            <p className="font-display mt-2 text-2xl font-bold">
              {t("benefitsTitle")}
            </p>
          </div>
        </div>
      </section>

      <section className="section-space">
        <div className="site-shell">
          <h2 className="font-display text-3xl font-bold text-primary md:text-5xl">
            {t("benefitsTitle")}
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {agencyBenefits.map((benefit) => (
              <article
                key={benefit.title.en}
                className="card-lift rounded-2xl border border-line bg-white p-6"
              >
                <Check className="text-gold" size={22} />
                <h3 className="font-display mt-4 text-xl font-bold text-primary">
                  {localize(benefit.title, locale)}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted">
                  {localize(benefit.copy, locale)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-space bg-surface-low">
        <div className="site-shell grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h2 className="font-display mt-3 text-3xl font-bold text-primary md:text-5xl">
              {t("formTitle")}
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted">{t("formCopy")}</p>
          </div>
          <AgencyForm />
        </div>
      </section>
    </>
  );
}

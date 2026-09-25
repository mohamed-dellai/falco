import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SectionHeading, ServicesGrid } from "@/components/marketing";
import { Link } from "@/i18n/navigation";
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
    title: t("servicesTitle"),
    alternates: {
      canonical: `/${locale}/services`,
      languages: { en: "/en/services", ar: "/ar/services" },
    },
  };
}

export default async function ServicesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Services");
  const common = await getTranslations("Common");

  const steps = [
    { title: t("stepOne"), copy: t("stepOneCopy") },
    { title: t("stepTwo"), copy: t("stepTwoCopy") },
    { title: t("stepThree"), copy: t("stepThreeCopy") },
  ];

  return (
    <>
      <section className="section-space">
        <div className="site-shell">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            copy={t("description")}
          />
          <ServicesGrid locale={locale} />
        </div>
      </section>

      <section className="section-space bg-primary-dark text-white">
        <div className="site-shell">
          <p className="eyebrow">{t("processEyebrow")}</p>
          <h2 className="font-display mt-3 text-3xl font-bold md:text-5xl">
            {t("processTitle")}
          </h2>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <span className="font-display text-3xl font-bold text-gold">
                  0{index + 1}
                </span>
                <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-blue-100/75">
                  {step.copy}
                </p>
              </article>
            ))}
          </div>
          <Link
            href="/contact"
            className="mt-8 inline-flex rounded-lg bg-gold px-6 py-3 text-sm font-bold text-ink"
          >
            {common("quote")}
          </Link>
        </div>
      </section>
    </>
  );
}

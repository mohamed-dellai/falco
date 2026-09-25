import type { Metadata } from "next";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { QuoteForm } from "@/components/forms";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

type PageProps = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ package?: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("contactTitle"),
    alternates: {
      canonical: `/${locale}/contact`,
      languages: { en: "/en/contact", ar: "/ar/contact" },
    },
  };
}

export default async function ContactPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");
  const agencies = await getTranslations("Agencies");

  const steps = [t("responseOne"), t("responseTwo"), t("responseThree")];

  return (
    <section className="section-space">
      <div className="site-shell">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="font-display mt-3 max-w-4xl text-4xl font-bold tracking-tight text-primary md:text-6xl">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-muted">
          {t("description")}
        </p>

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-line bg-surface-low p-6">
              <h2 className="font-display text-2xl font-bold text-primary">
                {t("responseTitle")}
              </h2>
              <ol className="mt-5 grid gap-4">
                {steps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm text-muted">
                    <span className="font-display font-bold text-gold">
                      0{index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-line bg-white p-6">
              <h2 className="font-display text-2xl font-bold text-primary">
                {t("directTitle")}
              </h2>
              <div className="mt-5 grid gap-4 text-sm text-muted">
                <a
                  href={`tel:+${siteConfig.whatsapp}`}
                  className="flex items-start gap-3 hover:text-primary"
                >
                  <Phone className="mt-0.5 shrink-0 text-gold" size={18} />
                  {siteConfig.phoneDisplay}
                </a>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="flex items-start gap-3 hover:text-primary"
                >
                  <Mail className="mt-0.5 shrink-0 text-gold" size={18} />
                  {siteConfig.email}
                </a>
                <p className="flex items-start gap-3">
                  <MapPin className="mt-0.5 shrink-0 text-gold" size={18} />
                  {siteConfig.company.address[locale]}
                </p>
              </div>
            </div>
            <Link
              href="/agencies"
              className="flex items-center gap-3 rounded-2xl bg-primary-dark p-6 text-white"
            >
              <Building2 className="shrink-0 text-gold" size={25} />
              <span>
                <strong className="block">{t("agencyForm")}</strong>
                <small className="mt-1 block text-blue-100/70">
                  {agencies("formCopy")}
                </small>
              </span>
            </Link>
          </div>
          <div>
            <h2 className="font-display mb-5 text-2xl font-bold text-primary">
              {t("travellerForm")}
            </h2>
            <QuoteForm packageSlug={query.package ?? ""} />
          </div>
        </div>
      </div>
    </section>
  );
}

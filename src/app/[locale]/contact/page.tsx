import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { QuoteForm } from "@/components/forms";
import { localeAlternates, type Locale } from "@/i18n/routing";
import { getHotel, getRoom, parseStay } from "@/lib/inventory";
import { getCompanyProfile } from "@/lib/company";

type PageProps = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    hotel?: string;
    room?: string;
    checkIn?: string;
    checkOut?: string;
    rooms?: string;
  }>;
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
      languages: localeAlternates("/contact"),
    },
  };
}

export default async function ContactPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Contact");
  const company = await getCompanyProfile();
  const hotel = query.hotel ? await getHotel(query.hotel) : null;
  const room = query.room ? await getRoom(query.room) : null;
  const requestedRoom = [hotel?.name, room?.name].filter(Boolean).join(" — ");
  const stay = parseStay(query.checkIn, query.checkOut);
  const requestedRooms = Number(query.rooms);
  const roomCount =
    Number.isInteger(requestedRooms) &&
    requestedRooms >= 1 &&
    requestedRooms <= 500
      ? requestedRooms
      : 1;

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
                  href={`tel:+${company.whatsapp}`}
                  className="flex items-start gap-3 hover:text-primary"
                >
                  <Phone className="mt-0.5 shrink-0 text-gold" size={18} />
                  {company.phoneDisplay}
                </a>
                <a
                  href={`mailto:${company.email}`}
                  className="flex items-start gap-3 hover:text-primary"
                >
                  <Mail className="mt-0.5 shrink-0 text-gold" size={18} />
                  {company.email}
                </a>
                <p className="flex items-start gap-3">
                  <MapPin className="mt-0.5 shrink-0 text-gold" size={18} />
                  {company.address[locale]}
                </p>
                {company.legalName && (
                  <p>{company.legalName}</p>
                )}
                {company.commercialRegistration && (
                  <p>
                    {t("commercialRegistration")}: {company.commercialRegistration}
                  </p>
                )}
                {company.vatNumber && (
                  <p>
                    {t("vatNumber")}: {company.vatNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div>
            <h2 className="font-display mb-5 text-2xl font-bold text-primary">
              {t("travellerForm")}
            </h2>
            {requestedRoom && (
              <p className="mb-4 text-sm font-bold text-primary">
                {requestedRoom}
              </p>
            )}
            <QuoteForm
              packageSlug={requestedRoom}
              arrival={stay?.checkIn ?? ""}
              departure={stay?.checkOut ?? ""}
              roomCount={roomCount}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

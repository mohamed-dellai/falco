import Image from "next/image";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getWhatsAppUrl, siteConfig } from "@/lib/site";

export async function SiteFooter() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Footer");
  const common = await getTranslations("Common");
  const nav = await getTranslations("Nav");

  return (
    <footer className="bg-primary-dark text-white">
      <div className="site-shell grid gap-10 py-12 md:grid-cols-[1.2fr_0.8fr_1fr]">
        <div>
          <Image
            src="/falco-logo.png"
            width={88}
            height={88}
            alt={common("brand")}
            className="size-22 rounded-2xl bg-white object-cover"
          />
          <h2 className="font-display mt-4 text-xl font-bold">
            {common("brand")}
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-7 text-blue-100/80">
            {t("summary")}
          </p>
        </div>

        <nav className="grid content-start gap-3 text-sm text-blue-100/80">
          <strong className="text-white">{nav("home")}</strong>
          <Link href="/packages" className="hover:text-gold">
            {nav("packages")}
          </Link>
          <Link href="/services" className="hover:text-gold">
            {nav("services")}
          </Link>
          <Link href="/agencies" className="hover:text-gold">
            {nav("agencies")}
          </Link>
          <Link href="/contact" className="hover:text-gold">
            {nav("contact")}
          </Link>
        </nav>

        <div className="space-y-4 text-sm">
          <strong className="block text-white">{t("coverage")}</strong>
          <p className="flex gap-2 text-blue-100/80">
            <MapPin className="mt-0.5 shrink-0 text-gold" size={17} />
            {siteConfig.company.address[locale]}
          </p>
          <a
            href={`mailto:${siteConfig.email}`}
            className="flex gap-2 text-blue-100/80 hover:text-gold"
          >
            <Mail className="shrink-0 text-gold" size={17} />
            {siteConfig.email}
          </a>
          <a
            href={`tel:+${siteConfig.whatsapp}`}
            className="flex gap-2 text-blue-100/80 hover:text-gold"
          >
            <Phone className="shrink-0 text-gold" size={17} />
            {siteConfig.phoneDisplay}
          </a>
          <a
            href={getWhatsAppUrl()}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-3 font-bold text-ink"
          >
            <MessageCircle size={17} />
            {common("whatsapp")}
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="site-shell py-5">
          <span className="text-xs text-blue-100/60">
            {t("rights", { year: new Date().getFullYear() })}
          </span>
        </div>
      </div>
    </footer>
  );
}

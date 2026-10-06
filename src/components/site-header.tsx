"use client";

import Image from "next/image";
import { Menu, MessageCircle, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import {
  sectionHome,
  sectionLinks,
  usePublicSection,
} from "@/components/public-section";

const languages: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
  { value: "fr", label: "Français" },
  { value: "it", label: "Italiano" },
];

export function SiteHeader({
  companyName,
  whatsappHref,
}: {
  companyName: string;
  whatsappHref: string;
}) {
  const t = useTranslations("Nav");
  const common = useTranslations("Common");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const section = usePublicSection();
  const homeHref = sectionHome(section);
  const navigation = sectionLinks(section);
  const [open, setOpen] = useState(false);

  function switchLanguage(nextLocale: Locale) {
    setOpen(false);
    const current = new URL(window.location.href);
    const segments = current.pathname.split("/");
    if ((routing.locales as readonly string[]).includes(segments[1] ?? "")) {
      segments.splice(1, 1);
    }
    const path = `${segments.join("/") || "/"}${current.search}${current.hash}`;
    router.replace(path, { locale: nextLocale });
  }

  function isActive(href: string) {
    const path = pathname.split(/[?#]/)[0] || "/";
    return path === href || path.startsWith(`${href}/`);
  }

  if (section === "gate") {
    return (
      <header className="fixed inset-x-0 top-0 z-50 bg-primary-dark">
        <div className="site-shell flex h-20 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <Image
              src="/falco-logo.png"
              width={56}
              height={56}
              alt={companyName}
              className="size-12 rounded-xl bg-white object-cover"
              priority
            />
            <strong className="font-display truncate text-base text-white">
              {companyName}
            </strong>
          </div>
          <select
            value={locale}
            aria-label={t("language")}
            dir="ltr"
            onChange={(event) => switchLanguage(event.target.value as Locale)}
            className="w-28 rounded-full border border-white/20 bg-white px-3 py-2 text-xs font-extrabold text-primary outline-none sm:w-auto"
          >
            {languages.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/80 bg-surface/95 backdrop-blur-xl">
      <div className="site-shell flex h-20 items-center justify-between gap-4">
        <Link href={homeHref} className="flex min-w-0 items-center gap-2">
          <Image
            src="/falco-logo.png"
            width={56}
            height={56}
            alt={companyName}
            className="size-14 rounded-xl bg-white object-cover"
            priority
          />
          <span className="hidden leading-tight sm:block">
            <strong className="font-display block text-base text-primary">
              {companyName}
            </strong>
            <span className="block text-xs font-bold text-gold">
              {common("tagline")}
            </span>
          </span>
        </Link>

        <nav
          aria-label={t("primary")}
          className="hidden items-center gap-6 text-sm font-bold text-muted lg:flex"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`relative py-2 transition-colors after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-center after:bg-gold after:transition-transform hover:text-primary ${
                isActive(item.href)
                  ? "text-primary after:scale-x-100"
                  : "after:scale-x-0"
              }`}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <select
            value={locale}
            aria-label={t("language")}
            dir="ltr"
            onChange={(event) => switchLanguage(event.target.value as Locale)}
            className="w-28 rounded-full border border-line bg-white px-3 py-2 text-xs font-extrabold text-primary outline-none transition hover:border-gold focus:border-gold sm:w-auto"
          >
            {languages.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
          <a
            href={whatsappHref}
            aria-label={common("whatsapp")}
            className="hidden size-10 place-items-center rounded-full border border-line bg-surface-low text-primary transition hover:border-gold sm:grid"
          >
            <MessageCircle size={19} />
          </a>
          {section === "agent" && (
            <Link
              href="/contact"
              className="hidden rounded-lg bg-primary px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-primary-dark xl:inline-flex"
            >
              {common("quote")}
            </Link>
          )}
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-low text-primary lg:hidden"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            aria-controls="mobile-navigation"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-navigation"
          className="border-t border-line bg-surface px-4 py-5 shadow-xl lg:hidden"
        >
          <nav aria-label={t("primary")} className="site-shell grid gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`rounded-lg px-4 py-3 text-sm font-bold transition hover:bg-surface-low hover:text-primary ${
                  isActive(item.href)
                    ? "bg-surface-low text-primary"
                    : "text-ink"
                }`}
              >
                {t(item.label)}
              </Link>
            ))}
            <div className="mt-3 grid gap-2 border-t border-line pt-4">
              {section === "agent" && (
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white"
                >
                  {common("quote")}
                </Link>
              )}
              <a
                href={whatsappHref}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-3 text-sm font-bold text-primary"
              >
                <MessageCircle size={17} />
                {common("whatsapp")}
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

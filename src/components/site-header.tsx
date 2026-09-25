"use client";

import Image from "next/image";
import { Menu, MessageCircle, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getWhatsAppUrl } from "@/lib/site";

const navigation = [
  { href: "/" as const, label: "home" },
  { href: "/packages" as const, label: "packages" },
  { href: "/services" as const, label: "services" },
  { href: "/agencies" as const, label: "agencies" },
  { href: "/about" as const, label: "about" },
  { href: "/contact" as const, label: "contact" },
] as const;

export function SiteHeader() {
  const t = useTranslations("Nav");
  const common = useTranslations("Common");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const nextLocale: Locale = locale === "ar" ? "en" : "ar";

  function switchLanguage() {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/80 bg-surface/95 backdrop-blur-xl">
      <div className="site-shell flex h-20 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-low text-primary lg:hidden"
            aria-label={open ? t("closeMenu") : t("openMenu")}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <Image
              src="/falco-logo.png"
              width={56}
              height={56}
              alt={common("brand")}
              className="size-14 rounded-xl bg-white object-cover"
              priority
            />
            <span className="hidden leading-tight sm:block">
              <strong className="font-display block text-base text-primary">
                {common("brand")}
              </strong>
              <span className="block text-xs font-bold text-gold">
                {common("tagline")}
              </span>
            </span>
          </Link>
        </div>

        <nav
          aria-label={t("home")}
          className="hidden items-center gap-6 text-sm font-bold text-muted lg:flex"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-primary"
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={switchLanguage}
            className="rounded-full border border-line bg-white px-3 py-2 text-xs font-extrabold text-primary transition hover:border-gold"
          >
            {t("language")}
          </button>
          <a
            href={getWhatsAppUrl()}
            aria-label={common("whatsapp")}
            className="grid size-10 place-items-center rounded-full border border-line bg-surface-low text-primary transition hover:border-gold"
          >
            <MessageCircle size={19} />
          </a>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-surface px-4 py-5 lg:hidden">
          <nav className="site-shell grid gap-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-sm font-bold text-ink transition hover:bg-surface-low hover:text-primary"
              >
                {t(item.label)}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

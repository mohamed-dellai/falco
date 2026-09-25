import type { Metadata } from "next";
import {
  Amiri,
  Noto_Serif,
  Plus_Jakarta_Sans,
  Tajawal,
} from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";
import "../globals.css";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const displayFont = Noto_Serif({
  subsets: ["latin"],
  variable: "--font-display",
});

const arabicFont = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-arabic",
});

const amiriFont = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-amiri",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Falco Services",
    template: "%s | Falco Services",
  },
  description:
    "Saudi Hajj and Umrah ground services for pilgrims and international agencies.",
  icons: {
    icon: "/falco-logo.png",
    apple: "/falco-logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "Falco Services",
    images: [{ url: "/falco-logo.png", width: 640, height: 640 }],
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const direction = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${bodyFont.variable} ${displayFont.variable} ${arabicFont.variable} ${amiriFont.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <a
            href="#main-content"
            className="fixed start-4 top-3 z-[100] -translate-y-20 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-ink transition focus:translate-y-0"
          >
            {locale === "ar" ? "انتقل إلى المحتوى" : "Skip to content"}
          </a>
          <SiteHeader />
          <main id="main-content" className="min-h-screen pt-20">
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

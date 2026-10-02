import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans, Newsreader } from "next/font/google";
import { AdminLocaleProvider } from "@/components/admin-locale";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import "../globals.css";
import "./admin.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-desk",
});

const news = Newsreader({
  subsets: ["latin"],
  variable: "--font-news",
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
});

export async function generateMetadata(): Promise<Metadata> {
  const copy = adminCopy(await getAdminLocale());
  return {
    title: `${copy.brand} — ${copy.desk}`,
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getAdminLocale();

  return (
    <html
      lang={locale}
      className={`${sans.variable} ${news.variable} ${plex.variable}`}
    >
      <body
        className={`${sans.className} admin-desk bg-[var(--desk-canvas)] text-[var(--desk-ink)] antialiased`}
      >
        <AdminLocaleProvider locale={locale}>{children}</AdminLocaleProvider>
      </body>
    </html>
  );
}

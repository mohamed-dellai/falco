import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans, Newsreader } from "next/font/google";
import { AdminLocaleProvider } from "@/components/admin-locale";
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

export const metadata: Metadata = {
  title: "Falco room desk",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getAdminLocale();

  return (
    <html lang={locale} className={`${sans.variable} ${news.variable} ${plex.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.48.0/dist/tabler-icons.min.css"
        />
      </head>
      <body className={`${sans.className} bg-[#fbf9f5] text-[#081c36] antialiased`}>
        <AdminLocaleProvider locale={locale}>{children}</AdminLocaleProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AdminAccountProvider } from "@/components/admin-account";
import { AdminLocaleProvider } from "@/components/admin-locale";
import { currentAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import "../globals.css";
import "./admin.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-desk",
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
  const account = await currentAdmin();

  return (
    <html
      lang={locale}
      className={sans.variable}
    >
      <body
        className={`${sans.className} admin-desk bg-[var(--desk-canvas)] text-[var(--desk-ink)] antialiased`}
      >
        <AdminLocaleProvider locale={locale}>
          <AdminAccountProvider account={account}>{children}</AdminAccountProvider>
        </AdminLocaleProvider>
      </body>
    </html>
  );
}

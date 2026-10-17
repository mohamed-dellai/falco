import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { ServiceSectionNav } from "@/components/service-section-nav";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";

export const dynamic = "force-dynamic";

export default async function ServicesLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  return (
    <AdminShell title={copy.services}>
      <ServiceSectionNav copy={copy} />
      <div className="mt-4">{children}</div>
    </AdminShell>
  );
}

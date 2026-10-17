import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";

export const dynamic = "force-dynamic";

export default async function AccountingLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  return (
    <AdminShell
      title={copy.accounting}
      crumbs={[{ href: "/admin/accounting/invoices", label: copy.accounting }]}
    >
      {children}
    </AdminShell>
  );
}

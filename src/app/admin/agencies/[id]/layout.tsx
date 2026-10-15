import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { ClientSectionNav } from "@/components/client-section-nav";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAgency } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function ClientSectionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const client = await getAgency(id);
  if (!client) notFound();
  const copy = adminCopy(await getAdminLocale());

  return (
    <AdminShell
      title={client.name}
      crumbs={[{ href: "/admin/agencies", label: copy.agencies }]}
    >
      <ClientSectionNav clientId={client.id} kind={client.kind} copy={copy} />
      {children}
    </AdminShell>
  );
}

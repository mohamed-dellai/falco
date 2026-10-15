import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { AdminNotice } from "@/components/admin-ui";
import { ContractSectionNav } from "@/components/contract-section-nav";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getPurchase } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function PurchaseSectionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const purchase = await getPurchase(id);
  if (!purchase) notFound();
  const copy = adminCopy(await getAdminLocale());

  return (
    <AdminShell
      title={purchase.number}
      crumbs={[{ href: "/admin/purchases", label: copy.purchases }]}
    >
      <ContractSectionNav
        purchaseId={purchase.id}
        status={purchase.status}
        copy={copy}
      />
      {purchase.status === "confirmed" && !purchase.active && (
        <div className="mb-4">
          <AdminNotice>{copy.purchaseDisabledNotice}</AdminNotice>
        </div>
      )}
      {purchase.status === "cancelled" && (
        <div className="mb-4">
          <AdminNotice>{copy.purchaseCancelledNotice}</AdminNotice>
        </div>
      )}
      {children}
    </AdminShell>
  );
}

import { notFound } from "next/navigation";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { AdminNotice } from "@/components/admin-ui";
import { PurchaseForm } from "@/components/purchase-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getPurchase, listHotels } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function PurchasePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const { id } = await params;
  const query = await searchParams;
  const [purchase, hotels] = await Promise.all([getPurchase(id), listHotels()]);
  if (!purchase) notFound();

  return (
    <AdminShell
      title={purchase.number}
      crumbs={[{ href: "/admin/purchases", label: copy.purchases }]}
    >
      <AdminError code={query.error} />
      {purchase.status === "confirmed" && (
        <div className="mb-4">
          <AdminNotice tone="success">
            {copy.purchaseConfirmedNotice}
          </AdminNotice>
        </div>
      )}
      {purchase.status === "cancelled" && (
        <div className="mb-4">
          <AdminNotice>{copy.purchaseCancelledNotice}</AdminNotice>
        </div>
      )}
      <PurchaseForm hotels={hotels} purchase={purchase} />
    </AdminShell>
  );
}

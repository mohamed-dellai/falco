import { notFound } from "next/navigation";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { PurchaseForm } from "@/components/purchase-form";
import { requireAdmin } from "@/lib/admin-auth";
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
  const { id } = await params;
  const query = await searchParams;
  const [purchase, hotels] = await Promise.all([getPurchase(id), listHotels()]);
  if (!purchase) notFound();

  return (
    <AdminShell
      title={purchase.number}
      crumbs={[{ href: "/admin/purchases", label: "Purchases" }]}
    >
      <AdminError code={query.error} />
      {purchase.status === "confirmed" && (
        <p className="mb-3 text-sm text-[#334155]">
          Confirmed. Each room is in inventory for the dates on its line.
        </p>
      )}
      <PurchaseForm hotels={hotels} purchase={purchase} />
    </AdminShell>
  );
}

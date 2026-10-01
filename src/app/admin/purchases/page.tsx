import Link from "next/link";
import { AdminShell, adminButtonClass } from "@/components/admin-shell";
import { PurchaseStatusPill } from "@/components/purchase-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  listPurchases,
  purchaseAmount,
  purchasePeriod,
  purchaseStatuses,
  type PurchaseStatus,
} from "@/lib/inventory";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

function asStatus(value: string | undefined) {
  return purchaseStatuses.includes(value as PurchaseStatus)
    ? (value as PurchaseStatus)
    : undefined;
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const status = asStatus(query.status);
  const purchases = await listPurchases(status ? { status } : undefined);
  const filters = [
    ["", copy.all],
    ["draft", copy.draft],
    ["confirmed", copy.confirmed],
    ["cancelled", copy.cancelled],
  ] as const;

  return (
    <AdminShell
      title={copy.purchases}
      searchPlaceholder={copy.searchPurchases}
      actions={
        <Link href="/admin/purchases/new" className={adminButtonClass}>
          {copy.newPurchase}
        </Link>
      }
    >
      <div className="mb-3 flex gap-2 text-sm">
        <Link href="/admin/assignments" className="rounded-lg px-2.5 py-1 font-semibold text-[#334155]">
          {copy.allotments}
        </Link>
        <span className="rounded-lg bg-[#081c36] px-2.5 py-1 font-semibold text-white">
          {copy.purchases}
        </span>
      </div>
      <div className="mb-3 flex gap-2 text-sm">
        {filters.map(([value, label]) => {
          const active = (status ?? "") === value;
          return (
            <Link
              key={value || "all"}
              href={value ? `/admin/purchases?status=${value}` : "/admin/purchases"}
              className={`rounded px-2 py-1 font-semibold ${
                active
                  ? "bg-[#0e4d8c] text-white"
                  : "text-[#334155] hover:bg-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {purchases.length ? (
        <div className="overflow-x-auto rounded border border-[#d5dbe3] bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-[#f4f7fa] text-[11px] font-semibold uppercase tracking-wide text-[#5c6776]">
              <tr>
                <th className="px-3 py-2">{copy.number}</th>
                <th className="px-3 py-2">{copy.hotels}</th>
                <th className="px-3 py-2">{copy.period}</th>
                <th className="px-3 py-2 text-end">{copy.rooms}</th>
                <th className="px-3 py-2 text-end">{copy.total}</th>
                <th className="px-3 py-2">{copy.status}</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id} data-search-item className="border-t border-[#e6ebf0]">
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/purchases/${purchase.id}`}
                      className="font-medium text-[#0e4d8c] hover:underline"
                    >
                      {purchase.number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{purchase.hotelName}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {purchasePeriod(purchase.lines)}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {purchase.lines.length}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {formatMoney(purchaseAmount(purchase), locale)}
                  </td>
                  <td className="px-3 py-2">
                    <PurchaseStatusPill status={purchase.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded border border-dashed border-[#c5ced8] bg-white px-4 py-6 text-sm text-[#5c6776]">
          {copy.noPurchases}
        </p>
      )}
    </AdminShell>
  );
}

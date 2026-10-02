import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminSearchForm,
  AdminTableFrame,
  adminButtonClass,
} from "@/components/admin-ui";
import { PurchaseStatusPill } from "@/components/purchase-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  listPurchases,
  purchaseAmount,
  purchaseSpan,
  purchaseStatuses,
  type PurchaseStatus,
} from "@/lib/inventory";
import { formatDateRange, formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

function asStatus(value: string | undefined) {
  return purchaseStatuses.includes(value as PurchaseStatus)
    ? (value as PurchaseStatus)
    : undefined;
}

function filterHref(status: string, query: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (query) params.set("q", query);
  const suffix = params.toString();
  return `/admin/purchases${suffix ? `?${suffix}` : ""}`;
}

function displayPeriod(
  lines: Array<{ checkIn: string; checkOut: string }>,
  locale: "en" | "fr",
) {
  const period = purchaseSpan(lines);
  return period
    ? formatDateRange(period.checkIn, period.checkOut, locale)
    : "—";
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const status = asStatus(query.status);
  const all = await listPurchases();
  const filteredByStatus = status
    ? all.filter((purchase) => purchase.status === status)
    : all;
  const search = query.q?.trim().toLocaleLowerCase(locale) ?? "";
  const purchases = search
    ? filteredByStatus.filter((purchase) =>
        [
          purchase.number,
          purchase.hotelName,
          ...purchase.lines.flatMap((line) => [line.checkIn, line.checkOut]),
          ...purchase.lines.flatMap((line) => [
            line.roomName,
            line.description,
          ]),
        ]
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(search),
      )
    : filteredByStatus;
  const filters = [
    ["", copy.all],
    ["draft", copy.draft],
    ["confirmed", copy.confirmed],
    ["cancelled", copy.cancelled],
  ] as const;

  return (
    <AdminShell
      title={copy.purchases}
      note={
        <span aria-live="polite" className="text-sm text-[var(--desk-muted)]">
          {fill(copy.purchaseCount, { count: purchases.length })}
        </span>
      }
      actions={
        <Link href="/admin/purchases/new" className={adminButtonClass}>
          {copy.newPurchase}
        </Link>
      }
    >
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <AdminSearchForm
          action="/admin/purchases"
          label={copy.searchPurchases}
          placeholder={copy.searchPurchases}
          value={query.q}
          hidden={{ status }}
        />
        <AdminFilterBar
          label={copy.filterByStatus}
          items={filters.map(([value, label]) => ({
            href: filterHref(value, query.q ?? ""),
            label,
            active: (status ?? "") === value,
            count:
              value === ""
                ? all.length
                : all.filter((item) => item.status === value).length,
          }))}
        />
      </div>

      {purchases.length ? (
        <>
          <div className="grid gap-3 lg:hidden">
            {purchases.map((purchase) => (
              <Link
                key={purchase.id}
                href={`/admin/purchases/${purchase.id}`}
                className="desk-focus rounded-2xl border border-[var(--desk-line)] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-plex text-xs text-[var(--desk-muted)]">
                      {purchase.number}
                    </p>
                    <h2 className="mt-1 font-semibold">{purchase.hotelName}</h2>
                  </div>
                  <PurchaseStatusPill status={purchase.status} />
                </div>
                <p className="mt-3 font-plex text-xs text-[var(--desk-muted)]">
                  {displayPeriod(purchase.lines, locale)}
                </p>
                <div className="mt-3 flex items-end justify-between border-t border-[var(--desk-line)] pt-3">
                  <span className="text-xs text-[var(--desk-muted)]">
                    {purchase.lines.length}{" "}
                    {copy.roomTypes.toLocaleLowerCase(locale)}
                  </span>
                  <strong className="font-plex text-sm">
                    {formatMoney(purchaseAmount(purchase), locale)}
                  </strong>
                </div>
              </Link>
            ))}
          </div>
          <div className="hidden lg:block">
            <AdminTableFrame>
              <table className="desk-table w-full border-collapse text-start text-sm">
                <thead className="bg-[var(--desk-canvas)]">
                  <tr>
                    <th className="px-4 py-3 text-start">{copy.number}</th>
                    <th className="px-4 py-3 text-start">{copy.hotels}</th>
                    <th className="px-4 py-3 text-start">{copy.period}</th>
                    <th className="px-4 py-3 text-end">{copy.rooms}</th>
                    <th className="px-4 py-3 text-end">{copy.total}</th>
                    <th className="px-4 py-3 text-start">{copy.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/purchases/${purchase.id}`}
                          className="desk-focus rounded-sm font-plex font-medium text-[var(--desk-primary)] hover:underline"
                        >
                          {purchase.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {purchase.hotelName}
                      </td>
                      <td className="px-4 py-3 font-plex text-xs">
                        {displayPeriod(purchase.lines, locale)}
                      </td>
                      <td className="px-4 py-3 text-end font-plex">
                        {purchase.lines.length}
                      </td>
                      <td className="px-4 py-3 text-end font-plex">
                        {formatMoney(purchaseAmount(purchase), locale)}
                      </td>
                      <td className="px-4 py-3">
                        <PurchaseStatusPill status={purchase.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableFrame>
          </div>
        </>
      ) : (
        <AdminEmptyState
          title={
            search
              ? fill(copy.noMatches, {
                  query: query.q ?? "",
                  count: filteredByStatus.length,
                })
              : copy.noPurchases
          }
          action={
            !search ? (
              <Link href="/admin/purchases/new" className={adminButtonClass}>
                {copy.newPurchase}
              </Link>
            ) : undefined
          }
        />
      )}
    </AdminShell>
  );
}

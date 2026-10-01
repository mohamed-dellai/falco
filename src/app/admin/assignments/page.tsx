import Link from "next/link";
import { AdminShell, adminButtonClass, adminButtonSecondaryClass } from "@/components/admin-shell";
import { AllotmentStatusPill } from "@/components/allotment-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  allotmentStatuses,
  allotmentValue,
  listAllotments,
  type AllotmentStatus,
} from "@/lib/inventory";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

function asStatus(value: string | undefined) {
  return allotmentStatuses.includes(value as AllotmentStatus)
    ? (value as AllotmentStatus)
    : undefined;
}

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const status = asStatus(query.status);
  const allotments = await listAllotments(status ? { status } : undefined);
  const filters = [
    ["", copy.all],
    ["draft", copy.draft],
    ["confirmed", copy.confirmed],
    ["cancelled", copy.cancelled],
  ] as const;

  return (
    <AdminShell
      title={copy.allotments}
      searchPlaceholder={copy.searchAllotments}
      note={
        <p
          data-search-count
          data-search-total={String(allotments.length)}
          data-search-idle={fill(copy.allotmentCount, { count: allotments.length })}
          className="text-sm text-[#5c6470]"
        >
          {fill(copy.allotmentCount, { count: allotments.length })}
        </p>
      }
      actions={
        <div className="flex gap-2">
          <Link href="/admin/purchases/new" className={adminButtonSecondaryClass}>
            {copy.newPurchase}
          </Link>
          <Link href="/admin/assignments/new" className={adminButtonClass}>
            {copy.newAllotment}
          </Link>
        </div>
      }
    >
      <div className="mb-3 flex gap-2 text-sm">
        <span className="rounded-lg bg-[#081c36] px-2.5 py-1 font-semibold text-white">
          {copy.allotments}
        </span>
        <Link href="/admin/purchases" className="rounded-lg px-2.5 py-1 font-semibold text-[#334155]">
          {copy.purchases}
        </Link>
      </div>
      <div className="mb-3 flex gap-2 text-sm">
        {filters.map(([value, label]) => {
          const active = (status ?? "") === value;
          return (
            <Link
              key={value || "all"}
              href={
                value ? `/admin/assignments?status=${value}` : "/admin/assignments"
              }
              className={`rounded px-2 py-1 font-semibold ${
                active ? "bg-[#0e4d8c] text-white" : "text-[#334155] hover:bg-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {allotments.length ? (
        <div className="overflow-x-auto rounded-xl border border-[#dfe5ec] bg-white">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-[#fbf9f5] text-[11px] font-semibold uppercase tracking-wide text-[#5c6470]">
              <tr>
                <th className="px-3 py-2">{copy.number}</th>
                <th className="px-3 py-2">{copy.agency}</th>
                <th className="px-3 py-2">{copy.stay}</th>
                <th className="px-3 py-2 text-end">{copy.rooms}</th>
                <th className="px-3 py-2 text-end">{copy.sell}</th>
                <th className="px-3 py-2">{copy.status}</th>
              </tr>
            </thead>
            <tbody>
              {allotments.map((allotment) => {
                const value = allotmentValue(allotment);
                return (
                  <tr key={allotment.id} data-search-item className="border-t border-[#e6ebf0]">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/assignments/${allotment.id}`}
                        className="font-medium text-[#0e4d8c] hover:underline"
                      >
                        {allotment.number}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{allotment.agencyName}</td>
                    <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                      {allotment.checkIn} → {allotment.checkOut}
                    </td>
                    <td className="px-3 py-2 text-end tabular-nums">
                      {value.rooms}
                    </td>
                    <td className="px-3 py-2 text-end tabular-nums">
                      {formatMoney(value.revenue, locale)}
                    </td>
                    <td className="px-3 py-2">
                      <AllotmentStatusPill status={allotment.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-[#c5ced8] bg-white px-4 py-8 text-sm text-[#5c6470]">
          {copy.noAllotments}{" "}
          <Link href="/admin/assignments/new" className="font-semibold text-[#0e4d8c]">
            {copy.newAllotment}
          </Link>
        </p>
      )}
    </AdminShell>
  );
}

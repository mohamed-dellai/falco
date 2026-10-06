import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminSearchForm,
  AdminTableFrame,
  adminButtonClass,
  adminButtonSecondaryClass,
} from "@/components/admin-ui";
import {
  AllotmentStatusPill,
  DeleteCancelledAllotment,
  SaleChannelMark,
} from "@/components/allotment-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, countText, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  allotmentStatuses,
  allotmentValue,
  listAllotments,
  saleChannels,
  type AllotmentStatus,
  type SaleChannel,
} from "@/lib/inventory";
import { formatDateRange, formatMoney } from "@/lib/money";
import { roomTypeLabel } from "@/lib/room-types";

export const dynamic = "force-dynamic";

function asStatus(value: string | undefined) {
  return allotmentStatuses.includes(value as AllotmentStatus)
    ? (value as AllotmentStatus)
    : undefined;
}

function asChannel(value: string | undefined) {
  if (value === "website") return "website" as const;
  return saleChannels.includes(value as SaleChannel)
    ? (value as SaleChannel)
    : undefined;
}

function filterHref(status: string, channel: string, query: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (channel) params.set("channel", channel);
  if (query) params.set("q", query);
  const suffix = params.toString();
  return `/admin/allotments${suffix ? `?${suffix}` : ""}`;
}

export default async function AllotmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; channel?: string; q?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const status = asStatus(query.status);
  const channel = asChannel(query.channel);
  const search = query.q?.trim().toLocaleLowerCase(locale) ?? "";
  const all = await listAllotments();
  const channelRows = channel
    ? all.filter((allotment) =>
        channel === "website"
          ? allotment.channel === "b2c" || allotment.channel === "b2b"
          : allotment.channel === channel,
      )
    : all;
  const statusRows = status
    ? channelRows.filter((allotment) => allotment.status === status)
    : channelRows;
  const allotments = search
    ? statusRows.filter((allotment) =>
        [
          allotment.number,
          allotment.agencyName,
          allotment.channel === "b2c"
            ? copy.channelB2c
            : allotment.channel === "b2b"
              ? copy.channelB2b
              : copy.channelDesk,
          allotment.checkIn,
          allotment.checkOut,
          ...allotment.lines.flatMap((line) => [
            line.hotelName,
            line.roomName,
            roomTypeLabel(line.roomName, (type) => copy[type]),
          ]),
        ]
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(search),
      )
    : statusRows;
  const filters = [
    ["", copy.all],
    ["request", copy.statusRequest],
    ["provisional", copy.statusProvisional],
    ["confirmed", copy.confirmed],
    ["cancelled", copy.cancelled],
    ["no_show", copy.statusNoShow],
  ] as const;
  const sources = [
    ["", copy.all],
    ["desk", copy.channelDesk],
    ["b2c", copy.channelB2c],
    ["b2b", copy.channelB2b],
  ] as const;

  return (
    <AdminShell
      title={copy.allotments}
      note={
        <span aria-live="polite" className="text-sm text-[var(--desk-muted)]">
          {countText(
            allotments.length,
            copy.allotmentCountOne,
            copy.allotmentCount,
          )}
        </span>
      }
      actions={
        <>
          <Link
            href="/admin/purchases/new"
            className={adminButtonSecondaryClass}
          >
            {copy.newPurchase}
          </Link>
          <Link href="/admin/allotments/new" className={adminButtonClass}>
            {copy.newAllotment}
          </Link>
        </>
      }
    >
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <AdminSearchForm
          action="/admin/allotments"
          label={copy.searchAllotments}
          placeholder={copy.searchAllotments}
          value={query.q}
          hidden={{ status, channel }}
        />
        <div className="flex flex-col items-start gap-2">
          <AdminFilterBar
            label={copy.status}
            items={filters.map(([value, label]) => ({
              href: filterHref(value, channel ?? "", query.q ?? ""),
              label,
              active: (status ?? "") === value,
              count:
                value === ""
                  ? channelRows.length
                  : channelRows.filter((item) => item.status === value).length,
            }))}
          />
          <AdminFilterBar
            label={copy.saleChannel}
            items={sources.map(([value, label]) => ({
              href: filterHref(status ?? "", value, query.q ?? ""),
              label,
              active: (channel ?? "") === value,
              count:
                value === ""
                  ? all.length
                  : all.filter((item) => item.channel === value).length,
            }))}
          />
        </div>
      </div>

      {allotments.length ? (
        <>
          <div className="grid gap-3 lg:hidden">
            {allotments.map((allotment) => {
              const value = allotmentValue(allotment);
              return (
                <article
                  key={allotment.id}
                  className="rounded-2xl border border-[var(--desk-line)] bg-white"
                >
                  <Link
                    href={`/admin/allotments/${allotment.id}`}
                    className="desk-focus block p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-plex text-xs text-[var(--desk-muted)]">
                          {allotment.number}
                        </p>
                        <h2 className="mt-1 font-semibold">
                          {allotment.agencyName}
                        </h2>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <SaleChannelMark channel={allotment.channel} />
                        <AllotmentStatusPill status={allotment.status} />
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-[var(--desk-muted)]">
                      {formatDateRange(
                        allotment.checkIn,
                        allotment.checkOut,
                        locale,
                      )}
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-3 border-t border-[var(--desk-line)] pt-3">
                      <span className="text-xs text-[var(--desk-muted)]">
                        {value.rooms} {copy.rooms.toLocaleLowerCase(locale)}
                      </span>
                      <strong className="font-plex text-sm">
                        {formatMoney(value.revenue, locale)}
                      </strong>
                    </div>
                  </Link>
                  {allotment.status === "cancelled" && (
                    <div className="border-t border-[var(--desk-line)] px-4 py-3">
                      <DeleteCancelledAllotment
                        id={allotment.id}
                        number={allotment.number}
                        compact
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <div className="hidden lg:block">
            <AdminTableFrame>
              <table className="desk-table w-full border-collapse text-start text-sm">
                <thead className="bg-[var(--desk-canvas)]">
                  <tr>
                    <th className="px-4 py-3 text-start">{copy.number}</th>
                    <th className="px-4 py-3 text-start">{copy.client}</th>
                    <th className="px-4 py-3 text-start">{copy.saleChannel}</th>
                    <th className="px-4 py-3 text-start">{copy.stay}</th>
                    <th className="px-4 py-3 text-end">{copy.rooms}</th>
                    <th className="px-4 py-3 text-end">{copy.sell}</th>
                    <th className="px-4 py-3 text-start">{copy.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {allotments.map((allotment) => {
                    const value = allotmentValue(allotment);
                    return (
                      <tr key={allotment.id}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/allotments/${allotment.id}`}
                            className="desk-focus rounded-sm font-plex font-medium text-[var(--desk-primary)] hover:underline"
                          >
                            {allotment.number}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {allotment.agencyName}
                        </td>
                        <td className="px-4 py-3">
                          <SaleChannelMark channel={allotment.channel} />
                        </td>
                        <td className="px-4 py-3 font-plex text-xs whitespace-nowrap">
                          {formatDateRange(
                            allotment.checkIn,
                            allotment.checkOut,
                            locale,
                          )}
                        </td>
                        <td className="px-4 py-3 text-end font-plex">
                          {value.rooms}
                        </td>
                        <td className="px-4 py-3 text-end font-plex">
                          {formatMoney(value.revenue, locale)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <AllotmentStatusPill status={allotment.status} />
                            {allotment.status === "cancelled" && (
                              <DeleteCancelledAllotment
                                id={allotment.id}
                                number={allotment.number}
                                compact
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
                  count: statusRows.length,
                })
              : copy.noAllotments
          }
          action={
            !search ? (
              <Link href="/admin/allotments/new" className={adminButtonClass}>
                {copy.newAllotment}
              </Link>
            ) : undefined
          }
        />
      )}
    </AdminShell>
  );
}

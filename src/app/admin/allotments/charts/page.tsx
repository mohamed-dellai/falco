import { AdminShell } from "@/components/admin-shell";
import { adminButtonClass, adminFieldClass } from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listHotels } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { reportFilters, reservationReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function ReservationChartsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; hotelId?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const filters = reportFilters(query);
  const [report, hotels] = await Promise.all([
    reservationReport(filters),
    listHotels(),
  ]);
  const peak = Math.max(1, ...report.days.map((day) => Math.max(day.contracted, day.reserved)));
  const channelLabel = {
    desk: copy.channelDesk,
    b2b: copy.channelB2b,
    b2c: copy.channelB2c,
  };

  return (
    <AdminShell
      title={copy.reservationNavCharts}
      crumbs={[{ href: "/admin/allotments", label: copy.allotments }]}
    >
      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-[var(--desk-line)] bg-white px-4 py-3 shadow-sm">
        <label className="grid gap-1 text-sm">
          <span className="text-[13px] font-medium text-[var(--desk-muted)]">{copy.checkIn}</span>
          <input type="date" name="from" defaultValue={filters.from} className={adminFieldClass} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-[13px] font-medium text-[var(--desk-muted)]">{copy.checkOut}</span>
          <input type="date" name="to" defaultValue={filters.to} className={adminFieldClass} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-[13px] font-medium text-[var(--desk-muted)]">{copy.hotel}</span>
          <select name="hotelId" defaultValue={filters.hotelId} className={adminFieldClass}>
            <option value="">{copy.all}</option>
            {hotels.map((hotel) => (
              <option key={hotel.id} value={hotel.id}>
                {hotel.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={adminButtonClass}>
          {copy.search}
        </button>
      </form>

      <section className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          [copy.reservationChartNights, String(report.totals.reservedRoomNights)],
          [copy.chartFree, String(report.totals.freeRoomNights)],
          [copy.reservationChartSales, formatMoney(report.totals.revenue, locale)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[var(--desk-line)] bg-white px-4 py-3 shadow-sm">
            <p className="text-[13px] font-medium text-[var(--desk-muted)]">{label}</p>
            <p className="font-plex mt-1 text-2xl font-bold text-[var(--desk-ink)] tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
        <header className="border-b border-[var(--desk-line)] px-5 py-4">
          <h2 className="text-base font-bold text-[var(--desk-ink)]">{copy.chartTitle}</h2>
        </header>
        {report.days.every((day) => day.contracted === 0 && day.reserved === 0) ? (
          <p className="px-5 py-6 text-sm text-[var(--desk-muted)]">{copy.chartEmpty}</p>
        ) : (
          <ul className="grid gap-2 px-5 py-4">
            {report.days.map((day) => (
              <li key={day.day} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3">
                <span className="font-plex text-xs font-bold text-[var(--desk-muted)] tabular-nums">{day.day}</span>
                <span className="flex h-2 overflow-hidden rounded-full bg-[var(--desk-surface-muted)]">
                  <span
                    className="bg-[var(--desk-success)]"
                    style={{ width: `${(day.reserved / peak) * 100}%` }}
                  />
                  <span
                    className="bg-[var(--desk-primary)]"
                    style={{ width: `${(Math.max(day.free, 0) / peak) * 100}%` }}
                  />
                </span>
                <span className="font-plex text-xs font-bold text-[var(--desk-ink)] tabular-nums">
                  {day.reserved}/{day.contracted}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
        <header className="border-b border-[var(--desk-line)] px-5 py-4">
          <h2 className="text-base font-bold text-[var(--desk-ink)]">{copy.reservationChartSales}</h2>
        </header>
        <table className="w-full border-collapse text-start">
          <thead className="bg-[var(--desk-canvas)]">
            <tr>
              <th className="px-3 py-2 text-[13px] font-bold text-[var(--desk-ink)]" scope="col">{copy.saleChannel}</th>
              <th className="px-3 py-2 text-end text-[13px] font-bold text-[var(--desk-ink)]" scope="col">{copy.allotments}</th>
              <th className="px-3 py-2 text-end text-[13px] font-bold text-[var(--desk-ink)]" scope="col">{copy.reservationChartNights}</th>
              <th className="px-3 py-2 text-end text-[13px] font-bold text-[var(--desk-ink)]" scope="col">{copy.reservationChartSales}</th>
            </tr>
          </thead>
          <tbody>
            {report.sources.map((source) => (
              <tr key={source.channel} className="border-t border-[var(--desk-line)]">
                <td className="px-3 py-2.5 text-sm font-bold text-[var(--desk-ink)]">{channelLabel[source.channel]}</td>
                <td className="font-plex px-3 py-2.5 text-end text-sm tabular-nums">{source.reservations}</td>
                <td className="font-plex px-3 py-2.5 text-end text-sm tabular-nums">{source.roomNights}</td>
                <td className="font-plex px-3 py-2.5 text-end text-sm font-bold tabular-nums">
                  {formatMoney(source.revenue, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}

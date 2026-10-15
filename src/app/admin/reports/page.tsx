import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import {
  AdminPanel,
  adminButtonClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { cities, listHotels } from "@/lib/inventory";
import { formatDate, formatMoney } from "@/lib/money";
import {
  reportFilters,
  reservationReport,
} from "@/lib/reports";

export const dynamic = "force-dynamic";

function labels(locale: "en" | "fr") {
  if (locale === "fr")
    return {
      title: "Rapports",
      description:
        "Stock contracté, réservations, revenu et files d’action issus du registre canonique.",
      filters: "Filtres",
      from: "Du",
      to: "Au",
      hotel: "Hôtel",
      city: "Ville",
      channel: "Canal",
      all: "Tous",
      apply: "Appliquer",
      capacity: "Nuitées contractées",
      overbook: "Survente autorisée",
      reserved: "Nuitées réservées",
      free: "Nuitées libres",
      occupancy: "Occupation",
      asp: "Prix moyen / nuitée",
      revenue: "Revenu",
      margin: "Marge",
      daily: "Production quotidienne",
      date: "Date",
      contracted: "Contracté",
      sold: "Réservé",
      arrivals: "Arrivées",
      departures: "Départs",
      cost: "Coût",
      sources: "Mix des sources",
      reservations: "Réservations",
      roomNights: "Nuitées",
      queues: "Files d’action",
      requests: "Demandes ouvertes",
      cancellations: "Demandes d’annulation",
      expiring: "Options expirant sous 24 h",
      desk: "Desk",
      b2b: "Portail B2B",
      b2c: "Site B2C",
      noData: "Aucune production sur cette période.",
    };
  return {
    title: "Reports",
    description:
      "Contracted stock, reservations, revenue, and action queues from the canonical ledger.",
    filters: "Filters",
    from: "From",
    to: "To",
    hotel: "Hotel",
    city: "City",
    channel: "Channel",
    all: "All",
    apply: "Apply",
    capacity: "Contracted room nights",
    overbook: "Overbook allowance",
    reserved: "Reserved room nights",
    free: "Free room nights",
    occupancy: "Occupancy",
    asp: "Average selling price",
    revenue: "Revenue",
    margin: "Margin",
    daily: "Daily production",
    date: "Date",
    contracted: "Contracted",
    sold: "Reserved",
    arrivals: "Arrivals",
    departures: "Departures",
    cost: "Cost",
    sources: "Source mix",
    reservations: "Reservations",
    roomNights: "Room nights",
    queues: "Action queues",
    requests: "Open requests",
    cancellations: "Cancellation requests",
    expiring: "Holds expiring in 24h",
    desk: "Desk",
    b2b: "B2B portal",
    b2c: "B2C website",
    noData: "No production in this period.",
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    hotelId?: string;
    city?: string;
    channel?: string;
  }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const text = labels(locale);
  const filters = reportFilters(await searchParams);
  const [report, hotels] = await Promise.all([
    reservationReport(filters),
    listHotels(),
  ]);
  const maximumCapacity = Math.max(
    1,
    ...report.days.map((day) => day.contracted + day.overbook),
  );
  const metrics = [
    {
      label: text.capacity,
      value: String(report.totals.contractedRoomNights),
    },
    {
      label: text.overbook,
      value: String(report.totals.overbookRoomNights),
    },
    {
      label: text.reserved,
      value: String(report.totals.reservedRoomNights),
    },
    { label: text.free, value: String(report.totals.freeRoomNights) },
    {
      label: text.occupancy,
      value: `${report.totals.occupancy.toFixed(1)}%`,
    },
    {
      label: text.asp,
      value: formatMoney(report.totals.averageSellingPrice, locale),
    },
    {
      label: text.revenue,
      value: formatMoney(report.totals.revenue, locale),
    },
    {
      label: text.margin,
      value: formatMoney(report.totals.margin, locale),
      positive: report.totals.margin >= 0,
    },
  ];

  return (
    <AdminShell title={text.title}>
      <p className="mb-5 max-w-3xl text-sm leading-6 text-[var(--desk-muted)]">
        {text.description}
      </p>
      <AdminPanel title={text.filters}>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[9rem_9rem_minmax(12rem,1fr)_10rem_9rem_auto] xl:items-end">
          <label className="grid gap-1 text-xs font-semibold">
            {text.from}
            <input
              name="from"
              type="date"
              defaultValue={filters.from}
              className={adminFieldClass}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            {text.to}
            <input
              name="to"
              type="date"
              defaultValue={filters.to}
              className={adminFieldClass}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            {text.hotel}
            <select
              name="hotelId"
              defaultValue={filters.hotelId}
              className={adminFieldClass}
            >
              <option value="">{text.all}</option>
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            {text.city}
            <select
              name="city"
              defaultValue={filters.city}
              className={adminFieldClass}
            >
              <option value="">{text.all}</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {copy[city]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            {text.channel}
            <select
              name="channel"
              defaultValue={filters.channel}
              className={adminFieldClass}
            >
              <option value="">{text.all}</option>
              <option value="desk">{text.desk}</option>
              <option value="b2b">{text.b2b}</option>
              <option value="b2c">{text.b2c}</option>
            </select>
          </label>
          <button type="submit" className={adminButtonClass}>
            {text.apply}
          </button>
        </form>
      </AdminPanel>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-lg border border-[var(--desk-line)] bg-white p-4 shadow-sm"
          >
            <p className="text-[10px] font-semibold tracking-wider text-[var(--desk-muted)] uppercase">
              {metric.label}
            </p>
            <p
              className={`mt-2 font-plex text-2xl font-bold ${
                "positive" in metric
                  ? metric.positive
                    ? "text-[var(--desk-success)]"
                    : "text-[var(--desk-danger)]"
                  : "text-[var(--desk-ink)]"
              }`}
            >
              {metric.value}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <AdminPanel title={text.daily}>
          {report.days.length ? (
            <>
              <div className="mb-5 grid h-40 grid-flow-col items-end gap-1 rounded-lg bg-[var(--desk-canvas)] p-3">
                {report.days.map((day) => (
                  <div
                    key={day.day}
                    title={`${day.day}: ${day.reserved}/${day.contracted + day.overbook}`}
                    className="group relative flex h-full min-w-1 items-end"
                  >
                    <span
                      className="w-full rounded-t bg-[var(--desk-primary-soft)]"
                      style={{
                        height: `${Math.max(
                          2,
                          ((day.contracted + day.overbook) / maximumCapacity) *
                            100,
                        )}%`,
                      }}
                    />
                    <span
                      className="absolute inset-x-0 bottom-0 rounded-t bg-[var(--desk-primary)]"
                      style={{
                        height: `${Math.max(
                          0,
                          (day.reserved / maximumCapacity) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="desk-table w-full min-w-[860px] text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-start">{text.date}</th>
                      <th className="px-3 py-2 text-end">{text.contracted}</th>
                      <th className="px-3 py-2 text-end">{text.sold}</th>
                      <th className="px-3 py-2 text-end">{text.free}</th>
                      <th className="px-3 py-2 text-end">{text.arrivals}</th>
                      <th className="px-3 py-2 text-end">{text.departures}</th>
                      <th className="px-3 py-2 text-end">{text.revenue}</th>
                      <th className="px-3 py-2 text-end">{text.margin}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.days.map((day) => (
                      <tr key={day.day}>
                        <td className="px-3 py-2 font-plex">
                          {formatDate(day.day, locale)}
                        </td>
                        <td className="px-3 py-2 text-end font-plex">
                          {day.contracted}
                          {day.overbook ? ` +${day.overbook}` : ""}
                        </td>
                        <td className="px-3 py-2 text-end font-plex">
                          {day.reserved}
                        </td>
                        <td className="px-3 py-2 text-end font-plex">
                          {day.free}
                        </td>
                        <td className="px-3 py-2 text-end font-plex">
                          {day.arrivals}
                        </td>
                        <td className="px-3 py-2 text-end font-plex">
                          {day.departures}
                        </td>
                        <td className="px-3 py-2 text-end font-plex">
                          {formatMoney(day.revenue, locale)}
                        </td>
                        <td className="px-3 py-2 text-end font-plex font-semibold">
                          {formatMoney(day.margin, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--desk-muted)]">{text.noData}</p>
          )}
        </AdminPanel>

        <div className="grid gap-5">
          <AdminPanel title={text.queues}>
            <div className="grid gap-2">
              {[
                {
                  label: text.requests,
                  value: report.queues.requests,
                  href: "/admin/allotments?status=request",
                },
                {
                  label: text.cancellations,
                  value: report.queues.cancellations,
                  href: "/admin/allotments?cancel=requested",
                },
                {
                  label: text.expiring,
                  value: report.queues.expiringHolds,
                  href: "/admin/allotments?status=provisional",
                },
              ].map((queue) => (
                <Link
                  key={queue.label}
                  href={queue.href}
                  className="flex items-center justify-between gap-4 rounded bg-[var(--desk-canvas)] px-3 py-2 text-xs font-semibold"
                >
                  <span>{queue.label}</span>
                  <strong className="font-plex text-base text-[var(--desk-primary)]">
                    {queue.value}
                  </strong>
                </Link>
              ))}
            </div>
          </AdminPanel>
          <AdminPanel title={text.sources}>
            <div className="grid gap-3">
              {report.sources.map((source) => (
                <div
                  key={source.channel}
                  className="border-b border-[var(--desk-line)] pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex justify-between gap-3 text-sm font-semibold">
                    <span>{text[source.channel]}</span>
                    <span className="font-plex">
                      {formatMoney(source.revenue, locale)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--desk-muted)]">
                    {source.reservations} {text.reservations.toLowerCase()} ·{" "}
                    {source.roomNights} {text.roomNights.toLowerCase()}
                  </p>
                </div>
              ))}
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminShell>
  );
}

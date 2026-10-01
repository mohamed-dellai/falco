import Link from "next/link";
import { AssignmentTable } from "@/components/assignment-table";
import { AdminShell, adminButtonClass, adminButtonSecondaryClass } from "@/components/admin-shell";
import { CountUp } from "@/components/count-up";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  cities,
  heldQuantity,
  inventoryStats,
  listAssignments,
  listHotels,
  listPurchases,
  listRooms,
  openQuantity,
  purchaseAmount,
  type City,
} from "@/lib/inventory";
import { formatMoney, todayInRiyadh } from "@/lib/money";
import { listSubmissions } from "@/lib/submissions";

export const dynamic = "force-dynamic";

function nextDay(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export default async function AdminHomePage() {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const today = todayInRiyadh();
  const tomorrow = nextDay(today);
  const [stats, assignments, submissions, hotels, rooms, drafts] = await Promise.all([
    inventoryStats(),
    listAssignments(),
    listSubmissions(),
    listHotels(),
    listRooms(),
    listPurchases({ status: "draft" }),
  ]);
  const capacity = await Promise.all(
    rooms.map(async (room) => {
      const hotel = hotels.find((item) => item.id === room.hotelId);
      const [held, open] = await Promise.all([
        heldQuantity(room, today, tomorrow),
        openQuantity(room, today),
      ]);
      return { city: (hotel?.city ?? "makkah") as City, held, open };
    }),
  );
  const units = capacity.reduce((sum, row) => sum + row.held, 0);
  const open = capacity.reduce((sum, row) => sum + row.open, 0);
  const held = Math.max(0, units - open);
  const heldShare = units > 0 ? (held / units) * 100 : 0;
  const byCity = cities.map((city) => {
    const rows = capacity.filter((row) => row.city === city);
    const cityUnits = rows.reduce((sum, row) => sum + row.held, 0);
    const cityOpen = rows.reduce((sum, row) => sum + row.open, 0);
    const cityHeld = Math.max(0, cityUnits - cityOpen);
    return {
      city,
      held: cityHeld,
      units: cityUnits,
      share: cityUnits > 0 ? (cityHeld / cityUnits) * 100 : 0,
    };
  });
  const upcoming = assignments.filter((assignment) => assignment.checkIn > today).length;
  const fresh = submissions.filter((item) => {
    const created = Date.parse(item.createdAt);
    return item.status === "new" && Number.isFinite(created) && Date.now() - created < 86_400_000;
  }).length;
  const dateLabel = new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    timeZone: "Asia/Riyadh",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <AdminShell
      title={copy.overview}
      searchPlaceholder={copy.searchAllotments}
      note={
        <span className="inline-flex items-center gap-2 rounded-full border border-[#dfe5ec] bg-white px-3 py-1 text-xs font-medium text-[#5c6470]">
          <i aria-hidden="true" className="ti ti-calendar text-[14px]" />
          {copy.today} · {dateLabel} · {copy.riyadh}
        </span>
      }
      actions={
        <div className="flex gap-2">
          <Link href="/admin/hotels/new" className={adminButtonSecondaryClass}>
            <i aria-hidden="true" className="ti ti-plus text-[15px]" />
            {copy.newHotel}
          </Link>
          <Link href="/admin/purchases/new" className={adminButtonClass}>
            <i aria-hidden="true" className="ti ti-plus text-[15px]" />
            {copy.newPurchase}
          </Link>
        </div>
      }
    >
      <div className="mx-auto grid max-w-[1180px] gap-5">
        <section className="desk-rise rounded-xl border border-[#dfe5ec] bg-white px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="font-news text-[19px] font-medium tracking-tight">
                  {copy.capacityToday}
                </h2>
                <p className="text-[13px] text-[#5c6470]">
                  <span className="font-plex text-[#081c36]">
                    <CountUp value={units} />
                  </span>{" "}
                  {fill(copy.unitsAcross, { count: "", hotels: stats.hotels }).trim()}
                </p>
              </div>
              <div className="mt-5 flex text-[13px] font-medium">
                <p className="text-[#0e4d8c]" style={{ width: `${Math.max(heldShare, 12)}%` }}>
                  {copy.held}{" "}
                  <span className="font-news text-2xl">
                    <CountUp value={held} />
                  </span>
                  <span className="ms-1 text-xs text-[#5c6470]">
                    ({units ? Math.round(heldShare) : 0}%)
                  </span>
                </p>
                <p className="ms-auto text-[#9a7a1f]">
                  {copy.open}{" "}
                  <span className="font-news text-2xl">
                    <CountUp value={open} />
                  </span>
                  <span className="ms-1 text-xs text-[#5c6470]">
                    ({units ? Math.round(100 - heldShare) : 0}%)
                  </span>
                </p>
              </div>
              <div className="mt-1.5 flex h-3.5 overflow-hidden rounded-full bg-[#f4efea]">
                <div
                  className="cap-fill bg-[#0e4d8c]"
                  style={{ width: `${heldShare}%` }}
                />
                <div className="cap-fill min-w-0 flex-1 border border-l-0 border-[#c59b27] bg-[#ffdf98]" />
              </div>
              <p className="mt-2.5 text-xs text-[#5c6470]">
                {copy.capacityNote}
              </p>
            </div>
            <div className="w-full max-w-sm border-[#eef0f3] sm:border-s sm:ps-8">
              <p className="text-[13px] font-semibold">{copy.heldByCity}</p>
              <ul className="mt-3 grid gap-3">
                {byCity.map((row) => (
                  <li
                    key={row.city}
                    className="grid grid-cols-[72px_1fr_auto] items-center gap-3"
                  >
                    <span className="text-[13px] font-medium">{copy[row.city]}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-[#ffdf98]/70">
                      <span
                        className="cap-fill block h-full rounded-full bg-[#0e4d8c]"
                        style={{ width: `${row.share}%` }}
                      />
                    </span>
                    <span className="font-plex text-xs text-[#5c6470]">
                      <span className="font-medium text-[#081c36]">{row.held}</span> {copy.of}{" "}
                      {row.units}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/forms"
            className="block rounded-xl border border-[#dfe5ec] bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#c59b27]/45"
          >
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">{copy.requests}</h3>
              {fresh > 0 && (
                <span className="text-xs font-semibold text-[#9a7a1f]">
                  {fill(copy.newToday, { count: fresh })}
                </span>
              )}
            </div>
            <p className="font-news mt-1 text-[30px] leading-none font-medium">
              <CountUp value={submissions.length} />
              <span className="ms-2 font-sans text-[15px] font-medium text-[#5c6470]">{copy.openLabel}</span>
            </p>
            <ul className="mt-3 divide-y divide-[#eef0f3] border-t border-[#eef0f3]">
              {submissions.slice(0, 3).map((submission) => (
                <li key={submission.id} className="flex justify-between gap-3 py-2 text-[13px]">
                  <span>
                    <span className="font-semibold">
                      {submission.agencyName || submission.name}
                    </span>
                    <span className="text-[#5c6470]">
                      {" "}
                      · {submission.kind === "quote" ? copy.allotmentRequest : copy.agencyApplication}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Link>
          <Link
            href="/admin/purchases?status=draft"
            className="block rounded-xl border border-[#dfe5ec] bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#c59b27]/45"
          >
            <h3 className="text-sm font-semibold">{copy.draftPurchases}</h3>
            <p className="font-news mt-1 text-[30px] leading-none font-medium">
              <CountUp value={drafts.length} />
              <span className="ms-2 font-sans text-[15px] font-medium text-[#5c6470]">
                {copy.unconfirmed}
              </span>
            </p>
            <ul className="mt-3 divide-y divide-[#eef0f3] border-t border-[#eef0f3]">
              {drafts.slice(0, 3).map((purchase) => (
                <li key={purchase.id} className="flex justify-between gap-3 py-2 text-[13px]">
                  <span className="font-semibold">{purchase.hotelName}</span>
                  <span className="font-plex">{formatMoney(purchaseAmount(purchase), locale)}</span>
                </li>
              ))}
            </ul>
          </Link>
        </section>

        <section className="grid gap-px overflow-hidden rounded-xl border border-[#dfe5ec] bg-[#dfe5ec] sm:grid-cols-4">
          {[
            [copy.hotels, stats.hotels],
            [copy.roomTypes, stats.rooms],
            [copy.inHouse, stats.activeAssignments],
            [copy.upcomingStays, upcoming],
          ].map(([label, value]) => (
            <article key={label} className="bg-white px-4 py-3">
              <span className="text-[11px] font-semibold tracking-wide text-[#5c6470] uppercase">
                {label}
              </span>
              <strong className="font-news mt-1 block text-2xl font-medium">
                <CountUp value={Number(value)} />
              </strong>
            </article>
          ))}
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-news text-[19px] font-medium">{copy.latestAllotments}</h2>
            <Link href="/admin/assignments" className="text-sm font-semibold text-[#0e4d8c]">
              {copy.viewAll}
            </Link>
          </div>
          <AssignmentTable assignments={assignments.slice(0, 8)} />
        </section>
      </div>
    </AdminShell>
  );
}

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Circle,
} from "lucide-react";
import { AssignmentTable } from "@/components/assignment-table";
import { AdminShell } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminSectionHeader,
  AdminStatStrip,
  adminButtonClass,
  adminButtonSecondaryClass,
} from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listBookings } from "@/lib/bookings";
import {
  cities,
  heldQuantity,
  inventoryStats,
  listAssignments,
  listHotels,
  listPurchases,
  listRooms,
  openQuantity,
  roomHasPeriod,
  type City,
} from "@/lib/inventory";
import { todayInRiyadh } from "@/lib/money";
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
  const [
    stats,
    assignments,
    submissions,
    hotels,
    rooms,
    drafts,
    pendingBookings,
  ] = await Promise.all([
    inventoryStats(),
    listAssignments(),
    listSubmissions(),
    listHotels(),
    listRooms(),
    listPurchases({ status: "draft" }),
    listBookings("pending"),
  ]);
  const stockRooms = rooms.filter(roomHasPeriod);
  const capacity = await Promise.all(
    stockRooms.map(async (room) => {
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
  const hasInventory = units > 0;
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
  const anyCityStock = byCity.some((row) => row.units > 0);
  const activeAssignments = assignments.filter(
    (assignment) => assignment.checkOut > today,
  );
  const upcoming = activeAssignments.filter(
    (assignment) => assignment.checkIn > today,
  ).length;
  const newRequests = submissions.filter((item) => item.status === "new");
  const fresh = newRequests.filter(
    (item) => item.createdAt.slice(0, 10) === today,
  ).length;
  const attention = [
    {
      href: "/admin/forms?status=new",
      label: copy.newRequests,
      count: newRequests.length,
      action: copy.queueReview,
      detail: fresh ? fill(copy.newToday, { count: fresh }) : undefined,
    },
    {
      href: "/admin/purchases?status=draft",
      label: copy.draftPurchases,
      count: drafts.length,
      action: copy.queueConfirm,
      detail: copy.unconfirmed,
    },
    {
      href: "/admin/bookings?status=pending",
      label: copy.pendingPayments,
      count: pendingBookings.length,
      action: copy.queueCollect,
      detail: copy.bookings,
    },
  ].filter((item) => item.count > 0);
  const setupSteps = [
    {
      done: stats.hotels > 0,
      label: copy.setupStepHotel,
      href: "/admin/hotels/new",
      action: copy.newHotel,
    },
    {
      done: stockRooms.length > 0,
      label: copy.setupStepPurchase,
      href: "/admin/purchases/new",
      action: copy.newPurchase,
    },
    {
      done: assignments.length > 0,
      label: copy.setupStepSale,
      href: "/admin/allotments/new",
      action: copy.newAllotment,
    },
  ];
  const dateLabel = new Intl.DateTimeFormat(
    locale === "fr" ? "fr-FR" : "en-GB",
    {
      timeZone: "Asia/Riyadh",
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(new Date());

  return (
    <AdminShell
      title={copy.overview}
      note={
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--desk-line)] bg-white px-3 py-1 text-xs font-medium text-[var(--desk-muted)]">
          <CalendarDays aria-hidden="true" size={14} />
          {copy.today} · {dateLabel} · {copy.riyadh}
        </span>
      }
      actions={
        <>
          <Link href="/admin/hotels/new" className={adminButtonSecondaryClass}>
            {copy.newHotel}
          </Link>
          <Link href="/admin/purchases/new" className={adminButtonClass}>
            {copy.newPurchase}
          </Link>
        </>
      }
    >
      <div className="grid gap-6">
        {hasInventory ? (
          <section className="desk-rise overflow-hidden rounded-2xl border border-[var(--desk-line)] bg-white">
            <div className="grid gap-7 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h2 className="font-news text-xl font-medium tracking-tight">
                      {copy.capacityToday}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--desk-muted)]">
                      {fill(copy.unitsAcross, {
                        count: units,
                        hotels: stats.hotels,
                      })}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-5 text-sm">
                    <p className="text-[var(--desk-primary)]">
                      {copy.held}{" "}
                      <strong className="font-news ms-1 text-2xl font-medium">
                        {held}
                      </strong>
                      {heldShare > 0 && heldShare < 100 && (
                        <span className="ms-1 text-xs text-[var(--desk-muted)]">
                          {Math.round(heldShare)}%
                        </span>
                      )}
                    </p>
                    <p className="text-[var(--desk-warning)]">
                      {copy.open}{" "}
                      <strong className="font-news ms-1 text-2xl font-medium">
                        {open}
                      </strong>
                      {heldShare > 0 && heldShare < 100 && (
                        <span className="ms-1 text-xs text-[var(--desk-muted)]">
                          {Math.round(100 - heldShare)}%
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div
                  className="mt-5 flex h-4 overflow-hidden rounded-full bg-[var(--desk-neutral-soft)]"
                  aria-label={`${copy.held} ${Math.round(heldShare)}%`}
                >
                  <div
                    className="cap-fill bg-[var(--desk-primary)]"
                    style={{ width: `${heldShare}%` }}
                  />
                  <div className="min-w-0 flex-1 bg-[var(--desk-gold-soft)]" />
                </div>
                <p className="mt-3 text-xs leading-5 text-[var(--desk-muted)]">
                  {copy.capacityNote}
                </p>
              </div>
              {anyCityStock && (
                <div className="border-t border-[var(--desk-line)] pt-5 lg:border-t-0 lg:border-s lg:pt-0 lg:ps-7">
                  <p className="text-sm font-semibold">{copy.heldByCity}</p>
                  <ul className="mt-4 grid gap-4">
                    {byCity
                      .filter((row) => row.units > 0)
                      .map((row) => (
                        <li
                          key={row.city}
                          className="grid grid-cols-[5rem_1fr_auto] items-center gap-3"
                        >
                          <span className="text-sm font-medium">
                            {copy[row.city]}
                          </span>
                          <span className="h-2 overflow-hidden rounded-full bg-[var(--desk-neutral-soft)]">
                            <span
                              className="cap-fill block h-full rounded-full bg-[var(--desk-primary)]"
                              style={{ width: `${row.share}%` }}
                            />
                          </span>
                          <span className="font-plex text-xs text-[var(--desk-muted)]">
                            <strong className="font-medium text-[var(--desk-ink)]">
                              {row.held}
                            </strong>{" "}
                            {copy.of} {row.units}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="desk-rise overflow-hidden rounded-2xl border border-[var(--desk-line)] bg-white">
            <div className="p-5 sm:p-6">
              <h2 className="font-news text-xl font-medium tracking-tight">
                {copy.setupTitle}
              </h2>
              <p className="mt-1 text-sm text-[var(--desk-muted)]">
                {copy.setupIntro}
              </p>
              <ol className="mt-5 grid gap-2.5">
                {setupSteps.map((step) => (
                  <li
                    key={step.href}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--desk-line)] px-4 py-3"
                  >
                    {step.done ? (
                      <Check
                        aria-hidden="true"
                        size={18}
                        className="shrink-0 text-[var(--desk-success)]"
                      />
                    ) : (
                      <Circle
                        aria-hidden="true"
                        size={18}
                        className="shrink-0 text-[var(--desk-muted-soft)]"
                      />
                    )}
                    <span
                      className={`min-w-0 flex-1 text-sm font-medium ${
                        step.done
                          ? "text-[var(--desk-muted)]"
                          : "text-[var(--desk-ink)]"
                      }`}
                    >
                      {step.label}
                    </span>
                    {step.done ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--desk-success)]">
                        {copy.setupDone}
                      </span>
                    ) : (
                      <Link
                        href={step.href}
                        className="desk-focus inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-[var(--desk-primary)] hover:underline"
                      >
                        {step.action}
                        <ArrowRight aria-hidden="true" size={15} />
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        <section className="desk-rise desk-rise-1">
          <AdminSectionHeader title={copy.attention} />
          <div className="divide-y divide-[var(--desk-line)] overflow-hidden rounded-2xl border border-[var(--desk-line)] bg-white">
            {attention.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-4 text-sm text-[var(--desk-muted)]">
                <Check
                  aria-hidden="true"
                  size={17}
                  className="shrink-0 text-[var(--desk-success)]"
                />
                {copy.actionQueueEmpty}
              </div>
            ) : (
              attention.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="desk-focus group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--desk-surface-muted)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.label}</p>
                    {item.detail && (
                      <p className="mt-0.5 text-xs text-[var(--desk-muted)]">
                        {item.detail}
                      </p>
                    )}
                  </div>
                  <strong className="font-news text-2xl font-medium tabular-nums">
                    {item.count}
                  </strong>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--desk-primary)]">
                    {item.action}
                    <ArrowRight
                      aria-hidden="true"
                      size={15}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        <div className="desk-rise desk-rise-2">
          <AdminStatStrip
            items={[
              { label: copy.hotels, value: stats.hotels },
              { label: copy.roomTypes, value: stats.rooms },
              { label: copy.inHouse, value: stats.activeAssignments },
              { label: copy.upcomingStays, value: upcoming },
            ]}
          />
        </div>

        <section className="desk-rise desk-rise-3">
          <AdminSectionHeader
            title={copy.activeRoomHolds}
            description={copy.activeRoomHoldsDescription}
            action={
              <Link
                href="/admin/allotments"
                className="desk-focus inline-flex items-center gap-1 rounded-lg text-sm font-semibold text-[var(--desk-primary)]"
              >
                {copy.viewAll}
                <ArrowRight aria-hidden="true" size={15} />
              </Link>
            }
          />
          {activeAssignments.length ? (
            <AssignmentTable assignments={activeAssignments.slice(0, 8)} />
          ) : (
            <AdminEmptyState
              compact
              title={copy.noAllotmentRows}
              action={
                <Link
                  href="/admin/allotments/new"
                  className={adminButtonClass}
                >
                  {copy.newAllotment}
                </Link>
              }
            />
          )}
        </section>
      </div>
    </AdminShell>
  );
}

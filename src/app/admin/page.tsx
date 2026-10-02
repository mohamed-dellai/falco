import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  Inbox,
  Plus,
  ReceiptText,
} from "lucide-react";
import { AssignmentTable } from "@/components/assignment-table";
import { AdminShell } from "@/components/admin-shell";
import {
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
            <Plus aria-hidden="true" size={16} />
            {copy.newHotel}
          </Link>
          <Link href="/admin/purchases/new" className={adminButtonClass}>
            <Plus aria-hidden="true" size={16} />
            {copy.newPurchase}
          </Link>
        </>
      }
    >
      <div className="grid gap-6">
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
                    <span className="ms-1 text-xs text-[var(--desk-muted)]">
                      {units ? Math.round(heldShare) : 0}%
                    </span>
                  </p>
                  <p className="text-[var(--desk-warning)]">
                    {copy.open}{" "}
                    <strong className="font-news ms-1 text-2xl font-medium">
                      {open}
                    </strong>
                    <span className="ms-1 text-xs text-[var(--desk-muted)]">
                      {units ? Math.round(100 - heldShare) : 0}%
                    </span>
                  </p>
                </div>
              </div>
              <div
                className="mt-5 flex h-4 overflow-hidden rounded-full bg-[var(--desk-gold-soft)]/70"
                aria-label={`${copy.held} ${Math.round(heldShare)}%`}
              >
                <div
                  className="cap-fill bg-[var(--desk-primary)]"
                  style={{ width: `${heldShare}%` }}
                />
                <div className="min-w-0 flex-1 border border-[var(--desk-gold)]" />
              </div>
              <p className="mt-3 text-xs leading-5 text-[var(--desk-muted)]">
                {copy.capacityNote}
              </p>
            </div>
            <div className="border-t border-[var(--desk-line)] pt-5 lg:border-t-0 lg:border-s lg:pt-0 lg:ps-7">
              <p className="text-sm font-semibold">{copy.heldByCity}</p>
              <ul className="mt-4 grid gap-4">
                {byCity.map((row) => (
                  <li
                    key={row.city}
                    className="grid grid-cols-[5rem_1fr_auto] items-center gap-3"
                  >
                    <span className="text-sm font-medium">
                      {copy[row.city]}
                    </span>
                    <span className="h-2 overflow-hidden rounded-full bg-[var(--desk-gold-soft)]/70">
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
          </div>
        </section>

        <section>
          <AdminSectionHeader title={copy.attention} />
          <div className="grid gap-3 md:grid-cols-3">
            <AttentionCard
              href="/admin/forms?status=new"
              icon={<Inbox aria-hidden="true" size={18} />}
              label={copy.newRequests}
              value={newRequests.length}
              detail={
                fresh ? fill(copy.newToday, { count: fresh }) : copy.requests
              }
            />
            <AttentionCard
              href="/admin/purchases?status=draft"
              icon={<ReceiptText aria-hidden="true" size={18} />}
              label={copy.draftPurchases}
              value={drafts.length}
              detail={copy.unconfirmed}
            />
            <AttentionCard
              href="/admin/bookings?status=pending"
              icon={<CreditCard aria-hidden="true" size={18} />}
              label={copy.pendingPayments}
              value={pendingBookings.length}
              detail={copy.bookings}
            />
          </div>
        </section>

        <AdminStatStrip
          items={[
            { label: copy.hotels, value: stats.hotels },
            { label: copy.roomTypes, value: stats.rooms },
            { label: copy.inHouse, value: stats.activeAssignments },
            { label: copy.upcomingStays, value: upcoming },
          ]}
        />

        <section>
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
          <AssignmentTable assignments={activeAssignments.slice(0, 8)} />
        </section>
      </div>
    </AdminShell>
  );
}

function AttentionCard({
  href,
  icon,
  label,
  value,
  detail,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="desk-focus group rounded-2xl border border-[var(--desk-line)] bg-white p-4 transition hover:border-[var(--desk-gold)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-[var(--desk-surface-muted)] text-[var(--desk-primary)]">
          {icon}
        </span>
        <ArrowRight
          aria-hidden="true"
          size={16}
          className="text-[var(--desk-muted)] transition-transform group-hover:translate-x-0.5"
        />
      </div>
      <p className="mt-4 text-sm font-semibold">{label}</p>
      <p className="font-news mt-1 text-3xl font-medium">{value}</p>
      <p className="mt-1 text-xs text-[var(--desk-muted)]">{detail}</p>
    </Link>
  );
}

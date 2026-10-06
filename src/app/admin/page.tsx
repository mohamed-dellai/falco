import type { ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  CalendarRange,
  Hourglass,
  Hotel,
  Plus,
  ReceiptText,
  Warehouse,
} from "lucide-react";
import {
  cancelAllotmentAction,
  cancelBookingAction,
} from "@/app/admin/actions";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill, type AdminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listBookings, type Booking } from "@/lib/bookings";
import {
  allotmentValue,
  cities,
  inventoryStats,
  listAllotments,
  listAssignments,
  listHotels,
  listPurchases,
  purchaseAmount,
  purchaseSpan,
  type Allotment,
  type City,
  type Purchase,
} from "@/lib/inventory";
import { formatDateRange, formatMoney, nightsBetween, todayInRiyadh } from "@/lib/money";
import { roomTypeLabel } from "@/lib/room-types";

const barButton =
  "desk-focus desk-press inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-[var(--desk-line)] bg-white px-2.5 text-xs font-semibold text-[var(--desk-ink)] shadow-sm hover:bg-[var(--desk-surface-muted)]";
const barPrimary =
  "desk-focus desk-press inline-flex h-8 items-center justify-center gap-1 rounded-full bg-[var(--desk-primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--desk-primary-hover)]";

export const dynamic = "force-dynamic";

const waveColors = ["var(--desk-primary-deep)", "var(--desk-primary)", "var(--desk-gold)"];

function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function holdLeft(iso: string) {
  const minutes = Math.floor((new Date(iso).getTime() - Date.now()) / 60_000);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  if (hours >= 48) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours >= 1) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function seasonLabel(locale: string) {
  const tag = locale === "fr" ? "fr-FR" : "en-GB";
  const hijri = new Intl.DateTimeFormat(`${tag}-u-ca-islamic-umalqura`, {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(new Date());
  const gregorian = new Intl.DateTimeFormat(tag, {
    month: "short",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(new Date());
  return { hijri, gregorian };
}

function roomLabel(name: string, copy: AdminCopy) {
  return roomTypeLabel(name, (type) => copy[type]);
}

function cityOf(value: string | undefined): City | undefined {
  return cities.includes(value as City) ? (value as City) : undefined;
}

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const city = cityOf(query.city);
  const today = todayInRiyadh();
  const soon = addDays(today, 3);
  const [stats, purchases, allotments, assignments, bookings, hotels] =
    await Promise.all([
      inventoryStats(),
      listPurchases({ status: "confirmed" }),
      listAllotments(),
      listAssignments(),
      listBookings("pending"),
      listHotels(),
    ]);
  const hotelById = new Map(hotels.map((hotel) => [hotel.id, hotel]));
  const confirmed = purchases.filter((purchase) =>
    city ? purchase.hotelCity === city : true,
  );
  const allocated = confirmed.reduce(
    (sum, purchase) =>
      sum + purchase.lines.reduce((lineSum, line) => lineSum + line.quantity, 0),
    0,
  );
  const wholesaleValue = confirmed.reduce(
    (sum, purchase) => sum + purchaseAmount(purchase),
    0,
  );
  const roomNights = confirmed.reduce(
    (sum, purchase) =>
      sum +
      purchase.lines.reduce(
        (lineSum, line) =>
          lineSum + line.quantity * nightsBetween(line.checkIn, line.checkOut),
        0,
      ),
    0,
  );
  const inHouse = assignments
    .filter((item) => item.checkIn <= today && item.checkOut > today)
    .reduce((sum, item) => sum + item.quantity, 0);
  const arriving = assignments
    .filter((item) => item.checkIn > today && item.checkIn <= soon)
    .reduce((sum, item) => sum + item.quantity, 0);
  const saleByBooking = new Map(
    allotments.flatMap((item) =>
      item.bookingId ? [[item.bookingId, item.id] as const] : [],
    ),
  );
  const liveBookings = bookings.filter((booking) => holdLeft(booking.holdUntil));
  const drafts = allotments.filter(
    (item) => item.status === "request" && item.channel !== "b2c",
  );
  const activeSales = allotments.filter(
    (item) => item.status === "confirmed" && item.checkOut > today,
  );
  const provisionalSales = allotments.filter((item) => item.status === "provisional");
  const lockedRooms =
    provisionalSales.reduce((sum, item) => sum + allotmentValue(item).rooms, 0) +
    activeSales.reduce((sum, item) => sum + allotmentValue(item).rooms, 0);
  const nearestBooking = liveBookings
    .slice()
    .sort((left, right) => left.holdUntil.localeCompare(right.holdUntil))[0];
  const nearest = nearestBooking ? holdLeft(nearestBooking.holdUntil) : null;
  const season = seasonLabel(locale);
  const cityCounts = cities.map((item) => ({
    city: item,
    count: purchases.filter((purchase) => purchase.hotelCity === item).length,
  }));

  return (
    <AdminShell
      title={copy.overview}
      note={
        <span className="hidden items-center gap-2 sm:inline-flex">
          <span className="text-[var(--desk-line-strong)]">/</span>
          <span className="text-xs font-medium text-[var(--desk-text)]">
            {season.hijri}
          </span>
          <span className="font-plex text-[11px] text-[var(--desk-muted)]">
            {season.gregorian}
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-[var(--desk-success-line)] bg-[var(--desk-success-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--desk-success)]">
            <span className="size-1.5 rounded-full bg-[var(--desk-success)]" />
            {copy.live}
          </span>
        </span>
      }
    >
      <div className="grid gap-4">
        <section className="flex flex-col gap-3 rounded-lg border border-[var(--desk-line)] bg-white p-3.5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded border border-[var(--desk-line)] bg-[var(--desk-surface-muted)] text-[var(--desk-ink)]">
              <Warehouse aria-hidden="true" size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-[var(--desk-ink)]">
                {copy.portfolioTitle}
              </h2>
              <p className="text-xs text-[var(--desk-muted)]">{copy.portfolioNote}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/hotels/new" className={barButton}>
              <Hotel aria-hidden="true" size={14} />
              {copy.newHotel}
            </Link>
            <Link href="/admin/allotments/new" className={barButton}>
              <ReceiptText aria-hidden="true" size={14} />
              {copy.newAllotment}
            </Link>
            <Link href="/admin/purchases/new" className={barPrimary}>
              <Plus aria-hidden="true" size={14} />
              {copy.newPurchase}
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            label={copy.wholesaleStock}
            value={String(allocated)}
            suffix={copy.roomsAllocated}
            icon={<Warehouse aria-hidden="true" size={18} className="text-[var(--desk-primary)]" />}
            detail={
              <span className="font-medium text-[var(--desk-success)]">
                {stats.openUnits} {copy.openToSell}
              </span>
            }
            meta={`${stats.hotels} ${copy.hotels}`}
          />
          <Kpi
            label={copy.inHouse}
            value={String(inHouse)}
            suffix={copy.checkedIn}
            icon={<Hotel aria-hidden="true" size={18} />}
            detail={<span>{copy.arrivals72}</span>}
            meta={String(arriving)}
          />
          <Kpi
            label={copy.activeHoldsLabel}
            value={String(drafts.length + activeSales.length + liveBookings.length)}
            suffix={
              lockedRooms
                ? `(${fill(copy.roomsLocked, { count: lockedRooms })})`
                : undefined
            }
            icon={<Hourglass aria-hidden="true" size={18} className="text-[var(--desk-warning)]" />}
            detail={<span>{copy.nearestHold}</span>}
            meta={nearest ?? copy.noTimedHold}
            metaTone={nearest ? "warning" : "muted"}
          />
          <Kpi
            label={copy.grossWholesale}
            value={formatMoney(wholesaleValue, locale)}
            icon={
              <span className="rounded border border-[var(--desk-warning-line)] bg-[var(--desk-gold-soft)] px-1.5 py-0.5 font-plex text-[10px] font-bold text-[var(--desk-gold)]">
                SAR
              </span>
            }
            detail={<span>{copy.avgNight}</span>}
            meta={
              roomNights > 0
                ? formatMoney(Math.round(wholesaleValue / roomNights), locale)
                : "—"
            }
          />
        </section>

        <section className="overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--desk-line)] bg-[var(--desk-surface-muted)] px-5 py-3">
            <div className="flex items-center gap-2">
              <CalendarRange aria-hidden="true" size={18} className="text-[var(--desk-primary)]" />
              <h2 className="text-sm font-bold text-[var(--desk-ink)]">
                {copy.allocationTitle}
              </h2>
            </div>
            <nav aria-label={copy.allCities} className="flex overflow-hidden rounded border border-[var(--desk-line)] bg-white text-xs shadow-sm">
              <CityLink href="/admin" active={!city} label={`${copy.allCities} (${purchases.length})`} />
              {cityCounts.map((item) => (
                <CityLink
                  key={item.city}
                  href={`/admin?city=${item.city}`}
                  active={city === item.city}
                  label={`${copy[item.city]} (${item.count})`}
                />
              ))}
            </nav>
          </header>
          {confirmed.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--desk-muted)]">
              {copy.noAllocation}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--desk-line)] text-[11px] font-semibold tracking-wider text-[var(--desk-muted)] uppercase">
                    <th className="px-4 py-2.5">{copy.property}</th>
                    <th className="px-4 py-2.5">{copy.zone}</th>
                    <th className="px-3 py-2.5 text-center">{copy.allocated}</th>
                    <th className="px-4 py-2.5">{copy.staySpread}</th>
                    <th className="px-3 py-2.5 text-center">{copy.nights}</th>
                    <th className="px-4 py-2.5 text-end">{copy.contractValue}</th>
                    <th className="px-3 py-2.5 text-center">
                      <span className="sr-only">{copy.purchases}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--desk-line-soft)]">
                  {confirmed.map((purchase) => (
                    <PurchaseRow
                      key={purchase.id}
                      purchase={purchase}
                      copy={copy}
                      locale={locale}
                      zone={
                        hotelById.get(purchase.hotelId)?.distanceToHaram ||
                        copy[purchase.hotelCity]
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--desk-line)] bg-[var(--desk-canvas)] px-5 py-2.5 text-xs text-[var(--desk-muted)]">
            <span>
              {confirmed.length} {copy.purchases}
            </span>
            <span className="font-plex font-medium text-[var(--desk-ink)]">
              {allocated} {copy.rooms} · {formatMoney(wholesaleValue, locale)}
            </span>
          </footer>
        </section>

        <section className="overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--desk-line)] bg-[var(--desk-surface-muted)] px-5 py-3">
            <div className="flex items-center gap-2">
              <Building2 aria-hidden="true" size={18} className="text-[var(--desk-ink)]" />
              <h2 className="text-sm font-bold text-[var(--desk-ink)]">
                {copy.holdsInProgress}
              </h2>
              <span className="rounded border border-[var(--desk-warning-line)] bg-[var(--desk-warning-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--desk-warning)]">
                {drafts.length + activeSales.length + liveBookings.length}
              </span>
            </div>
            <Link
              href="/admin/allotments"
              className="text-xs font-semibold text-[var(--desk-primary)] hover:underline"
            >
              {copy.viewAll}
            </Link>
          </header>
          {drafts.length + activeSales.length + liveBookings.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--desk-muted)]">
              {copy.holdsNote}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--desk-line)] text-[11px] font-semibold tracking-wider text-[var(--desk-muted)] uppercase">
                    <th className="px-4 py-2.5">{copy.agencies}</th>
                    <th className="px-4 py-2.5">{copy.property}</th>
                    <th className="px-4 py-2.5">{copy.staySpread}</th>
                    <th className="px-3 py-2.5 text-center">{copy.nights}</th>
                    <th className="px-3 py-2.5 text-center">{copy.rooms}</th>
                    <th className="px-4 py-2.5 text-end">{copy.contractValue}</th>
                    <th className="px-4 py-2.5">{copy.status}</th>
                    <th className="px-4 py-2.5 text-end">
                      <span className="sr-only">{copy.confirmPurchase}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--desk-line-soft)]">
                  {drafts.map((allotment) => (
                    <AllotmentRow
                      key={allotment.id}
                      allotment={allotment}
                      copy={copy}
                      locale={locale}
                      confirmHref={`/admin/allotments/${allotment.id}`}
                    />
                  ))}
                  {activeSales.map((allotment) => (
                    <AllotmentRow
                      key={allotment.id}
                      allotment={allotment}
                      copy={copy}
                      locale={locale}
                      release
                    />
                  ))}
                  {liveBookings.map((booking) => (
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      copy={copy}
                      locale={locale}
                      saleHref={
                        saleByBooking.get(booking.id)
                          ? `/admin/allotments/${saleByBooking.get(booking.id)}`
                          : undefined
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <footer className="border-t border-[var(--desk-line)] bg-[var(--desk-canvas)] px-5 py-3 text-xs text-[var(--desk-muted)]">
            {copy.holdsNote}
          </footer>
        </section>
      </div>
    </AdminShell>
  );
}

function CityLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`border-e border-[var(--desk-line)] px-3 py-1 last:border-e-0 ${
        active
          ? "bg-[var(--desk-surface-muted)] font-semibold text-[var(--desk-ink)]"
          : "text-[var(--desk-muted)] hover:bg-[var(--desk-canvas)]"
      }`}
    >
      {label}
    </Link>
  );
}

function Kpi({
  label,
  value,
  suffix,
  icon,
  detail,
  meta,
  metaTone = "muted",
}: {
  label: string;
  value: string;
  suffix?: string;
  icon: ReactNode;
  detail: ReactNode;
  meta: string;
  metaTone?: "muted" | "warning";
}) {
  return (
    <article className="rounded-lg border border-[var(--desk-line)] bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-[11px] font-medium tracking-wider text-[var(--desk-muted)] uppercase">
        {label}
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <strong className="font-plex text-2xl font-bold text-[var(--desk-ink)]">
          {value}
        </strong>
        {suffix && (
          <span className="text-xs font-medium text-[var(--desk-muted)]">{suffix}</span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-[var(--desk-line-soft)] pt-2 text-[11px] text-[var(--desk-muted)]">
        {detail}
        <span
          className={`font-plex font-medium ${
            metaTone === "warning"
              ? "text-[var(--desk-warning)]"
              : "text-[var(--desk-text)]"
          }`}
        >
          {meta}
        </span>
      </div>
    </article>
  );
}

function PurchaseRow({
  purchase,
  copy,
  locale,
  zone,
}: {
  purchase: Purchase;
  copy: AdminCopy;
  locale: string;
  zone: string;
}) {
  const span = purchaseSpan(purchase.lines);
  const nights = span ? nightsBetween(span.checkIn, span.checkOut) : 0;
  const rooms = purchase.lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = rooms || 1;
  return (
    <tr className="hover:bg-[var(--desk-canvas)]">
      <td className="px-4 py-3">
        <div className="font-medium text-[var(--desk-ink)]">{purchase.hotelName}</div>
        <div className="mt-0.5 font-plex text-[11px] text-[var(--desk-muted)]">
          {purchase.number}
          {purchase.lines[0]
            ? ` · ${roomLabel(purchase.lines[0].roomName, copy)}`
            : ""}
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-medium ${
            purchase.hotelCity === "makkah"
              ? "border-[var(--desk-warning-line)] bg-[var(--desk-gold-soft)] text-[var(--desk-gold)]"
              : "border-[var(--desk-line)] bg-[var(--desk-surface-muted)] text-[var(--desk-text)]"
          }`}
        >
          {zone}
        </span>
      </td>
      <td className="px-3 py-3 text-center font-plex font-bold text-[var(--desk-ink)]">
        {rooms}
      </td>
      <td className="px-4 py-3">
        <div className="flex h-2 overflow-hidden rounded-full border border-[var(--desk-line)] bg-[var(--desk-surface-muted)]">
          {purchase.lines.map((line, index) => (
            <span
              key={line.id}
              title={roomLabel(line.roomName, copy)}
              className="h-full"
              style={{
                width: `${(line.quantity / total) * 100}%`,
                background: waveColors[index % waveColors.length],
              }}
            />
          ))}
        </div>
        <p className="mt-1 font-plex text-[10px] text-[var(--desk-muted)]">
          {span ? formatDateRange(span.checkIn, span.checkOut, locale) : "—"}
        </p>
      </td>
      <td className="px-3 py-3 text-center">
        <span className="rounded border border-[var(--desk-success-line)] bg-[var(--desk-success-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--desk-success)]">
          {nights}
        </span>
      </td>
      <td className="px-4 py-3 text-end font-plex font-bold text-[var(--desk-ink)]">
        {formatMoney(purchaseAmount(purchase), locale)}
      </td>
      <td className="px-3 py-3 text-center">
        <Link
          href={`/admin/purchases/${purchase.id}`}
          className="desk-focus rounded px-2 py-1 text-[11px] font-semibold text-[var(--desk-primary)] hover:underline"
        >
          {copy.viewAll}
        </Link>
      </td>
    </tr>
  );
}

function AllotmentRow({
  allotment,
  copy,
  locale,
  confirmHref,
  release = false,
}: {
  allotment: Allotment;
  copy: AdminCopy;
  locale: string;
  confirmHref?: string;
  release?: boolean;
}) {
  const value = allotmentValue(allotment);
  const room = allotment.lines[0];
  return (
    <tr className="hover:bg-[var(--desk-canvas)]">
      <td className="px-4 py-3">
        <span className="block font-semibold text-[var(--desk-ink)]">
          {allotment.agencyName}
        </span>
        <span className="font-plex text-[11px] text-[var(--desk-muted)]">
          {allotment.number}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="block font-medium text-[var(--desk-text)]">
          {room?.hotelName ?? "—"}
        </span>
        <span className="text-[11px] text-[var(--desk-muted)]">
          {room ? roomLabel(room.roomName, copy) : "—"}
        </span>
      </td>
      <td className="px-4 py-3 font-plex text-[var(--desk-text)]">
        {formatDateRange(allotment.checkIn, allotment.checkOut, locale)}
      </td>
      <td className="px-3 py-3 text-center font-plex">{value.nights}</td>
      <td className="px-3 py-3 text-center font-plex font-bold">{value.rooms}</td>
      <td className="px-4 py-3 text-end font-plex font-bold">
        {formatMoney(value.revenue, locale)}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold ${
            allotment.status === "request"
              ? "border-[var(--desk-warning-line)] bg-[var(--desk-warning-soft)] text-[var(--desk-warning)]"
              : "border-[var(--desk-success-line)] bg-[var(--desk-success-soft)] text-[var(--desk-success)]"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              allotment.status === "request"
                ? "bg-[var(--desk-warning)]"
                : "bg-[var(--desk-success)]"
            }`}
          />
          {allotment.status === "request"
            ? copy.statusRequest
            : allotment.status === "provisional"
              ? copy.statusProvisional
              : allotment.status === "no_show"
                ? copy.statusNoShow
                : allotment.status === "cancelled"
                  ? copy.cancelled
                  : copy.confirmed}
        </span>
      </td>
      <td className="px-4 py-3 text-end">
        <div className="inline-flex items-center gap-1">
          {confirmHref && (
            <Link
              href={confirmHref}
              className="rounded bg-[var(--desk-primary)] px-2 py-1 text-[11px] font-medium text-white hover:bg-[var(--desk-primary-hover)]"
            >
              {copy.queueConfirm}
            </Link>
          )}
          {release && (
            <form action={cancelAllotmentAction}>
              <input type="hidden" name="id" value={allotment.id} />
              <button
                type="submit"
                className="rounded border border-[var(--desk-line)] bg-white px-2 py-1 text-[11px] font-medium text-[var(--desk-muted)] hover:text-[var(--desk-danger)]"
              >
                {copy.releaseAction}
              </button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}

function BookingRow({
  booking,
  copy,
  locale,
  saleHref,
}: {
  booking: Booking;
  copy: AdminCopy;
  locale: string;
  saleHref?: string;
}) {
  const left = holdLeft(booking.holdUntil);
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  return (
    <tr className="hover:bg-[var(--desk-canvas)]">
      <td className="px-4 py-3">
        {saleHref ? (
          <Link href={saleHref} className="block font-semibold text-[var(--desk-ink)] hover:underline">
            {booking.name}
          </Link>
        ) : (
          <span className="block font-semibold text-[var(--desk-ink)]">{booking.name}</span>
        )}
        <span className="font-plex text-[11px] text-[var(--desk-muted)]">
          {booking.number}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="block font-medium text-[var(--desk-text)]">
          {booking.hotelName}
        </span>
        <span className="text-[11px] text-[var(--desk-muted)]">
          {roomLabel(booking.roomName, copy)}
        </span>
      </td>
      <td className="px-4 py-3 font-plex text-[var(--desk-text)]">
        {formatDateRange(booking.checkIn, booking.checkOut, locale)}
      </td>
      <td className="px-3 py-3 text-center font-plex">{nights}</td>
      <td className="px-3 py-3 text-center font-plex font-bold">{booking.quantity}</td>
      <td className="px-4 py-3 text-end font-plex font-bold">
        {formatMoney(booking.publicPricePerNight * nights * booking.quantity, locale)}
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 rounded border border-[var(--desk-warning-line)] bg-[var(--desk-warning-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--desk-warning)]">
          <span className="size-1.5 rounded-full bg-[var(--desk-warning)]" />
          {left}
        </span>
      </td>
      <td className="px-4 py-3 text-end">
        <form action={cancelBookingAction}>
          <input type="hidden" name="id" value={booking.id} />
          <button
            type="submit"
            className="rounded border border-[var(--desk-line)] bg-white px-2 py-1 text-[11px] font-medium text-[var(--desk-muted)] hover:text-[var(--desk-danger)]"
          >
            {copy.releaseAction}
          </button>
        </form>
      </td>
    </tr>
  );
}

import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminSearchForm,
  AdminStatusPill,
  AdminTableFrame,
} from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, countText, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  bookingStatuses,
  listBookings,
  type BookingStatus,
} from "@/lib/bookings";
import { formatDateRange, formatMoney, nightsBetween } from "@/lib/money";

export const dynamic = "force-dynamic";

function asStatus(value: string | undefined) {
  return bookingStatuses.includes(value as BookingStatus)
    ? (value as BookingStatus)
    : undefined;
}

function filterHref(status: string, query: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (query) params.set("q", query);
  const suffix = params.toString();
  return `/admin/bookings${suffix ? `?${suffix}` : ""}`;
}

function BookingStatus({
  status,
  copy,
}: {
  status: BookingStatus;
  copy: ReturnType<typeof adminCopy>;
}) {
  return (
    <AdminStatusPill
      tone={
        status === "confirmed"
          ? "success"
          : status === "cancelled"
            ? "danger"
            : "warning"
      }
    >
      {status === "pending"
        ? copy.pendingPayment
        : status === "confirmed"
          ? copy.confirmed
          : copy.cancelled}
    </AdminStatusPill>
  );
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const status = asStatus(query.status);
  const all = await listBookings();
  const statusRows = status
    ? all.filter((booking) => booking.status === status)
    : all;
  const search = query.q?.trim().toLocaleLowerCase(locale) ?? "";
  const bookings = search
    ? statusRows.filter((booking) =>
        [
          booking.number,
          booking.name,
          booking.email,
          booking.phone,
          booking.hotelName,
          booking.roomName,
          booking.checkIn,
          booking.checkOut,
        ]
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(search),
      )
    : statusRows;
  const filters = [
    ["", copy.all],
    ["pending", copy.pendingPayment],
    ["confirmed", copy.confirmed],
    ["cancelled", copy.cancelled],
  ] as const;

  return (
    <AdminShell
      title={copy.bookings}
      note={
        <p aria-live="polite" className="text-sm text-[var(--desk-muted)]">
          {countText(bookings.length, copy.bookingCountOne, copy.bookingCount)}
        </p>
      }
    >
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <AdminSearchForm
          action="/admin/bookings"
          label={copy.searchBookings}
          placeholder={copy.searchBookings}
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
      {bookings.length === 0 ? (
        <AdminEmptyState
          title={
            search
              ? fill(copy.noMatches, {
                  query: query.q ?? "",
                  count: statusRows.length,
                })
              : copy.noBookings
          }
        />
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {bookings.map((booking) => {
              const nights = Math.max(
                0,
                nightsBetween(booking.checkIn, booking.checkOut),
              );
              return (
                <Link
                  key={booking.id}
                  href={`/admin/bookings/${booking.id}`}
                  className="desk-focus rounded-2xl border border-[var(--desk-line)] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-plex text-xs text-[var(--desk-muted)]">
                        {booking.number}
                      </p>
                      <h2 className="mt-1 font-semibold">{booking.name}</h2>
                    </div>
                    <BookingStatus status={booking.status} copy={copy} />
                  </div>
                  <p className="mt-3 text-sm">
                    {booking.hotelName} · {booking.roomName}
                  </p>
                  <p className="mt-1 font-plex text-xs text-[var(--desk-muted)]">
                    {formatDateRange(booking.checkIn, booking.checkOut, locale)}
                  </p>
                  <div className="mt-3 flex items-end justify-between border-t border-[var(--desk-line)] pt-3">
                    <span className="text-xs text-[var(--desk-muted)]">
                      {booking.quantity} {copy.rooms.toLocaleLowerCase(locale)}{" "}
                      · {booking.travellers}{" "}
                      {copy.travellers.toLocaleLowerCase(locale)}
                    </span>
                    <strong className="font-plex text-sm">
                      {formatMoney(
                        booking.publicPricePerNight * nights * booking.quantity,
                        locale,
                      )}
                    </strong>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="hidden lg:block">
            <AdminTableFrame>
              <table className="desk-table w-full text-sm">
                <thead className="bg-[var(--desk-canvas)]">
                  <tr>
                    <th className="px-4 py-3 text-start">{copy.number}</th>
                    <th className="px-4 py-3 text-start">{copy.guest}</th>
                    <th className="px-4 py-3 text-start">{copy.hotelRoom}</th>
                    <th className="px-4 py-3 text-start">{copy.stay}</th>
                    <th className="px-4 py-3 text-end">{copy.total}</th>
                    <th className="px-4 py-3 text-start">{copy.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const nights = Math.max(
                      0,
                      nightsBetween(booking.checkIn, booking.checkOut),
                    );
                    return (
                      <tr key={booking.id}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/bookings/${booking.id}`}
                            className="desk-focus rounded-sm font-plex font-semibold text-[var(--desk-primary)] hover:underline"
                          >
                            {booking.number}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="block font-semibold">
                            {booking.name}
                          </span>
                          <span className="text-xs text-[var(--desk-muted)]">
                            {booking.email}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {booking.hotelName}
                          <span className="block text-xs text-[var(--desk-muted)]">
                            {booking.roomName}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-plex text-xs">
                          {formatDateRange(
                            booking.checkIn,
                            booking.checkOut,
                            locale,
                          )}
                          <span className="mt-1 block font-sans text-[var(--desk-muted)]">
                            {booking.quantity} · {booking.travellers}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-end font-plex">
                          {formatMoney(
                            booking.publicPricePerNight *
                              nights *
                              booking.quantity,
                            locale,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <BookingStatus status={booking.status} copy={copy} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </AdminTableFrame>
          </div>
        </>
      )}
    </AdminShell>
  );
}

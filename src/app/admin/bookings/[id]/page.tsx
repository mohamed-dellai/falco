import { notFound } from "next/navigation";
import { cancelBookingAction, deleteBookingAction } from "@/app/admin/actions";
import { AdminShell } from "@/components/admin-shell";
import {
  AdminNotice,
  AdminPanel,
  AdminStatStrip,
  AdminStatusPill,
  adminButtonDangerClass,
} from "@/components/admin-ui";
import { NamedConfirm } from "@/components/named-confirm";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getBooking } from "@/lib/bookings";
import {
  formatDateRange,
  formatDateTime,
  formatMoney,
  nightsBetween,
} from "@/lib/money";
import { roomTypeLabel } from "@/lib/room-types";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) notFound();
  const nights = Math.max(0, nightsBetween(booking.checkIn, booking.checkOut));
  const total = booking.publicPricePerNight * nights * booking.quantity;

  return (
    <AdminShell
      title={booking.number}
      crumbs={[{ href: "/admin/bookings", label: copy.bookings }]}
      note={
        <AdminStatusPill
          tone={
            booking.status === "confirmed"
              ? "success"
              : booking.status === "cancelled"
                ? "danger"
                : "warning"
          }
        >
          {booking.status === "pending"
            ? copy.pendingPayment
            : booking.status === "confirmed"
              ? copy.confirmed
              : copy.cancelled}
        </AdminStatusPill>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {booking.status !== "cancelled" && (
            <NamedConfirm
              title={copy.cancelBookingTitle}
              body={fill(copy.cancelBookingBody, { number: booking.number })}
              confirm={copy.cancelAction}
              pendingLabel={copy.cancelling}
              cancelLabel={copy.keepBooking}
              action={cancelBookingAction}
              fields={{ id: booking.id }}
              trigger={copy.cancelAction}
              triggerClassName={adminButtonDangerClass}
            />
          )}
          <NamedConfirm
            title={copy.deleteBookingTitle}
            body={fill(copy.deleteBookingBody, { number: booking.number })}
            confirm={copy.deleteAction}
            pendingLabel={copy.deleting}
            cancelLabel={copy.keepBooking}
            action={deleteBookingAction}
            fields={{ id: booking.id }}
            trigger={copy.deleteAction}
          />
        </div>
      }
    >
      <div className="grid gap-5">
        {booking.status === "cancelled" && (
          <AdminNotice>{copy.bookingCancelledNotice}</AdminNotice>
        )}
        <AdminStatStrip
          items={[
            { label: copy.rooms, value: booking.quantity },
            { label: copy.travellers, value: booking.travellers },
            { label: copy.nights, value: nights },
            { label: copy.total, value: formatMoney(total, locale) },
          ]}
        />
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <AdminPanel title={copy.bookingDetails}>
            <dl className="grid gap-3 text-sm">
              <DetailRow label={copy.hotel} value={booking.hotelName} />
              <DetailRow
                label={copy.roomType}
                value={roomTypeLabel(booking.roomName, (type) => copy[type])}
              />
              <DetailRow
                label={copy.stay}
                value={formatDateRange(
                  booking.checkIn,
                  booking.checkOut,
                  locale,
                )}
                mono
              />
              <DetailRow
                label={copy.priceNight}
                value={formatMoney(booking.publicPricePerNight, locale)}
                mono
              />
              <DetailRow
                label={copy.holdUntil}
                value={formatDateTime(booking.holdUntil, locale)}
              />
              <DetailRow
                label={copy.createdAt}
                value={formatDateTime(booking.createdAt, locale)}
              />
              <DetailRow
                label={copy.confirmedAt}
                value={formatDateTime(booking.confirmedAt, locale)}
              />
            </dl>
          </AdminPanel>
          <div className="grid gap-5">
            <AdminPanel title={copy.guest}>
              <dl className="grid gap-3 text-sm">
                <DetailRow label={copy.contact} value={booking.name} />
                <DetailRow label={copy.email} value={booking.email} />
                <DetailRow label={copy.whatsapp} value={booking.phone} mono />
                <DetailRow label={copy.country} value={booking.country} />
              </dl>
            </AdminPanel>
            <AdminPanel title={copy.payment}>
              <dl className="grid gap-3 text-sm">
                <DetailRow
                  label={copy.paymentReference}
                  value={
                    booking.stripePaymentIntent ??
                    booking.stripeSessionId ??
                    "—"
                  }
                  mono
                />
                <DetailRow
                  label={copy.status}
                  value={
                    booking.status === "confirmed"
                      ? copy.confirmed
                      : booking.status === "cancelled"
                        ? copy.cancelled
                        : copy.pendingPayment
                  }
                />
              </dl>
            </AdminPanel>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-[var(--desk-line)] pb-3 last:border-0 last:pb-0">
      <dt className="text-[var(--desk-muted)]">{label}</dt>
      <dd
        className={`max-w-[65%] text-end font-medium break-words ${
          mono ? "font-plex text-xs" : ""
        }`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

import { ArrowRight } from "lucide-react";
import { DualDate } from "@/components/calendar-date-field";
import { ReservationHoldClock } from "@/components/reservation-hold";
import { fill, type AdminCopy } from "@/lib/admin-copy";
import type { Allotment } from "@/lib/inventory";
import { formatDateTime, formatMoney } from "@/lib/money";

function supplierSummary(lines: Allotment["lines"], copy: AdminCopy) {
  if (!lines.length) return null;
  if (lines.every((line) => line.supplierStatus === "no_show")) {
    return { label: copy.supplierNoShow, dot: "bg-[var(--desk-danger)]", confirmed: 0 };
  }
  const confirmed = lines.filter((line) => line.supplierStatus === "confirmed").length;
  const waiting = lines.some(
    (line) => line.supplierStatus === "waiting" || line.supplierStatus === "provisional",
  );
  const blocked = lines.some(
    (line) => line.supplierStatus === "cancelled" || line.supplierStatus === "no_show",
  );
  if (confirmed === lines.length) {
    return {
      label: copy.supplierLineConfirmed,
      dot: "bg-[var(--desk-success)]",
      confirmed,
    };
  }
  if (blocked && !waiting && confirmed === 0) {
    return {
      label: copy.supplierLineCancelled,
      dot: "bg-[var(--desk-danger)]",
      confirmed,
    };
  }
  if (waiting || confirmed > 0) {
    return { label: copy.supplierWaiting, dot: "bg-[var(--desk-gold)]", confirmed };
  }
  return { label: copy.supplierNew, dot: "bg-[var(--desk-line-strong)]", confirmed };
}

export function ReservationStay({
  allotment,
  nights,
  rooms,
  sell,
  paid,
  unposted,
  due,
  refundDue,
  copy,
  locale,
}: {
  allotment: Allotment;
  nights: number;
  rooms: number;
  sell: number;
  paid: number;
  unposted: number;
  due: number;
  refundDue: number;
  copy: AdminCopy;
  locale: string;
}) {
  const channelLabel = {
    desk: copy.channelDesk,
    b2c: copy.channelB2c,
    b2b: copy.channelB2b,
  }[allotment.channel];
  const source =
    allotment.saleSource === "direct" ? copy.saleHotelDirect : copy.saleFromContract;
  const supplier = supplierSummary(allotment.lines, copy);
  const label = "text-[13px] font-medium text-[var(--desk-muted)]";
  const owed = refundDue > 0 ? refundDue : due;

  return (
    <div className="border-b border-[var(--desk-line)] px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <p className={`font-plex ${label} tabular-nums`}>
            {allotment.number}
            <span className="mx-1.5 text-[var(--desk-line-strong)]">·</span>
            {channelLabel}
          </p>
          <h2 className="mt-1 text-xl leading-7 font-bold text-[var(--desk-ink)]">
            {allotment.hotelName || "—"}
          </h2>
          <p className="mt-1 text-sm text-[var(--desk-text)]">
            {allotment.agencyName || "—"}
            {allotment.guestName ? ` · ${allotment.guestName}` : ""}
            {allotment.commercialName ? ` · ${allotment.commercialName}` : ""}
            {allotment.commissionPercent != null ? ` · ${allotment.commissionPercent}%` : ""}
          </p>
        </div>
        <div className="text-end">
          <p className={label}>{refundDue > 0 ? copy.paymentRefundDue : copy.paymentDue}</p>
          <p
            className={`font-plex text-2xl font-bold tabular-nums ${
              refundDue > 0 ? "text-[var(--desk-danger)]" : "text-[var(--desk-ink)]"
            }`}
          >
            {formatMoney(owed, locale)}
          </p>
          <p className={`font-plex mt-1 ${label} tabular-nums`}>
            {copy.paymentTotal} {formatMoney(sell, locale)}
            <span className="mx-1.5 text-[var(--desk-line-strong)]">·</span>
            {copy.paymentPaid} {formatMoney(paid, locale)}
            {unposted > 0 ? (
              <>
                <span className="mx-1.5 text-[var(--desk-line-strong)]">·</span>
                <span className="text-[var(--desk-warning)]">
                  {copy.reservationUnposted} {formatMoney(unposted, locale)}
                </span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <p className={label}>{copy.checkIn}</p>
          <DualDate
            iso={allotment.checkIn}
            locale={locale}
            className="mt-0.5 text-sm font-semibold text-[var(--desk-ink)]"
          />
        </div>
        <ArrowRight aria-hidden className="mb-1 size-4 text-[var(--desk-line-strong)] rtl:rotate-180" />
        <div>
          <p className={label}>{copy.checkOut}</p>
          <DualDate
            iso={allotment.checkOut}
            locale={locale}
            className="mt-0.5 text-sm font-semibold text-[var(--desk-ink)]"
          />
        </div>
        <p className={`font-plex pb-0.5 text-sm text-[var(--desk-text)] tabular-nums`}>
          {nights} {copy.nights.toLowerCase()} · {rooms} {copy.rooms.toLowerCase()} · {source}
        </p>
        <div>
          <p className={label}>{copy.payBefore}</p>
          <p className="mt-0.5 text-sm font-medium text-[var(--desk-text)]">
            {allotment.payBefore ? (
              <DualDate iso={allotment.payBefore} locale={locale} />
            ) : (
              "—"
            )}
          </p>
        </div>
        <div>
          <p className={label}>{copy.payOnArrival}</p>
          <p className="mt-0.5 text-sm font-medium text-[var(--desk-text)]">
            {allotment.payOnArrival ? copy.reservationYes : copy.reservationNo}
          </p>
        </div>
      </div>

      {allotment.status === "provisional" && allotment.holdUntil ? (
        <div className="mt-4 rounded-lg border border-[var(--desk-warning-line)] bg-[var(--desk-warning-soft)] px-3 py-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-[var(--desk-warning)]">
              {copy.reservationHoldExpires}
              <span className="font-plex ms-2 font-medium tabular-nums">
                {formatDateTime(allotment.holdUntil, locale)}
              </span>
            </p>
            <span className="rounded border border-[var(--desk-warning-line)] bg-white px-2 py-0.5 text-sm font-semibold text-[var(--desk-warning)]">
              <ReservationHoldClock until={allotment.holdUntil} template={copy.reservationHoldLeft} />
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--desk-warning)]">{copy.reservationHoldKeep}</p>
        </div>
      ) : null}

      {supplier ? (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className={`size-2 shrink-0 rounded-full ${supplier.dot}`} />
          <span className="font-medium text-[var(--desk-ink)]">{supplier.label}</span>
          <span className={`font-plex ${label} tabular-nums`}>
            {fill(copy.reservationSupplierProgress, {
              confirmed: supplier.confirmed,
              lines: allotment.lines.length,
            })}
          </span>
        </p>
      ) : null}

      {allotment.supplierReference ? (
        <p className="mt-2 text-sm text-[var(--desk-text)]">
          <span className={label}>{copy.docHotelConf}: </span>
          {allotment.supplierReference}
        </p>
      ) : null}
      {allotment.penaltyAmount > 0 ? (
        <p className={`font-plex mt-2 text-sm tabular-nums ${label}`}>
          {copy.penaltyAmount}: {formatMoney(allotment.penaltyAmount, locale)}
        </p>
      ) : null}
    </div>
  );
}

import type { ReactNode } from "react";
import { DateField, DualDate } from "@/components/calendar-date-field";
import {
  adminButtonClass,
  adminButtonSecondaryClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { saveReservationHeaderAction } from "@/app/admin/actions";
import type { AdminCopy } from "@/lib/admin-copy";
import type { Commercial } from "@/lib/client-crm";
import type { Agency, Allotment, Hotel } from "@/lib/inventory";
import { nightsBetween } from "@/lib/money";

function Band({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 px-4 py-4 sm:px-5">{children}</div>;
}

function Field({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid min-w-0 gap-1.5 text-sm ${className}`}>
      <span className="text-[13px] font-medium text-[var(--desk-muted)]">
        {title}
      </span>
      {children}
    </label>
  );
}

export function ReservationHeaderForm({
  allotment,
  agencies,
  hotels,
  commercials,
  copy,
  locale,
  defaultAgencyId,
  plain = false,
}: {
  allotment: Allotment | null;
  agencies: Agency[];
  hotels: Hotel[];
  commercials: Commercial[];
  copy: AdminCopy;
  locale: string;
  defaultAgencyId?: string;
  plain?: boolean;
}) {
  const closed =
    allotment?.status === "cancelled" ||
    allotment?.status === "no_show" ||
    allotment?.status === "unavailable" ||
    allotment?.status === "regret" ||
    allotment?.channel === "b2c";
  const confirmed = allotment?.status === "confirmed";
  const hasLines = (allotment?.lines.length ?? 0) > 0;
  const datesLocked = Boolean(closed || confirmed);
  const hotelLocked = Boolean(closed || confirmed || hasLines);
  const sourceLocked = Boolean(closed || confirmed || hasLines);
  const partyLocked = Boolean(closed || confirmed);
  const nights = allotment ? nightsBetween(allotment.checkIn, allotment.checkOut) : 0;

  return (
    <form
      action={saveReservationHeaderAction}
      className={
        plain
          ? "divide-y divide-[var(--desk-line)]"
          : "divide-y divide-[var(--desk-line)] overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm"
      }
    >
      {closed ? null : (
        <div className="flex justify-end px-4 py-3 sm:px-5">
          <button
            type="submit"
            className={allotment ? adminButtonSecondaryClass : adminButtonClass}
          >
            {copy.saveReservation}
          </button>
        </div>
      )}
      <Band>
        {allotment ? <input type="hidden" name="id" value={allotment.id} /> : null}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="grid content-start gap-3">
          <Field title={copy.reservationParty}>
            {partyLocked ? (
              <input type="hidden" name="agencyId" value={allotment?.agencyId ?? ""} />
            ) : null}
            <select
              name="agencyId"
              required
              defaultValue={allotment?.agencyId ?? defaultAgencyId ?? ""}
              disabled={partyLocked}
              className={adminFieldClass}
            >
              <option value="" disabled>
                {copy.reservationParty}
              </option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </Field>
          <Field title={copy.guestName}>
            <input
              name="guestName"
              defaultValue={allotment?.guestName ?? ""}
              disabled={Boolean(closed)}
              maxLength={160}
              className={adminFieldClass}
            />
          </Field>
          <Field title={copy.commercial}>
            {partyLocked ? (
              <input type="hidden" name="commercialId" value={allotment?.commercialId ?? ""} />
            ) : null}
            <select
              name="commercialId"
              defaultValue={allotment?.commercialId ?? ""}
              disabled={partyLocked}
              className={adminFieldClass}
            >
              <option value="">{copy.noRep}</option>
              {commercials.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                </option>
              ))}
            </select>
          </Field>
          {allotment?.commissionPercent != null ? (
            <p className="font-plex text-[13px] text-[var(--desk-muted)] tabular-nums">
              {copy.commissionPercent}: {allotment.commissionPercent}%
            </p>
          ) : null}
          </div>
          <div className="grid content-start gap-3 sm:grid-cols-2 lg:col-span-2">
          <Field title={copy.hotel}>
            {hotelLocked ? (
              <input type="hidden" name="hotelId" value={allotment?.hotelId ?? ""} />
            ) : null}
            <select
              name="hotelId"
              required
              defaultValue={allotment?.hotelId ?? ""}
              disabled={hotelLocked}
              className={adminFieldClass}
            >
              <option value="" disabled>
                {copy.hotel}
              </option>
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </option>
              ))}
            </select>
          </Field>
          <Field title={copy.saleSource}>
            {sourceLocked ? (
              <input type="hidden" name="saleSource" value={allotment?.saleSource ?? "contract"} />
            ) : null}
            <select
              name="saleSource"
              defaultValue={allotment?.saleSource ?? "contract"}
              disabled={sourceLocked}
              className={adminFieldClass}
            >
              <option value="contract">{copy.saleFromContract}</option>
              <option value="direct">{copy.saleHotelDirect}</option>
            </select>
          </Field>
          <Field title={copy.nights}>
            <input readOnly value={allotment ? String(Math.max(nights, 0)) : ""} className={adminFieldClass} />
          </Field>
          <div className="grid min-w-0 gap-1.5">
            <span className="text-[13px] font-medium text-[var(--desk-muted)]">
              {copy.checkIn}
            </span>
            {datesLocked ? (
              <>
                <input type="hidden" name="checkIn" value={allotment?.checkIn ?? ""} />
                <DualDate iso={allotment?.checkIn} locale={locale} />
              </>
            ) : (
              <DateField
                name="checkIn"
                label={copy.checkIn}
                locale={locale}
                required
                defaultValue={allotment?.checkIn ?? ""}
              />
            )}
          </div>
          <div className="grid min-w-0 gap-1.5">
            <span className="text-[13px] font-medium text-[var(--desk-muted)]">
              {copy.checkOut}
            </span>
            {datesLocked ? (
              <>
                <input type="hidden" name="checkOut" value={allotment?.checkOut ?? ""} />
                <DualDate iso={allotment?.checkOut} locale={locale} />
              </>
            ) : (
              <DateField
                name="checkOut"
                label={copy.checkOut}
                locale={locale}
                required
                defaultValue={allotment?.checkOut ?? ""}
              />
            )}
          </div>
          <Field title={copy.payBefore}>
            <DateField
              name="payBefore"
              label={copy.payBefore}
              locale={locale}
              defaultValue={allotment?.payBefore ?? ""}
              disabled={Boolean(closed)}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="payOnArrival"
              defaultChecked={allotment?.payOnArrival ?? false}
              disabled={Boolean(closed)}
            />
            {copy.payOnArrival}
          </label>
          </div>
          <div className="grid content-start gap-3 lg:col-span-3">
        <Field title={copy.notes}>
          <textarea
            name="notes"
            defaultValue={allotment?.notes ?? ""}
            disabled={Boolean(closed)}
            rows={2}
            maxLength={2000}
            className={adminFieldClass}
          />
        </Field>
          </div>
        </div>
      </Band>
      {allotment ? (
        <Band>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field title={copy.docHotelConf}>
              <input
                name="supplierReference"
                defaultValue={allotment.supplierReference}
                disabled={Boolean(closed)}
                maxLength={160}
                className={adminFieldClass}
              />
            </Field>
            <Field title={copy.followUpNote}>
              <textarea
                name="supplierNotes"
                defaultValue={allotment.supplierNotes}
                disabled={Boolean(closed)}
                rows={2}
                maxLength={2000}
                className={adminFieldClass}
              />
            </Field>
          </div>
        </Band>
      ) : null}
    </form>
  );
}

"use client";

import { useMemo, useState } from "react";
import { assignRoomAction } from "@/app/admin/actions";
import { useAdminCopy, useAdminLocale } from "@/components/admin-locale";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { CalendarSwitch, DateField } from "@/components/calendar-date-field";
import {
  AdminField,
  adminButtonClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { fill } from "@/lib/admin-copy";
import { formatMoney, moneyInput, nightsBetween } from "@/lib/money";

export function AssignmentForm({
  roomId,
  costPerNight,
  agencies,
}: {
  roomId: string;
  costPerNight: number;
  agencies: Array<{
    id: string;
    name: string;
    country: string;
    kind?: string;
  }>;
}) {
  const copy = useAdminCopy();
  const locale = useAdminLocale();
  const [cost, setCost] = useState(moneyInput(costPerNight));
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const estimate = useMemo(() => {
    const nights = nightsBetween(checkIn, checkOut);
    const rooms = Number(quantity);
    const costHalalas = Math.round(Number(cost || 0) * 100);
    const priceHalalas = Math.round(Number(price || 0) * 100);
    if (nights < 1 || !Number.isInteger(rooms) || rooms < 1) return null;
    return {
      nights,
      cost: costHalalas * nights * rooms,
      revenue: priceHalalas * nights * rooms,
      margin: (priceHalalas - costHalalas) * nights * rooms,
    };
  }, [checkIn, checkOut, cost, price, quantity]);

  return (
    <form action={assignRoomAction} className="grid gap-4">
      <input type="hidden" name="roomId" value={roomId} />
      <AdminField label={copy.client}>
        <select name="agencyId" required className={adminFieldClass}>
          <option value="">{copy.selectAgency}</option>
          {agencies.map((agency) => (
            <option key={agency.id} value={agency.id}>
              {agency.name}
              {agency.country ? ` — ${agency.country}` : ""}
              {" · "}
              {agency.kind === "individual" ? copy.individual : copy.agency}
            </option>
          ))}
        </select>
      </AdminField>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label={copy.rooms}>
          <input
            name="quantity"
            type="number"
            min={1}
            required
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label={copy.costNight}>
          <input
            name="costPerNight"
            inputMode="decimal"
            required
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            className={adminFieldClass}
          />
        </AdminField>
        <div className="sm:col-span-2">
          <CalendarSwitch
            label={copy.calendar}
            normal={copy.normalCalendar}
            arabic={copy.arabicCalendar}
          />
        </div>
        <AdminField label={copy.checkIn}>
          <DateField
            name="checkIn"
            label={copy.checkIn}
            locale={locale}
            required
            value={checkIn}
            onChange={setCheckIn}
          />
        </AdminField>
        <AdminField label={copy.checkOut}>
          <DateField
            name="checkOut"
            label={copy.checkOut}
            locale={locale}
            required
            value={checkOut}
            onChange={setCheckOut}
          />
        </AdminField>
      </div>
      <AdminField label={copy.agencyPriceNight}>
        <input
          name="agencyPricePerNight"
          inputMode="decimal"
          required
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className={adminFieldClass}
        />
      </AdminField>
      <AdminField label={copy.notes}>
        <textarea
          name="notes"
          className={`${adminFieldClass} !h-auto min-h-24 py-2`}
        />
      </AdminField>
      {estimate && (
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[var(--desk-line)] bg-[var(--desk-line)] text-sm">
          <div className="bg-white px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--desk-muted)]">
              {copy.cost}
            </dt>
            <dd className="tabular-nums">
              {formatMoney(estimate.cost, locale)}
            </dd>
          </div>
          <div className="bg-white px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--desk-muted)]">
              {copy.sell}
            </dt>
            <dd className="tabular-nums">
              {formatMoney(estimate.revenue, locale)}
            </dd>
          </div>
          <div className="bg-white px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--desk-muted)]">
              {fill(copy.marginWithNights, { count: estimate.nights })}
            </dt>
            <dd className="font-semibold tabular-nums text-[var(--desk-primary)]">
              {formatMoney(estimate.margin, locale)}
            </dd>
          </div>
        </dl>
      )}
      <AdminSubmitButton
        pendingLabel={copy.saving}
        className={`${adminButtonClass} w-fit`}
      >
        {copy.saveAllotment}
      </AdminSubmitButton>
    </form>
  );
}

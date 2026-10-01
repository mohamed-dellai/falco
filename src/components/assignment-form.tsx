"use client";

import { useMemo, useState } from "react";
import { assignRoomAction } from "@/app/admin/actions";
import { adminButtonClass, adminFieldClass } from "@/components/admin-shell";
import { formatMoney, moneyInput, nightsBetween } from "@/lib/money";

export function AssignmentForm({
  roomId,
  costPerNight,
  agencies,
}: {
  roomId: string;
  costPerNight: number;
  agencies: Array<{ id: string; name: string; country: string }>;
}) {
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
      <label className="grid gap-1 text-xs font-semibold text-[#334155]">
        Travel agency
        <select name="agencyId" required className={adminFieldClass}>
          <option value="">Select an agency</option>
          {agencies.map((agency) => (
            <option key={agency.id} value={agency.id}>
              {agency.name}
              {agency.country ? ` — ${agency.country}` : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold text-[#334155]">
          Rooms
          <input
            name="quantity"
            type="number"
            min={1}
            required
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={adminFieldClass}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#334155]">
          Falco cost / night (SAR)
          <input
            name="costPerNight"
            inputMode="decimal"
            required
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            className={adminFieldClass}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#334155]">
          Check-in
          <input
            name="checkIn"
            type="date"
            required
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            className={adminFieldClass}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#334155]">
          Check-out
          <input
            name="checkOut"
            type="date"
            required
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            className={adminFieldClass}
          />
        </label>
      </div>
      <label className="grid gap-1 text-xs font-semibold text-[#334155]">
        Agency price / night (SAR)
        <input
          name="agencyPricePerNight"
          inputMode="decimal"
          required
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className={adminFieldClass}
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-[#334155]">
        Notes
        <textarea name="notes" className={`${adminFieldClass} !h-auto min-h-24 py-2`} />
      </label>
      {estimate && (
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded border border-[#d5dbe3] bg-[#d5dbe3] text-sm">
          <div className="bg-[#f4f7fa] px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#5c6776]">
              Cost
            </dt>
            <dd className="tabular-nums">{formatMoney(estimate.cost, "en")}</dd>
          </div>
          <div className="bg-[#f4f7fa] px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#5c6776]">
              Sell
            </dt>
            <dd className="tabular-nums">
              {formatMoney(estimate.revenue, "en")}
            </dd>
          </div>
          <div className="bg-[#f4f7fa] px-3 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#5c6776]">
              Margin · {estimate.nights} nights
            </dt>
            <dd className="font-semibold tabular-nums text-[#0e4d8c]">
              {formatMoney(estimate.margin, "en")}
            </dd>
          </div>
        </dl>
      )}
      <button type="submit" className={`${adminButtonClass} w-fit`}>
        Save allotment
      </button>
    </form>
  );
}

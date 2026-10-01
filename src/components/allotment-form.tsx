"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  cancelAllotmentAction,
  deleteAllotmentAction,
  saveAllotmentAction,
} from "@/app/admin/actions";
import {
  adminButtonClass,
  adminButtonSecondaryClass,
  adminFieldClass,
} from "@/components/admin-shell";
import { useAdminCopy } from "@/components/admin-locale";
import { fill } from "@/lib/admin-copy";
import type { Allotment, AllotmentStatus } from "@/lib/inventory";
import { formatMoney, moneyInput, nightsBetween } from "@/lib/money";

type RoomOption = {
  id: string;
  name: string;
  hotelName: string;
  costPerNight: number;
};

type DraftLine = {
  key: string;
  roomId: string;
  cost: string;
  price: string;
  label: string;
};

const statusStyle: Record<AllotmentStatus, string> = {
  draft: "bg-[#eef2f6] text-[#334155]",
  confirmed: "bg-[#e5f6ea] text-[#146c36]",
  cancelled: "bg-[#fdecec] text-[#9b1c1c]",
};

export function AllotmentStatusPill({ status }: { status: AllotmentStatus }) {
  const copy = useAdminCopy();
  const statusLabel: Record<AllotmentStatus, string> = {
    draft: copy.draft,
    confirmed: copy.confirmed,
    cancelled: copy.cancelled,
  };
  return (
    <span
      className={`rounded px-2 py-1 text-xs font-semibold ${statusStyle[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}

function lineHalalas(price: string) {
  const normalized = price.replaceAll(",", "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

function emptyLine(room?: RoomOption): DraftLine {
  return {
    key: crypto.randomUUID(),
    roomId: room?.id ?? "",
    cost: room ? moneyInput(room.costPerNight) : "",
    price: "",
    label: room ? `${room.hotelName} — ${room.name}` : "",
  };
}

function lineFromAllotment(allotment: Allotment): DraftLine[] {
  return allotment.lines.map((line) => ({
    key: line.id,
    roomId: line.roomId,
    cost: moneyInput(line.costPerNight),
    price: moneyInput(line.agencyPricePerNight),
    label: `${line.hotelName} — ${line.roomName}`,
  }));
}

function lineIsFilled(line: DraftLine) {
  return Boolean(line.roomId || line.cost.trim() || line.price.trim());
}

export function AllotmentForm({
  agencies,
  rooms,
  allotment,
  roomId,
}: {
  agencies: Array<{ id: string; name: string; country: string }>;
  rooms: RoomOption[];
  allotment?: Allotment;
  roomId?: string;
}) {
  const copy = useAdminCopy();
  const locked =
    allotment?.status === "confirmed" || allotment?.status === "cancelled";
  const preset = rooms.find((room) => room.id === roomId);
  const [agencyId, setAgencyId] = useState(allotment?.agencyId ?? "");
  const [checkIn, setCheckIn] = useState(allotment?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(allotment?.checkOut ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    allotment?.lines.length
      ? lineFromAllotment(allotment)
      : [emptyLine(preset)],
  );
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState("");

  const totals = useMemo(() => {
    const nights = nightsBetween(checkIn, checkOut);
    let cost = 0;
    let revenue = 0;
    let rooms = 0;
    if (nights < 1) return { nights: 0, cost: 0, revenue: 0, margin: 0, rooms: 0 };
    for (const line of lines) {
      const lineCost = lineHalalas(line.cost);
      const linePrice = lineHalalas(line.price);
      if (lineCost === null || linePrice === null) continue;
      rooms += 1;
      cost += lineCost * nights;
      revenue += linePrice * nights;
    }
    return { nights, cost, revenue, margin: revenue - cost, rooms };
  }, [checkIn, checkOut, lines]);

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const intent =
      submitter instanceof HTMLButtonElement ? submitter.value : "draft";
    const filled = lines.filter(lineIsFilled);
    if (!agencyId) {
      event.preventDefault();
      setFormError("Select the agency.");
      return;
    }
    const nights = nightsBetween(checkIn, checkOut);
    if (nights < 1) {
      event.preventDefault();
      setFormError(copy.datesError);
      return;
    }
    if (nights > 1095) {
      event.preventDefault();
      setFormError("A stay can't be longer than three years.");
      return;
    }
    if (intent === "confirm" && filled.length === 0) {
      event.preventDefault();
      setFormError("Add at least one room before confirming the allotment.");
      return;
    }
    const broken = filled.find(
      (line) =>
        !line.roomId ||
        lineHalalas(line.cost) === null ||
        lineHalalas(line.price) === null,
    );
    if (broken) {
      event.preventDefault();
      setFormError("Each room needs Falco's cost and the agency price.");
      return;
    }
    setFormError("");
    setPending(intent);
  }

  return (
    <div className="rounded border border-[#d5dbe3] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6ebf0] px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {!locked && (
            <>
              <button
                type="submit"
                form="allotment-form"
                name="intent"
                value="confirm"
                disabled={pending !== ""}
                className={`${adminButtonClass} min-w-40`}
              >
                {pending === "confirm" ? copy.confirming : copy.confirmAllotment}
              </button>
              <button
                type="submit"
                form="allotment-form"
                name="intent"
                value="draft"
                disabled={pending !== ""}
                className={`${adminButtonSecondaryClass} min-w-32`}
              >
                {pending === "draft" ? copy.saving : copy.saveDraft}
              </button>
            </>
          )}
          {allotment?.status === "confirmed" && (
            <form action={cancelAllotmentAction}>
              <input type="hidden" name="id" value={allotment.id} />
              <button type="submit" className={adminButtonSecondaryClass}>
                Cancel
              </button>
            </form>
          )}
          {allotment?.status === "draft" && (
            <form action={deleteAllotmentAction}>
              <input type="hidden" name="id" value={allotment.id} />
              <button
                type="submit"
                className="h-9 px-2 text-sm font-semibold text-red-700"
              >
                Delete
              </button>
            </form>
          )}
        </div>
        <AllotmentStatusPill status={allotment?.status ?? "draft"} />
      </div>

      <form
        id="allotment-form"
        action={saveAllotmentAction}
        onSubmit={onSubmit}
        className="grid gap-4 p-4"
      >
        {allotment && <input type="hidden" name="id" value={allotment.id} />}
        {formError && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-xs font-semibold text-[#334155]">
            {copy.agency}
            {locked ? (
              <span className="flex h-9 items-center text-sm font-medium">
                {allotment?.agencyName}
              </span>
            ) : (
              <select
                name="agencyId"
                required
                value={agencyId}
                onChange={(event) => setAgencyId(event.target.value)}
                className={adminFieldClass}
              >
                <option value="">{copy.selectAgency}</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                    {agency.country ? ` — ${agency.country}` : ""}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[#334155]">
            {copy.checkIn}
            {locked ? (
              <span className="flex h-9 items-center text-sm font-medium tabular-nums">
                {allotment?.checkIn}
              </span>
            ) : (
              <input
                name="checkIn"
                type="date"
                required
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
                className={adminFieldClass}
              />
            )}
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[#334155]">
            {copy.checkOut}
            {locked ? (
              <span className="flex h-9 items-center text-sm font-medium tabular-nums">
                {allotment?.checkOut}
              </span>
            ) : (
              <input
                name="checkOut"
                type="date"
                required
                value={checkOut}
                onChange={(event) => setCheckOut(event.target.value)}
                className={adminFieldClass}
              />
            )}
          </label>
        </div>

        <p className="text-xs text-[#5c6776]">
          {allotment
            ? `${allotment.number} · ${fill(copy.orderedOn, { date: allotment.createdAt.slice(0, 10) })}. `
            : `${copy.numberAssigned} `}
          {copy.draftNote}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-[#f4f7fa] text-[11px] font-semibold uppercase tracking-wide text-[#5c6776]">
              <tr>
                <th className="px-2 py-2">{copy.rooms}</th>
                <th className="px-2 py-2 text-end">{copy.costNight}</th>
                <th className="px-2 py-2 text-end">{copy.agencyPriceNight}</th>
                <th className="px-2 py-2 text-end">{copy.sell}</th>
                {!locked && <th className="w-8 px-2 py-2" />}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const nights = nightsBetween(checkIn, checkOut);
                const price = lineHalalas(line.price);
                const sell = nights > 0 && price !== null ? price * nights : null;
                const known = rooms.some((room) => room.id === line.roomId);
                return (
                  <tr key={line.key} data-search-item className="border-t border-[#e6ebf0]">
                    <td className="px-2 py-2">
                      {locked ? (
                        <span>{line.label}</span>
                      ) : (
                        <select
                          name="lineRoom"
                          value={line.roomId}
                          onChange={(event) => {
                            const room = rooms.find(
                              (item) => item.id === event.target.value,
                            );
                            updateLine(line.key, {
                              roomId: event.target.value,
                              label: room
                                ? `${room.hotelName} — ${room.name}`
                                : "",
                              cost: room ? moneyInput(room.costPerNight) : line.cost,
                            });
                          }}
                          className={adminFieldClass}
                        >
                          <option value="">{copy.selectRoom}</option>
                          {line.roomId && !known && (
                            <option value={line.roomId}>{line.label}</option>
                          )}
                          {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.hotelName} — {room.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {locked ? (
                        <span className="block text-end tabular-nums">
                          {line.cost}
                        </span>
                      ) : (
                        <input
                          name="lineCost"
                          inputMode="decimal"
                          value={line.cost}
                          onChange={(event) =>
                            updateLine(line.key, { cost: event.target.value })
                          }
                          className={`${adminFieldClass} text-end`}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {locked ? (
                        <span className="block text-end tabular-nums">
                          {line.price}
                        </span>
                      ) : (
                        <input
                          name="linePrice"
                          inputMode="decimal"
                          value={line.price}
                          onChange={(event) =>
                            updateLine(line.key, { price: event.target.value })
                          }
                          className={`${adminFieldClass} text-end`}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 text-end tabular-nums">
                      {sell === null ? "—" : formatMoney(sell, "en")}
                    </td>
                    {!locked && (
                      <td className="px-2 py-2 text-end">
                        <button
                          type="button"
                          onClick={() =>
                            setLines((current) =>
                              current.length === 1
                                ? [emptyLine()]
                                : current.filter((item) => item.key !== line.key),
                            )
                          }
                          className="text-xs font-semibold text-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!locked && (
          <button
            type="button"
            onClick={() => setLines((current) => [...current, emptyLine()])}
            className="w-fit text-sm font-semibold text-[#0e4d8c]"
          >
            Add a room
          </button>
        )}

        <label className="grid gap-1 text-xs font-semibold text-[#334155]">
          {copy.notes}
          {locked ? (
            <p className="text-sm font-normal text-[#172033]">
              {allotment?.notes || "—"}
            </p>
          ) : (
            <textarea
              name="notes"
              defaultValue={allotment?.notes ?? ""}
              className={`${adminFieldClass} !h-auto min-h-20 py-2`}
            />
          )}
        </label>

        <dl className="ms-auto grid w-full max-w-sm gap-1 text-sm">
          <div className="flex justify-between gap-6">
            <dt className="text-[#5c6776]">{copy.rooms}</dt>
            <dd className="tabular-nums">{totals.rooms}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-[#5c6776]">{copy.cost}</dt>
            <dd className="tabular-nums">{formatMoney(totals.cost, "en")}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-[#5c6776]">{copy.sell}</dt>
            <dd className="tabular-nums">{formatMoney(totals.revenue, "en")}</dd>
          </div>
          <div className="flex justify-between gap-6 font-semibold text-[#0e4d8c]">
            <dt>
              Margin
              {totals.nights > 0 ? ` · ${totals.nights} nights` : ""}
            </dt>
            <dd className="tabular-nums">{formatMoney(totals.margin, "en")}</dd>
          </div>
        </dl>
      </form>
    </div>
  );
}

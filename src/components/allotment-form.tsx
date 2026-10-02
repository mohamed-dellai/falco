"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  cancelAllotmentAction,
  deleteAllotmentAction,
  saveAllotmentAction,
} from "@/app/admin/actions";
import {
  AdminField,
  AdminStatusPill,
  adminButtonClass,
  adminButtonDangerClass,
  adminButtonSecondaryClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { NamedConfirm } from "@/components/named-confirm";
import { useAdminCopy, useAdminLocale } from "@/components/admin-locale";
import { fill } from "@/lib/admin-copy";
import type { Allotment, AllotmentStatus } from "@/lib/inventory";
import {
  formatDate,
  formatMoney,
  moneyInput,
  nightsBetween,
} from "@/lib/money";

type RoomOption = {
  id: string;
  name: string;
  hotelName: string;
  costPerNight: number;
};

type DraftLine = {
  key: string;
  roomId: string;
  quantity: string;
  cost: string;
  price: string;
  label: string;
};

export function AllotmentStatusPill({ status }: { status: AllotmentStatus }) {
  const copy = useAdminCopy();
  const statusLabel: Record<AllotmentStatus, string> = {
    draft: copy.draft,
    confirmed: copy.confirmed,
    cancelled: copy.cancelled,
  };
  return (
    <AdminStatusPill
      tone={
        status === "confirmed"
          ? "success"
          : status === "cancelled"
            ? "danger"
            : "neutral"
      }
    >
      {statusLabel[status]}
    </AdminStatusPill>
  );
}

function lineHalalas(price: string) {
  const normalized = price.replaceAll(",", "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

function parsedQuantity(value: string) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5000) return null;
  return quantity;
}

function emptyLine(room?: RoomOption): DraftLine {
  return {
    key: crypto.randomUUID(),
    roomId: room?.id ?? "",
    quantity: "1",
    cost: room ? moneyInput(room.costPerNight) : "",
    price: "",
    label: room ? `${room.hotelName} — ${room.name}` : "",
  };
}

function lineFromAllotment(allotment: Allotment): DraftLine[] {
  return allotment.lines.map((line) => ({
    key: line.id,
    roomId: line.roomId,
    quantity: String(line.quantity),
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
  agencyId,
  initialCheckIn,
  initialCheckOut,
}: {
  agencies: Array<{ id: string; name: string; country: string }>;
  rooms: RoomOption[];
  allotment?: Allotment;
  roomId?: string;
  agencyId?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
}) {
  const copy = useAdminCopy();
  const locale = useAdminLocale();
  const locked =
    allotment?.status === "confirmed" || allotment?.status === "cancelled";
  const preset = rooms.find((room) => room.id === roomId);
  const [selectedAgencyId, setSelectedAgencyId] = useState(
    allotment?.agencyId ?? agencyId ?? "",
  );
  const [checkIn, setCheckIn] = useState(
    allotment?.checkIn ?? initialCheckIn ?? "",
  );
  const [checkOut, setCheckOut] = useState(
    allotment?.checkOut ?? initialCheckOut ?? "",
  );
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
    if (nights < 1)
      return { nights: 0, cost: 0, revenue: 0, margin: 0, rooms: 0 };
    for (const line of lines) {
      const lineCost = lineHalalas(line.cost);
      const linePrice = lineHalalas(line.price);
      const quantity = parsedQuantity(line.quantity);
      if (lineCost === null || linePrice === null || quantity === null) continue;
      rooms += quantity;
      cost += lineCost * nights * quantity;
      revenue += linePrice * nights * quantity;
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
    if (!selectedAgencyId) {
      event.preventDefault();
      setFormError(copy.agencyError);
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
      setFormError(copy.spanError);
      return;
    }
    if (intent === "confirm" && filled.length === 0) {
      event.preventDefault();
      setFormError(copy.allotmentLinesError);
      return;
    }
    const broken = filled.find(
      (line) =>
        !line.roomId ||
        parsedQuantity(line.quantity) === null ||
        lineHalalas(line.cost) === null ||
        lineHalalas(line.price) === null,
    );
    if (broken) {
      event.preventDefault();
      setFormError(copy.linePricingError);
      return;
    }
    setFormError("");
    setPending(intent);
  }

  return (
    <div className="overflow-visible rounded-2xl border border-[var(--desk-line)] bg-white">
      <div className="sticky top-[4.5rem] z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-[var(--desk-line)] bg-white/95 px-4 py-3 backdrop-blur lg:static">
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
                {pending === "confirm"
                  ? copy.confirming
                  : copy.confirmAllotment}
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
            <NamedConfirm
              title={copy.cancelAllotmentTitle}
              body={fill(copy.cancelAllotmentBody, {
                number: allotment.number,
              })}
              confirm={copy.cancelAction}
              pendingLabel={copy.cancelling}
              cancelLabel={copy.keepAllotment}
              action={cancelAllotmentAction}
              fields={{ id: allotment.id }}
              trigger={copy.cancelAction}
              triggerClassName={adminButtonDangerClass}
            />
          )}
          {allotment?.status === "draft" && (
            <NamedConfirm
              title={copy.deleteDraftTitle}
              body={fill(copy.deleteDraftBody, { number: allotment.number })}
              confirm={copy.deleteAction}
              pendingLabel={copy.deleting}
              cancelLabel={copy.keepDraft}
              action={deleteAllotmentAction}
              fields={{ id: allotment.id }}
              trigger={copy.deleteAction}
              triggerClassName={adminButtonDangerClass}
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          <span
            aria-live="polite"
            className="font-plex text-xs tabular-nums text-[var(--desk-muted)]"
          >
            {copy.sell} · {formatMoney(totals.revenue, locale)}
          </span>
          <AllotmentStatusPill status={allotment?.status ?? "draft"} />
        </div>
      </div>

      <form
        id="allotment-form"
        action={saveAllotmentAction}
        onSubmit={onSubmit}
        className="grid gap-5 p-4 sm:p-5"
      >
        {allotment && <input type="hidden" name="id" value={allotment.id} />}
        {formError && (
          <p
            role="alert"
            className="rounded-xl border border-[var(--desk-danger-line)] bg-[var(--desk-danger-soft)] px-3 py-2 text-sm text-[var(--desk-danger)]"
          >
            {formError}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <AdminField label={copy.agency}>
            {locked ? (
              <span className="flex min-h-10 items-center text-sm font-medium">
                {allotment?.agencyName}
              </span>
            ) : (
              <select
                name="agencyId"
                required
                value={selectedAgencyId}
                onChange={(event) => setSelectedAgencyId(event.target.value)}
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
          </AdminField>
          <AdminField label={copy.checkIn}>
            {locked ? (
              <span className="flex min-h-10 items-center font-plex text-xs font-medium">
                {formatDate(allotment?.checkIn, locale)}
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
          </AdminField>
          <AdminField label={copy.checkOut}>
            {locked ? (
              <span className="flex min-h-10 items-center font-plex text-xs font-medium">
                {formatDate(allotment?.checkOut, locale)}
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
          </AdminField>
        </div>

        <p className="text-xs leading-5 text-[var(--desk-muted)]">
          {allotment
            ? `${allotment.number} · ${fill(copy.orderedOn, {
                date: formatDate(allotment.createdAt, locale),
              })}. `
            : `${copy.numberAssigned} `}
          {copy.draftNote}
        </p>

        <div className="min-w-0 overflow-x-auto">
          <table className="block w-full border-collapse text-start text-sm lg:table">
            <thead className="hidden bg-[var(--desk-canvas)] lg:table-header-group">
              <tr>
                <th className="px-2 py-2">{copy.rooms}</th>
                <th className="px-2 py-2 text-end">{copy.qty}</th>
                <th className="px-2 py-2 text-end">{copy.costNight}</th>
                <th className="px-2 py-2 text-end">{copy.agencyPriceNight}</th>
                <th className="px-2 py-2 text-end">{copy.sell}</th>
                {!locked && <th className="w-8 px-2 py-2" />}
              </tr>
            </thead>
            <tbody className="grid gap-3 lg:table-row-group">
              {lines.map((line) => {
                const nights = nightsBetween(checkIn, checkOut);
                const price = lineHalalas(line.price);
                const quantity = parsedQuantity(line.quantity);
                const sell =
                  nights > 0 && price !== null && quantity !== null
                    ? price * nights * quantity
                    : null;
                const known = rooms.some((room) => room.id === line.roomId);
                return (
                  <tr
                    key={line.key}
                    className="block rounded-xl border border-[var(--desk-line)] p-3 lg:table-row lg:rounded-none lg:border-x-0 lg:border-b-0 lg:p-0"
                  >
                    <td className="block px-0 py-2 lg:table-cell lg:px-2">
                      <span className="mb-1 block text-xs font-semibold text-[var(--desk-muted)] lg:hidden">
                        {copy.rooms}
                      </span>
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
                              cost: room
                                ? moneyInput(room.costPerNight)
                                : line.cost,
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
                    <td className="block px-0 py-2 text-end lg:table-cell lg:px-2">
                      <span className="me-2 text-xs font-semibold text-[var(--desk-muted)] lg:hidden">
                        {copy.qty}
                      </span>
                      {locked ? (
                        <span className="tabular-nums">{line.quantity}</span>
                      ) : (
                        <input
                          name="lineQuantity"
                          type="number"
                          min={1}
                          max={5000}
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(line.key, {
                              quantity: event.target.value,
                            })
                          }
                          className={`${adminFieldClass} w-full text-end lg:w-16`}
                        />
                      )}
                    </td>
                    <td className="block px-0 py-2 lg:table-cell lg:px-2">
                      <span className="mb-1 block text-xs font-semibold text-[var(--desk-muted)] lg:hidden">
                        {copy.costNight}
                      </span>
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
                    <td className="block px-0 py-2 lg:table-cell lg:px-2">
                      <span className="mb-1 block text-xs font-semibold text-[var(--desk-muted)] lg:hidden">
                        {copy.agencyPriceNight}
                      </span>
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
                    <td className="block px-0 py-2 text-end font-plex lg:table-cell lg:px-2">
                      <span className="me-2 text-xs font-semibold text-[var(--desk-muted)] lg:hidden">
                        {copy.sell}
                      </span>
                      {sell === null ? "—" : formatMoney(sell, locale)}
                    </td>
                    {!locked && (
                      <td className="block px-0 py-2 text-end lg:table-cell lg:px-2">
                        <button
                          type="button"
                          onClick={() =>
                            setLines((current) =>
                              current.length === 1
                                ? [emptyLine()]
                                : current.filter(
                                    (item) => item.key !== line.key,
                                  ),
                            )
                          }
                          className="desk-focus rounded text-xs font-semibold text-[var(--desk-danger)]"
                        >
                          {copy.removeLine}
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
            className="desk-focus w-fit rounded-lg text-sm font-semibold text-[var(--desk-primary)]"
          >
            {copy.addRoom}
          </button>
        )}

        <AdminField label={copy.notes}>
          {locked ? (
            <p className="text-sm font-normal text-[var(--desk-text)]">
              {allotment?.notes || "—"}
            </p>
          ) : (
            <textarea
              name="notes"
              defaultValue={allotment?.notes ?? ""}
              className={`${adminFieldClass} !h-auto min-h-20 py-2`}
            />
          )}
        </AdminField>

        <dl className="ms-auto grid w-full max-w-sm gap-2 rounded-xl bg-[var(--desk-canvas)] p-4 text-sm">
          <div className="flex justify-between gap-6">
            <dt className="text-[var(--desk-muted)]">{copy.rooms}</dt>
            <dd className="font-plex">{totals.rooms}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-[var(--desk-muted)]">{copy.cost}</dt>
            <dd className="font-plex">{formatMoney(totals.cost, locale)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-[var(--desk-muted)]">{copy.sell}</dt>
            <dd className="font-plex">{formatMoney(totals.revenue, locale)}</dd>
          </div>
          <div className="flex justify-between gap-6 border-t border-[var(--desk-line)] pt-2 font-semibold text-[var(--desk-primary)]">
            <dt>
              {totals.nights > 0
                ? fill(copy.marginWithNights, { count: totals.nights })
                : copy.margin}
            </dt>
            <dd className="font-plex">{formatMoney(totals.margin, locale)}</dd>
          </div>
        </dl>
      </form>
    </div>
  );
}

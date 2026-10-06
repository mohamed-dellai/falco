"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  cancelAllotmentAction,
  confirmHeldAllotmentAction,
  deleteAllotmentAction,
  markNoShowAction,
  reopenAllotmentAction,
  saveAllotmentAction,
} from "@/app/admin/actions";
import {
  AdminStatusPill,
  adminButtonDangerClass,
  adminFieldClass,
} from "@/components/admin-ui";
import {
  CalendarSwitch,
  DateField,
  DualDate,
} from "@/components/calendar-date-field";
import { NamedConfirm } from "@/components/named-confirm";
import { useAdminCopy, useAdminLocale } from "@/components/admin-locale";
import { fill, type AdminCopy } from "@/lib/admin-copy";
import { mealPlanLabel, roomTypeLabel, type MealPlan } from "@/lib/room-types";
import type { Allotment, AllotmentStatus, SaleChannel } from "@/lib/inventory";
import {
  formatDateRange,
  formatMoney,
  moneyInput,
  nightsBetween,
  shiftIsoDate,
  stayInside,
} from "@/lib/money";

type RoomOption = {
  id: string;
  name: string;
  hotelName: string;
  costPerNight: number;
  checkIn: string | null;
  checkOut: string | null;
  board?: MealPlan;
  view?: string;
};

function roomChoiceLabel(
  hotelName: string,
  name: string,
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
  locale: string,
  copy: AdminCopy,
) {
  const period =
    checkIn && checkOut ? ` · ${formatDateRange(checkIn, checkOut, locale)}` : "";
  return `${hotelName} — ${roomTypeLabel(name, (type) => copy[type])}${period}`;
}

function contractLabel(
  room: RoomOption,
  locale: string,
  copy: AdminCopy,
) {
  const meal = room.board
    ? mealPlanLabel(room.board, {
        room_only: copy.roomOnly,
        breakfast: copy.breakfastBoard,
        half_board: copy.halfBoard,
        full_board: copy.fullBoard,
      })
    : "";
  const view = room.view?.trim() ? ` · ${room.view.trim()}` : "";
  return `${roomChoiceLabel(room.hotelName, room.name, room.checkIn, room.checkOut, locale, copy)}${meal ? ` · ${meal}` : ""}${view}`;
}

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
    request: copy.statusRequest,
    provisional: copy.statusProvisional,
    confirmed: copy.confirmed,
    cancelled: copy.cancelled,
    no_show: copy.statusNoShow,
  };
  return (
    <AdminStatusPill
      tone={
        status === "confirmed"
          ? "success"
          : status === "cancelled"
            ? "neutral"
            : "warning"
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

function emptyLine(
  room: RoomOption | undefined,
  locale: string,
  copy: AdminCopy,
): DraftLine {
  return {
    key: crypto.randomUUID(),
    roomId: room?.id ?? "",
    quantity: "1",
    cost: room ? moneyInput(room.costPerNight) : "",
    price: "",
    label: room
      ? roomChoiceLabel(
          room.hotelName,
          room.name,
          room.checkIn,
          room.checkOut,
          locale,
          copy,
        )
      : "",
  };
}

function lineFromAllotment(
  allotment: Allotment,
  locale: string,
  copy: AdminCopy,
): DraftLine[] {
  return allotment.lines.map((line) => ({
    key: line.id,
    roomId: line.purchaseLineId || line.roomId,
    quantity: String(line.quantity),
    cost: moneyInput(line.costPerNight),
    price: moneyInput(line.agencyPricePerNight),
    label: roomChoiceLabel(
      line.hotelName,
      line.roomName,
      line.roomCheckIn,
      line.roomCheckOut,
      locale,
      copy,
    ),
  }));
}

function lineIsFilled(line: DraftLine) {
  return Boolean(line.roomId || line.cost.trim() || line.price.trim());
}

function stayBounds(options: RoomOption[], mode: "union" | "intersection") {
  let start = "";
  let end = "";
  for (const room of options) {
    if (!room.checkIn || !room.checkOut) continue;
    if (!start || (mode === "union" ? room.checkIn < start : room.checkIn > start)) {
      start = room.checkIn;
    }
    if (!end || (mode === "union" ? room.checkOut > end : room.checkOut < end)) {
      end = room.checkOut;
    }
  }
  if (!start || !end || start >= end) return null;
  return { start, end };
}

export function SaleChannelMark({ channel }: { channel: SaleChannel }) {
  const copy = useAdminCopy();
  const label =
    channel === "b2c"
      ? copy.channelB2c
      : channel === "b2b"
        ? copy.channelB2b
        : copy.channelDesk;
  const tone =
    channel === "b2c"
      ? "bg-[var(--desk-primary-soft)] text-[var(--desk-primary)]"
      : channel === "b2b"
        ? "bg-[var(--desk-gold-soft)] text-[var(--desk-gold)]"
        : "bg-[var(--desk-surface-muted)] text-[var(--desk-muted)]";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function StageTrack({ status }: { status: AllotmentStatus }) {
  const copy = useAdminCopy();
  const steps: Array<{ id: AllotmentStatus; label: string }> = [
    { id: "request", label: copy.statusRequest },
    { id: "provisional", label: copy.statusProvisional },
    { id: "confirmed", label: copy.confirmed },
    { id: "cancelled", label: copy.cancelled },
    { id: "no_show", label: copy.statusNoShow },
  ];
  return (
    <div className="flex overflow-hidden rounded border border-[var(--desk-line)] bg-white text-[11px] font-semibold">
      {steps.map((step) => {
        const current = step.id === status;
        const tone = !current
          ? "text-[var(--desk-muted)]"
          : step.id === "confirmed"
            ? "bg-[var(--desk-success-soft)] text-[var(--desk-success)]"
            : step.id === "cancelled"
              ? "bg-[var(--desk-danger-soft)] text-[var(--desk-danger)]"
              : "bg-[var(--desk-warning-soft)] text-[var(--desk-warning)]";
        return (
          <span
            key={step.id}
            className={`inline-flex items-center gap-1.5 border-e border-[var(--desk-line)] px-3 py-1 last:border-e-0 ${tone}`}
          >
            {current && <span className="size-1.5 rounded-full bg-current" />}
            {step.label}
          </span>
        );
      })}
    </div>
  );
}

export function AllotmentForm({
  agencies,
  rooms,
  allotment,
  roomId,
  agencyId,
  initialCheckIn,
  initialCheckOut,
  rates = [],
}: {
  agencies: Array<{
    id: string;
    name: string;
    country: string;
    kind?: string;
  }>;
  rooms: RoomOption[];
  allotment?: Allotment;
  roomId?: string;
  agencyId?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  rates?: Array<{
    purchaseLineId: string;
    agencyId: string;
    pricePerNight: number;
  }>;
}) {
  const copy = useAdminCopy();
  const locale = useAdminLocale();
  const websiteBooking = allotment?.channel === "b2c";
  const locked = Boolean(allotment && allotment.status !== "request") || websiteBooking;
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
      ? lineFromAllotment(allotment, locale, copy)
      : [emptyLine(preset, locale, copy)],
  );
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState("");
  const selectedAgency = agencies.find((agency) => agency.id === selectedAgencyId);

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

  const selectedRooms = lines
    .map((line) => rooms.find((room) => room.id === line.roomId))
    .filter((room): room is RoomOption => Boolean(room?.checkIn && room.checkOut));
  const bounds = selectedRooms.length
    ? stayBounds(selectedRooms, "intersection")
    : stayBounds(rooms, "union");
  const clash = selectedRooms.length > 0 && !bounds;
  const stayReady = nightsBetween(checkIn, checkOut) > 0;
  const windowProblem = clash
    ? copy.saleRoomsClash
    : stayReady &&
        selectedRooms.some(
          (room) => !stayInside(checkIn, checkOut, room.checkIn, room.checkOut),
        )
      ? copy.saleWindowError
      : stayReady &&
          !rooms.some((room) =>
            stayInside(checkIn, checkOut, room.checkIn, room.checkOut),
          )
        ? copy.noRoomForStay
        : "";
  const listedRooms = stayReady
    ? rooms.filter((room) =>
        stayInside(checkIn, checkOut, room.checkIn, room.checkOut),
      )
    : rooms;
  const checkInMax = bounds
    ? [shiftIsoDate(bounds.end, -1), checkOut ? shiftIsoDate(checkOut, -1) : ""]
        .filter(Boolean)
        .sort()[0]
    : undefined;
  const checkOutMin = bounds
    ? [shiftIsoDate(bounds.start, 1), checkIn ? shiftIsoDate(checkIn, 1) : ""]
        .filter(Boolean)
        .sort()
        .at(-1)
    : undefined;

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const intent =
      submitter instanceof HTMLButtonElement ? submitter.value : "request";
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
    const uncovered = filled.some((line) => {
      if (!line.roomId) return false;
      const room = rooms.find((item) => item.id === line.roomId);
      return !room || !stayInside(checkIn, checkOut, room.checkIn, room.checkOut);
    });
    const stockCovers = rooms.some((room) =>
      stayInside(checkIn, checkOut, room.checkIn, room.checkOut),
    );
    if (uncovered || !stockCovers) {
      event.preventDefault();
      setFormError(copy.saleWindowError);
      return;
    }
    if ((intent === "confirm" || intent === "hold") && filled.length === 0) {
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
    <div className="overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--desk-line)] bg-[var(--desk-surface-muted)] px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {!locked && (
            <>
              <button
                type="submit"
                form="allotment-form"
                name="intent"
                value="confirm"
                disabled={pending !== ""}
                className="desk-focus inline-flex h-8 items-center gap-1.5 rounded bg-[var(--desk-primary)] px-3.5 text-xs font-semibold text-white hover:bg-[var(--desk-primary-hover)] disabled:opacity-55"
              >
                {pending === "confirm" ? copy.confirming : copy.confirmAllotment}
              </button>
              <button
                type="submit"
                form="allotment-form"
                name="intent"
                value="hold"
                disabled={pending !== ""}
                className="desk-focus inline-flex h-8 items-center gap-1.5 rounded border border-[var(--desk-line)] bg-white px-3 text-xs font-semibold text-[var(--desk-ink)] hover:bg-white/70 disabled:opacity-55"
              >
                {pending === "hold" ? copy.saving : copy.holdSale}
              </button>
              <button
                type="submit"
                form="allotment-form"
                name="intent"
                value="request"
                disabled={pending !== ""}
                className="desk-focus inline-flex h-8 items-center gap-1.5 rounded border border-[var(--desk-line)] bg-white px-3 text-xs font-semibold text-[var(--desk-ink)] hover:bg-white/70 disabled:opacity-55"
              >
                {pending === "request" ? copy.saving : copy.saveRequest}
              </button>
            </>
          )}
          {allotment?.status === "provisional" && !websiteBooking && (
            <form action={confirmHeldAllotmentAction}>
              <input type="hidden" name="id" value={allotment.id} />
              <button
                type="submit"
                className="desk-focus inline-flex h-8 items-center rounded bg-[var(--desk-primary)] px-3.5 text-xs font-semibold text-white hover:bg-[var(--desk-primary-hover)]"
              >
                {copy.confirmAllotment}
              </button>
            </form>
          )}
          {(allotment?.status === "confirmed" || allotment?.status === "provisional") && (
            <NamedConfirm
              title={copy.cancelAllotmentTitle}
              body={fill(copy.cancelAllotmentBody, { number: allotment.number })}
              confirm={copy.cancelAction}
              pendingLabel={copy.cancelling}
              cancelLabel={copy.keepAllotment}
              action={cancelAllotmentAction}
              fields={{ id: allotment.id }}
              trigger={copy.cancelAction}
              triggerClassName="desk-focus inline-flex h-8 items-center px-2 text-xs font-semibold text-[var(--desk-muted)] hover:text-[var(--desk-danger)]"
            />
          )}
          {allotment?.status === "confirmed" && (
            <form action={markNoShowAction}>
              <input type="hidden" name="id" value={allotment.id} />
              <button
                type="submit"
                className="desk-focus inline-flex h-8 items-center px-2 text-xs font-semibold text-[var(--desk-muted)] hover:text-[var(--desk-danger)]"
              >
                {copy.markNoShow}
              </button>
            </form>
          )}
          {allotment?.status === "request" && (
            <NamedConfirm
              title={copy.deleteDraftTitle}
              body={fill(copy.deleteDraftBody, { number: allotment.number })}
              confirm={copy.deleteAction}
              pendingLabel={copy.deleting}
              cancelLabel={copy.keepDraft}
              action={deleteAllotmentAction}
              fields={{ id: allotment.id }}
              trigger={copy.deleteAction}
              triggerClassName="desk-focus inline-flex h-8 items-center px-2 text-xs font-semibold text-[var(--desk-muted)] hover:text-[var(--desk-danger)]"
            />
          )}
          {allotment?.status === "cancelled" && (
            <>
              {!websiteBooking && (
                <form action={reopenAllotmentAction}>
                  <input type="hidden" name="id" value={allotment.id} />
                  <button
                    type="submit"
                    className="desk-focus inline-flex h-8 items-center rounded bg-[var(--desk-primary)] px-3.5 text-xs font-semibold text-white hover:bg-[var(--desk-primary-hover)]"
                  >
                    {copy.makeDraft}
                  </button>
                </form>
              )}
              <DeleteCancelledAllotment id={allotment.id} number={allotment.number} compact />
            </>
          )}
        </div>
        <StageTrack status={allotment?.status ?? "request"} />
      </div>

      <form
        id="allotment-form"
        action={saveAllotmentAction}
        onSubmit={onSubmit}
        className="p-6 sm:p-8"
      >
        {allotment && <input type="hidden" name="id" value={allotment.id} />}
        {formError && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-[var(--desk-danger-line)] bg-[var(--desk-danger-soft)] px-3 py-2 text-sm text-[var(--desk-danger)]"
          >
            {formError}
          </p>
        )}

        <div className="mb-6 border-b border-[var(--desk-line-soft)] pb-4">
          <span className="mb-1 block text-[11px] font-semibold tracking-wider text-[var(--desk-muted)] uppercase">
            {copy.salesOrder}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-plex text-3xl font-bold tracking-tight text-[var(--desk-ink)]">
              {allotment?.number ?? copy.newAllotment}
            </h2>
            <SaleChannelMark channel={allotment?.channel ?? "desk"} />
            {selectedAgency && (
              <span className="text-base font-medium text-[var(--desk-text)]">
                — {selectedAgency.name}
              </span>
            )}
          </div>
        </div>

        {!locked && (
          <div className="mb-4">
            <CalendarSwitch
              label={copy.calendar}
              normal={copy.normalCalendar}
              arabic={copy.arabicCalendar}
            />
          </div>
        )}

        <div className="mb-8 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
              {copy.agency}
            </span>
            {locked ? (
              <span className="text-sm font-medium">{allotment?.agencyName}</span>
            ) : (
              <select
                name="agencyId"
                required
                value={selectedAgencyId}
                onChange={(event) => setSelectedAgencyId(event.target.value)}
                className={adminFieldClass}
              >
                <option value="">{copy.chooseAgency}</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                    {agency.country ? ` — ${agency.country}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
              {copy.checkIn}
            </span>
            {locked ? (
              <DualDate iso={allotment?.checkIn} locale={locale} />
            ) : (
              <DateField
                name="checkIn"
                label={copy.checkIn}
                locale={locale}
                required
                min={bounds?.start}
                max={checkInMax}
                disabled={clash}
                value={checkIn}
                onChange={setCheckIn}
              />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
              {copy.checkOut}
            </span>
            {locked ? (
              <DualDate iso={allotment?.checkOut} locale={locale} />
            ) : (
              <DateField
                name="checkOut"
                label={copy.checkOut}
                locale={locale}
                required
                min={checkOutMin}
                max={bounds?.end}
                disabled={clash}
                value={checkOut}
                onChange={setCheckOut}
              />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
              {copy.orderDate}
            </span>
            {allotment ? (
              <DualDate iso={allotment.createdAt.slice(0, 10)} locale={locale} />
            ) : (
              <span className="text-sm text-[var(--desk-muted)]">{copy.numberAssigned}</span>
            )}
          </div>
        </div>

        {windowProblem ? (
          <p className="mb-6 text-sm text-[var(--desk-danger)]">{windowProblem}</p>
        ) : bounds && selectedRooms.length > 0 ? (
          <p className="mb-6 text-sm text-[var(--desk-muted)]">
            {fill(copy.saleWindowHint, {
              range: formatDateRange(bounds.start, bounds.end, locale),
            })}
          </p>
        ) : null}

        <div className="mb-3 border-b border-[var(--desk-line)]">
          <span className="-mb-px inline-flex border-b-2 border-[var(--desk-primary)] pb-2 text-xs font-bold text-[var(--desk-primary)]">
            {copy.orderLines}
          </span>
        </div>

        <div className="overflow-x-auto rounded border border-[var(--desk-line)]">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--desk-line)] bg-[var(--desk-surface-muted)] text-[11px] font-semibold tracking-wider text-[var(--desk-muted)] uppercase">
                <th className="px-4 py-2.5">{copy.rooms}</th>
                <th className="px-3 py-2.5 text-center">{copy.nights}</th>
                <th className="px-3 py-2.5 text-center">{copy.qty}</th>
                <th className="px-4 py-2.5 text-end">{copy.costNight}</th>
                <th className="px-4 py-2.5 text-end">{copy.agencyPriceNight}</th>
                <th className="px-4 py-2.5 text-end">{copy.sell}</th>
                {!locked && <th className="w-16 px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--desk-line-soft)]">
              {lines.map((line) => {
                const nights = nightsBetween(checkIn, checkOut);
                const price = lineHalalas(line.price);
                const quantity = parsedQuantity(line.quantity);
                const sell =
                  nights > 0 && price !== null && quantity !== null
                    ? price * nights * quantity
                    : null;
                return (
                  <tr key={line.key} className="hover:bg-[var(--desk-canvas)]">
                    <td className="px-4 py-3">
                      {locked ? (
                        <span className="font-medium text-[var(--desk-ink)]">{line.label}</span>
                      ) : (
                        <select
                          name="lineRoom"
                          value={line.roomId}
                          onChange={(event) => {
                            const room = rooms.find((item) => item.id === event.target.value);
                            updateLine(line.key, {
                              roomId: event.target.value,
                              label: room ? contractLabel(room, locale, copy) : "",
                              cost: room ? moneyInput(room.costPerNight) : line.cost,
                              price:
                                rates.find(
                                  (rate) =>
                                    rate.purchaseLineId === event.target.value &&
                                    rate.agencyId === selectedAgencyId,
                                )?.pricePerNight != null
                                  ? moneyInput(
                                      rates.find(
                                        (rate) =>
                                          rate.purchaseLineId === event.target.value &&
                                          rate.agencyId === selectedAgencyId,
                                      )!.pricePerNight,
                                    )
                                  : line.price,
                            });
                          }}
                          className={adminFieldClass}
                        >
                          <option value="">{copy.selectRoom}</option>
                          {line.roomId &&
                            !listedRooms.some((room) => room.id === line.roomId) && (
                              <option value={line.roomId}>{line.label}</option>
                            )}
                          {listedRooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {contractLabel(room, locale, copy)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-plex">
                      {nights > 0 ? nights : "—"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {locked ? (
                        <span className="font-plex font-medium">{line.quantity}</span>
                      ) : (
                        <input
                          name="lineQuantity"
                          type="number"
                          min={1}
                          max={5000}
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(line.key, { quantity: event.target.value })
                          }
                          className={`${adminFieldClass} text-center`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      {locked ? (
                        <span className="font-plex">{line.cost}</span>
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
                    <td className="px-4 py-3 text-end">
                      {locked ? (
                        <span className="font-plex">{line.price}</span>
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
                    <td className="px-4 py-3 text-end font-plex font-semibold">
                      {sell === null ? "—" : formatMoney(sell, locale)}
                    </td>
                    {!locked && (
                      <td className="px-3 py-3 text-end">
                        <button
                          type="button"
                          onClick={() =>
                            setLines((current) =>
                              current.length === 1
                                ? [emptyLine(undefined, locale, copy)]
                                : current.filter((item) => item.key !== line.key),
                            )
                          }
                          className="whitespace-nowrap text-[11px] font-semibold text-[var(--desk-danger)]"
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

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          {!locked ? (
            <button
              type="button"
              onClick={() =>
                setLines((current) => [...current, emptyLine(undefined, locale, copy)])
              }
              className="font-semibold text-[var(--desk-primary)] hover:underline"
            >
              + {copy.addRoom}
            </button>
          ) : (
            <span />
          )}
          <span className="font-plex text-[var(--desk-muted)]">
            {lines.filter((line) => line.roomId).length} · {totals.rooms} {copy.rooms}
          </span>
        </div>

        <div className="mt-6">
          <label className="grid gap-1.5 text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
            {copy.terms}
            {locked ? (
              <p className="text-sm font-normal normal-case tracking-normal text-[var(--desk-text)]">
                {allotment?.notes || "—"}
              </p>
            ) : (
              <textarea
                name="notes"
                defaultValue={allotment?.notes ?? ""}
                placeholder={copy.notesExample}
                className={`${adminFieldClass} !h-auto min-h-20 py-2 normal-case tracking-normal`}
              />
            )}
          </label>
        </div>

        <div className="mt-8 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 border-t border-[var(--desk-line)] pt-4 text-sm">
            <div className="flex justify-between gap-6 text-[var(--desk-muted)]">
              <dt>{copy.sell}</dt>
              <dd className="font-plex font-medium text-[var(--desk-ink)]">
                {formatMoney(totals.revenue, locale)}
              </dd>
            </div>
            <div className="flex justify-between gap-6 text-[var(--desk-muted)]">
              <dt>{copy.margin}</dt>
              <dd className="font-plex font-medium text-[var(--desk-success)]">
                {formatMoney(totals.margin, locale)}
              </dd>
            </div>
            <div className="flex justify-between gap-6 border-t border-[var(--desk-line)] pt-2 text-base font-bold text-[var(--desk-ink)]">
              <dt>{copy.contractValue}</dt>
              <dd className="font-plex text-lg text-[var(--desk-primary)]">
                {formatMoney(totals.revenue, locale)}
              </dd>
            </div>
          </dl>
        </div>
      </form>
    </div>
  );
}
export function DeleteCancelledAllotment({
  id,
  number,
  compact = false,
}: {
  id: string;
  number: string;
  compact?: boolean;
}) {
  const copy = useAdminCopy();
  return (
    <NamedConfirm
      title={copy.deleteCancelledTitle}
      body={fill(copy.deleteCancelledBody, { number })}
      confirm={copy.deleteAction}
      pendingLabel={copy.deleting}
      cancelLabel={copy.keepCancelled}
      action={deleteAllotmentAction}
      fields={{ id }}
      trigger={copy.deleteAction}
      triggerClassName={compact ? undefined : adminButtonDangerClass}
    />
  );
}

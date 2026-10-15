"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  cancelAllotmentAction,
  confirmHeldAllotmentAction,
  deleteAllotmentAction,
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
  purchaseLineId?: string;
  name: string;
  hotelName: string;
  costPerNight: number;
  roomPrice: number;
  checkIn: string | null;
  checkOut: string | null;
  board?: MealPlan;
  view?: string;
  meals: Array<{ code: string; cost: number; price: number }>;
  views: Array<{ name: string; cost: number; price: number }>;
  minNights?: number;
  stopSale?: boolean;
  defaultAgencyPricePerNight?: number | null;
  policyName?: string;
  generalTerms?: string;
  cancellationTerms?: string;
  paymentTerms?: string;
  releaseDays?: number;
  refundable?: boolean;
};

type DirectCatalog = {
  hotels: Array<{ id: string; name: string }>;
  roomTypes: Array<{ id: string; name: string; guests: number }>;
  meals: Array<{ code: string; name: string }>;
  hotelRooms: Array<{ hotelId: string; roomTypeId: string }>;
  hotelMeals: Array<{ hotelId: string; code: string }>;
  hotelViews: Array<{ hotelId: string; name: string }>;
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
  hotelId: string;
  mealCode: string;
  mealCodes: string[];
  viewName: string;
  quantity: string;
  cost: string;
  price: string;
  label: string;
};

function quotedMoney(room: RoomOption, mealCode: string, viewName: string) {
  const meal = room.meals.find((item) => item.code === mealCode);
  const view = room.views.find((item) => item.name === viewName);
  const roomPrice = room.roomPrice ?? 0;
  return {
    roomCost: room.costPerNight,
    roomPrice,
    mealCost: meal?.cost ?? 0,
    mealPrice: meal?.price ?? 0,
    viewCost: view?.cost ?? 0,
    viewPrice: view?.price ?? 0,
    cost: room.costPerNight + (meal?.cost ?? 0) + (view?.cost ?? 0),
    price: roomPrice + (meal?.price ?? 0) + (view?.price ?? 0),
  };
}

export function AllotmentStatusPill({ status }: { status: AllotmentStatus }) {
  const copy = useAdminCopy();
  const statusLabel: Record<AllotmentStatus, string> = {
    request: copy.statusRequest,
    provisional: copy.statusProvisional,
    confirmed: copy.confirmed,
    cancelled: copy.cancelled,
    no_show: copy.statusNoShow,
    unavailable: copy.statusUnavailable,
    regret: copy.statusRegret,
  };
  return (
    <AdminStatusPill
      tone={
        status === "confirmed"
          ? "success"
          : status === "cancelled" ||
              status === "no_show" ||
              status === "unavailable" ||
              status === "regret"
            ? "danger"
            : "warning"
      }
    >
      <span className="me-1.5 inline-block size-1.5 rounded-full bg-current" aria-hidden="true" />
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
  const mealCode = room?.meals[0]?.code ?? room?.board ?? "";
  const viewName = room?.views[0]?.name ?? room?.view ?? "";
  const quote = room ? quotedMoney(room, mealCode, viewName) : null;
  return {
    key: crypto.randomUUID(),
    roomId: room?.id ?? "",
    hotelId: "",
    mealCode,
    mealCodes: mealCode ? [mealCode] : [],
    viewName,
    quantity: "1",
    cost: quote ? moneyInput(quote.cost) : "",
    price: quote ? moneyInput(quote.price) : "",
    label: room ? contractLabel(room, locale, copy) : "",
  };
}

function lineFromAllotment(
  allotment: Allotment,
  locale: string,
  copy: AdminCopy,
): DraftLine[] {
  return allotment.lines.map((line) => {
    const mealLabels = {
      room_only: copy.roomOnly,
      breakfast: copy.breakfastBoard,
      half_board: copy.halfBoard,
      full_board: copy.fullBoard,
    };
    const meal = mealPlanLabel(line.boardSnapshot, mealLabels);
    const direct = allotment.saleSource === "direct";
    const directMeals = (line.rateSnapshot.meals ?? [])
      .map((code) => mealPlanLabel(code, mealLabels))
      .filter(Boolean)
      .join(", ");
    return {
      key: line.id,
      roomId: direct
        ? (line.rateSnapshot.roomTypeId ?? "")
        : line.contractPeriodId || line.purchaseLineId || line.roomId,
      hotelId: line.rateSnapshot.hotelId ?? "",
      mealCode: line.boardSnapshot,
      mealCodes:
        line.rateSnapshot.meals ??
        (line.boardSnapshot && line.boardSnapshot !== "room_only" ? [line.boardSnapshot] : []),
      viewName: line.viewSnapshot,
      quantity: String(line.quantity),
      cost: moneyInput(line.costPerNight),
      price: moneyInput(line.agencyPricePerNight),
      label: `${direct ? `${line.hotelName} — ${roomTypeLabel(line.roomName, (type) => copy[type])}` : roomChoiceLabel(
        line.hotelName,
        line.roomName,
        line.roomCheckIn,
        line.roomCheckOut,
        locale,
        copy,
      )} · ${direct ? directMeals || meal : meal}${line.viewSnapshot ? ` · ${line.viewSnapshot}` : ""}`,
    };
  });
}

function lineIsFilled(line: DraftLine) {
  return Boolean(line.roomId || line.hotelId || line.cost.trim() || line.price.trim());
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
    { id: "regret", label: copy.statusRegret },
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
  catalog,
  commercials = [],
}: {
  agencies: Array<{
    id: string;
    name: string;
    country: string;
    kind?: string;
  }>;
  commercials?: Array<{ id: string; name: string }>;
  rooms: RoomOption[];
  allotment?: Allotment;
  roomId?: string;
  agencyId?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  catalog: DirectCatalog;
}) {
  const copy = useAdminCopy();
  const locale = useAdminLocale();
  const websiteBooking = allotment?.channel === "b2c";
  const locked = Boolean(allotment && allotment.status !== "request") || websiteBooking;
  const preset = rooms.find((room) => room.id === roomId);
  const [source, setSource] = useState<"contract" | "direct">(
    allotment?.saleSource ?? (rooms.length ? "contract" : "direct"),
  );
  const [selectedAgencyId, setSelectedAgencyId] = useState(
    allotment?.agencyId ?? agencyId ?? "",
  );
  const [commercialId, setCommercialId] = useState(allotment?.commercialId ?? "");
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
    let roomCount = 0;
    if (source === "direct") {
      for (const line of lines) {
        const lineCost = lineHalalas(line.cost);
        const linePrice = lineHalalas(line.price);
        const quantity = parsedQuantity(line.quantity);
        if (lineCost === null || linePrice === null || quantity === null) continue;
        roomCount += quantity;
        cost += lineCost;
        revenue += linePrice;
      }
      return { nights, cost, revenue, margin: revenue - cost, rooms: roomCount };
    }
    if (nights < 1)
      return { nights: 0, cost: 0, revenue: 0, margin: 0, rooms: 0 };
    for (const line of lines) {
      const room = rooms.find((item) => item.id === line.roomId);
      const quote = room ? quotedMoney(room, line.mealCode, line.viewName) : null;
      const lineCost = quote ? quote.cost : lineHalalas(line.cost);
      const linePrice = quote ? quote.price : lineHalalas(line.price);
      const quantity = parsedQuantity(line.quantity);
      if (lineCost === null || linePrice === null || quantity === null) continue;
      roomCount += quantity;
      cost += lineCost * nights * quantity;
      revenue += linePrice * nights * quantity;
    }
    return { nights, cost, revenue, margin: revenue - cost, rooms: roomCount };
  }, [checkIn, checkOut, lines, rooms, source]);

  const selectedRooms =
    source === "direct"
      ? []
      : lines
          .map((line) => rooms.find((room) => room.id === line.roomId))
          .filter((room): room is RoomOption => Boolean(room?.checkIn && room.checkOut));
  const selectedTerms = allotment
    ? allotment.lines.map((line) => ({
        id: line.id,
        name: String(line.termsSnapshot.name ?? copy.terms),
        generalTerms: String(line.termsSnapshot.generalTerms ?? ""),
        cancellationTerms: String(
          line.termsSnapshot.cancellationTerms ?? "",
        ),
        paymentTerms: String(line.termsSnapshot.paymentTerms ?? ""),
        releaseDays: Number(line.termsSnapshot.releaseDays ?? 0),
        refundable: line.termsSnapshot.refundable !== false,
      }))
    : selectedRooms.map((room) => ({
        id: room.id,
        name: room.policyName || copy.terms,
        generalTerms: room.generalTerms ?? "",
        cancellationTerms: room.cancellationTerms ?? "",
        paymentTerms: room.paymentTerms ?? "",
        releaseDays: room.releaseDays ?? 0,
        refundable: room.refundable !== false,
      }));
  const uniqueTerms = [
    ...new Map(
      selectedTerms.map((terms) => [
        `${terms.name}:${terms.generalTerms}:${terms.cancellationTerms}`,
        terms,
      ]),
    ).values(),
  ];
  const bounds =
    source === "direct"
      ? null
      : selectedRooms.length
        ? stayBounds(selectedRooms, "intersection")
        : stayBounds(rooms, "union");
  const clash = source !== "direct" && selectedRooms.length > 0 && !bounds;
  const stayReady = nightsBetween(checkIn, checkOut) > 0;
  const windowProblem =
    source === "direct"
      ? ""
      : clash
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
        stayInside(checkIn, checkOut, room.checkIn, room.checkOut) &&
        !room.stopSale &&
        nightsBetween(checkIn, checkOut) >= (room.minNights ?? 1),
      )
    : rooms.filter((room) => !room.stopSale);
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

  function applyContractChoice(
    key: string,
    room: RoomOption,
    mealCode: string,
    viewName: string,
    roomId = room.id,
  ) {
    const quote = quotedMoney(room, mealCode, viewName);
    updateLine(key, {
      roomId,
      mealCode,
      viewName,
      label: contractLabel(room, locale, copy),
      cost: moneyInput(quote.cost),
      price: moneyInput(quote.price),
    });
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
    if (source === "direct") {
      const broken = filled.find((line) => {
        const views = catalog.hotelViews.filter((view) => view.hotelId === line.hotelId);
        return (
          !line.hotelId ||
          !line.roomId ||
          (views.length > 0 && !views.some((view) => view.name === line.viewName)) ||
          parsedQuantity(line.quantity) === null ||
          lineHalalas(line.cost) === null ||
          lineHalalas(line.price) === null
        );
      });
      if ((intent === "confirm" || intent === "hold") && (filled.length === 0 || broken)) {
        event.preventDefault();
        setFormError(broken ? copy.linePricingError : copy.allotmentLinesError);
        return;
      }
      if (broken) {
        event.preventDefault();
        setFormError(copy.linePricingError);
        return;
      }
      setFormError("");
      setPending(intent);
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
    const broken = filled.find((line) => {
      const room = rooms.find((item) => item.id === line.roomId);
      return (
        !line.roomId ||
        parsedQuantity(line.quantity) === null ||
        (Boolean(room?.meals.length) && !room?.meals.some((meal) => meal.code === line.mealCode)) ||
        (Boolean(room?.views.length) && !room?.views.some((view) => view.name === line.viewName))
      );
    });
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
            <form action={confirmHeldAllotmentAction} className="flex items-center gap-3">
              <input type="hidden" name="id" value={allotment.id} />
              <label className="flex items-center gap-2 text-xs font-semibold text-[var(--desk-ink)]">
                <input name="useOverbook" type="checkbox" className="size-3.5" />
                {copy.useOverbook}
              </label>
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
        <input type="hidden" name="saleSource" value={source} />
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

        <div className="mb-6 grid gap-2">
          <span className="text-[11px] font-semibold tracking-wider text-[var(--desk-muted)] uppercase">
            {copy.saleSource}
          </span>
          {locked ? (
            <span className="text-sm font-semibold">
              {source === "direct" ? copy.saleHotelDirect : copy.saleFromContract}
            </span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(["contract", "direct"] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => {
                    setSource(choice);
                    setLines([emptyLine(undefined, locale, copy)]);
                  }}
                  className={`desk-focus rounded border px-3 py-1.5 text-xs font-semibold ${
                    source === choice
                      ? "border-[var(--desk-primary)] bg-[var(--desk-primary-soft)] text-[var(--desk-primary)]"
                      : "border-[var(--desk-line)] bg-white text-[var(--desk-ink)]"
                  }`}
                >
                  {choice === "direct" ? copy.saleHotelDirect : copy.saleFromContract}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-[var(--desk-muted)]">
            {source === "direct" ? copy.directTotalsHint : copy.contractRateHint}
          </p>
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
              {copy.repOnSale}
            </span>
            {locked ? (
              <span className="text-sm font-medium">
                {allotment?.commissionPercent == null
                  ? copy.noRep
                  : fill(copy.commissionLine, {
                      name: allotment.commercialName || copy.noRep,
                      percent: allotment.commissionPercent,
                      amount: formatMoney(
                        Math.round(
                          (allotment.lines.reduce((sum, line) => {
                            const nights = nightsBetween(
                              allotment.checkIn,
                              allotment.checkOut,
                            );
                            const units = line.amountBasis === "stay" ? 1 : nights;
                            return sum + line.agencyPricePerNight * line.quantity * units;
                          }, 0) *
                            allotment.commissionPercent) /
                            100,
                        ),
                        locale,
                      ),
                    })}
              </span>
            ) : (
              <select
                name="commercialId"
                value={commercialId}
                onChange={(event) => setCommercialId(event.target.value)}
                className={adminFieldClass}
              >
                <option value="">{copy.noRep}</option>
                {commercials.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
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
                <th className="px-4 py-2.5 text-end">{source === "direct" ? copy.totalCost : copy.costNight}</th>
                <th className="px-4 py-2.5 text-end">{source === "direct" ? copy.totalPrice : copy.agencyPriceNight}</th>
                <th className="px-4 py-2.5 text-end">{copy.sell}</th>
                {!locked && <th className="w-16 px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--desk-line-soft)]">
              {lines.map((line) => {
                const nights = nightsBetween(checkIn, checkOut);
                const price = lineHalalas(line.price);
                const quantity = parsedQuantity(line.quantity);
                const contractRoom = rooms.find((room) => room.id === line.roomId);
                const quote =
                  source === "contract" && contractRoom && !locked
                    ? quotedMoney(contractRoom, line.mealCode, line.viewName)
                    : null;
                const nightly = quote?.price ?? price;
                const sell =
                  source === "direct"
                    ? price
                    : nights > 0 && nightly !== null && quantity !== null
                      ? nightly * nights * quantity
                      : null;
                const directRooms = catalog.roomTypes.filter((type) =>
                  catalog.hotelRooms.some(
                    (link) => link.hotelId === line.hotelId && link.roomTypeId === type.id,
                  ),
                );
                const directViews = catalog.hotelViews.filter((link) => link.hotelId === line.hotelId);
                const directMeals = catalog.meals.filter((meal) =>
                  catalog.hotelMeals.some(
                    (link) => link.hotelId === line.hotelId && link.code === meal.code,
                  ),
                );
                const saved = allotment?.lines.find((item) => item.id === line.key);
                return (
                  <tr key={line.key} className="hover:bg-[var(--desk-canvas)]">
                    <td className="px-4 py-3">
                      {locked ? (
                        <div className="grid gap-1">
                          <span className="font-medium text-[var(--desk-ink)]">{line.label}</span>
                          {saved?.rateSnapshot.room && (
                            <p className="text-[11px] text-[var(--desk-muted)]">
                              {copy.componentRoom} {formatMoney(saved.rateSnapshot.room.cost, locale)} / {formatMoney(saved.rateSnapshot.room.price, locale)}
                              {saved.rateSnapshot.meal ? ` · ${copy.componentMeal} ${formatMoney(saved.rateSnapshot.meal.cost, locale)} / ${formatMoney(saved.rateSnapshot.meal.price, locale)}` : ""}
                              {saved.rateSnapshot.view?.name ? ` · ${copy.componentView} ${formatMoney(saved.rateSnapshot.view.cost, locale)} / ${formatMoney(saved.rateSnapshot.view.price, locale)}` : ""}
                            </p>
                          )}
                        </div>
                      ) : source === "direct" ? (
                        <div className="grid gap-2">
                          <select
                            name="directHotel"
                            value={line.hotelId}
                            onChange={(event) =>
                              updateLine(line.key, {
                                hotelId: event.target.value,
                                roomId: "",
                                viewName: "",
                                mealCodes: [],
                              })
                            }
                            className={adminFieldClass}
                          >
                            <option value="">{copy.selectHotel}</option>
                            {catalog.hotels.map((hotel) => (
                              <option key={hotel.id} value={hotel.id}>{hotel.name}</option>
                            ))}
                          </select>
                          <select
                            name="directRoom"
                            value={line.roomId}
                            onChange={(event) => updateLine(line.key, { roomId: event.target.value })}
                            className={adminFieldClass}
                          >
                            <option value="">{copy.selectRoom}</option>
                            {directRooms.map((type) => (
                              <option key={type.id} value={type.id}>
                                {roomTypeLabel(type.name, (code) => copy[code])} · {type.guests}
                              </option>
                            ))}
                          </select>
                          <select
                            name="directView"
                            value={line.viewName}
                            onChange={(event) => updateLine(line.key, { viewName: event.target.value })}
                            className={adminFieldClass}
                          >
                            <option value="">{copy.componentView}</option>
                            {directViews.map((view) => (
                              <option key={view.name} value={view.name}>{view.name}</option>
                            ))}
                          </select>
                          <input type="hidden" name="directMeals" value={line.mealCodes.join(",")} />
                          <div className="flex flex-wrap gap-2">
                            {directMeals.map((meal) => (
                              <label key={meal.code} className="flex items-center gap-1 font-semibold">
                                <input
                                  type="checkbox"
                                  checked={line.mealCodes.includes(meal.code)}
                                  onChange={(event) =>
                                    updateLine(line.key, {
                                      mealCodes: event.target.checked
                                        ? [...new Set([...line.mealCodes, meal.code])]
                                        : line.mealCodes.filter((code) => code !== meal.code),
                                    })
                                  }
                                />
                                {mealPlanLabel(meal.code, {
                                  room_only: copy.roomOnly,
                                  breakfast: copy.breakfastBoard,
                                  half_board: copy.halfBoard,
                                  full_board: copy.fullBoard,
                                }) || meal.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          <select
                            name="lineRoom"
                            value={line.roomId}
                            onChange={(event) => {
                              const room = rooms.find((item) => item.id === event.target.value);
                              if (!room) {
                                updateLine(line.key, { roomId: "", mealCode: "", viewName: "", cost: "", price: "", label: "" });
                                return;
                              }
                              applyContractChoice(
                                line.key,
                                room,
                                room.meals[0]?.code ?? room.board ?? "",
                                room.views[0]?.name ?? "",
                              );
                            }}
                            className={adminFieldClass}
                          >
                            <option value="">{copy.selectRoom}</option>
                            {line.roomId && !listedRooms.some((room) => room.id === line.roomId) && (
                              <option value={line.roomId}>{line.label}</option>
                            )}
                            {listedRooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {contractLabel(room, locale, copy)}
                              </option>
                            ))}
                          </select>
                          {!contractRoom && (
                            <>
                              <input type="hidden" name="lineMeal" value="" />
                              <input type="hidden" name="lineView" value="" />
                            </>
                          )}
                          {contractRoom && (
                            <>
                              {contractRoom.meals.length ? (
                                <select
                                  name="lineMeal"
                                  value={line.mealCode}
                                  onChange={(event) =>
                                    applyContractChoice(line.key, contractRoom, event.target.value, line.viewName, line.roomId)
                                  }
                                  className={adminFieldClass}
                                >
                                  {contractRoom.meals.map((meal) => (
                                    <option key={meal.code} value={meal.code}>
                                      {mealPlanLabel(meal.code, {
                                        room_only: copy.roomOnly,
                                        breakfast: copy.breakfastBoard,
                                        half_board: copy.halfBoard,
                                        full_board: copy.fullBoard,
                                      })}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input type="hidden" name="lineMeal" value="" />
                              )}
                              <select
                                name="lineView"
                                value={line.viewName}
                                onChange={(event) =>
                                  applyContractChoice(line.key, contractRoom, line.mealCode, event.target.value, line.roomId)
                                }
                                className={adminFieldClass}
                              >
                                {!contractRoom.views.length && <option value="">{copy.componentView}</option>}
                                {contractRoom.views.map((view) => (
                                  <option key={view.name} value={view.name}>{view.name}</option>
                                ))}
                              </select>
                              {quote && (
                                <p className="text-[11px] leading-5 text-[var(--desk-muted)]">
                                  {copy.componentRoom} {formatMoney(quote.roomCost, locale)} / {formatMoney(quote.roomPrice, locale)}
                                  {" · "}
                                  {copy.componentMeal} {formatMoney(quote.mealCost, locale)} / {formatMoney(quote.mealPrice, locale)}
                                  {" · "}
                                  {copy.componentView} {formatMoney(quote.viewCost, locale)} / {formatMoney(quote.viewPrice, locale)}
                                </p>
                              )}
                            </>
                          )}
                        </div>
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
                          name={source === "direct" ? "directQuantity" : "lineQuantity"}
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
                      {source === "direct" && !locked ? (
                        <input
                          name="directCost"
                          inputMode="decimal"
                          value={line.cost}
                          onChange={(event) =>
                            updateLine(line.key, { cost: event.target.value })
                          }
                          className={`${adminFieldClass} text-end`}
                        />
                      ) : (
                        <span className="font-plex">
                          {quote ? formatMoney(quote.cost, locale) : line.cost || "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end">
                      {source === "direct" && !locked ? (
                        <input
                          name="directPrice"
                          inputMode="decimal"
                          value={line.price}
                          onChange={(event) =>
                            updateLine(line.key, { price: event.target.value })
                          }
                          className={`${adminFieldClass} text-end`}
                        />
                      ) : (
                        <span className="font-plex">
                          {quote ? formatMoney(quote.price, locale) : line.price || "—"}
                        </span>
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

        <section className="mt-6 rounded-lg border border-[var(--desk-line)] bg-[var(--desk-canvas)] p-4">
          <h3 className="text-xs font-bold tracking-wide text-[var(--desk-ink)] uppercase">
            {copy.terms}
          </h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {uniqueTerms.length ? (
              uniqueTerms.map((terms) => (
                <div
                  key={terms.id}
                  className="rounded border border-[var(--desk-line)] bg-white p-3 text-xs leading-5"
                >
                  <p className="font-bold text-[var(--desk-ink)]">
                    {terms.name}
                  </p>
                  {terms.generalTerms && (
                    <p className="mt-2 whitespace-pre-line text-[var(--desk-muted)]">
                      {terms.generalTerms}
                    </p>
                  )}
                  {terms.cancellationTerms && (
                    <p className="mt-2 whitespace-pre-line text-[var(--desk-muted)]">
                      <strong>{copy.cancelled}:</strong>{" "}
                      {terms.cancellationTerms}
                    </p>
                  )}
                  {terms.paymentTerms && (
                    <p className="mt-2 whitespace-pre-line text-[var(--desk-muted)]">
                      <strong>{copy.payment}:</strong> {terms.paymentTerms}
                    </p>
                  )}
                  <p className="mt-2 font-semibold text-[var(--desk-primary)]">
                    {fill(copy.releaseDaysNote, { days: terms.releaseDays })} ·{" "}
                    {terms.refundable ? copy.refundable : copy.nonRefundable}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--desk-muted)]">—</p>
            )}
          </div>
          {!locked && (
            <label className="mt-3 flex items-start gap-2.5 text-sm font-medium text-[var(--desk-ink)]">
              <input name="useOverbook" type="checkbox" className="mt-0.5 size-4" />
              <span>
                {copy.useOverbook}
                <span className="mt-0.5 block text-xs font-normal text-[var(--desk-muted)]">
                  {copy.useOverbookHint}
                </span>
              </span>
            </label>
          )}
        </section>

        <div className="mt-5">
          <label className="grid gap-1.5 text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
            {copy.notes}
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

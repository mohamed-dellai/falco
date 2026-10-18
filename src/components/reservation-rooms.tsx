"use client";

import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  addReservationLineAction,
  previewHotelRoomMailAction,
  removeReservationLineAction,
  sendHotelRoomMailAction,
  updateReservationLineAction,
} from "@/app/admin/actions";
import { adminButtonSecondaryClass, adminFieldClass } from "@/components/admin-ui";
import { MailNotifyDialog } from "@/components/mail-notify-dialog";
import { fill, type AdminCopy } from "@/lib/admin-copy";
import type {
  Allotment,
  LineSupplierStatus,
  StayRoomChoice,
} from "@/lib/inventory";
import { formatMoney, moneyInput } from "@/lib/money";
import { mealPlanLabel, type MealPlan } from "@/lib/room-types";

function PriceVatField({ copy, value }: { copy: AdminCopy; value?: boolean }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-[13px] font-medium text-[var(--desk-muted)]">{copy.roomPriceVat}</span>
      <select name="priceVat" defaultValue={value ? "included" : "excluded"} className={adminFieldClass}>
        <option value="excluded">{copy.roomPriceWithoutVat}</option>
        <option value="included">{copy.roomPriceWithVat}</option>
      </select>
    </label>
  );
}

function boardNames(copy: AdminCopy) {
  return {
    room_only: copy.roomOnly,
    breakfast: copy.breakfastBoard,
    half_board: copy.halfBoard,
    full_board: copy.fullBoard,
  };
}

function supplierTone(status: LineSupplierStatus) {
  if (status === "confirmed") {
    return { dot: "bg-[var(--desk-success)]", text: "text-[var(--desk-success)]" };
  }
  if (status === "waiting" || status === "provisional") {
    return { dot: "bg-[var(--desk-gold)]", text: "text-[var(--desk-warning)]" };
  }
  if (status === "no_show") {
    return { dot: "bg-[var(--desk-warning)]", text: "text-[var(--desk-warning)]" };
  }
  if (status === "cancelled") {
    return { dot: "bg-[var(--desk-danger)]", text: "text-[var(--desk-danger)]" };
  }
  return { dot: "bg-[var(--desk-line-strong)]", text: "text-[var(--desk-muted)]" };
}

const roomActionTone = {
  provisional: {
    rest: "border-[var(--desk-gold)] bg-[var(--desk-gold-soft)] text-[var(--desk-warning)] hover:bg-[var(--desk-gold)] hover:text-white",
    current: "border-[var(--desk-gold)] bg-[var(--desk-gold)] text-white shadow-sm",
  },
  confirmed: {
    rest: "border-[var(--desk-success)] bg-[var(--desk-success-soft)] text-[var(--desk-success)] hover:bg-[var(--desk-success)] hover:text-white",
    current: "border-[var(--desk-success)] bg-[var(--desk-success)] text-white shadow-sm",
  },
  cancelled: {
    rest: "border-[var(--desk-danger)] bg-[var(--desk-danger-soft)] text-[var(--desk-danger)] hover:bg-[var(--desk-danger)] hover:text-white",
    current: "border-[var(--desk-danger)] bg-[var(--desk-danger)] text-white shadow-sm",
  },
  no_show: {
    rest: "border-[var(--desk-warning)] bg-[var(--desk-warning-soft)] text-[var(--desk-warning)] hover:bg-[var(--desk-warning)] hover:text-white",
    current: "border-[var(--desk-warning)] bg-[var(--desk-warning)] text-white shadow-sm",
  },
} as const;

function lineSell(line: Allotment["lines"][number], nights: number) {
  return line.agencyPricePerNight * nights * line.quantity;
}

function supplierLabel(status: LineSupplierStatus, copy: AdminCopy) {
  const labels: Record<LineSupplierStatus, string> = {
    new: copy.supplierNew,
    waiting: copy.supplierWaiting,
    provisional: copy.supplierLineProvisional,
    confirmed: copy.supplierLineConfirmed,
    amended: copy.supplierAmended,
    cancelled: copy.supplierLineCancelled,
    no_show: copy.supplierNoShow,
  };
  return labels[status];
}

export function ReservationRooms({
  allotment,
  choices,
  roomTypes,
  meals,
  views,
  hotelRoomTypeIds,
  hotelMealCodes,
  hotelViewNames,
  totals,
  copy,
  locale,
  openAdd = false,
  policies,
}: {
  allotment: Allotment;
  choices: StayRoomChoice[];
  roomTypes: Array<{ id: string; name: string }>;
  meals: Array<{ code: string; name: string }>;
  views: Array<{ name: string }>;
  hotelRoomTypeIds: string[];
  hotelMealCodes: string[];
  hotelViewNames: string[];
  totals: {
    nights: number;
    rooms: number;
    cost: number;
    revenue: number;
    margin: number;
  };
  copy: AdminCopy;
  locale: string;
  openAdd?: boolean;
  policies: { id: string; name: string }[];
}) {
  const open =
    allotment.channel !== "b2c" &&
    (allotment.status === "request" ||
      allotment.status === "provisional" ||
      allotment.status === "confirmed");
  const direct = allotment.saleSource === "direct";
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(openAdd);
  const [hotelMail, setHotelMail] = useState<null | "request" | "amendment" | "voucher">(null);
  const [amendment, setAmendment] = useState("");
  const [rooming, setRooming] = useState(false);
  useEffect(() => {
    if (openAdd) setAdding(true);
  }, [openAdd]);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const supplierMail = [
    ["request", copy.supplierRequest],
    ["request_block", copy.supplierRequestBlock],
    ["amendment", copy.supplierAmendmentMail],
    ["voucher", copy.supplierVoucherSend],
    ["cancel", copy.supplierCancelSend],
  ] as const;
  const lineIds = allotment.lines.map((line) => line.id);
  const allSelected = lineIds.length > 0 && selected.length === lineIds.length;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = selected.length > 0 && !allSelected;
  }, [selected, allSelected]);

  const figures = [
    { label: copy.nights, value: String(totals.nights), strong: false },
    { label: copy.rooms, value: String(totals.rooms), strong: false },
    { label: copy.cost, value: formatMoney(totals.cost, locale), strong: false },
    { label: copy.sell, value: formatMoney(totals.revenue, locale), strong: true },
    { label: copy.margin, value: formatMoney(totals.margin, locale), strong: false },
  ];

  const mailChip =
    "desk-focus inline-flex min-h-8 items-center rounded-lg border border-[var(--desk-line)] bg-white px-2.5 text-sm font-semibold hover:bg-[var(--desk-canvas)]";

  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-xl border border-[var(--desk-line)] bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <div>
            <h2 className="text-base font-bold text-[var(--desk-ink)]">
              {copy.reservationRoomLines}
            </h2>
            <p className="font-plex mt-0.5 text-sm text-[var(--desk-muted)] tabular-nums">
              {fill(copy.reservationLinesMeta, {
                lines: allotment.lines.length,
                rooms: totals.rooms,
                nights: totals.nights,
              })}
            </p>
          </div>
          {open && allotment.hotelId ? (
            <button
              type="button"
              aria-expanded={adding}
              aria-controls="add-room"
              onClick={() => setAdding((current) => !current)}
              className={adminButtonSecondaryClass}
            >
              <Plus aria-hidden className="size-3.5 text-[var(--desk-muted)]" />
              {copy.addRoom}
            </button>
          ) : null}
        </header>
        {open && allotment.lines.length ? (
          <p className="px-4 pb-3 text-[13px] text-[var(--desk-muted)]">{copy.selectRoomsToSend}</p>
        ) : null}
        {open && selected.length > 0 ? (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-[var(--desk-info-line)] bg-[var(--desk-primary-soft)] px-3 py-2.5">
              <span className="text-[13px] font-semibold text-[var(--desk-primary-deep)]">
                {fill(copy.reservationLinesSelected, { count: selected.length })}
              </span>
              <span aria-hidden className="hidden h-5 w-px bg-[var(--desk-info-line)] sm:block" />
              <span className="text-sm text-[var(--desk-muted)]">{copy.reservationSendToHotel}</span>
              {supplierMail.map(([kind, label]) =>
                kind === "request" || kind === "amendment" || kind === "voucher" ? (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setAmendment("");
                      setRooming(false);
                      setHotelMail(kind);
                    }}
                    className={`${mailChip} text-[var(--desk-ink)]`}
                  >
                    {label}
                  </button>
                ) : (
                  <Link
                    key={kind}
                    href={`/admin/allotments/${allotment.id}/supplier?kind=${kind}&lines=${selected.join(",")}`}
                    className={`${mailChip} ${
                      kind === "cancel"
                        ? "text-[var(--desk-danger)] hover:bg-[var(--desk-danger-soft)]"
                        : "text-[var(--desk-ink)]"
                    }`}
                  >
                    {label}
                  </Link>
                ),
              )}
              <button
                type="button"
                onClick={() => setSelected([])}
                className="desk-focus ms-auto text-sm font-medium text-[var(--desk-muted)] underline-offset-2 hover:text-[var(--desk-ink)] hover:underline"
              >
                {copy.reservationClearSelection}
              </button>
            </div>
          </div>
        ) : null}
      {allotment.lines.length ? (
        <div className="mt-8 overflow-x-auto border-y border-[var(--desk-line)]">
          <table className="w-full min-w-[64rem] border-collapse text-start">
            <thead className="bg-[var(--desk-canvas)]">
              <tr className="border-b border-[var(--desk-line)]">
                {open ? (
                  <th className="w-10 px-3 py-2" scope="col">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      aria-label={copy.reservationRoomLines}
                      checked={allSelected}
                      onChange={(event) => setSelected(event.target.checked ? lineIds : [])}
                      className="size-4"
                    />
                  </th>
                ) : null}
                <th className="px-3 py-2 text-[13px] font-bold text-[var(--desk-ink)]" scope="col">
                  {copy.roomType}
                </th>
                <th className="px-3 py-2 text-[13px] font-bold text-[var(--desk-ink)]" scope="col">
                  {copy.status}
                </th>
                <th className="px-3 py-2 text-end text-[13px] font-bold text-[var(--desk-ink)]" scope="col">
                  {copy.roomQuantity}
                </th>
                <th className="px-3 py-2 text-end text-[13px] font-bold text-[var(--desk-ink)]" scope="col">
                  {copy.cost}
                </th>
                <th className="px-3 py-2 text-end text-[13px] font-bold text-[var(--desk-ink)]" scope="col">
                  {copy.sell}
                </th>
                <th className="px-3 py-2 text-end text-[13px] font-bold text-[var(--desk-ink)]" scope="col">
                  {copy.paymentTotal}
                </th>
                {open ? <th className="w-20 px-3 py-2" scope="col"><span className="sr-only">{copy.saveReservation}</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {allotment.lines.map((line) => {
                const formId = `room-${line.id}`;
                const tone = supplierTone(line.supplierStatus);
                const picked = selected.includes(line.id);
                const board = mealPlanLabel(line.boardSnapshot, boardNames(copy));
                return (
                  <Fragment key={line.id}>
                    <tr
                      className={`border-b border-[var(--desk-line-soft)] ${
                        picked ? "bg-[var(--desk-primary-soft)]/60" : ""
                      }`}
                    >
                      {open ? (
                        <td className="px-3 py-2.5 align-top">
                          <input
                            type="checkbox"
                            aria-label={line.roomName}
                            checked={picked}
                            onChange={(event) =>
                              setSelected((current) =>
                                event.target.checked
                                  ? [...current, line.id]
                                  : current.filter((id) => id !== line.id),
                              )
                            }
                            className="mt-0.5 size-4"
                          />
                        </td>
                      ) : null}
                      <td className="px-3 py-2.5 align-top">
                        <p className="text-sm font-bold text-[var(--desk-ink)]">{line.roomName}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-[var(--desk-muted)]">
                          <span>
                            {board}
                            {line.viewSnapshot ? ` · ${line.viewSnapshot}` : ""}
                          </span>
                          <span className="rounded border border-[var(--desk-line)] bg-white px-1.5 py-px text-xs font-medium text-[var(--desk-text-soft)]">
                            {direct ? copy.saleHotelDirect : copy.saleFromContract}
                          </span>
                        </p>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <p className={`mb-2 inline-flex items-center gap-1.5 text-sm font-bold ${tone.text}`}>
                          <span className={`size-2 rounded-full ${tone.dot}`} />
                          {supplierLabel(line.supplierStatus, copy)}
                        </p>
                        {open ? (
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                ["provisional", copy.roomStatusTentative],
                                ["confirmed", copy.roomStatusConfirm],
                                ["cancelled", copy.roomStatusCancel],
                                ["no_show", copy.roomStatusNoShow],
                              ] as const
                            ).map(([status, label]) => {
                              const on = line.supplierStatus === status;
                              return (
                              <form key={status} action={updateReservationLineAction}>
                                <input type="hidden" name="allotmentId" value={allotment.id} />
                                <input type="hidden" name="lineId" value={line.id} />
                                <input type="hidden" name="quantity" value={line.quantity} />
                                <input type="hidden" name="supplierStatus" value={status} />
                                <button
                                  type="submit"
                                  aria-pressed={on}
                                  className={`desk-focus desk-press inline-flex h-8 items-center rounded-lg border px-2.5 text-[13px] font-bold transition ${
                                    on ? roomActionTone[status].current : roomActionTone[status].rest
                                  }`}
                                >
                                  {label}
                                </button>
                              </form>
                              );
                            })}
                          </div>
                        ) : null}
                      </td>
                      <td className="font-plex px-3 py-2.5 text-end align-top text-sm font-bold text-[var(--desk-ink)] tabular-nums">
                        {line.quantity}
                      </td>
                      <td className="font-plex px-3 py-2.5 text-end align-top text-sm text-[var(--desk-text)] tabular-nums">
                        {formatMoney(line.costPerNight, locale)}
                      </td>
                      <td className="font-plex px-3 py-2.5 text-end align-top text-sm font-bold text-[var(--desk-ink)] tabular-nums">
                        {formatMoney(line.agencyPricePerNight, locale)}
                        <p className="mt-0.5 text-xs font-medium text-[var(--desk-muted)]">
                          {line.priceIncludesVat ? copy.roomPriceWithVat : copy.roomPriceWithoutVat}
                        </p>
                      </td>
                      <td className="font-plex px-3 py-2.5 text-end align-top text-sm font-bold text-[var(--desk-ink)] tabular-nums">
                        {formatMoney(lineSell(line, totals.nights), locale)}
                      </td>
                      {open ? (
                        <td className="px-3 py-2.5 text-end align-top">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              aria-label={copy.saveReservation}
                              aria-expanded={editing === line.id}
                              onClick={() => setEditing((current) => (current === line.id ? null : line.id))}
                              className="desk-focus grid size-8 place-items-center rounded-md text-[var(--desk-muted)] hover:bg-white"
                            >
                              <Pencil aria-hidden className="size-3.5" />
                            </button>
                            <form id={formId} action={removeReservationLineAction}>
                              <input type="hidden" name="allotmentId" value={allotment.id} />
                              <input type="hidden" name="lineId" value={line.id} />
                              <button
                                type="submit"
                                aria-label={copy.removeRoom}
                                className="desk-focus grid size-8 place-items-center rounded-md text-[var(--desk-muted)] hover:bg-[var(--desk-danger-soft)] hover:text-[var(--desk-danger)]"
                              >
                                <Trash2 aria-hidden className="size-3.5" />
                              </button>
                            </form>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                    {open && editing === line.id ? (
                      <tr key={`${line.id}-edit`} className="border-b border-[var(--desk-line-soft)] bg-[var(--desk-canvas)]">
                        <td colSpan={open ? 8 : 6} className="px-3 py-3">
                          <form action={updateReservationLineAction} className="flex flex-wrap items-end gap-3">
                            <input type="hidden" name="allotmentId" value={allotment.id} />
                            <input type="hidden" name="lineId" value={line.id} />
                            <input type="hidden" name="supplierStatus" value={line.supplierStatus} />
                            <label className="grid gap-1 text-sm">
                              <span className="text-[13px] font-medium text-[var(--desk-muted)]">
                                {copy.roomQuantity}
                              </span>
                              <input
                                name="quantity"
                                type="number"
                                min={1}
                                max={5000}
                                required
                                defaultValue={line.quantity}
                                className={`${adminFieldClass} w-24`}
                              />
                            </label>
                            <label className="grid gap-1 text-sm">
                              <span className="text-[13px] font-medium text-[var(--desk-muted)]">
                                {copy.agencyPriceNight}
                              </span>
                              <input
                                name="price"
                                inputMode="decimal"
                                required
                                defaultValue={moneyInput(line.agencyPricePerNight)}
                                className={`${adminFieldClass} w-36`}
                              />
                            </label>
                            <PriceVatField copy={copy} value={line.priceIncludesVat} />
                            {(allotment.status === "provisional" || allotment.status === "confirmed") && !direct ? (
                              <label className="flex items-center gap-2 pb-2 text-xs text-[var(--desk-muted)]">
                                <input type="checkbox" name="useOverbook" />
                                {copy.useOverbook}
                              </label>
                            ) : null}
                            <button type="submit" className={adminButtonSecondaryClass}>
                              {copy.saveReservation}
                            </button>
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {allotment.lines.length ? (
        <footer className="flex flex-wrap items-end justify-end gap-x-6 gap-y-2 bg-[var(--desk-canvas)] px-4 py-3">
          {figures.map((figure) => (
            <div key={figure.label} className="text-end">
              <p className="text-[13px] font-medium text-[var(--desk-muted)]">
                {figure.label}
              </p>
              <p
                className={`font-plex tabular-nums ${
                  figure.strong
                    ? "text-base font-semibold text-[var(--desk-ink)]"
                    : "text-sm text-[var(--desk-text)]"
                }`}
              >
                {figure.value}
              </p>
            </div>
          ))}
        </footer>
      ) : null}
      </section>
      {open && adding ? (
        <section id="add-room" className="overflow-hidden rounded-xl border border-[var(--desk-line)] bg-white shadow-sm">
          <header className="px-4 py-3.5">
            <h2 className="text-base font-semibold text-[var(--desk-ink)]">{copy.addRoom}</h2>
            <p className="mt-0.5 text-sm text-[var(--desk-muted)]">
              {direct ? copy.saleHotelDirect : copy.saleFromContract}
            </p>
          </header>
          {!allotment.hotelId ? (
            <p className="border-t border-[var(--desk-line)] px-4 py-3 text-sm text-[var(--desk-muted)]">
              {copy.setHotelBeforeRooms}
            </p>
          ) : direct ? (
            <DirectAdd
              allotmentId={allotment.id}
              roomTypes={roomTypes.filter((type) => hotelRoomTypeIds.includes(type.id))}
              meals={meals.filter((meal) => hotelMealCodes.includes(meal.code))}
              views={views.filter((view) => hotelViewNames.includes(view.name))}
              copy={copy}
            />
          ) : (
            <ContractAdd allotment={allotment} choices={choices} copy={copy} />
          )}
        </section>
      ) : null}
      {hotelMail ? (
        <MailNotifyDialog
          action={sendHotelRoomMailAction}
          allotmentId={allotment.id}
          policies={policies}
          copy={copy}
          missingNote={copy.mailNotifyNoHotel}
          refreshKey={`${hotelMail}|${amendment}|${rooming ? "1" : "0"}|${selected.join(",")}`}
          onClose={() => setHotelMail(null)}
          load={(policyIds) =>
            previewHotelRoomMailAction({
              id: allotment.id,
              kind: hotelMail,
              lineIds: selected,
              policyIds,
              amendment,
              rooming,
            })
          }
          extra={
            <>
              <input type="hidden" name="kind" value={hotelMail} />
              <input type="hidden" name="lines" value={selected.join(",")} />
              {hotelMail === "amendment" ? (
                <label className="block text-xs font-bold text-[var(--desk-text)]">
                  {copy.docAmendmentDetails}
                  <textarea
                    name="amendmentDetails"
                    value={amendment}
                    onChange={(event) => setAmendment(event.target.value)}
                    maxLength={2000}
                    className={`${adminFieldClass} mt-1 min-h-20`}
                  />
                </label>
              ) : null}
              {hotelMail === "voucher" ? null : (
                <label className="flex items-center gap-2 text-sm font-semibold text-[var(--desk-ink)]">
                  <input
                    type="checkbox"
                    name="roomingList"
                    checked={rooming}
                    onChange={(event) => setRooming(event.target.checked)}
                  />
                  {copy.docAttachRooming}
                </label>
              )}
            </>
          }
        />
      ) : null}
    </div>
  );
}

function ContractAdd({
  allotment,
  choices,
  copy,
}: {
  allotment: Allotment;
  choices: StayRoomChoice[];
  copy: AdminCopy;
}) {
  const rooms = useMemo(() => {
    const seen = new Map<string, string>();
    for (const choice of choices) seen.set(choice.roomTypeId, choice.roomName);
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [choices]);
  const [roomTypeId, setRoomTypeId] = useState(rooms[0]?.id ?? "");
  const meals = useMemo(
    () => [...new Set(choices.filter((choice) => choice.roomTypeId === roomTypeId).map((choice) => choice.board))],
    [choices, roomTypeId],
  );
  const [meal, setMeal] = useState<MealPlan | "">(meals[0] ?? "");
  const views = useMemo(
    () =>
      [...new Set(
        choices
          .filter((choice) => choice.roomTypeId === roomTypeId && choice.board === meal)
          .map((choice) => choice.view),
      )],
    [choices, roomTypeId, meal],
  );
  const [view, setView] = useState<string>(views[0] ?? "");
  const [periodId, setPeriodId] = useState("");
  const matching = choices.filter(
    (choice) => choice.roomTypeId === roomTypeId && choice.board === meal && choice.view === view,
  );
  const selected = periodId ? matching.find((choice) => choice.periodId === periodId) : undefined;
  const book = matching.filter((choice) => choice.saleMode === "book");
  const automatic = book.sort((left, right) => right.quantityLeft - left.quantityLeft)[0];
  const shown = selected ?? automatic;
  const onRequest = !shown || shown.saleMode === "request";
  const available = onRequest ? 0 : shown.quantityLeft;

  if (rooms.length === 0) {
    return (
      <p className="border-t border-[var(--desk-line)] px-4 py-3 text-sm text-[var(--desk-muted)]">
        {copy.setHotelBeforeRooms}
      </p>
    );
  }

  return (
    <form action={addReservationLineAction} className="grid gap-3 border-t border-[var(--desk-line)] bg-[var(--desk-canvas)] p-4 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="allotmentId" value={allotment.id} />
      <input type="hidden" name="saleSource" value="contract" />
      <label className="grid gap-1 text-sm">
        <span className="text-[13px] font-medium text-[var(--desk-muted)]">
          {copy.roomType}
        </span>
        <select
          name="roomTypeId"
          value={roomTypeId}
          onChange={(event) => {
            setRoomTypeId(event.target.value);
            setMeal("");
            setView("");
            setPeriodId("");
          }}
          className={adminFieldClass}
        >
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-[13px] font-medium text-[var(--desk-muted)]">
          {copy.mealPlan}
        </span>
        <select
          name="mealCode"
          value={meal && meals.includes(meal) ? meal : (meals[0] ?? "")}
          onChange={(event) => {
            setMeal(event.target.value as MealPlan);
            setView("");
            setPeriodId("");
          }}
          className={adminFieldClass}
        >
          {meals.map((code) => (
            <option key={code} value={code}>
              {mealPlanLabel(code, boardNames(copy))}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-[13px] font-medium text-[var(--desk-muted)]">
          {copy.viewTypes}
        </span>
        <select
          name="viewName"
          value={views.includes(view) ? view : views[0]}
          onChange={(event) => {
            setView(event.target.value);
            setPeriodId("");
          }}
          className={adminFieldClass}
        >
          {views.map((name) => (
            <option key={name} value={name}>
              {name || "—"}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-[13px] font-medium text-[var(--desk-muted)]">
          {copy.automaticContract}
        </span>
        <select
          name="contractPeriodId"
          value={periodId}
          onChange={(event) => setPeriodId(event.target.value)}
          className={adminFieldClass}
        >
          <option value="">{copy.automaticContract}</option>
          {matching.map((choice) => (
            <option key={choice.periodId} value={choice.periodId}>
              {choice.saleMode === "request" ? copy.onRequestRoom : String(choice.quantityLeft)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-[13px] font-medium text-[var(--desk-muted)]">
          {copy.availableRooms}
        </span>
        <input
          readOnly
          value={onRequest ? copy.onRequestRoom : String(available)}
          className={adminFieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-[13px] font-medium text-[var(--desk-muted)]">
          {copy.roomQuantity}
        </span>
        <input name="quantity" type="number" min={1} max={5000} required defaultValue={1} className={adminFieldClass} />
      </label>
      <PriceVatField copy={copy} />
      {(allotment.status === "provisional" || allotment.status === "confirmed") && (
        <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-3">
          <input type="checkbox" name="useOverbook" />
          {copy.useOverbook}
        </label>
      )}
      <div className="sm:col-span-2 lg:col-span-3">
        <button type="submit" className={adminButtonSecondaryClass}>
          {copy.addRoom}
        </button>
      </div>
    </form>
  );
}

function DirectAdd({
  allotmentId,
  roomTypes,
  meals,
  views,
  copy,
}: {
  allotmentId: string;
  roomTypes: Array<{ id: string; name: string }>;
  meals: Array<{ code: string; name: string }>;
  views: Array<{ name: string }>;
  copy: AdminCopy;
}) {
  if (roomTypes.length === 0) {
    return (
      <p className="border-t border-[var(--desk-line)] px-4 py-3 text-sm text-[var(--desk-muted)]">
        {copy.setHotelBeforeRooms}
      </p>
    );
  }
  return (
    <form action={addReservationLineAction} className="grid gap-3 border-t border-[var(--desk-line)] bg-[var(--desk-canvas)] p-4 sm:grid-cols-2 lg:grid-cols-3">
      <input type="hidden" name="allotmentId" value={allotmentId} />
      <input type="hidden" name="saleSource" value="direct" />
      <label className="grid gap-1 text-sm">
        <span className="text-[13px] font-medium text-[var(--desk-muted)]">
          {copy.roomType}
        </span>
        <select name="roomTypeId" required className={adminFieldClass}>
          {roomTypes.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-[13px] font-medium text-[var(--desk-muted)]">
          {copy.mealPlan}
        </span>
        <select name="mealCode" className={adminFieldClass}>
          {meals.map((meal) => (
            <option key={meal.code} value={meal.code}>
              {meal.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-[13px] font-medium text-[var(--desk-muted)]">
          {copy.viewTypes}
        </span>
        <select name="viewName" className={adminFieldClass}>
          {views.map((view) => (
            <option key={view.name} value={view.name}>
              {view.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-[13px] font-medium text-[var(--desk-muted)]">
          {copy.roomQuantity}
        </span>
        <input name="quantity" type="number" min={1} max={5000} required defaultValue={1} className={adminFieldClass} />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-[13px] font-medium text-[var(--desk-muted)]">
          {copy.cost}
        </span>
        <input name="cost" inputMode="decimal" required className={adminFieldClass} />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-[13px] font-medium text-[var(--desk-muted)]">
          {copy.agencyPriceNight}
        </span>
        <input name="price" inputMode="decimal" required className={adminFieldClass} />
      </label>
      <PriceVatField copy={copy} />
      <div className="sm:col-span-2 lg:col-span-3">
        <button type="submit" className={adminButtonSecondaryClass}>
          {copy.addRoom}
        </button>
      </div>
    </form>
  );
}

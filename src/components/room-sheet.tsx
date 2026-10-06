"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { deleteAssignmentAction, deleteRoomAction, deleteRoomPhotoAction, updateRoomAction } from "@/app/admin/actions";
import { useAdminCopy, useAdminLocale } from "@/components/admin-locale";
import { adminFieldClass } from "@/components/admin-ui";
import { CalendarSwitch, DateField, DualDate } from "@/components/calendar-date-field";
import { NamedConfirm } from "@/components/named-confirm";
import { PhotoUploader } from "@/components/photo-uploader";
import { PurchaseStatusPill } from "@/components/purchase-form";
import { fill } from "@/lib/admin-copy";
import type { Assignment, PurchaseStatus } from "@/lib/inventory";
import { formatDate, formatDateRange, formatMoney, moneyInput, nightsBetween } from "@/lib/money";
import {
  roomTypeLabel,
  roomTypeOptionLabel,
  type MealPlan,
} from "@/lib/room-types";

type RoomPurchase = {
  lineId: string;
  id: string;
  number: string;
  status: PurchaseStatus;
  checkIn: string;
  checkOut: string;
  quantity: number;
  costPerNight: number;
};

type CatalogOption = {
  id: string;
  name: string;
  guests: number;
  board: MealPlan;
  view: string;
  description: string;
};

function boardLabels(copy: ReturnType<typeof useAdminCopy>): Record<MealPlan, string> {
  return {
    room_only: copy.roomOnly,
    breakfast: copy.breakfastBoard,
    half_board: copy.halfBoard,
    full_board: copy.fullBoard,
  };
}

function halalas(value: string) {
  const normalized = value.replaceAll(",", "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

export function RoomSheet({
  room,
  hotel,
  purchased,
  held,
  open,
  sold,
  photos,
  purchases,
  assignments,
  types,
}: {
  room: {
    id: string;
    roomTypeId: string;
    name: string;
    description: string;
    capacity: number;
    quantity: number;
    costPerNight: number;
    publicPricePerNight: number | null;
    checkIn: string | null;
    checkOut: string | null;
  };
  types: CatalogOption[];
  hotel: {
    id: string;
    name: string;
    city: string;
    distanceToHaram: string;
  };
  purchased: boolean;
  held: number;
  open: number;
  sold: number;
  photos: Array<{ id: string; url: string }>;
  purchases: RoomPurchase[];
  assignments: Assignment[];
}) {
  const copy = useAdminCopy();
  const locale = useAdminLocale();
  const [tab, setTab] = useState<"details" | "purchases" | "holds" | "photos">("details");
  const [pending, setPending] = useState(false);
  const [cost, setCost] = useState(moneyInput(room.costPerNight));
  const [publicPrice, setPublicPrice] = useState(
    room.publicPricePerNight == null ? "" : moneyInput(room.publicPricePerNight),
  );
  const [roomTypeId, setRoomTypeId] = useState(room.roomTypeId);
  const selected =
    types.find((type) => type.id === roomTypeId) ??
    types.find((type) => type.id === room.roomTypeId) ??
    null;
  const typeName = selected
    ? roomTypeLabel(selected.name, (code) => copy[code])
    : roomTypeLabel(room.name, (code) => copy[code]);
  const guests = selected?.guests ?? room.capacity;
  const city =
    hotel.city === "makkah" || hotel.city === "madinah" || hotel.city === "jeddah"
      ? copy[hotel.city]
      : hotel.city;
  const nights =
    room.checkIn && room.checkOut ? nightsBetween(room.checkIn, room.checkOut) : 0;
  const costHalalas = halalas(cost);
  const publicHalalas = publicPrice.trim() ? halalas(publicPrice) : null;
  const spread =
    costHalalas !== null && publicHalalas !== null ? publicHalalas - costHalalas : null;
  const margin =
    spread !== null && costHalalas !== null && costHalalas > 0
      ? (spread / costHalalas) * 100
      : null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (publicPrice.trim() && (publicHalalas === null || publicHalalas < 1)) {
      event.preventDefault();
      return;
    }
    setPending(true);
  }

  const tabs = [
    { id: "details" as const, label: copy.roomDetailsTab },
    { id: "purchases" as const, label: `${copy.purchases} (${purchases.length})` },
    { id: "holds" as const, label: `${copy.roomHoldsTab} (${assignments.length})` },
    { id: "photos" as const, label: copy.photos },
  ];

  return (
    <div className="mx-auto grid max-w-5xl gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--desk-line)] bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            form="room-form"
            disabled={pending}
            className="desk-focus inline-flex h-9 items-center rounded-lg bg-[var(--desk-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--desk-primary-hover)] disabled:opacity-55"
          >
            {pending ? copy.saving : copy.saveRoom}
          </button>
          <NamedConfirm
            title={copy.deleteRoomTitle}
            body={fill(copy.deleteRoomBody, { room: typeName })}
            confirm={copy.deleteRoom}
            pendingLabel={copy.deleting}
            cancelLabel={copy.keepRoom}
            action={deleteRoomAction}
            fields={{ id: room.id }}
            trigger={copy.deleteRoom}
            triggerClassName="desk-focus inline-flex h-9 items-center px-3 text-sm font-semibold text-[var(--desk-danger)]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg bg-[var(--desk-canvas)] p-1 text-center">
            {[
              [copy.ribbonHeld, held],
              [copy.ribbonOpen, open],
              [copy.ribbonSold, sold],
            ].map(([label, value]) => (
              <div key={String(label)} className="min-w-14 px-2.5 py-1">
                <span className="block text-[10px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
                  {label}
                </span>
                <span className="font-plex text-base font-semibold text-[var(--desk-ink)]">
                  {value}
                </span>
              </div>
            ))}
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              held + open + sold > 0
                ? "bg-[var(--desk-success-soft)] text-[var(--desk-success)]"
                : "bg-[var(--desk-canvas)] text-[var(--desk-muted)]"
            }`}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {held + open + sold > 0 ? copy.inInventory : copy.outOfInventory}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--desk-line)] bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
              {copy.roomRecord}
              <span className="px-1.5 text-[var(--desk-line)]">•</span>
              <Link href={`/admin/hotels/${hotel.id}`} className="text-[var(--desk-primary)]">
                {hotel.name}, {city}
              </Link>
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[var(--desk-ink)]">
              {typeName}
            </h2>
          </div>
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-[var(--desk-canvas)] p-3">
            <span className="text-[10px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
              {copy.hotelName}
            </span>
            <p className="mt-1 font-semibold text-[var(--desk-ink)]">{hotel.name}</p>
            <p className="text-xs text-[var(--desk-muted)]">
              {hotel.distanceToHaram || city}
            </p>
          </div>
          <div className="rounded-lg bg-[var(--desk-canvas)] p-3">
            <span className="text-[10px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
              {copy.contractedStay}
            </span>
            <p className="mt-1 font-semibold text-[var(--desk-ink)]">
              {room.checkIn && room.checkOut
                ? formatDateRange(room.checkIn, room.checkOut, locale)
                : "—"}
            </p>
            {nights > 0 && (
              <p className="text-xs text-[var(--desk-muted)]">
                {nights} {copy.nights.toLocaleLowerCase(locale)}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-[var(--desk-canvas)] p-3">
            <span className="text-[10px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
              {copy.guests}
            </span>
            <p className="mt-1 font-semibold text-[var(--desk-ink)]">{guests}</p>
          </div>
          <div className="rounded-lg bg-[var(--desk-canvas)] p-3">
            <span className="text-[10px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
              {copy.wholesaleCost}
            </span>
            <p className="mt-1 font-plex font-semibold text-[var(--desk-ink)]">
              {formatMoney(room.costPerNight, locale)}
            </p>
            <p className="font-plex text-xs text-[var(--desk-success)]">
              {room.publicPricePerNight == null
                ? "—"
                : formatMoney(room.publicPricePerNight, locale)}
            </p>
          </div>
        </div>

        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-[var(--desk-line)]">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-xs font-semibold whitespace-nowrap ${
                tab === item.id
                  ? "border-[var(--desk-primary)] text-[var(--desk-primary)]"
                  : "border-transparent text-[var(--desk-muted)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form
          id="room-form"
          action={updateRoomAction}
          onSubmit={onSubmit}
          className={tab === "details" ? "grid gap-8 md:grid-cols-2" : "hidden"}
        >
            <input type="hidden" name="id" value={room.id} />
            <div className="grid gap-4">
              <label className="grid gap-1.5 text-sm font-semibold">
                {copy.roomType}
                <select
                  name="roomTypeId"
                  required
                  value={roomTypeId}
                  onChange={(event) => setRoomTypeId(event.target.value)}
                  className={adminFieldClass}
                >
                  {!selected && <option value="">{copy.selectRoom}</option>}
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {roomTypeOptionLabel({
                        name: type.name,
                        guests: type.guests,
                        board: type.board,
                        view: type.view,
                        nameLabel: (code) => copy[code],
                        boardLabel: boardLabels(copy),
                      })}
                    </option>
                  ))}
                </select>
                {selected?.description ? (
                  <span className="text-xs font-normal text-[var(--desk-muted)]">
                    {selected.description}
                  </span>
                ) : null}
              </label>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{copy.contractedStay}</span>
                  {nights > 0 && (
                    <span className="text-xs font-semibold text-[var(--desk-primary)]">
                      {nights} {copy.nights.toLocaleLowerCase(locale)}
                    </span>
                  )}
                </div>
                {purchased && room.checkIn && room.checkOut ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input type="hidden" name="checkIn" value={room.checkIn} />
                    <input type="hidden" name="checkOut" value={room.checkOut} />
                    <div className="rounded-lg bg-[var(--desk-canvas)] p-2.5">
                      <span className="text-[10px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
                        {copy.checkIn}
                      </span>
                      <DualDate iso={room.checkIn} locale={locale} />
                    </div>
                    <div className="rounded-lg bg-[var(--desk-canvas)] p-2.5">
                      <span className="text-[10px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
                        {copy.checkOut}
                      </span>
                      <DualDate iso={room.checkOut} locale={locale} />
                    </div>
                  </div>
                ) : (
                  <>
                    <CalendarSwitch
                      label={copy.calendar}
                      normal={copy.normalCalendar}
                      arabic={copy.arabicCalendar}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <DateField
                        name="checkIn"
                        label={copy.checkIn}
                        locale={locale}
                        defaultValue={room.checkIn ?? ""}
                      />
                      <DateField
                        name="checkOut"
                        label={copy.checkOut}
                        locale={locale}
                        defaultValue={room.checkOut ?? ""}
                      />
                    </div>
                    <p className="text-xs text-[var(--desk-muted)]">{copy.roomStayHint}</p>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5 text-sm font-semibold">
                  {copy.guests}
                  <p className="rounded-lg bg-[var(--desk-canvas)] px-3 py-2 font-normal tabular-nums">
                    {guests}
                  </p>
                </div>
                {!purchased && (
                  <label className="grid gap-1.5 text-sm font-semibold">
                    {copy.roomsHeld}
                    <input
                      name="quantity"
                      type="number"
                      min={1}
                      required
                      defaultValue={room.quantity}
                      className={adminFieldClass}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="grid content-start gap-4">
              <label className="grid gap-1.5 text-sm font-semibold">
                {copy.wholesaleCost}
                <input
                  name="costPerNight"
                  required
                  value={cost}
                  onChange={(event) => setCost(event.target.value)}
                  className={`${adminFieldClass} text-end`}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                {copy.publicPriceNight}
                <input
                  name="publicPricePerNight"
                  value={publicPrice}
                  onChange={(event) => setPublicPrice(event.target.value)}
                  title={copy.publicPriceHint}
                  className={`${adminFieldClass} text-end`}
                />
                <span className="text-xs font-normal text-[var(--desk-muted)]">
                  {copy.publicPriceHint}
                </span>
              </label>
              <div className="flex items-center justify-between gap-4 rounded-lg bg-[var(--desk-canvas)] p-3">
                <div>
                  <span className="block text-[10px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
                    {copy.grossMargin}
                  </span>
                  <span className="font-plex text-base font-bold text-[var(--desk-success)]">
                    {margin === null ? "—" : `${margin >= 0 ? "+" : ""}${margin.toFixed(1)}%`}
                  </span>
                </div>
                <div className="text-end">
                  <span className="block text-[10px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
                    {copy.spreadNight}
                  </span>
                  <span className="font-plex text-base font-semibold text-[var(--desk-ink)]">
                    {spread === null ? "—" : formatMoney(spread, locale)}
                  </span>
                </div>
              </div>
              {purchased && (
                <p className="text-xs text-[var(--desk-muted)]">{copy.quantityCostPurchase}</p>
              )}
              <label className="grid gap-1.5 text-sm font-semibold">
                {copy.description}
                <textarea
                  name="description"
                  defaultValue={room.description}
                  rows={4}
                  className={`${adminFieldClass} !h-auto py-2`}
                />
              </label>
            </div>
          </form>

        {tab === "purchases" && (
          purchases.length ? (
            <div className="overflow-x-auto rounded border border-[var(--desk-line)]">
              <table className="w-full min-w-[680px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--desk-line)] bg-[var(--desk-canvas)] text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
                    <th className="px-4 py-2.5">{copy.number}</th>
                    <th className="px-4 py-2.5">{copy.period}</th>
                    <th className="px-3 py-2.5 text-center">{copy.rooms}</th>
                    <th className="px-4 py-2.5 text-end">{copy.costNight}</th>
                    <th className="px-4 py-2.5 text-end">{copy.contractValue}</th>
                    <th className="px-4 py-2.5">{copy.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--desk-line)]">
                  {purchases.map((purchase) => {
                    const lineNights = nightsBetween(purchase.checkIn, purchase.checkOut);
                    return (
                      <tr key={purchase.lineId}>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/purchases/${purchase.id}`}
                            className="font-plex font-semibold text-[var(--desk-primary)] hover:underline"
                          >
                            {purchase.number}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="block font-plex">
                            {formatDateRange(purchase.checkIn, purchase.checkOut, locale)}
                          </span>
                          <span className="text-[var(--desk-muted)]">
                            {lineNights} {copy.nights.toLocaleLowerCase(locale)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-plex">{purchase.quantity}</td>
                        <td className="px-4 py-3 text-end font-plex">
                          {formatMoney(purchase.costPerNight, locale)}
                        </td>
                        <td className="px-4 py-3 text-end font-plex font-semibold">
                          {formatMoney(
                            purchase.costPerNight * purchase.quantity * Math.max(0, lineNights),
                            locale,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <PurchaseStatusPill status={purchase.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--desk-line)] px-6 py-10 text-center">
              <p className="font-semibold text-[var(--desk-ink)]">{copy.noRoomPurchases}</p>
              <Link
                href={`/admin/purchases/new?hotel=${hotel.id}`}
                className="mt-3 inline-flex h-9 items-center rounded-lg border border-[var(--desk-line)] px-4 text-sm font-semibold text-[var(--desk-primary)]"
              >
                {copy.newPurchase}
              </Link>
            </div>
          )
        )}

        {tab === "holds" && (
          assignments.length ? (
            <div className="overflow-x-auto rounded border border-[var(--desk-line)]">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--desk-line)] bg-[var(--desk-canvas)] text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
                    <th className="px-4 py-2.5">{copy.agency}</th>
                    <th className="px-4 py-2.5">{copy.period}</th>
                    <th className="px-3 py-2.5 text-center">{copy.rooms}</th>
                    <th className="px-4 py-2.5 text-end">{copy.sell}</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--desk-line)]">
                  {assignments.map((assignment) => {
                    const lineNights = nightsBetween(assignment.checkIn, assignment.checkOut);
                    return (
                      <tr key={assignment.id}>
                        <td className="px-4 py-3 font-semibold">{assignment.agencyName}</td>
                        <td className="px-4 py-3 font-plex">
                          {formatDateRange(assignment.checkIn, assignment.checkOut, locale)}
                        </td>
                        <td className="px-3 py-3 text-center font-plex">{assignment.quantity}</td>
                        <td className="px-4 py-3 text-end font-plex">
                          {formatMoney(
                            assignment.agencyPricePerNight * assignment.quantity * Math.max(0, lineNights),
                            locale,
                          )}
                        </td>
                        <td className="px-4 py-3 text-end">
                          {assignment.allotmentId ? (
                            <Link
                              href={`/admin/allotments/${assignment.allotmentId}`}
                              className="font-semibold text-[var(--desk-primary)] hover:underline"
                            >
                              {copy.openRecord}
                            </Link>
                          ) : (
                            <NamedConfirm
                              title={copy.releaseTitle}
                              body={fill(copy.releaseBody, {
                                agency: assignment.agencyName,
                                room: typeName,
                                hotel: hotel.name,
                                checkIn: formatDate(assignment.checkIn, locale),
                                checkOut: formatDate(assignment.checkOut, locale),
                              })}
                              confirm={copy.releaseAction}
                              pendingLabel={copy.cancelling}
                              cancelLabel={copy.keepAllotment}
                              action={deleteAssignmentAction}
                              fields={{ id: assignment.id, roomId: room.id }}
                              trigger={copy.releaseAction}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--desk-line)] px-6 py-10 text-center">
              <p className="font-semibold text-[var(--desk-ink)]">{copy.noRoomHolds}</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-[var(--desk-muted)]">
                {copy.allotRoomDescription}
              </p>
              <Link
                href={`/admin/allotments/new?room=${room.id}`}
                className="mt-3 inline-flex h-9 items-center rounded-lg border border-[var(--desk-line)] px-4 text-sm font-semibold text-[var(--desk-primary)]"
              >
                {copy.allotRoom}
              </Link>
            </div>
          )
        )}

        {tab === "photos" && (
          <div>
            <PhotoUploader roomId={room.id} />
            {photos.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo, index) => (
                  <figure
                    key={photo.id}
                    className="overflow-hidden rounded-lg border border-[var(--desk-line)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={fill(copy.photoAlt, { record: typeName, count: index + 1 })}
                      className="h-36 w-full object-cover"
                    />
                    <div className="flex justify-center px-2 py-2">
                      <NamedConfirm
                        title={copy.removePhotoTitle}
                        body={fill(copy.removePhotoBody, { record: typeName })}
                        confirm={copy.removePhotoConfirm}
                        pendingLabel={copy.removing}
                        cancelLabel={copy.keepPhoto}
                        action={deleteRoomPhotoAction}
                        fields={{ roomId: room.id, photoId: photo.id }}
                        trigger={copy.remove}
                      />
                    </div>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--desk-muted)]">{copy.noPhotos}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

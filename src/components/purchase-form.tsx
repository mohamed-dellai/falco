"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  cancelPurchaseAction,
  deletePurchaseAction,
  savePurchaseAction,
} from "@/app/admin/actions";
import {
  AdminField,
  AdminStatusPill,
  adminButtonClass,
  adminButtonDangerClass,
  adminButtonSecondaryClass,
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
import type { Purchase, PurchaseStatus } from "@/lib/inventory";
import {
  formatDate,
  formatMoney,
  moneyInput,
  nightsBetween,
} from "@/lib/money";

type DraftLine = {
  key: string;
  name: string;
  description: string;
  quantity: string;
  capacity: string;
  checkIn: string;
  checkOut: string;
  price: string;
  roomId?: string | null;
};

function cityName(copy: AdminCopy, city: string) {
  if (city === "makkah" || city === "madinah" || city === "jeddah")
    return copy[city];
  return city;
}

export function PurchaseStatusPill({ status }: { status: PurchaseStatus }) {
  const copy = useAdminCopy();
  const statusLabel: Record<PurchaseStatus, string> = {
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

function emptyLine(): DraftLine {
  return {
    key: crypto.randomUUID(),
    name: "",
    description: "",
    quantity: "1",
    capacity: "4",
    checkIn: "",
    checkOut: "",
    price: "",
  };
}

function lineFromPurchase(purchase: Purchase): DraftLine[] {
  return purchase.lines.map((line) => ({
    key: line.id,
    name: line.roomName,
    description: line.description,
    quantity: String(line.quantity),
    capacity: String(line.capacity),
    checkIn: line.checkIn,
    checkOut: line.checkOut,
    price: moneyInput(line.costPerNight),
    roomId: line.roomId,
  }));
}

function lineIsFilled(line: DraftLine) {
  return Boolean(
    line.name.trim() || line.price.trim() || line.checkIn || line.checkOut,
  );
}

export function PurchaseForm({
  hotels,
  purchase,
  hotelId,
}: {
  hotels: Array<{ id: string; name: string; city: string }>;
  purchase?: Purchase;
  hotelId?: string;
}) {
  const copy = useAdminCopy();
  const locale = useAdminLocale();
  const locked =
    purchase?.status === "confirmed" || purchase?.status === "cancelled";
  const [hotel, setHotel] = useState(purchase?.hotelId ?? hotelId ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    purchase?.lines.length ? lineFromPurchase(purchase) : [emptyLine()],
  );
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState("");

  const totals = useMemo(() => {
    let amount = 0;
    let rooms = 0;
    for (const line of lines) {
      const nights = nightsBetween(line.checkIn, line.checkOut);
      const price = lineHalalas(line.price);
      const quantity = parsedQuantity(line.quantity);
      if (nights < 1 || price === null || quantity === null) continue;
      rooms += quantity;
      amount += price * nights * quantity;
    }
    return { amount, rooms };
  }, [lines]);

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
    if (!hotel) {
      event.preventDefault();
      setFormError(copy.selectHotel);
      return;
    }
    if (intent === "confirm" && filled.length === 0) {
      event.preventDefault();
      setFormError(copy.linesError);
      return;
    }
    const broken = filled.find((line) => {
      const capacity = Number(line.capacity);
      const nights = nightsBetween(line.checkIn, line.checkOut);
      return (
        line.name.trim().length < 2 ||
        parsedQuantity(line.quantity) === null ||
        !Number.isInteger(capacity) ||
        capacity < 1 ||
        capacity > 20 ||
        nights < 1 ||
        nights > 1095 ||
        lineHalalas(line.price) === null
      );
    });
    if (broken) {
      event.preventDefault();
      const nights = nightsBetween(broken.checkIn, broken.checkOut);
      if (nights > 1095) {
        setFormError(copy.spanError);
      } else if (nights < 1) {
        setFormError(copy.datesError);
      } else {
        setFormError(copy.roomLineError);
      }
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
                form="purchase-form"
                name="intent"
                value="confirm"
                disabled={pending !== ""}
                className={`${adminButtonClass} min-w-40`}
              >
                {pending === "confirm" ? copy.confirming : copy.confirmPurchase}
              </button>
              <button
                type="submit"
                form="purchase-form"
                name="intent"
                value="draft"
                disabled={pending !== ""}
                className={`${adminButtonSecondaryClass} min-w-32`}
              >
                {pending === "draft" ? copy.saving : copy.saveDraft}
              </button>
            </>
          )}
          {purchase?.status === "confirmed" && (
            <NamedConfirm
              title={copy.cancelPurchaseTitle}
              body={fill(copy.cancelPurchaseBody, {
                number: purchase.number,
              })}
              confirm={copy.cancelAction}
              pendingLabel={copy.cancelling}
              cancelLabel={copy.keepPurchase}
              action={cancelPurchaseAction}
              fields={{ id: purchase.id }}
              trigger={copy.cancelAction}
              triggerClassName={adminButtonDangerClass}
            />
          )}
          {purchase?.status === "draft" && (
            <NamedConfirm
              title={copy.deleteDraftTitle}
              body={fill(copy.deleteDraftBody, { number: purchase.number })}
              confirm={copy.deleteAction}
              pendingLabel={copy.deleting}
              cancelLabel={copy.keepDraft}
              action={deletePurchaseAction}
              fields={{ id: purchase.id }}
              trigger={copy.deleteAction}
              triggerClassName={adminButtonDangerClass}
            />
          )}
          {purchase?.status === "cancelled" && (
            <DeleteCancelledPurchase id={purchase.id} number={purchase.number} />
          )}
        </div>
        <div className="flex items-center gap-3">
          <span
            aria-live="polite"
            className="font-plex text-xs tabular-nums text-[var(--desk-muted)]"
          >
            {copy.total} · {formatMoney(totals.amount, locale)}
          </span>
          <PurchaseStatusPill status={purchase?.status ?? "draft"} />
        </div>
      </div>

      <form
        id="purchase-form"
        action={savePurchaseAction}
        onSubmit={onSubmit}
        className="grid gap-5 p-4 sm:p-5"
      >
        {purchase && <input type="hidden" name="id" value={purchase.id} />}
        {formError && (
          <p
            role="alert"
            className="rounded-xl border border-[var(--desk-danger-line)] bg-[var(--desk-danger-soft)] px-3 py-2 text-sm text-[var(--desk-danger)]"
          >
            {formError}
          </p>
        )}

        <AdminField label={copy.hotel} className="max-w-md">
          {locked ? (
            <span className="flex min-h-10 items-center text-sm font-medium text-[var(--desk-text)]">
              {purchase?.hotelName}
              {purchase ? ` — ${cityName(copy, purchase.hotelCity)}` : ""}
            </span>
          ) : (
            <select
              name="hotelId"
              required
              value={hotel}
              onChange={(event) => setHotel(event.target.value)}
              className={adminFieldClass}
            >
              <option value="">{copy.selectHotel}</option>
              {hotels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.city ? ` — ${cityName(copy, item.city)}` : ""}
                </option>
              ))}
            </select>
          )}
        </AdminField>

        <p className="text-xs leading-5 text-[var(--desk-muted)]">
          {purchase
            ? `${purchase.number} · ${fill(copy.orderedOn, {
                date: formatDate(purchase.createdAt, locale),
              })}. `
            : `${copy.numberAssigned} `}
          {copy.purchaseLineHelp}
        </p>
        {!locked && (
          <CalendarSwitch
            label={copy.calendar}
            normal={copy.normalCalendar}
            arabic={copy.arabicCalendar}
          />
        )}

        <div className="min-w-0 overflow-x-auto">
          <table className="block w-full border-collapse text-start text-sm lg:table">
            <thead className="hidden bg-[var(--desk-canvas)] lg:table-header-group">
              <tr>
                <th className="px-2 py-2">{copy.rooms}</th>
                <th className="px-2 py-2">{copy.details}</th>
                <th className="px-2 py-2 text-end">{copy.qty}</th>
                <th className="px-2 py-2 text-end">{copy.sleeps}</th>
                <th className="px-2 py-2">{copy.from}</th>
                <th className="px-2 py-2">{copy.to}</th>
                <th className="px-2 py-2 text-end">{copy.pricePerNight}</th>
                <th className="px-2 py-2 text-end">{copy.amount}</th>
                {!locked && <th className="w-8 px-2 py-2" />}
              </tr>
            </thead>
            <tbody className="grid gap-3 lg:table-row-group">
              {lines.map((line) => {
                const nights = nightsBetween(line.checkIn, line.checkOut);
                const price = lineHalalas(line.price);
                const quantity = parsedQuantity(line.quantity);
                const amount =
                  nights > 0 && price !== null && quantity !== null
                    ? price * nights * quantity
                    : 0;
                return (
                  <tr
                    key={line.key}
                    className="block rounded-xl border border-[var(--desk-line)] p-3 lg:table-row lg:rounded-none lg:border-x-0 lg:border-b-0 lg:p-0"
                  >
                    <td className="block px-0 py-2 lg:table-cell lg:px-2">
                      <span className="mb-1 block text-xs font-semibold text-[var(--desk-muted)] lg:hidden">
                        {copy.roomType}
                      </span>
                      {locked ? (
                        line.roomId ? (
                          <Link
                            href={`/admin/rooms/${line.roomId}`}
                            className="font-medium text-[var(--desk-primary)] hover:underline"
                          >
                            {line.name}
                          </Link>
                        ) : (
                          line.name
                        )
                      ) : (
                        <input
                          name="lineName"
                          value={line.name}
                          placeholder={copy.roomNameExample}
                          onChange={(event) =>
                            updateLine(line.key, { name: event.target.value })
                          }
                          className={adminFieldClass}
                        />
                      )}
                    </td>
                    <td className="block px-0 py-2 lg:table-cell lg:px-2">
                      <span className="mb-1 block text-xs font-semibold text-[var(--desk-muted)] lg:hidden">
                        {copy.details}
                      </span>
                      {locked ? (
                        <span className="text-[var(--desk-text-soft)]">
                          {line.description}
                        </span>
                      ) : (
                        <input
                          name="lineDescription"
                          value={line.description}
                          placeholder={copy.roomDetailsExample}
                          onChange={(event) =>
                            updateLine(line.key, {
                              description: event.target.value,
                            })
                          }
                          className={adminFieldClass}
                        />
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
                    <td className="block px-0 py-2 text-end lg:table-cell lg:px-2">
                      <span className="me-2 text-xs font-semibold text-[var(--desk-muted)] lg:hidden">
                        {copy.sleeps}
                      </span>
                      {locked ? (
                        <span className="tabular-nums">{line.capacity}</span>
                      ) : (
                        <input
                          name="lineCapacity"
                          type="number"
                          min={1}
                          max={20}
                          value={line.capacity}
                          onChange={(event) =>
                            updateLine(line.key, {
                              capacity: event.target.value,
                            })
                          }
                          className={`${adminFieldClass} w-full text-end lg:w-16`}
                        />
                      )}
                    </td>
                    <td className="block px-0 py-2 lg:table-cell lg:px-2">
                      <span className="mb-1 block text-xs font-semibold text-[var(--desk-muted)] lg:hidden">
                        {copy.from}
                      </span>
                      {locked ? (
                        <DualDate iso={line.checkIn} locale={locale} />
                      ) : (
                        <DateField
                          name="lineCheckIn"
                          label={copy.from}
                          locale={locale}
                          value={line.checkIn}
                          onChange={(checkIn) =>
                            updateLine(line.key, { checkIn })
                          }
                        />
                      )}
                    </td>
                    <td className="block px-0 py-2 lg:table-cell lg:px-2">
                      <span className="mb-1 block text-xs font-semibold text-[var(--desk-muted)] lg:hidden">
                        {copy.to}
                      </span>
                      {locked ? (
                        <DualDate iso={line.checkOut} locale={locale} />
                      ) : (
                        <DateField
                          name="lineCheckOut"
                          label={copy.to}
                          locale={locale}
                          value={line.checkOut}
                          onChange={(checkOut) =>
                            updateLine(line.key, { checkOut })
                          }
                        />
                      )}
                    </td>
                    <td className="block px-0 py-2 text-end lg:table-cell lg:px-2">
                      <span className="me-2 text-xs font-semibold text-[var(--desk-muted)] lg:hidden">
                        {copy.pricePerNight}
                      </span>
                      {locked ? (
                        <span className="tabular-nums">
                          {formatMoney(lineHalalas(line.price) ?? 0, locale)}
                        </span>
                      ) : (
                        <input
                          name="linePrice"
                          inputMode="decimal"
                          value={line.price}
                          placeholder="0.00"
                          onChange={(event) =>
                            updateLine(line.key, { price: event.target.value })
                          }
                          className={`${adminFieldClass} w-full text-end lg:w-28`}
                        />
                      )}
                    </td>
                    <td className="block px-0 py-2 text-end font-plex lg:table-cell lg:px-2">
                      <span className="me-2 text-xs font-semibold text-[var(--desk-muted)] lg:hidden">
                        {copy.amount}
                      </span>
                      {nights > 0 ? formatMoney(amount, locale) : "—"}
                    </td>
                    {!locked && (
                      <td className="px-2 py-2 text-end">
                        <button
                          type="button"
                          onClick={() =>
                            setLines((current) =>
                              current.filter((item) => item.key !== line.key),
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
            {copy.addLine}
          </button>
        )}

        <AdminField label={copy.notes}>
          {locked ? (
            <p className="text-sm font-normal text-[var(--desk-text)]">
              {purchase?.notes || "—"}
            </p>
          ) : (
            <textarea
              name="notes"
              defaultValue={purchase?.notes ?? ""}
              placeholder={copy.notesExample}
              className={`${adminFieldClass} !h-auto min-h-20 py-2`}
            />
          )}
        </AdminField>

        <dl className="ms-auto grid w-full max-w-xs gap-2 rounded-xl bg-[var(--desk-canvas)] p-4 text-sm">
          <div className="flex justify-between gap-6">
            <dt className="text-[var(--desk-muted)]">{copy.rooms}</dt>
            <dd className="font-plex">{totals.rooms}</dd>
          </div>
          <div className="flex justify-between gap-6 border-t border-[var(--desk-line)] pt-2 text-base font-semibold">
            <dt>{copy.total}</dt>
            <dd className="font-plex">{formatMoney(totals.amount, locale)}</dd>
          </div>
        </dl>
      </form>
    </div>
  );
}

export function DeleteCancelledPurchase({
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
      action={deletePurchaseAction}
      fields={{ id }}
      trigger={copy.deleteAction}
      triggerClassName={compact ? undefined : adminButtonDangerClass}
    />
  );
}

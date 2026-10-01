"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  cancelPurchaseAction,
  deletePurchaseAction,
  savePurchaseAction,
} from "@/app/admin/actions";
import {
  adminButtonClass,
  adminButtonSecondaryClass,
  adminFieldClass,
} from "@/components/admin-shell";
import { useAdminCopy } from "@/components/admin-locale";
import type { AdminCopy } from "@/lib/admin-copy";
import type { Purchase, PurchaseStatus } from "@/lib/inventory";
import { formatMoney, moneyInput, nightsBetween } from "@/lib/money";

type DraftLine = {
  key: string;
  name: string;
  description: string;
  capacity: string;
  checkIn: string;
  checkOut: string;
  price: string;
  roomId?: string | null;
};

function cityName(copy: AdminCopy, city: string) {
  if (city === "makkah" || city === "madinah" || city === "jeddah") return copy[city];
  return city;
}

const statusStyle: Record<PurchaseStatus, string> = {
  draft: "bg-[#eef2f6] text-[#334155]",
  confirmed: "bg-[#e5f6ea] text-[#146c36]",
  cancelled: "bg-[#fdecec] text-[#9b1c1c]",
};

export function PurchaseStatusPill({ status }: { status: PurchaseStatus }) {
  const copy = useAdminCopy();
  const statusLabel: Record<PurchaseStatus, string> = {
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

function emptyLine(): DraftLine {
  return {
    key: crypto.randomUUID(),
    name: "",
    description: "",
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
  const locked = purchase?.status === "confirmed" || purchase?.status === "cancelled";
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
      if (nights < 1 || price === null) continue;
      rooms += 1;
      amount += price * nights;
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
        !Number.isInteger(capacity) ||
        capacity < 1 ||
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
    <div className="rounded border border-[#d5dbe3] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6ebf0] px-4 py-3">
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
            <form action={cancelPurchaseAction}>
              <input type="hidden" name="id" value={purchase.id} />
              <button type="submit" className={adminButtonSecondaryClass}>
                {copy.cancelAction}
              </button>
            </form>
          )}
          {purchase?.status === "draft" && (
            <form action={deletePurchaseAction}>
              <input type="hidden" name="id" value={purchase.id} />
              <button
                type="submit"
                className="h-9 px-2 text-sm font-semibold text-red-700"
              >
                {copy.deleteAction}
              </button>
            </form>
          )}
        </div>
        <PurchaseStatusPill status={purchase?.status ?? "draft"} />
      </div>

      <form id="purchase-form" action={savePurchaseAction} onSubmit={onSubmit} className="grid gap-4 p-4">
        {purchase && <input type="hidden" name="id" value={purchase.id} />}
        {formError && (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {formError}
          </p>
        )}

        <label className="grid max-w-md gap-1 text-xs font-semibold text-[#334155]">
          {copy.hotel}
          {locked ? (
            <span className="flex h-9 items-center text-sm font-medium text-[#172033]">
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
        </label>

        <p className="text-xs text-[#5c6776]">
          {purchase ? `${purchase.number} · ` : "Number is assigned when you save. "}
          Each room has its own dates. One room per line.
          {purchase ? ` Ordered ${purchase.createdAt.slice(0, 10)}.` : ""}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-[#f4f7fa] text-[11px] font-semibold uppercase tracking-wide text-[#5c6776]">
              <tr>
                <th className="px-2 py-2">{copy.rooms}</th>
                <th className="px-2 py-2">{copy.details}</th>
                <th className="px-2 py-2 text-end">{copy.sleeps}</th>
                <th className="px-2 py-2">{copy.from}</th>
                <th className="px-2 py-2">{copy.to}</th>
                <th className="px-2 py-2 text-end">{copy.pricePerNight}</th>
                <th className="px-2 py-2 text-end">{copy.amount}</th>
                {!locked && <th className="w-8 px-2 py-2" />}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const nights = nightsBetween(line.checkIn, line.checkOut);
                const price = lineHalalas(line.price);
                const amount = nights > 0 && price !== null ? price * nights : 0;
                return (
                  <tr key={line.key} data-search-item className="border-t border-[#e6ebf0]">
                    <td className="px-2 py-2">
                      {locked ? (
                        line.roomId ? (
                          <Link
                            href={`/admin/rooms/${line.roomId}`}
                            className="font-medium text-[#0e4d8c] hover:underline"
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
                          placeholder="Quad"
                          onChange={(event) =>
                            updateLine(line.key, { name: event.target.value })
                          }
                          className={adminFieldClass}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {locked ? (
                        <span className="text-[#334155]">{line.description}</span>
                      ) : (
                        <input
                          name="lineDescription"
                          value={line.description}
                          placeholder="Haram view, breakfast"
                          onChange={(event) =>
                            updateLine(line.key, { description: event.target.value })
                          }
                          className={adminFieldClass}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 text-end">
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
                            updateLine(line.key, { capacity: event.target.value })
                          }
                          className={`${adminFieldClass} w-16 text-end`}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {locked ? (
                        <span className="tabular-nums">{line.checkIn}</span>
                      ) : (
                        <input
                          name="lineCheckIn"
                          type="date"
                          value={line.checkIn}
                          onChange={(event) =>
                            updateLine(line.key, { checkIn: event.target.value })
                          }
                          className={adminFieldClass}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {locked ? (
                        <span className="tabular-nums">{line.checkOut}</span>
                      ) : (
                        <input
                          name="lineCheckOut"
                          type="date"
                          value={line.checkOut}
                          onChange={(event) =>
                            updateLine(line.key, { checkOut: event.target.value })
                          }
                          className={adminFieldClass}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 text-end">
                      {locked ? (
                        <span className="tabular-nums">
                          {formatMoney(lineHalalas(line.price) ?? 0, "en")}
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
                          className={`${adminFieldClass} w-28 text-end`}
                        />
                      )}
                    </td>
                    <td className="px-2 py-2 text-end tabular-nums">
                      {nights > 0 ? formatMoney(amount, "en") : "—"}
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
                          className="text-xs font-semibold text-[#5c6776]"
                        >
                          {copy.remove}
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
            Add a line
          </button>
        )}

        <label className="grid gap-1 text-xs font-semibold text-[#334155]">
          {copy.notes}
          {locked ? (
            <p className="text-sm font-normal text-[#172033]">
              {purchase?.notes || "—"}
            </p>
          ) : (
            <textarea
              name="notes"
              defaultValue={purchase?.notes ?? ""}
              placeholder="Contract reference, payment terms"
              className={`${adminFieldClass} !h-auto min-h-20 py-2`}
            />
          )}
        </label>

        <dl className="ms-auto grid w-full max-w-xs gap-1 text-sm">
          <div className="flex justify-between gap-6">
            <dt className="text-[#5c6776]">{copy.rooms}</dt>
            <dd className="tabular-nums">{totals.rooms}</dd>
          </div>
          <div className="flex justify-between gap-6 text-base font-semibold">
            <dt>{copy.total}</dt>
            <dd className="tabular-nums">
              {formatMoney(totals.amount, "en")}
            </dd>
          </div>
        </dl>
      </form>
    </div>
  );
}

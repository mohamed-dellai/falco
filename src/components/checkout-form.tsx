"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { maxDirectRooms } from "@/lib/booking-limits";
import { formatMoney } from "@/lib/money";

export function CheckoutForm({
  roomId,
  checkIn,
  checkOut,
  nightly,
  nights,
  capacity,
  cancelled,
}: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  nightly: number;
  nights: number;
  capacity: number;
  cancelled: boolean;
}) {
  const t = useTranslations("Book");
  const locale = useLocale();
  const [quantity, setQuantity] = useState(1);
  const [travellers, setTravellers] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const rooms = Math.min(maxDirectRooms, Math.max(1, quantity || 1));
  const people = Math.max(1, travellers || 1);
  const total = nightly * nights * rooms;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (people > capacity * rooms) {
      setError(t("capacity"));
      return;
    }
    const data = new FormData(event.currentTarget);
    setPending(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          checkIn,
          checkOut,
          quantity: rooms,
          travellers: people,
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          phone: String(data.get("phone") ?? ""),
          country: String(data.get("country") ?? ""),
          locale,
        }),
      });
      const result = (await response.json()) as {
        url?: string | null;
        code?: string;
        requested?: boolean;
        reference?: string;
      };
      if (result.requested) {
        setNotice(t("requested", { reference: result.reference ?? "" }));
        setPending(false);
        return;
      }
      if (!response.ok || !result.url) {
        setError(
          t(
            result.code === "capacity"
              ? "capacity"
              : result.code === "payment"
                ? "payment"
                : "unavailable",
          ),
        );
        setPending(false);
        return;
      }
      window.location.assign(result.url);
    } catch {
      setError(t("unavailable"));
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-line bg-white p-5 md:p-7"
    >
      {cancelled && (
        <p className="mb-4 rounded-lg bg-surface-low p-3 text-sm font-bold text-ink">
          {t("cancelled")}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-bold text-primary sm:col-span-2">
          {t("name")}
          <input
            name="name"
            required
            autoComplete="name"
            className="h-12 rounded-lg border border-line px-3 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-bold text-primary">
          {t("email")}
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="h-12 rounded-lg border border-line px-3 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-bold text-primary">
          {t("phone")}
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            className="h-12 rounded-lg border border-line px-3 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-bold text-primary sm:col-span-2">
          {t("country")}
          <input
            name="country"
            required
            autoComplete="country-name"
            className="h-12 rounded-lg border border-line px-3 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-bold text-primary">
          {t("rooms")}
          <input
            type="number"
            min={1}
            max={maxDirectRooms}
            value={rooms}
            onChange={(event) =>
              setQuantity(
                Math.min(
                  maxDirectRooms,
                  Math.max(1, Number(event.target.value) || 1),
                ),
              )
            }
            className="h-12 rounded-lg border border-line px-3 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-bold text-primary">
          {t("travellers")}
          <input
            type="number"
            min={1}
            max={20}
            value={people}
            onChange={(event) =>
              setTravellers(
                Math.min(20, Math.max(1, Number(event.target.value) || 1)),
              )
            }
            className="h-12 rounded-lg border border-line px-3 text-sm"
          />
        </label>
      </div>
      <p className="mt-5 text-sm text-muted">
        {t("summary", {
          nightly: formatMoney(nightly, locale),
          total: formatMoney(total, locale),
        })}
      </p>
      {notice && (
        <p className="mt-3 text-sm font-bold text-primary">{notice}</p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-bold text-red-800">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-5 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-70"
      >
        {pending ? t("paying") : t("pay")}
      </button>
    </form>
  );
}

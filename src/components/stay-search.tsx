"use client";

import { Search } from "lucide-react";
import {
  useEffect,
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarSwitch, DateField } from "@/components/calendar-date-field";
import { useRouter } from "@/i18n/navigation";
import { nightsBetween } from "@/lib/money";

const maxStayNights = 120;

function nextDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function StaySearch({
  pathname,
  minDate,
  checkIn = "",
  checkOut = "",
  variant = "panel",
  title,
  hint,
}: {
  pathname: string;
  minDate: string;
  checkIn?: string;
  checkOut?: string;
  variant?: "panel" | "bar";
  title?: string;
  hint?: string;
}) {
  const t = useTranslations("Search");
  const calendar = useTranslations("Calendar");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState("");
  const [from, setFrom] = useState(checkIn);
  const [to, setTo] = useState(checkOut);
  const [isPending, startTransition] = useTransition();
  const errorId = useId();

  function updateCheckIn(value: string) {
    setFrom(value);
    setError("");
    if (to && nightsBetween(value, to) < 1) setTo("");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nights = nightsBetween(from, to);
    if (nights < 1) {
      setError(t("dates"));
      return;
    }
    if (nights > maxStayNights) {
      setError(t("span"));
      return;
    }
    setError("");
    startTransition(() => {
      const current = new URLSearchParams(window.location.search);
      current.set("checkIn", from);
      current.set("checkOut", to);
      const query = current.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  const fields = (
    <>
      <label className="grid gap-1 text-xs font-bold text-primary">
        {t("checkIn")}
        <DateField
          name="checkIn"
          label={t("checkIn")}
          locale={locale}
          variant="public"
          required
          min={minDate}
          value={from}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={updateCheckIn}
          className="h-12 min-w-0 rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
        />
      </label>
      <label className="grid gap-1 text-xs font-bold text-primary">
        {t("checkOut")}
        <DateField
          name="checkOut"
          label={t("checkOut")}
          locale={locale}
          variant="public"
          required
          min={nextDate(from || minDate)}
          value={to}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(next) => {
            setTo(next);
            setError("");
          }}
          className="h-12 min-w-0 rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gold px-5 text-sm font-bold text-ink transition hover:bg-gold-light disabled:cursor-wait disabled:opacity-70"
      >
        <Search aria-hidden="true" size={17} strokeWidth={2.25} />
        {isPending ? t("searching") : t("search")}
      </button>
    </>
  );

  return (
    <form
      id="room-search"
      onSubmit={onSubmit}
      className={variant === "bar" ? "mt-8 scroll-mt-28" : "mt-6 scroll-mt-28"}
      aria-label={t("formTitle")}
    >
      <div
        className={
          variant === "bar"
            ? "rounded-2xl border border-white/25 bg-white/[0.96] p-3 text-ink shadow-[0_20px_60px_rgb(2_12_27_/_0.32)] backdrop-blur-md"
            : "rounded-2xl border border-line bg-white p-3"
        }
      >
        <div className="px-1 pb-3">
          <p className="text-sm font-extrabold text-primary">
            {title ?? t("formTitle")}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-muted">
            {hint ?? t("formHint")}
          </p>
          <CalendarSwitch
            label={calendar("label")}
            normal={calendar("normal")}
            arabic={calendar("arabic")}
            variant="public"
            className="mt-3"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          {fields}
        </div>
      </div>
      {error && (
        <p
          id={errorId}
          role="alert"
          className={`mt-2 text-sm font-bold ${
            variant === "bar" ? "text-gold-light" : "text-red-800"
          }`}
        >
          {error}
        </p>
      )}
    </form>
  );
}

export function FocusResults({ token }: { token: string }) {
  useEffect(() => {
    if (!token) return;
    const node = document.getElementById("availability");
    if (!node) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    node.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [token]);

  return null;
}

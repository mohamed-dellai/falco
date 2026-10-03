"use client";

import { getCalendar } from "multi-calendar-datepicker";
import { useMultiCalendarDatepicker } from "multi-calendar-datepicker/react";
import "multi-calendar-datepicker/css";
import { useEffect, useState } from "react";
import { adminFieldClass } from "@/components/admin-ui";
import { formatDate } from "@/lib/money";

export type CalendarKind = "gregorian" | "hijri";

const storageKey = "falco_calendar";

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function formatHijri(iso: string | null | undefined) {
  if (!iso || !isIsoDate(iso)) return "";
  const [year, month, day] = iso.split("-").map(Number);
  const calendar = getCalendar("ummalqura");
  const hijri = calendar.fromGregorian({ year, month, day });
  const months = calendar.getMonths("ar");
  const name = months[hijri.month - 1];
  if (!name) return "";
  return `${hijri.day} ${name} ${hijri.year}`;
}

export function useCalendarKind(): [CalendarKind, (kind: CalendarKind) => void] {
  const [kind, setKind] = useState<CalendarKind>("gregorian");

  useEffect(() => {
    function sync() {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "hijri" || stored === "gregorian") setKind(stored);
    }
    sync();
    window.addEventListener("falco-calendar", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("falco-calendar", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function choose(next: CalendarKind) {
    window.localStorage.setItem(storageKey, next);
    window.dispatchEvent(new Event("falco-calendar"));
    setKind(next);
  }

  return [kind, choose];
}

export function CalendarSwitch({
  label,
  normal,
  arabic,
  variant = "desk",
  className = "",
}: {
  label: string;
  normal: string;
  arabic: string;
  variant?: "desk" | "public";
  className?: string;
}) {
  const [kind, choose] = useCalendarKind();
  const shell =
    variant === "public"
      ? "inline-flex rounded-lg border border-line bg-surface p-0.5"
      : "inline-flex rounded-xl border border-[var(--desk-line)] bg-white p-1";
  const button = (active: boolean) =>
    variant === "public"
      ? `rounded-md px-3 py-1.5 text-xs font-bold transition ${
          active ? "bg-primary text-white" : "text-muted hover:text-ink"
        }`
      : `desk-focus min-h-10 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
          active
            ? "bg-[var(--desk-ink)] text-white"
            : "text-[var(--desk-muted)] hover:bg-[var(--desk-surface-muted)] hover:text-[var(--desk-ink)]"
        }`;

  return (
    <div role="group" aria-label={label} className={`${shell} ${className}`}>
      <button
        type="button"
        aria-pressed={kind === "gregorian"}
        onClick={() => choose("gregorian")}
        className={button(kind === "gregorian")}
      >
        {normal}
      </button>
      <button
        type="button"
        aria-pressed={kind === "hijri"}
        onClick={() => choose("hijri")}
        className={button(kind === "hijri")}
      >
        {arabic}
      </button>
    </div>
  );
}

export function DualDate({
  iso,
  locale,
  className = "",
}: {
  iso: string | null | undefined;
  locale: string;
  className?: string;
}) {
  const [kind] = useCalendarKind();
  if (!iso) return <span className={className}>—</span>;
  const primary = kind === "hijri" ? formatHijri(iso) : formatDate(iso, locale);
  const secondary = kind === "hijri" ? formatDate(iso, locale) : formatHijri(iso);
  return (
    <span className={className}>
      <span className="block tabular-nums">{primary || "—"}</span>
      {secondary ? (
        <span className="block text-[11px] leading-4 text-[var(--desk-muted)]">
          {secondary}
        </span>
      ) : null}
    </span>
  );
}

export function DateField({
  name,
  value,
  defaultValue = "",
  onChange,
  required = false,
  min,
  locale,
  label,
  variant = "desk",
  className,
  "aria-invalid": invalid,
  "aria-describedby": describedBy,
}: {
  name: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  min?: string;
  locale: string;
  label?: string;
  variant?: "desk" | "public";
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [kind] = useCalendarKind();
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const current = controlled ? value : internal;
  const fieldClass =
    className ??
    (variant === "desk"
      ? adminFieldClass
      : "h-12 min-w-0 rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none");
  const captionClass =
    variant === "public"
      ? "text-[11px] leading-4 text-muted"
      : "text-[11px] leading-4 text-[var(--desk-muted)]";

  function commit(next: string) {
    if (next && min && next < min) return;
    if (!controlled) setInternal(next);
    onChange?.(next);
  }

  const alternate =
    kind === "hijri" ? formatDate(current, locale) : formatHijri(current);

  return (
    <span className="grid gap-1">
      {kind === "gregorian" ? (
        <input
          name={name}
          type="date"
          required={required}
          min={min}
          value={current}
          aria-label={label}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(event) => commit(event.target.value)}
          className={fieldClass}
        />
      ) : (
        <HijriPicker
          name={name}
          value={current}
          required={required}
          min={min}
          label={label}
          invalid={invalid}
          describedBy={describedBy}
          className={`${fieldClass} cursor-pointer`}
          onValue={commit}
        />
      )}
      {current && alternate && alternate !== "—" ? (
        <span className={captionClass}>{alternate}</span>
      ) : null}
    </span>
  );
}

function HijriPicker({
  name,
  value,
  required,
  min,
  label,
  invalid,
  describedBy,
  className,
  onValue,
}: {
  name: string;
  value: string;
  required: boolean;
  min?: string;
  label?: string;
  invalid?: boolean;
  describedBy?: string;
  className: string;
  onValue: (value: string) => void;
}) {
  const { inputRef, pickerRef } = useMultiCalendarDatepicker({
    calendar: "hijri",
    hijriMode: "ummalqura",
    locale: "ar",
    dir: "rtl",
    digits: "latin",
    displayFormat: "DD-MM-YYYY",
    secondaryCalendar: "gregorian",
    weekStart: 6,
    weekendDays: [5, 6],
    minDate: min || null,
    showTodayButton: true,
    showClearButton: true,
    closeOnSelect: true,
  });

  useEffect(() => {
    const picker = pickerRef.current;
    const input = inputRef.current;
    if (!picker || !input) return;
    if (!value) {
      if (picker.getGregorianValue()) picker.clear();
    } else if (picker.getGregorianValue() !== value) {
      picker.setGregorianValue(value);
    }
    input.value = value ? formatHijri(value) : "";
  }, [inputRef, pickerRef, value]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    function paint(iso: string) {
      input.value = iso ? formatHijri(iso) : "";
    }
    function onPick(event: Event) {
      const detail = (event as CustomEvent<{ value?: string }>).detail;
      const next = detail?.value ?? "";
      if (next && min && next < min) {
        const picker = pickerRef.current;
        if (value) picker?.setGregorianValue(value);
        else if (picker?.getGregorianValue()) picker.clear();
        paint(value);
        return;
      }
      paint(next);
      onValue(next);
    }
    function onClear() {
      paint("");
      onValue("");
    }
    input.addEventListener("mcd:change", onPick);
    input.addEventListener("mcd:clear", onClear);
    return () => {
      input.removeEventListener("mcd:change", onPick);
      input.removeEventListener("mcd:clear", onClear);
    };
  }, [inputRef, min, onValue, pickerRef, value]);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <input
        ref={inputRef}
        type="text"
        readOnly
        required={required}
        aria-label={label}
        dir="auto"
        aria-haspopup="dialog"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        placeholder={label}
        autoComplete="off"
        className={className}
      />
    </>
  );
}

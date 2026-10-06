export function parseMoney(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .replaceAll(",", "")
    .trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function localeTag(locale: string) {
  return locale === "ar"
    ? "ar-SA"
    : locale === "fr"
      ? "fr-FR"
      : locale === "it"
        ? "it-IT"
        : "en-SA";
}

export function formatMoney(halalas: number, locale: string) {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(halalas / 100);
}

export function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "medium",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

export function formatDateTime(
  value: string | null | undefined,
  locale: string,
) {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

export function formatDateRange(
  checkIn: string,
  checkOut: string,
  locale: string,
) {
  if (!checkIn && !checkOut) return "—";
  return `${formatDate(checkIn, locale)} → ${formatDate(checkOut, locale)}`;
}

export function moneyInput(halalas: number) {
  const whole = Math.trunc(halalas / 100);
  const fraction = Math.abs(halalas % 100);
  return fraction
    ? `${whole}.${String(fraction).padStart(2, "0")}`
    : String(whole);
}

export function nightsBetween(checkIn: string, checkOut: string) {
  const start = Date.parse(`${checkIn}T00:00:00Z`);
  const end = Date.parse(`${checkOut}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

export function shiftIsoDate(iso: string, days: number) {
  const parsed = Date.parse(`${iso}T00:00:00Z`);
  if (!Number.isFinite(parsed)) return "";
  return new Date(parsed + days * 86_400_000).toISOString().slice(0, 10);
}

export function stayInside(
  checkIn: string,
  checkOut: string,
  windowIn: string | null | undefined,
  windowOut: string | null | undefined,
) {
  if (!checkIn || !checkOut || !windowIn || !windowOut) return false;
  return checkIn >= windowIn && checkOut <= windowOut;
}

export function todayInRiyadh() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

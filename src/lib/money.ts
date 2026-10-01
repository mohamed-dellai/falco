export function parseMoney(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .replaceAll(",", "")
    .trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function formatMoney(halalas: number, locale: string) {
  const tag =
    locale === "ar"
      ? "ar-SA"
      : locale === "fr"
        ? "fr-FR"
        : locale === "it"
          ? "it-IT"
          : "en-SA";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(halalas / 100);
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

export function todayInRiyadh() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

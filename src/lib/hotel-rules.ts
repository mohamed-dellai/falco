import { shiftIsoDate } from "@/lib/money";

export type HotelSaleWindow = {
  minAdvanceDays: number;
  cutoffTime: string;
};

function riyadhParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: `${read("year")}-${read("month")}-${read("day")}`,
    minutes: Number(read("hour")) * 60 + Number(read("minute")),
  };
}

function cutoffMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function earliestCheckIn(hotel: HotelSaleWindow, now = new Date()) {
  const clock = riyadhParts(now);
  const advance = Number.isInteger(hotel.minAdvanceDays)
    ? Math.max(0, hotel.minAdvanceDays)
    : 0;
  let day = shiftIsoDate(clock.day, advance);
  const cutoff = cutoffMinutes(hotel.cutoffTime);
  if (cutoff != null && clock.minutes >= cutoff) {
    day = shiftIsoDate(day, 1);
  }
  return day;
}

export function stayAllowed(
  hotel: HotelSaleWindow,
  checkIn: string,
  now = new Date(),
) {
  return checkIn >= earliestCheckIn(hotel, now);
}

export function hotelDisplayName(
  hotel: { name: string; nameAr: string },
  locale: string,
) {
  const arabic = hotel.nameAr.trim();
  return locale === "ar" && arabic ? arabic : hotel.name;
}

export function hotelDisplayDescription(
  hotel: { description: string; descriptionAr: string },
  locale: string,
) {
  const arabic = hotel.descriptionAr.trim();
  return locale === "ar" && arabic ? arabic : hotel.description;
}

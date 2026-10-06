import { cities, type City } from "@/lib/places";
import { mealPlans, type MealPlan } from "@/lib/room-types";

export const distanceCaps = [1, 3, 5] as const;
export type DistanceCap = (typeof distanceCaps)[number];
export const catalogSorts = ["name", "stars", "distance"] as const;
export type CatalogSort = (typeof catalogSorts)[number];

export type CatalogFilters = {
  city: City | "";
  q: string;
  checkIn: string;
  checkOut: string;
  stars: number[];
  boards: MealPlan[];
  guests: number[];
  views: string[];
  distance: DistanceCap | null;
  sort: CatalogSort;
};

type QueryValue = string | string[] | undefined;
export type SearchQuery = Record<string, QueryValue>;

type CatalogRoom = {
  board: MealPlan;
  capacity: number;
  view: string;
};

type CatalogHotel = {
  name: string;
  city: City;
  stars: number;
  distanceToHaram: string;
  rooms: CatalogRoom[];
};

function one(value: QueryValue) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function many(value: QueryValue) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw.map((item) => item.trim()).filter(Boolean);
}

function numbers(value: QueryValue, allowed: number[]) {
  return [
    ...new Set(
      many(value)
        .flatMap((item) => item.split(","))
        .map((item) => Number(item))
        .filter((item) => allowed.includes(item)),
    ),
  ];
}

export function parseCatalogFilters(query: SearchQuery): CatalogFilters {
  const city = one(query.city);
  const distance = Number(one(query.distance));
  const sort = one(query.sort);
  return {
    city: cities.includes(city as City) ? (city as City) : "",
    q: one(query.q).slice(0, 80),
    checkIn: one(query.checkIn),
    checkOut: one(query.checkOut),
    stars: numbers(query.stars, [1, 2, 3, 4, 5]),
    boards: [
      ...new Set(
        many(query.board)
          .flatMap((item) => item.split(","))
          .filter((item): item is MealPlan => mealPlans.includes(item as MealPlan)),
      ),
    ],
    guests: numbers(query.guests, [1, 2, 3, 4, 5]),
    views: many(query.view).slice(0, 8).map((view) => view.slice(0, 80)),
    distance: distanceCaps.includes(distance as DistanceCap)
      ? (distance as DistanceCap)
      : null,
    sort: catalogSorts.includes(sort as CatalogSort)
      ? (sort as CatalogSort)
      : "name",
  };
}

export function catalogHref(
  filters: CatalogFilters,
  path = "/hotels",
  hash = "",
) {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.q) params.set("q", filters.q);
  if (filters.checkIn) params.set("checkIn", filters.checkIn);
  if (filters.checkOut) params.set("checkOut", filters.checkOut);
  if (filters.stars.length) params.set("stars", filters.stars.join(","));
  if (filters.boards.length) params.set("board", filters.boards.join(","));
  if (filters.guests.length) params.set("guests", filters.guests.join(","));
  for (const view of filters.views) params.append("view", view);
  if (filters.distance) params.set("distance", String(filters.distance));
  if (filters.sort !== "name") params.set("sort", filters.sort);
  const query = params.toString();
  return `${path}${query ? `?${query}` : ""}${hash}`;
}

export function distanceMeters(value: string) {
  const text = value
    .trim()
    .toLowerCase()
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  const match = text.match(/(\d+(?:[.,]\d+)?)/);
  if (!match || match.index == null) return null;
  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount)) return null;
  const tail = text.slice(match.index + match[1].length, match.index + match[1].length + 16);
  if (/km|كيلو|كم/.test(tail)) return amount * 1000;
  if (/متر|meter|\bm\b/.test(tail)) return amount;
  if (amount <= 15) return amount * 1000;
  return amount;
}

function roomMatches(
  room: CatalogRoom,
  filters: CatalogFilters,
) {
  if (filters.boards.length && !filters.boards.includes(room.board)) return false;
  if (filters.guests.length) {
    const fits = filters.guests.some((guests) =>
      guests === 5 ? room.capacity >= 5 : room.capacity === guests,
    );
    if (!fits) return false;
  }
  if (filters.views.length && !filters.views.includes(room.view.trim())) return false;
  return true;
}

export function filterCatalog<T extends CatalogHotel>(
  hotels: T[],
  filters: CatalogFilters,
) {
  const needle = filters.q.trim().toLocaleLowerCase();
  const roomFilter =
    filters.boards.length > 0 || filters.guests.length > 0 || filters.views.length > 0;
  const matched = hotels.filter((hotel) => {
    if (filters.city && hotel.city !== filters.city) return false;
    if (needle && !hotel.name.toLocaleLowerCase().includes(needle)) return false;
    if (filters.stars.length && !filters.stars.includes(hotel.stars)) return false;
    if (filters.distance) {
      const meters = distanceMeters(hotel.distanceToHaram);
      if (meters == null || meters > filters.distance * 1000) return false;
    }
    if (roomFilter && !hotel.rooms.some((room) => roomMatches(room, filters))) {
      return false;
    }
    return true;
  });

  return matched.sort((left, right) => {
    if (filters.sort === "stars" && left.stars !== right.stars) {
      return right.stars - left.stars;
    }
    if (filters.sort === "distance") {
      const leftMeters = distanceMeters(left.distanceToHaram);
      const rightMeters = distanceMeters(right.distanceToHaram);
      if (leftMeters == null && rightMeters != null) return 1;
      if (leftMeters != null && rightMeters == null) return -1;
      if (leftMeters != null && rightMeters != null && leftMeters !== rightMeters) {
        return leftMeters - rightMeters;
      }
    }
    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  });
}

export function catalogViews(hotels: Array<{ rooms: Array<{ view: string }> }>) {
  return [
    ...new Set(
      hotels.flatMap((hotel) =>
        hotel.rooms.map((room) => room.view.trim()).filter(Boolean),
      ),
    ),
  ].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}

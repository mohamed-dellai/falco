"use client";

import { Search, SlidersHorizontal, Star } from "lucide-react";
import { useEffect, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarSwitch, DateField } from "@/components/calendar-date-field";
import { useRouter } from "@/i18n/navigation";
import {
  catalogHref,
  type CatalogFilters,
  type DistanceCap,
} from "@/lib/hotel-filters";
import { cities, type City } from "@/lib/places";
import { nightsBetween } from "@/lib/money";
import { mealPlans, type MealPlan } from "@/lib/room-types";

const maxStayNights = 120;
const fieldClass =
  "h-12 w-full min-w-0 rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20";

function nextDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function HotelCatalog({
  filters,
  views,
  minDate,
  count,
  children,
}: {
  filters: CatalogFilters;
  views: string[];
  minDate: string;
  count: number;
  children: ReactNode;
}) {
  const t = useTranslations("Hotels");
  const search = useTranslations("Search");
  const common = useTranslations("Common");
  const calendar = useTranslations("Calendar");
  const locale = useLocale();
  const router = useRouter();
  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  function apply(next: CatalogFilters, hash = "") {
    startTransition(() => {
      router.replace(catalogHref(next, "/hotels", hash));
    });
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nights = nightsBetween(draft.checkIn, draft.checkOut);
    if ((draft.checkIn || draft.checkOut) && nights < 1) {
      setError(search("dates"));
      return;
    }
    if (nights > maxStayNights) {
      setError(search("span"));
      return;
    }
    setError("");
    apply(
      {
        ...filters,
        city: draft.city,
        q: draft.q.trim(),
        checkIn: draft.checkIn,
        checkOut: draft.checkOut,
      },
      "#availability",
    );
  }

  function toggleStar(star: number) {
    const stars = filters.stars.includes(star)
      ? filters.stars.filter((item) => item !== star)
      : [...filters.stars, star];
    apply({ ...filters, stars });
  }

  function toggleBoard(board: MealPlan) {
    const boards = filters.boards.includes(board)
      ? filters.boards.filter((item) => item !== board)
      : [...filters.boards, board];
    apply({ ...filters, boards });
  }

  function toggleGuest(guests: number) {
    const next = filters.guests.includes(guests)
      ? filters.guests.filter((item) => item !== guests)
      : [...filters.guests, guests];
    apply({ ...filters, guests: next });
  }

  function toggleView(view: string) {
    const views = filters.views.includes(view)
      ? filters.views.filter((item) => item !== view)
      : [...filters.views, view];
    apply({ ...filters, views });
  }

  const boardLabel: Record<MealPlan, string> = {
    room_only: t("roomOnly"),
    breakfast: t("breakfastBoard"),
    half_board: t("halfBoard"),
    full_board: t("fullBoard"),
  };
  const activeFilters =
    filters.stars.length +
    filters.boards.length +
    filters.guests.length +
    filters.views.length +
    (filters.distance ? 1 : 0);

  const panel = (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-extrabold text-primary">{t("filters")}</h2>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={() =>
              apply({
                ...filters,
                stars: [],
                boards: [],
                guests: [],
                views: [],
                distance: null,
              })
            }
            className="text-xs font-bold text-gold"
          >
            {t("clearFilters")}
          </button>
        )}
      </div>

      <fieldset className="mt-5">
        <legend className="text-sm font-extrabold text-ink">{t("starsLabel")}</legend>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => {
            const selected = filters.stars.includes(star);
            return (
              <button
                key={star}
                type="button"
                aria-pressed={selected}
                aria-label={t("stars", { count: star })}
                onClick={() => toggleStar(star)}
                className={`inline-flex h-10 items-center justify-center gap-0.5 rounded-lg border text-sm font-bold transition ${
                  selected
                    ? "border-gold bg-gold text-ink"
                    : "border-line bg-white text-primary hover:border-gold"
                }`}
              >
                {star}
                <Star aria-hidden="true" size={11} className="fill-current" />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-6 border-t border-line pt-5">
        <legend className="text-sm font-extrabold text-ink">{t("mealsLabel")}</legend>
        <div className="mt-3 grid gap-2">
          {mealPlans.map((board) => (
            <label key={board} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={filters.boards.includes(board)}
                onChange={() => toggleBoard(board)}
                className="size-4 accent-gold"
              />
              {boardLabel[board]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6 border-t border-line pt-5">
        <legend className="text-sm font-extrabold text-ink">{t("guestsLabel")}</legend>
        <div className="mt-3 grid gap-2">
          {[1, 2, 3, 4, 5].map((guests) => (
            <label key={guests} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={filters.guests.includes(guests)}
                onChange={() => toggleGuest(guests)}
                className="size-4 accent-gold"
              />
              {guests === 5 ? t("guestsFive") : t("sleeps", { count: guests })}
            </label>
          ))}
        </div>
      </fieldset>

      {views.length > 0 && (
        <fieldset className="mt-6 border-t border-line pt-5">
          <legend className="text-sm font-extrabold text-ink">{t("viewLabel")}</legend>
          <div className="mt-3 grid gap-2">
            {views.map((view) => (
              <label key={view} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={filters.views.includes(view)}
                  onChange={() => toggleView(view)}
                  className="size-4 accent-gold"
                />
                {view}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="mt-6 border-t border-line pt-5">
        <legend className="text-sm font-extrabold text-ink">{t("distanceLabel")}</legend>
        <div className="mt-3 grid gap-2">
          {([null, 1, 3, 5] as Array<DistanceCap | null>).map((cap) => (
            <label key={cap ?? "any"} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="distance"
                checked={filters.distance === cap}
                onChange={() => apply({ ...filters, distance: cap })}
                className="size-4 accent-gold"
              />
              {cap == null ? t("distanceAny") : t(`distance${cap}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="mt-6 border-t border-line pt-4 text-xs leading-5 text-muted">
        {t("rateNote")}
      </p>
    </div>
  );

  return (
    <>
      <form
        onSubmit={onSearch}
        className="rounded-2xl border border-line bg-white p-3"
        aria-label={t("searchLabel")}
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)_auto] lg:items-end">
          <label className="grid gap-1 text-xs font-bold text-primary">
            {t("destination")}
            <select
              value={draft.city}
              onChange={(event) =>
                setDraft({ ...draft, city: event.target.value as City | "" })
              }
              className={fieldClass}
            >
              <option value="">{t("anyCity")}</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {common(city)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-primary">
            {search("checkIn")}
            <DateField
              name="checkIn"
              label={search("checkIn")}
              locale={locale}
              variant="public"
              min={minDate}
              value={draft.checkIn}
              onChange={(checkIn) => {
                setError("");
                const checkOut =
                  draft.checkOut && nightsBetween(checkIn, draft.checkOut) < 1
                    ? ""
                    : draft.checkOut;
                setDraft({ ...draft, checkIn, checkOut });
              }}
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-primary">
            {search("checkOut")}
            <DateField
              name="checkOut"
              label={search("checkOut")}
              locale={locale}
              variant="public"
              min={nextDate(draft.checkIn || minDate)}
              value={draft.checkOut}
              onChange={(checkOut) => {
                setError("");
                setDraft({ ...draft, checkOut });
              }}
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1 text-xs font-bold text-primary">
            {t("hotelName")}
            <input
              value={draft.q}
              onChange={(event) => setDraft({ ...draft, q: event.target.value })}
              placeholder={t("hotelNamePlaceholder")}
              className={fieldClass}
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gold px-5 text-sm font-bold text-ink transition hover:bg-gold-light disabled:cursor-wait disabled:opacity-70"
          >
            <Search aria-hidden="true" size={17} strokeWidth={2.25} />
            {isPending ? search("searching") : t("searchHotels")}
          </button>
        </div>
        <CalendarSwitch
          label={calendar("label")}
          normal={calendar("normal")}
          arabic={calendar("arabic")}
          variant="public"
          className="mt-3"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm font-bold text-red-800">
            {error}
          </p>
        )}
      </form>

      <div
        id="availability"
        className="mt-6 grid scroll-mt-24 items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]"
      >
        <aside className={filtersOpen ? "block" : "hidden lg:block"}>{panel}</aside>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-muted">
              {t("resultCount", { count })}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-bold text-primary lg:hidden"
              >
                <SlidersHorizontal aria-hidden="true" size={15} />
                {t("filters")}
                {activeFilters > 0 ? ` (${activeFilters})` : ""}
              </button>
              <label className="flex items-center gap-2 text-xs font-bold text-primary">
                <span className="sr-only">{t("sort")}</span>
                <select
                  value={filters.sort}
                  onChange={(event) =>
                    apply({
                      ...filters,
                      sort: event.target.value as CatalogFilters["sort"],
                    })
                  }
                  className="h-10 rounded-lg border border-line bg-white px-3 text-sm font-bold text-ink outline-none focus:border-gold"
                >
                  <option value="name">{t("sortName")}</option>
                  <option value="stars">{t("sortStars")}</option>
                  <option value="distance">{t("sortDistance")}</option>
                </select>
              </label>
            </div>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

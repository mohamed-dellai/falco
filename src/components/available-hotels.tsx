import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { listShowcase } from "@/lib/inventory";

type Showcase = Awaited<ReturnType<typeof listShowcase>>;

export async function AvailableHotels({
  hotels,
  checkIn,
  checkOut,
}: {
  hotels: Showcase;
  checkIn: string;
  checkOut: string;
}) {
  const t = await getTranslations("Hotels");
  const search = await getTranslations("Search");
  const common = await getTranslations("Common");

  if (!hotels.length) {
    return (
      <div className="mt-8 flex max-w-3xl flex-col gap-5 rounded-2xl border border-line bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-low text-primary">
            <SearchX aria-hidden="true" size={21} />
          </span>
          <div>
            <h3 className="font-bold text-ink">{search("empty")}</h3>
            <p className="mt-1 max-w-lg text-sm leading-6 text-muted">
              {search("emptyHint")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href="#room-search"
            className="rounded-lg border border-line px-4 py-2.5 text-sm font-bold text-primary transition hover:border-gold"
          >
            {search("changeDates")}
          </a>
          <Link
            href="/contact"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark"
          >
            {search("requestHelp")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {hotels.map((hotel) => {
        const image = hotel.photos[0] ?? hotel.rooms[0]?.photos[0];
        const openRooms = hotel.rooms.reduce((sum, room) => sum + room.open, 0);
        return (
          <article
            key={hotel.id}
            className="card-lift overflow-hidden rounded-2xl border border-line bg-white"
          >
            <div className="relative h-52 bg-primary-dark">
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={hotel.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-gold">
                {common(hotel.city)} · {t("stars", { count: hotel.stars })}
              </p>
              <h2 className="font-display mt-2 text-2xl font-bold text-primary">
                {hotel.name}
              </h2>
              {hotel.distanceToHaram && (
                <p className="mt-2 text-sm text-muted">
                  {hotel.distanceToHaram}
                </p>
              )}
              <p className="mt-4 text-sm font-bold text-primary">
                {t("openForStay", { count: openRooms })}
              </p>
              <Link
                href={`/hotels/${hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}`}
                className="mt-5 inline-flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white"
              >
                {search("chooseHotel")}
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

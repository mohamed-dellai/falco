import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { listPublicStay } from "@/lib/inventory";
import { formatDateRange, formatMoney } from "@/lib/money";
import { roomTypeLabel } from "@/lib/room-types";

type Offers = Awaited<ReturnType<typeof listPublicStay>>;

export async function PublicStay({
  hotels,
  checkIn,
  checkOut,
  nights,
}: {
  hotels: Offers;
  checkIn: string;
  checkOut: string;
  nights: number;
}) {
  const t = await getTranslations("Traveller");
  const hotelsCopy = await getTranslations("Hotels");
  const common = await getTranslations("Common");
  const locale = (await getLocale()) as Locale;

  if (!hotels.length) {
    return (
      <p className="mt-8 max-w-xl text-base leading-8 text-muted">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {hotels.flatMap((hotel) =>
        hotel.rooms.map((room) => {
          const image = room.photos[0] ?? hotel.photos[0];
          const total = room.publicPricePerNight * nights;
          return (
            <article
              key={room.id}
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
                  {common(hotel.city)} ·{" "}
                  {hotelsCopy("stars", { count: hotel.stars })}
                </p>
                <h2 className="font-display mt-2 text-2xl font-bold text-primary">
                  {hotel.name}
                </h2>
                <p className="mt-1 text-sm font-bold text-ink">
                  {roomTypeLabel(room.name, (type) => hotelsCopy(type))}
                </p>
                {room.checkIn && room.checkOut && (
                  <p className="mt-1 text-sm text-muted">
                    {formatDateRange(room.checkIn, room.checkOut, locale)}
                  </p>
                )}
                <p className="mt-2 text-sm text-muted">
                  {hotelsCopy("sleeps", { count: room.capacity })}
                </p>
                <p className="mt-4 text-sm font-bold text-emerald-800">
                  {t("available")}
                </p>
                <p className="mt-3 text-sm text-muted">
                  {t("nightly", {
                    price: formatMoney(room.publicPricePerNight, locale),
                  })}
                </p>
                <p className="mt-1 text-lg font-extrabold text-primary">
                  {t("total", { price: formatMoney(total, locale) })}
                </p>
                <Link
                  href={`/book?room=${room.id}&checkIn=${checkIn}&checkOut=${checkOut}`}
                  className="mt-5 inline-flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white"
                >
                  {t("book")}
                </Link>
              </div>
            </article>
          );
        }),
      )}
    </div>
  );
}

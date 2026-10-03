import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { RoomRequest } from "@/components/room-request";
import { StaySearch } from "@/components/stay-search";
import { Link } from "@/i18n/navigation";
import { localeAlternates, type Locale } from "@/i18n/routing";
import { getHotel, getShowcaseHotel, parseStay } from "@/lib/inventory";
import { todayInRiyadh } from "@/lib/money";
import { roomTypeLabel } from "@/lib/room-types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const hotel = await getHotel(id);
  if (!hotel) return {};
  return {
    title: hotel.name,
    description: hotel.description,
    alternates: {
      canonical: `/${locale}/hotels/${id}`,
      languages: localeAlternates(`/hotels/${id}`),
    },
  };
}

export default async function HotelPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale; id: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string }>;
}) {
  const { locale, id } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const stay = parseStay(query.checkIn, query.checkOut);
  const hotel = await getHotel(id);
  if (!hotel) notFound();
  const listed = stay ? await getShowcaseHotel(id, stay) : null;
  const rooms = listed?.rooms ?? [];
  const minDate = todayInRiyadh();

  const t = await getTranslations("Hotels");
  const search = await getTranslations("Search");
  const common = await getTranslations("Common");
  const gallery = [...hotel.photos, ...rooms.flatMap((room) => room.photos)];

  return (
    <section className="section-space">
      <div className="site-shell">
        <Link
          href={
            stay
              ? `/hotels?checkIn=${stay.checkIn}&checkOut=${stay.checkOut}`
              : "/hotels"
          }
          className="text-sm font-bold text-primary"
        >
          {t("back")}
        </Link>
        <p className="eyebrow mt-5">
          {common(hotel.city)} · {t("stars", { count: hotel.stars })}
        </p>
        <h1 className="font-display mt-2 text-4xl font-bold text-primary md:text-6xl">
          {hotel.name}
        </h1>
        {hotel.distanceToHaram && (
          <p className="mt-3 text-sm font-bold text-gold">
            {hotel.distanceToHaram}
          </p>
        )}
        {hotel.address && (
          <p className="mt-2 text-sm text-muted">{hotel.address}</p>
        )}
        {hotel.description && (
          <p className="mt-5 max-w-3xl text-base leading-8 text-muted">
            {hotel.description}
          </p>
        )}

        {gallery.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {gallery.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={photo}
                src={photo}
                alt={hotel.name}
                className="h-40 w-full rounded-xl object-cover"
              />
            ))}
          </div>
        )}

        <h2 className="font-display mt-12 text-3xl font-bold text-primary">
          {t("roomsTitle")}
        </h2>
        <StaySearch
          key={`${query.checkIn ?? ""}:${query.checkOut ?? ""}`}
          pathname={`/hotels/${hotel.id}`}
          minDate={minDate}
          checkIn={query.checkIn}
          checkOut={query.checkOut}
        />
        {stay && rooms.length ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {rooms.map((room) => (
              <article
                key={room.id}
                className="overflow-hidden rounded-2xl border border-line bg-white"
              >
                {room.photos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={room.photos[0]}
                    alt={roomTypeLabel(room.name, (type) => t(type))}
                    className="h-56 w-full object-cover"
                  />
                )}
                <div className="p-5">
                  <h3 className="text-2xl font-bold text-primary">
                    {roomTypeLabel(room.name, (type) => t(type))}
                    {room.checkIn && room.checkOut && (
                      <span className="mt-1 block text-sm font-medium text-muted">
                        {room.checkIn} → {room.checkOut}
                      </span>
                    )}
                  </h3>
                  {room.description && (
                    <p className="mt-2 text-sm leading-7 text-muted">
                      {room.description}
                    </p>
                  )}
                  <p className="mt-4 text-sm font-bold">
                    {t("sleeps", { count: room.capacity })} ·{" "}
                    {t("openForStay", { count: room.open })}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {t("rateOnRequest")}
                  </p>
                  <RoomRequest
                    hotelId={hotel.id}
                    roomId={room.id}
                    max={room.open}
                    checkIn={stay.checkIn}
                    checkOut={stay.checkOut}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-7 text-muted">
            {stay ? t("fullyAllotted") : search("prompt")}
          </p>
        )}
      </div>
    </section>
  );
}

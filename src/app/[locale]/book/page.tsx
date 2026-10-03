import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { localeAlternates, type Locale } from "@/i18n/routing";
import { getHotel, getRoom, parseStay } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("bookTitle"),
    alternates: {
      canonical: `/${locale}/book`,
      languages: localeAlternates("/book"),
    },
  };
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    room?: string;
    checkIn?: string;
    checkOut?: string;
    payment?: string;
  }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const stay = parseStay(query.checkIn, query.checkOut);
  const room = query.room ? await getRoom(query.room) : null;
  const hotel = room ? await getHotel(room.hotelId) : null;
  if (!stay || !room || !hotel || room.publicPricePerNight == null) notFound();

  const t = await getTranslations("Book");
  const nightly = room.publicPricePerNight;

  return (
    <section className="section-space">
      <div className="site-shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="eyebrow">{t("eyebrow")}</p>
          <h1 className="font-display mt-3 text-4xl font-bold text-primary md:text-5xl">
            {hotel.name}
          </h1>
          <p className="mt-3 text-lg font-bold text-ink">{room.name}</p>
          {room.checkIn && room.checkOut && (
            <p className="mt-1 text-sm text-muted">
              {room.checkIn} → {room.checkOut}
            </p>
          )}
          <p className="mt-4 text-sm font-bold text-muted">
            {stay.checkIn} → {stay.checkOut}
          </p>
          <p className="mt-2 text-sm text-muted">
            {t("nightly", { price: formatMoney(nightly, locale) })}
          </p>
        </div>
        <CheckoutForm
          roomId={room.id}
          checkIn={stay.checkIn}
          checkOut={stay.checkOut}
          nightly={nightly}
          nights={stay.nights}
          capacity={room.capacity}
          cancelled={query.payment === "cancelled"}
        />
      </div>
    </section>
  );
}

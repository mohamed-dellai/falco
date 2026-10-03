import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BookingRefresh } from "@/components/booking-refresh";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getBooking } from "@/lib/bookings";
import { nightsBetween } from "@/lib/money";
import { formatMoney } from "@/lib/money";
import { roomTypeLabel } from "@/lib/room-types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: t("bookTitle") };
}

export default async function BookingCompletePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ booking?: string }>;
}) {
  const { locale } = await params;
  const { booking: bookingId } = await searchParams;
  setRequestLocale(locale);
  if (!bookingId) notFound();
  const booking = await getBooking(bookingId);
  if (!booking) notFound();
  const t = await getTranslations("Book");
  const hotels = await getTranslations("Hotels");
  const nights = Math.max(0, nightsBetween(booking.checkIn, booking.checkOut));
  const pending = booking.status === "pending";

  return (
    <section className="section-space">
      <BookingRefresh pending={pending} />
      <div className="site-shell max-w-2xl">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="font-display mt-3 text-4xl font-bold text-primary">
          {pending
            ? t("pendingTitle")
            : booking.status === "confirmed"
              ? t("confirmedTitle")
              : t("cancelledTitle")}
        </h1>
        <p className="mt-4 text-base leading-8 text-muted">
          {pending
            ? t("pendingCopy")
            : booking.status === "confirmed"
              ? t("confirmedCopy", { reference: booking.number })
              : t("cancelledCopy")}
        </p>
        <div className="mt-8 rounded-2xl border border-line bg-white p-5 text-sm">
          <p className="font-bold text-ink">{booking.hotelName}</p>
          <p className="mt-1 text-muted">
            {roomTypeLabel(booking.roomName, (type) => hotels(type))}
          </p>
          <p className="mt-3 text-muted">
            {booking.checkIn} → {booking.checkOut}
          </p>
          <p className="mt-1 font-bold text-primary">
            {formatMoney(
              booking.publicPricePerNight * nights * booking.quantity,
              locale,
            )}
          </p>
        </div>
        <Link
          href="/stay"
          className="mt-6 inline-flex text-sm font-bold text-primary"
        >
          {t("back")}
        </Link>
      </div>
    </section>
  );
}

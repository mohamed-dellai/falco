import { hasLocale } from "next-intl";
import { notFound, redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

export default async function StayRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ checkIn?: string; checkOut?: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const query = await searchParams;
  const next = new URLSearchParams();
  if (query.checkIn) next.set("checkIn", query.checkIn);
  if (query.checkOut) next.set("checkOut", query.checkOut);
  const suffix = next.toString();
  redirect(`/${locale}/quest${suffix ? `?${suffix}` : ""}`);
}

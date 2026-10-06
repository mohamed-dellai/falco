"use server";

import { redirect } from "next/navigation";
import {
  clearAgencySession,
  createAgencySession,
  currentAgency,
} from "@/lib/agency-auth";
import { createAgencyReservation } from "@/lib/inventory";

function localeOf(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  return locale === "ar" || locale === "fr" || locale === "it" ? locale : "en";
}

export async function agencySignInAction(formData: FormData) {
  const locale = localeOf(formData);
  const ok = await createAgencySession(
    String(formData.get("email") ?? ""),
    String(formData.get("password") ?? ""),
  );
  if (!ok) redirect(`/${locale}/hotels/login?error=1`);
  redirect(`/${locale}/hotels`);
}

export async function agencySignOutAction(formData: FormData) {
  const locale = localeOf(formData);
  await clearAgencySession();
  redirect(`/${locale}/hotels`);
}

export async function bookAgencyOfferAction(formData: FormData) {
  const locale = localeOf(formData);
  const hotelId = String(formData.get("hotelId") ?? "");
  const checkIn = String(formData.get("checkIn") ?? "");
  const checkOut = String(formData.get("checkOut") ?? "");
  const back = `/${locale}/hotels/${hotelId}?checkIn=${checkIn}&checkOut=${checkOut}`;
  const agency = await currentAgency();
  if (!agency) redirect(`/${locale}/hotels/login`);
  const quantity = Number(formData.get("quantity"));
  const result = await createAgencyReservation({
    agencyId: agency.id,
    offerId: String(formData.get("offerId") ?? ""),
    checkIn,
    checkOut,
    quantity,
  });
  if (!result.ok) redirect(`${back}&error=${result.error}`);
  redirect(`${back}&booked=${encodeURIComponent(result.number)}&kind=${result.status}`);
}

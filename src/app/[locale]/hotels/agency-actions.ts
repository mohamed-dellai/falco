"use server";

import { redirect } from "next/navigation";
import {
  agencyReturnPath,
  clearAgencySession,
  createAgencySession,
  currentAgency,
  updateAgencyProfile,
} from "@/lib/agency-auth";
import {
  addAgencyCartLine,
  checkoutAgencyCart,
  clearAgencyCart,
  updateAgencyCartLine,
} from "@/lib/agency-cart";
import { requestAgencyCancellation } from "@/lib/reservations";

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
  if (!ok) {
    const next = agencyReturnPath(locale, String(formData.get("next") ?? ""));
    redirect(
      `/${locale}/hotels/login?error=1&next=${encodeURIComponent(next)}`,
    );
  }
  redirect(agencyReturnPath(locale, String(formData.get("next") ?? "")));
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
  const result = await addAgencyCartLine({
    agencyId: agency.id,
    contractPeriodId: String(formData.get("contractPeriodId") ?? ""),
    hotelId,
    checkIn,
    checkOut,
    quantity,
  });
  if (!result.ok) redirect(`${back}&error=${result.error}`);
  redirect(`/${locale}/hotels/basket`);
}

export async function updateAgencyCartAction(formData: FormData) {
  const locale = localeOf(formData);
  const agency = await currentAgency();
  if (!agency) redirect(`/${locale}/hotels/login`);
  const quantity = Number(formData.get("quantity"));
  const result = await updateAgencyCartLine({
    agencyId: agency.id,
    lineId: String(formData.get("lineId") ?? ""),
    quantity,
  });
  redirect(
    result.ok
      ? `/${locale}/hotels/basket`
      : `/${locale}/hotels/basket?error=${result.error}`,
  );
}

export async function clearAgencyCartAction(formData: FormData) {
  const locale = localeOf(formData);
  const agency = await currentAgency();
  if (!agency) redirect(`/${locale}/hotels/login`);
  await clearAgencyCart(agency.id);
  redirect(`/${locale}/hotels`);
}

export async function checkoutAgencyCartAction(formData: FormData) {
  const locale = localeOf(formData);
  const agency = await currentAgency();
  if (!agency) redirect(`/${locale}/hotels/login`);
  const result = await checkoutAgencyCart({
    agencyId: agency.id,
    termsAccepted: formData.get("termsAccepted") === "on",
    acceptedBy:
      String(formData.get("acceptedBy") ?? "").trim() || agency.name,
    notes: String(formData.get("notes") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  });
  if (!result.ok) {
    redirect(`/${locale}/hotels/basket?error=${result.error}`);
  }
  redirect(`/${locale}/hotels/reservations/${result.number}`);
}

export async function requestAgencyCancellationAction(formData: FormData) {
  const locale = localeOf(formData);
  const agency = await currentAgency();
  if (!agency) redirect(`/${locale}/hotels/login`);
  const number = String(formData.get("number") ?? "");
  const saved = await requestAgencyCancellation({
    agencyId: agency.id,
    number,
    reason: String(formData.get("reason") ?? ""),
  });
  redirect(
    saved
      ? `/${locale}/hotels/reservations/${number}?requested=1`
      : `/${locale}/hotels/reservations/${number}?error=cancellation`,
  );
}

export async function updateAgencyProfileAction(formData: FormData) {
  const locale = localeOf(formData);
  const agency = await currentAgency();
  if (!agency) redirect(`/${locale}/hotels/login`);
  const saved = await updateAgencyProfile({
    agencyId: agency.id,
    contactName: String(formData.get("contactName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    country: String(formData.get("country") ?? ""),
  });
  redirect(
    saved
      ? `/${locale}/hotels/profile?saved=1`
      : `/${locale}/hotels/profile?error=invalid`,
  );
}

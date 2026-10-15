"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cancelBooking, deleteBooking } from "@/lib/bookings";
import {
  clearAdminSession,
  createAdminSession,
  currentAdmin,
  requireAdmin,
} from "@/lib/admin-auth";
import { saveAgencyLogin } from "@/lib/agency-auth";
import {
  addSupplierCode,
  createClientGroup,
  deleteClientGroup,
  deleteSupplierCode,
  identityFile,
  listClientGroups,
  renameClientGroup,
  saveCommercial,
  saveNationalId,
  setAgencySupplier,
} from "@/lib/client-crm";
import {
  requestContactReveal,
  verifyContactReveal,
} from "@/lib/contact-reveal";
import {
  accountDraft,
  createAdminUser,
  createFirstAdmin,
  deleteAdminUser,
  updateAdminUser,
} from "@/lib/admin-users";
import {
  addHotelPhoto,
  allotmentIdForBooking,
  cities,
  createAgency,
  getAgency,
  updateAgency,
  updateAgencySelling,
  createHotel,
  cancelPurchase,
  cancelAllotment,
  confirmAllotment,
  holdAllotment,
  addReservationLine,
  updateReservationLine,
  removeReservationLine,
  saveReservationHeader,
  returnAllotmentToProvisional,
  returnAllotmentToRequest,
  regretAllotment,
  asLineSupplierStatus,
  saveContractRate,
  deleteContractRate,
  confirmPurchase,
  deleteAllotment,
  reopenAllotment,
  deleteAssignment,
  deleteHotel,
  deleteHotelPhoto,
  deletePurchase,
  deleteRoomPhoto,
  deleteOfferPhoto,
  getAllotment,
  getHotel,
  getPurchase,
  updateHotelContact,
  updateHotelRules,
  updateHotelVisibility,
  listRoomTypes,
  deleteRoomType,
  saveRoomType,
  saveAllotment,
  reviseConfirmedPurchase,
  savePurchase,
  unarchivePurchase,
  updateHotel,
  type AllotmentLineInput,
  type City,
  type ContractType,
  type Purchase,
  type PurchaseLine,
  type PurchaseLineInput,
  type SupplierType,
} from "@/lib/inventory";
import { parseMoney } from "@/lib/money";
import {
  amendContractPeriod,
  createContractPolicy,
  deleteContractGroupRate,
  deleteContractPeriodRate,
  saveContractGroupRate,
  saveContractPeriodRate,
} from "@/lib/contracts";
import {
  deleteSubmission,
  setSubmissionStatus,
  submissionStatuses,
  type SubmissionStatus,
} from "@/lib/submissions";
import { saveCompanyProfile, saveCompanyLogo } from "@/lib/company";
import { getMailSettings, mailDraft, mailErrorCode, saveMailSettings, sendMailTest } from "@/lib/mail";
import { mealPlanCode, saleModeCode } from "@/lib/room-types";
import {
  allowedViewNames,
  createMealType,
  createViewType,
  deleteMealType,
  deleteViewType,
  listHotelMealLinks,
  listHotelOfferings,
  listHotelRoomLinks,
  listHotelViewLinks,
  listMealTypes,
  renameMealType,
  renameViewType,
  saveHotelOfferings,
} from "@/lib/hotel-parameters";
import { placeById } from "@/lib/places";
import { selectedImages } from "@/lib/uploads";
import {
  appendReservationEvent,
  cancelAllReservation,
  decideCancellation,
  noShowReservation,
  recordReservationCommunication,
  setAllReservationLines,
  setReservationRequest,
  unavailableReservation,
} from "@/lib/reservations";
import {
  composeHotelRoomNotice,
  composeReservationNotice,
  sendHotelRoomNotice,
  sendReservationNotice,
  type HotelRoomMailKind,
  type NoticeMailKind,
} from "@/lib/reservation-mail";
import { transaction } from "@/lib/db";
import {
  addReservationPayment,
  cardTypes,
  deleteReservationPayment,
  listReservationPayments,
  paymentMethods,
  paymentTotals,
  savePayTerms,
  setPaymentPosted,
  type PaymentMethod,
} from "@/lib/reservation-payments";
import { execute } from "@/lib/db";
import { coordinatePair } from "@/lib/geo";
function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function integer(formData: FormData, key: string) {
  const value = Number(text(formData, key));
  return Number.isInteger(value) ? value : null;
}

function readCoordinate(raw: string) {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function optionalName(value: string) {
  if (!value) return "";
  if (value.length < 2 || value.length > 140) return null;
  return value;
}

function hotelIdentity(formData: FormData) {
  const name = text(formData, "name");
  const nameAr = optionalName(text(formData, "nameAr"));
  const city = text(formData, "city");
  const placeId = text(formData, "placeId");
  const stars = integer(formData, "stars");
  if (name.length < 2 || name.length > 140 || nameAr === null) return null;
  if (!cities.includes(city as City) || stars === null) return null;
  if (stars < 1 || stars > 5) return null;
  const place = placeId ? placeById(placeId) : null;
  if (placeId && (!place || place.city !== city)) return null;
  const latitude = readCoordinate(text(formData, "latitude"));
  const longitude = readCoordinate(text(formData, "longitude"));
  if (latitude === undefined || longitude === undefined) return null;
  const position = coordinatePair(latitude, longitude);
  if (!position) return null;

  return {
    name,
    nameAr,
    city: city as City,
    placeId,
    address: text(formData, "address").slice(0, 240),
    description: text(formData, "description").slice(0, 2000),
    descriptionAr: text(formData, "descriptionAr").slice(0, 2000),
    stars,
    distanceToHaram: text(formData, "distanceToHaram").slice(0, 120),
    latitude: position.latitude,
    longitude: position.longitude,
  };
}

function hotelContact(formData: FormData) {
  const reservationEmail = text(formData, "reservationEmail").slice(0, 254);
  if (
    reservationEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reservationEmail)
  ) {
    return null;
  }
  return {
    reservationEmail,
    reservationPhone: text(formData, "reservationPhone").slice(0, 80),
    reservationWhatsapp: text(formData, "reservationWhatsapp").slice(0, 80),
  };
}

async function savePhotosSafely(
  formData: FormData,
  save: (file: File) => Promise<void>,
) {
  try {
    await storePhotos(formData, save);
    return false;
  } catch {
    return true;
  }
}

async function storePhotos(
  formData: FormData,
  save: (file: File) => Promise<void>,
) {
  for (const file of selectedImages(formData)) {
    await save(file);
  }
}

export async function loginAction(formData: FormData) {
  const accepted = await createAdminSession(
    text(formData, "email"),
    text(formData, "password"),
  );
  if (!accepted) redirect("/admin/login?error=rejected");
  redirect("/admin");
}

export async function saveCompanyAction(formData: FormData) {
  await requireAdmin();
  const saved = await saveCompanyProfile({
    name: text(formData, "name"),
    legalName: text(formData, "legalName"),
    email: text(formData, "email"),
    phoneDisplay: text(formData, "phone"),
    whatsapp: text(formData, "whatsapp"),
    commercialRegistration: text(formData, "commercialRegistration"),
    vatNumber: text(formData, "vatNumber"),
    address: {
      en: text(formData, "addressEn"),
      ar: text(formData, "addressAr"),
      fr: text(formData, "addressFr"),
      it: text(formData, "addressIt"),
    },
    hasLogo: false,
  });
  if (!saved) redirect("/admin/settings?error=invalid");
  const logo = formData.get("logo");
  const stored = await saveCompanyLogo(logo instanceof File ? logo : null, formData.get("removeLogo") === "on");
  redirect(stored ? "/admin/settings?saved=company" : "/admin/settings?error=invalid");
}

export async function saveMailSettingsAction(formData: FormData) {
  await requireAdmin();
  const current = await getMailSettings();
  const port = integer(formData, "port");
  const draft = mailDraft({
    enabled: formData.get("enabled") === "on",
    host: text(formData, "host"),
    port: port ?? 0,
    security: text(formData, "security"),
    username: text(formData, "username"),
    password: String(formData.get("password") ?? "").trim() ? String(formData.get("password") ?? "") : "",
    fromName: text(formData, "fromName"),
    fromEmail: text(formData, "fromEmail"),
    replyTo: text(formData, "replyTo"),
    allowPrivateCert: formData.get("allowPrivateCert") === "on",
    passwordSet: current.passwordSet,
  });
  if (!draft) redirect("/admin/settings?section=mail&error=invalid");
  const saved = await saveMailSettings(draft);
  redirect(
    saved
      ? "/admin/settings?section=mail&saved=mail"
      : "/admin/settings?section=mail&error=mail-missing",
  );
}

export async function sendMailTestAction(formData: FormData) {
  await requireAdmin();
  let result: Awaited<ReturnType<typeof sendMailTest>>;
  try {
    result = await sendMailTest(text(formData, "to"));
  } catch (error) {
    const code =
      error instanceof Error && error.message === "MAIL_SECRET"
        ? "mail-missing"
        : mailErrorCode(error);
    console.error("Mail test failed", code);
    redirect(`/admin/settings?section=mail&error=${code}`);
  }
  if (result === "sent") redirect("/admin/settings?section=mail&saved=mail-test");
  redirect(`/admin/settings?section=mail&error=${result === "invalid" ? "invalid" : result}`);
}

export async function createFirstAdminAction(formData: FormData) {
  const draft = accountDraft({
    name: text(formData, "name"),
    email: text(formData, "email"),
    password: text(formData, "password"),
    passwordRequired: true,
  });
  if (!draft.ok) redirect(`/admin/login?error=${draft.error}`);
  if (draft.password !== text(formData, "passwordAgain")) {
    redirect("/admin/login?error=mismatch");
  }
  const id = await createFirstAdmin(draft);
  if (!id) redirect("/admin/login");
  const accepted = await createAdminSession(draft.email, draft.password);
  if (!accepted) redirect("/admin/login?error=invalid");
  redirect("/admin");
}

export async function createAdminUserAction(formData: FormData) {
  await requireAdmin();
  const draft = accountDraft({
    name: text(formData, "name"),
    email: text(formData, "email"),
    password: text(formData, "password"),
    passwordRequired: true,
  });
  if (!draft.ok) redirect(`/admin/accounts/new?error=${draft.error}`);
  if (draft.password !== text(formData, "passwordAgain")) {
    redirect("/admin/accounts/new?error=mismatch");
  }
  const created = await createAdminUser(draft);
  if (!created.ok) redirect(`/admin/accounts/new?error=${created.error}`);
  redirect(`/admin/accounts/${created.id}`);
}

export async function updateAdminUserAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const draft = accountDraft({
    name: text(formData, "name"),
    email: text(formData, "email"),
    password: text(formData, "password"),
    passwordRequired: false,
  });
  if (!draft.ok) redirect(`/admin/accounts/${id}?error=${draft.error}`);
  const saved = await updateAdminUser(id, draft);
  if (!saved.ok) redirect(`/admin/accounts/${id}?error=${saved.error}`);
  redirect(`/admin/accounts/${id}`);
}

export async function deleteAdminUserAction(formData: FormData) {
  await requireAdmin();
  const actor = await currentAdmin();
  const id = text(formData, "id");
  if (!actor) redirect("/admin/login");
  const removed = await deleteAdminUser(id, actor.id);
  redirect(removed.ok ? "/admin/accounts" : `/admin/accounts/${id}?error=${removed.error}`);
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function createHotelAction(formData: FormData) {
  await requireAdmin();
  const input = hotelIdentity(formData);
  if (!input) redirect("/admin/hotels/new?error=invalid");
  const id = await createHotel(input);
  redirect(`/admin/hotels/${id}`);
}

export async function updateHotelAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const input = hotelIdentity(formData);
  if (!input || !(await getHotel(id))) redirect("/admin/hotels?error=invalid");
  await updateHotel(id, input);
  redirect(`/admin/hotels/${id}?saved=hotel`);
}

export async function updateHotelContactAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const input = hotelContact(formData);
  if (!input || !(await getHotel(id))) redirect(`/admin/hotels/${id}/contact?error=invalid`);
  await updateHotelContact(id, input);
  redirect(`/admin/hotels/${id}/contact?saved=contact`);
}

export async function updateHotelVisibilityAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (!(await getHotel(id))) redirect("/admin/hotels?error=invalid");
  const publishedWebsite = text(formData, "publishedWebsite") === "1";
  const publishedDesk = text(formData, "publishedDesk") === "1";
  if (publishedWebsite || publishedDesk) {
    const offerings = await listHotelOfferings(id);
    if (!offerings.roomTypes.length) {
      redirect(`/admin/hotels/${id}/visibility?error=publish`);
    }
  }
  await updateHotelVisibility(id, { publishedWebsite, publishedDesk });
  redirect(`/admin/hotels/${id}/visibility?saved=visibility`);
}

export async function updateHotelRulesAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const minAdvanceDays = integer(formData, "minAdvanceDays");
  const cutoffTime = text(formData, "cutoffTime");
  if (
    !(await getHotel(id)) ||
    minAdvanceDays === null ||
    minAdvanceDays < 0 ||
    minAdvanceDays > 30 ||
    (cutoffTime && !/^\d{2}:\d{2}$/.test(cutoffTime))
  ) {
    redirect(`/admin/hotels/${id}/rules?error=invalid`);
  }
  await updateHotelRules(id, {
    minAdvanceDays,
    cutoffTime,
    payOnArrival: text(formData, "payOnArrival") === "1",
  });
  redirect(`/admin/hotels/${id}/rules?saved=rules`);
}

export async function deleteHotelAction(formData: FormData) {
  await requireAdmin();
  await deleteHotel(text(formData, "id"));
  redirect("/admin/hotels");
}

export async function deleteHotelPhotoAction(formData: FormData) {
  await requireAdmin();
  const hotelId = text(formData, "hotelId");
  await deleteHotelPhoto(text(formData, "photoId"));
  redirect(`/admin/hotels/${hotelId}/photos`);
}

export async function createRoomAction(formData: FormData) {
  await requireAdmin();
  const hotelId = text(formData, "hotelId");
  redirect(`/admin/hotels/${hotelId}?error=historical`);
}

export async function updateRoomAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  redirect(`/admin/rooms/${id}?error=historical`);
}

export async function deleteRoomAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  redirect(`/admin/rooms/${id}?error=historical`);
}

export async function deleteRoomPhotoAction(formData: FormData) {
  await requireAdmin();
  const roomId = text(formData, "roomId");
  await deleteRoomPhoto(text(formData, "photoId"));
  redirect(`/admin/rooms/${roomId}`);
}

export async function deleteOfferPhotoAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  await deleteOfferPhoto(text(formData, "photoId"));
  redirect(purchaseTab(purchaseId, "photos"));
}

function clientInput(formData: FormData) {
  const name = text(formData, "name");
  const nameAr = text(formData, "nameAr");
  const kind = text(formData, "kind") === "individual" ? "individual" : "agency";
  const vatNotRequired = formData.get("vatNotRequired") === "1";
  const vatNumber =
    kind === "agency" ? text(formData, "vatNumber").slice(0, 40) : "";
  if (name.length < 2 || name.length > 160) {
    return { ok: false as const, error: "invalid" as const };
  }
  if (nameAr && (nameAr.length < 2 || nameAr.length > 140)) {
    return { ok: false as const, error: "invalid" as const };
  }
  if (kind === "agency" && !vatNotRequired && !vatNumber) {
    return { ok: false as const, error: "vat" as const };
  }
  return {
    ok: true as const,
    value: {
      name,
      nameAr,
      kind: kind as "agency" | "individual",
      country: text(formData, "country").slice(0, 80),
      contactName: text(formData, "contactName").slice(0, 120),
      email: text(formData, "email").slice(0, 160),
      phone: text(formData, "phone").slice(0, 40),
      commercialRegistration:
        kind === "agency"
          ? text(formData, "commercialRegistration").slice(0, 40)
          : "",
      vatNumber,
      vatNotRequired: kind === "agency" ? vatNotRequired : false,
      groupId: kind === "agency" ? text(formData, "groupId") || null : null,
    },
  };
}

async function savePortal(formData: FormData, agencyId: string, kind: string) {
  return saveAgencyLogin({
    agencyId,
    kind,
    email: text(formData, "portalEmail"),
    password: String(formData.get("portalPassword") ?? ""),
  });
}

async function groupExists(id: string) {
  const groups = await listClientGroups();
  return groups.some((group) => group.id === id);
}

export async function createAgencyAction(formData: FormData) {
  await requireAdmin();
  const input = clientInput(formData);
  if (!input.ok) redirect(`/admin/agencies/new?error=${input.error}`);
  if (input.value.groupId && !(await groupExists(input.value.groupId))) {
    redirect("/admin/agencies/new?error=invalid");
  }
  const id = await createAgency(input.value);
  const portal = await savePortal(formData, id, input.value.kind);
  if (!portal.ok) {
    redirect(`/admin/agencies/${id}/access?error=${portal.error ?? "invalid"}`);
  }
  redirect(`/admin/agencies/${id}?saved=details`);
}

export async function updateAgencyAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const input = clientInput(formData);
  if (!input.ok || !(await getAgency(id))) {
    redirect(`/admin/agencies/${id}?error=${input.ok ? "invalid" : input.error}`);
  }
  if (input.value.groupId && !(await groupExists(input.value.groupId))) {
    redirect(`/admin/agencies/${id}?error=invalid`);
  }
  await updateAgency(id, input.value);
  redirect(`/admin/agencies/${id}?saved=details`);
}

export async function updateAgencyAccessAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const agency = await getAgency(id);
  if (!agency || agency.kind !== "agency") {
    redirect(`/admin/agencies/${id}?error=invalid`);
  }
  const portal = await savePortal(formData, id, agency.kind);
  if (!portal.ok) {
    redirect(`/admin/agencies/${id}/access?error=${portal.error ?? "invalid"}`);
  }
  redirect(`/admin/agencies/${id}/access?saved=access`);
}

export async function updateAgencySellingAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  if (!(await getAgency(id))) redirect(`/admin/agencies/${id}?error=invalid`);
  await updateAgencySelling(id, {
    stopSale: formData.get("stopSale") === "1",
    disabled: formData.get("disabled") === "1",
  });
  redirect(`/admin/agencies/${id}/selling?saved=selling`);
}

export async function updateAgencySupplierAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const saved = await setAgencySupplier(id, formData.get("isSupplier") === "1");
  redirect(
    saved
      ? `/admin/agencies/${id}/codes?saved=codes`
      : `/admin/agencies/${id}/codes?error=invalid`,
  );
}

export async function addSupplierCodeAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const saved = await addSupplierCode({
    agencyId: id,
    provider: text(formData, "provider"),
    externalCode: text(formData, "externalCode"),
  });
  redirect(
    saved
      ? `/admin/agencies/${id}/codes?saved=codes`
      : `/admin/agencies/${id}/codes?error=invalid`,
  );
}

export async function deleteSupplierCodeAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  await deleteSupplierCode(text(formData, "codeId"), id);
  redirect(`/admin/agencies/${id}/codes`);
}

export async function saveIdentityAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const upload = formData.get("identity");
  let file: { bytes: Buffer; contentType: string; filename: string } | null = null;
  if (upload instanceof File && upload.size > 0) {
    const checked = identityFile(upload);
    if (!checked.ok) redirect(`/admin/agencies/${id}/identity?error=invalid`);
    file = {
      bytes: Buffer.from(await upload.arrayBuffer()),
      contentType: checked.contentType,
      filename: checked.filename,
    };
  }
  const saved = await saveNationalId({
    agencyId: id,
    nationalId: text(formData, "nationalId"),
    file,
  });
  redirect(
    saved
      ? `/admin/agencies/${id}/identity?saved=identity`
      : `/admin/agencies/${id}/identity?error=invalid`,
  );
}

function agenciesBack(formData: FormData) {
  const params = new URLSearchParams();
  const kind = text(formData, "kind");
  const query = text(formData, "q");
  if (kind) params.set("kind", kind);
  if (query) params.set("q", query);
  const suffix = params.toString();
  return `/admin/agencies${suffix ? `?${suffix}` : ""}`;
}

export async function requestContactRevealAction(formData: FormData) {
  await requireAdmin();
  const admin = await currentAdmin();
  const back = agenciesBack(formData);
  if (!admin?.email) redirect(`${back}${back.includes("?") ? "&" : "?"}error=mail`);
  const sent = await requestContactReveal(admin.id, admin.email);
  const join = back.includes("?") ? "&" : "?";
  redirect(sent ? `${back}${join}sent=1` : `${back}${join}error=mail`);
}

export async function verifyContactRevealAction(formData: FormData) {
  await requireAdmin();
  const admin = await currentAdmin();
  const back = agenciesBack(formData);
  const join = back.includes("?") ? "&" : "?";
  if (!admin) redirect(`${back}${join}error=code`);
  const ok = await verifyContactReveal(admin.id, text(formData, "code"));
  redirect(ok ? `${back}${join}revealed=1` : `${back}${join}error=code`);
}

export async function saveCommercialAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id") || null;
  const percent = Number(text(formData, "percent"));
  const saved = await saveCommercial({
    id,
    name: text(formData, "name"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    country: text(formData, "country"),
    percent,
    disabled: formData.get("disabled") === "1",
  });
  const base = id ? `/admin/commercials/${id}` : "/admin/commercials/new";
  if (!saved.ok) redirect(`${base}?error=${saved.error}`);
  redirect(`/admin/commercials/${saved.id}?saved=1`);
}

export async function createClientGroupAction(formData: FormData) {
  await requireAdmin();
  const id = await createClientGroup(text(formData, "name"));
  redirect(id ? "/admin/client-groups?saved=1" : "/admin/client-groups?error=invalid");
}

export async function renameClientGroupAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const saved = await renameClientGroup(id, text(formData, "name"));
  redirect(saved ? "/admin/client-groups?saved=1" : "/admin/client-groups?error=invalid");
}

export async function deleteClientGroupAction(formData: FormData) {
  await requireAdmin();
  const saved = await deleteClientGroup(text(formData, "id"));
  redirect(saved ? "/admin/client-groups" : "/admin/client-groups?error=group");
}

export async function assignRoomAction(formData: FormData) {
  await requireAdmin();
  const roomId = text(formData, "roomId");
  redirect(`/admin/rooms/${roomId}?error=historical`);
}

function dateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function contractFlag(formData: FormData, key: string) {
  return formData.getAll(key).some((value) => String(value) === "on");
}

function optionalMoney(raw: string) {
  if (!raw) return null;
  const amount = parseMoney(raw);
  if (amount === null || amount < 0) return undefined;
  return amount;
}

async function hotelAssignment(hotelId: string) {
  const [rooms, meals, views] = await Promise.all([
    listHotelRoomLinks(),
    listHotelMealLinks(),
    listHotelViewLinks(),
  ]);
  return {
    rooms: new Set(
      rooms.filter((link) => link.hotelId === hotelId).map((link) => link.roomTypeId),
    ),
    meals: new Set(
      meals.filter((link) => link.hotelId === hotelId).map((link) => link.code),
    ),
    views: new Set(
      views.filter((link) => link.hotelId === hotelId).map((link) => link.name),
    ),
  };
}

function readComponentRates(formData: FormData, prefix: string, keys: string[]) {
  const rates: Record<
    string,
    {
      weekdayCost: number;
      weekendCost: number;
      weekdayPrice: number | null;
      weekendPrice: number | null;
    }
  > = {};
  for (const code of keys) {
    const weekdayParsed = optionalMoney(text(formData, `${prefix}.${code}.WeekdayCost`));
    const weekendParsed = optionalMoney(text(formData, `${prefix}.${code}.WeekendCost`));
    const weekdayRaw = text(formData, `${prefix}.${code}.WeekdayPrice`);
    const weekendRaw = text(formData, `${prefix}.${code}.WeekendPrice`);
    const weekdayPrice = weekdayRaw ? optionalMoney(weekdayRaw) : null;
    const weekendPrice = weekendRaw ? optionalMoney(weekendRaw) : null;
    if (
      weekdayParsed === undefined ||
      weekendParsed === undefined ||
      weekdayPrice === undefined ||
      weekendPrice === undefined ||
      (weekdayRaw && (weekdayPrice === null || weekdayPrice < 1)) ||
      (weekendRaw && (weekendPrice === null || weekendPrice < 1))
    ) {
      return null;
    }
    rates[code] = {
      weekdayCost: weekdayParsed ?? 0,
      weekendCost: weekendParsed ?? 0,
      weekdayPrice,
      weekendPrice,
    };
  }
  return rates;
}

async function contractDraft(formData: FormData, hotelId: string) {
  const [catalog, meals, knownViews] = await Promise.all([
    listRoomTypes(),
    listMealTypes(),
    allowedViewNames(),
  ]);
  const mealCodes = new Set(meals.map((meal) => meal.code));
  const byId = new Map(catalog.map((type) => [type.id, type]));
  const contractType = text(formData, "contractType");
  const supplierType = text(formData, "supplierType");
  const priority = Number(text(formData, "priority") || "1");
  const costRaw = text(formData, "contractCost");
  const contractCost = optionalMoney(costRaw);
  const checkIn = dateValue(text(formData, "checkIn"));
  const checkOut = dateValue(text(formData, "checkOut"));
  const mainMeal = mealPlanCode(text(formData, "mainMeal"));
  if (contractType !== "block" && contractType !== "request") return null;
  if (supplierType !== "hotel_direct" && supplierType !== "wholesaler") return null;
  const supplierAgencyId =
    supplierType === "wholesaler" ? text(formData, "supplierAgencyId") : "";
  if (supplierAgencyId) {
    const supplier = await getAgency(supplierAgencyId);
    if (!supplier || supplier.kind !== "agency" || !supplier.isSupplier) return null;
  }
  if (!Number.isInteger(priority) || priority < 1 || priority > 99) return null;
  if (contractCost === undefined) return null;
  if (!mainMeal || !mealCodes.has(mainMeal)) return null;
  const board = mainMeal;
  const assigned = await hotelAssignment(hotelId);
  if (!assigned.meals.has(mainMeal)) return null;

  const selectedMeals = [
    ...new Set(
      formData
        .getAll("mealCode")
        .map((value) => mealPlanCode(String(value)))
        .filter((code): code is NonNullable<typeof code> => Boolean(code)),
    ),
  ].filter((code) => mealCodes.has(code));
  if (selectedMeals.some((code) => !assigned.meals.has(code))) return null;
  const selectedViews = [
    ...new Set(
      formData
        .getAll("viewName")
        .map((value) => String(value).trim().slice(0, 80))
        .filter(Boolean),
    ),
  ];
  if (selectedViews.some((view) => !knownViews.has(view) || !assigned.views.has(view))) {
    return null;
  }
  const viewForLine = selectedViews.length === 1 ? selectedViews[0] : "";
  const saleMode = contractType === "request" ? "request" : "book";

  function roomLine(
    typeId: string,
    prefix: string,
    primary: boolean,
  ): PurchaseLineInput | null {
    const type = byId.get(typeId);
    if (!type) return null;
    const quantity = Number(text(formData, `${prefix}Quantity`));
    const weekdayParsed = optionalMoney(text(formData, `${prefix}WeekdayCost`));
    const weekendParsed = optionalMoney(text(formData, `${prefix}WeekendCost`));
    const weekdayRaw = text(formData, `${prefix}WeekdayPrice`);
    const weekendRaw = text(formData, `${prefix}WeekendPrice`);
    const weekdayPrice = weekdayRaw ? optionalMoney(weekdayRaw) : null;
    const weekendPrice = weekendRaw ? optionalMoney(weekendRaw) : null;
    if (
      weekdayParsed === undefined ||
      weekendParsed === undefined ||
      weekdayPrice === undefined ||
      weekendPrice === undefined ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 5000 ||
      (weekdayRaw && (weekdayPrice === null || weekdayPrice < 1)) ||
      (weekendRaw && (weekendPrice === null || weekendPrice < 1))
    ) {
      return null;
    }
    return {
      roomTypeId: type.id,
      roomName: text(formData, `${prefix}Name`).slice(0, 140) || type.name,
      description: "",
      capacity: type.guests,
      quantity,
      costPerNight: weekdayParsed ?? 0,
      publicPricePerNight: weekdayPrice,
      checkIn,
      checkOut,
      board,
      view: viewForLine,
      minNights: 1,
      saleMode,
      nameAr: text(formData, `${prefix}NameAr`).slice(0, 140),
      weekendCost: weekendParsed ?? 0,
      weekendPrice,
      primary,
    };
  }

  const lines: PurchaseLineInput[] = [];
  const primaryId = text(formData, "primaryRoomType");
  if (primaryId) {
    const primary = roomLine(primaryId, "primary", true);
    if (!primary) return null;
    lines.push(primary);
  }
  for (const value of formData.getAll("variableRoomType")) {
    const typeId = String(value);
    if (!typeId || typeId === primaryId) continue;
    const variable = roomLine(typeId, `variable_${typeId}_`, false);
    if (!variable) return null;
    lines.push(variable);
  }
  if (lines.some((line) => !line.roomTypeId || !assigned.rooms.has(line.roomTypeId))) {
    return null;
  }
  if (lines.length && (!checkIn || !checkOut)) return null;

  const mealRates = readComponentRates(formData, "mealRate", selectedMeals);
  const viewRates = readComponentRates(formData, "viewRate", selectedViews);
  if (!mealRates || !viewRates) return null;

  return {
    contractName: text(formData, "contractName").slice(0, 140),
    contractType: contractType as "block" | "request",
    contractCost,
    priority,
    supplierType: supplierType as "hotel_direct" | "wholesaler",
    supplierAgencyId: supplierAgencyId || null,
    contactHotel: contractFlag(formData, "contactHotel"),
    active: contractFlag(formData, "active"),
    mealCodes: [...new Set([board, ...selectedMeals])],
    mealRates,
    viewNames: selectedViews,
    viewRates,
    lines,
  };
}

function purchaseRedirect(id: string | null, hotelId: string, error?: string) {
  const base = id ? `/admin/purchases/${id}` : "/admin/purchases/new";
  if (!error) return base;
  const hotel = !id && hotelId ? `&hotel=${encodeURIComponent(hotelId)}` : "";
  return `${base}?error=${error}${hotel}`;
}

function purchaseTab(
  id: string,
  tab: "header" | "rooms" | "board" | "periods" | "rates" | "policies" | "photos" | "",
) {
  if (!tab || tab === "header") return `/admin/purchases/${id}`;
  return `/admin/purchases/${id}/${tab}`;
}

function storedLine(
  line: PurchaseLine,
  patch: Partial<PurchaseLineInput> = {},
): PurchaseLineInput {
  return {
    roomTypeId: line.roomTypeId ?? "",
    roomName: line.roomName,
    description: line.description,
    capacity: line.capacity,
    quantity: line.quantity,
    costPerNight: line.costPerNight,
    publicPricePerNight: line.publicPricePerNight,
    checkIn: line.checkIn,
    checkOut: line.checkOut,
    board: line.board,
    view: line.view,
    minNights: line.minNights,
    saleMode: line.saleMode,
    nameAr: line.nameAr,
    weekendCost: line.weekendCost,
    weekendPrice: line.weekendPrice,
    primary: line.primary,
    ...patch,
  };
}

async function readSectionLines(
  formData: FormData,
  stay: { checkIn: string; checkOut: string; board: PurchaseLineInput["board"]; saleMode: PurchaseLineInput["saleMode"]; hotelId: string },
  previous: PurchaseLine[],
) {
  const [catalog, assigned] = await Promise.all([
    listRoomTypes(),
    hotelAssignment(stay.hotelId),
  ]);
  if (!assigned.meals.has(stay.board)) return null;
  const byId = new Map(catalog.map((type) => [type.id, type]));
  const lines: PurchaseLineInput[] = [];

  function roomLine(typeId: string, prefix: string, primary: boolean) {
    const type = byId.get(typeId);
    if (!type || !assigned.rooms.has(type.id)) return null;
    const quantity = Number(text(formData, `${prefix}Quantity`));
    const weekdayParsed = optionalMoney(text(formData, `${prefix}WeekdayCost`));
    const weekendParsed = optionalMoney(text(formData, `${prefix}WeekendCost`));
    const weekdayRaw = text(formData, `${prefix}WeekdayPrice`);
    const weekendRaw = text(formData, `${prefix}WeekendPrice`);
    const weekdayPrice = weekdayRaw ? optionalMoney(weekdayRaw) : null;
    const weekendPrice = weekendRaw ? optionalMoney(weekendRaw) : null;
    if (
      weekdayParsed === undefined ||
      weekendParsed === undefined ||
      weekdayPrice === undefined ||
      weekendPrice === undefined ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 5000 ||
      (weekdayRaw && (weekdayPrice === null || weekdayPrice < 1)) ||
      (weekendRaw && (weekendPrice === null || weekendPrice < 1))
    ) {
      return null;
    }
    const earlier = previous.find((line) => line.roomTypeId === type.id && line.primary === primary);
    return {
      roomTypeId: type.id,
      roomName: text(formData, `${prefix}Name`).slice(0, 140) || type.name,
      description: earlier?.description ?? "",
      capacity: type.guests,
      quantity,
      costPerNight: weekdayParsed ?? 0,
      publicPricePerNight: weekdayPrice,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      board: stay.board,
      view: earlier?.view ?? "",
      minNights: earlier?.minNights ?? 1,
      saleMode: stay.saleMode,
      nameAr: text(formData, `${prefix}NameAr`).slice(0, 140),
      weekendCost: weekendParsed ?? 0,
      weekendPrice,
      primary,
    } satisfies PurchaseLineInput;
  }

  const primaryId = text(formData, "primaryRoomType");
  if (primaryId) {
    const primary = roomLine(primaryId, "primary", true);
    if (!primary) return null;
    lines.push(primary);
  }
  for (const value of formData.getAll("variableRoomType")) {
    const typeId = String(value);
    if (!typeId || typeId === primaryId) continue;
    const variable = roomLine(typeId, `variable_${typeId}_`, false);
    if (!variable) return null;
    lines.push(variable);
  }
  if (lines.length && (!stay.checkIn || !stay.checkOut)) return null;
  return lines;
}

async function mergePurchaseSection(
  existing: Purchase,
  formData: FormData,
  section: "header" | "rooms" | "board",
) {
  const draft = {
    hotelId: existing.hotelId,
    contractName: existing.contractName,
    contractType: existing.contractType,
    contractCost: existing.contractCost,
    priority: existing.priority,
    supplierType: existing.supplierType,
    supplierAgencyId: existing.supplierAgencyId,
    contactHotel: existing.contactHotel,
    active: existing.active,
    mealCodes: existing.mealCodes,
    mealRates: existing.mealRates,
    viewNames: existing.viewNames,
    viewRates: existing.viewRates,
    lines: existing.lines.map((line) => storedLine(line)),
  };

  if (section === "header") {
    const hotelId = text(formData, "hotelId");
    const contractType: ContractType =
      text(formData, "contractType") === "request" ? "request" : "block";
    const supplierType: SupplierType =
      text(formData, "supplierType") === "wholesaler" ? "wholesaler" : "hotel_direct";
    const priority = Number(text(formData, "priority") || "1");
    const contractCost = optionalMoney(text(formData, "contractCost"));
    const checkIn = dateValue(text(formData, "checkIn"));
    const checkOut = dateValue(text(formData, "checkOut"));
    const postedType = text(formData, "contractType");
    const postedSupplier = text(formData, "supplierType");
    if (postedType !== "block" && postedType !== "request") return null;
    if (postedSupplier !== "hotel_direct" && postedSupplier !== "wholesaler") return null;
    if (!Number.isInteger(priority) || priority < 1 || priority > 99) return null;
    if (contractCost === undefined || !checkIn || !checkOut) return null;
    if (!(await getHotel(hotelId))) return null;
    const supplierAgencyId =
      supplierType === "wholesaler" ? text(formData, "supplierAgencyId") : "";
    if (supplierAgencyId) {
      const supplier = await getAgency(supplierAgencyId);
      if (!supplier || supplier.kind !== "agency" || !supplier.isSupplier) return null;
    }
    const assigned = await hotelAssignment(hotelId);
    if (draft.lines.some((line) => line.roomTypeId && !assigned.rooms.has(line.roomTypeId))) {
      return null;
    }
    if (draft.lines.some((line) => !assigned.meals.has(line.board))) return null;
    const saleMode = contractType === "request" ? "request" as const : "book" as const;
    const mealCodes = draft.mealCodes.filter((code) => assigned.meals.has(code));
    const viewNames = draft.viewNames.filter((name) => assigned.views.has(name));
    return {
      ...draft,
      hotelId,
      contractName: text(formData, "contractName").slice(0, 140),
      contractType,
      contractCost,
      priority,
      supplierType,
      supplierAgencyId: supplierAgencyId || null,
      contactHotel: contractFlag(formData, "contactHotel"),
      active: contractFlag(formData, "active"),
      mealCodes,
      mealRates: Object.fromEntries(
        Object.entries(draft.mealRates).filter(([code]) => mealCodes.includes(code)),
      ),
      viewNames,
      viewRates: Object.fromEntries(
        Object.entries(draft.viewRates).filter(([name]) => viewNames.includes(name)),
      ),
      lines: draft.lines.map((line) => ({
        ...line,
        checkIn,
        checkOut,
        saleMode,
        view: viewNames.includes(line.view) ? line.view : "",
      })),
    };
  }

  if (section === "rooms") {
    const board = mealPlanCode(text(formData, "mainMeal"));
    if (!board) return null;
    const lines = await readSectionLines(
      formData,
      {
        checkIn: existing.checkIn,
        checkOut: existing.checkOut,
        board,
        saleMode: existing.contractType === "request" ? "request" : "book",
        hotelId: existing.hotelId,
      },
      existing.lines,
    );
    if (!lines) return null;
    return { ...draft, lines };
  }

  const [meals, knownViews, assigned] = await Promise.all([
    listMealTypes(),
    allowedViewNames(),
    hotelAssignment(existing.hotelId),
  ]);
  const mealCodes = new Set(meals.map((meal) => meal.code));
  const selectedMeals = [
    ...new Set(
      formData
        .getAll("mealCode")
        .map((value) => mealPlanCode(String(value)))
        .filter((code): code is NonNullable<typeof code> => Boolean(code)),
    ),
  ].filter((code) => mealCodes.has(code));
  const selectedViews = [
    ...new Set(
      formData
        .getAll("viewName")
        .map((value) => String(value).trim().slice(0, 80))
        .filter(Boolean),
    ),
  ];
  if (
    selectedMeals.some((code) => !assigned.meals.has(code)) ||
    selectedViews.some((view) => !knownViews.has(view) || !assigned.views.has(view))
  ) {
    return null;
  }
  const mealRates = readComponentRates(formData, "mealRate", selectedMeals);
  const viewRates = readComponentRates(formData, "viewRate", selectedViews);
  if (!mealRates || !viewRates) return null;
  const included = existing.lines.find((line) => line.primary)?.board ?? existing.lines[0]?.board;
  const view = selectedViews.length === 1 ? selectedViews[0] : "";
  return {
    ...draft,
    mealCodes: [...new Set([...(included ? [included] : []), ...selectedMeals])],
    mealRates,
    viewNames: selectedViews,
    viewRates,
    lines: draft.lines.map((line) => ({ ...line, view })),
  };
}

export async function savePurchaseAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id") || null;
  const hotelId = text(formData, "hotelId");
  const section = text(formData, "section");
  if (id && (section === "header" || section === "rooms" || section === "board")) {
    const existing = await getPurchase(id);
    const back = purchaseTab(id, section);
    if (!existing || existing.status === "cancelled") {
      redirect(`${back}?error=purchase`);
    }
    const merged = await mergePurchaseSection(existing, formData, section);
    if (!merged) redirect(`${back}?error=invalid`);
    const notes = formData.has("notes")
      ? text(formData, "notes").slice(0, 2000)
      : existing.notes;
    if (existing.status === "confirmed") {
      const revised = await reviseConfirmedPurchase(existing, { notes, ...merged });
      if (!revised.ok) redirect(`${back}?error=${revised.error}`);
      redirect(back);
    }
    const saved = await savePurchase({
      id,
      notes,
      ...merged,
    });
    if (!saved.ok) redirect(`${back}?error=${saved.error}`);
    const published = await confirmPurchase(saved.id);
    if (!published.ok) redirect(`${back}?error=${published.error}`);
    redirect(back);
  }
  const draft = await contractDraft(formData, hotelId);

  if (!draft) {
    redirect(purchaseRedirect(id, hotelId, "invalid"));
  }
  if (draft.lines.length === 0) {
    redirect(purchaseRedirect(id, hotelId, "lines"));
  }

  const saved = await savePurchase({
    id,
    hotelId,
    notes: text(formData, "notes").slice(0, 2000),
    ...draft,
  });
  if (!saved.ok) redirect(purchaseRedirect(id, hotelId, saved.error));

  const published = await confirmPurchase(saved.id);
  if (!published.ok) {
    redirect(purchaseRedirect(saved.id, hotelId, published.error));
  }
  redirect(`/admin/purchases/${saved.id}`);
}

export async function unarchivePurchaseAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const result = await unarchivePurchase(id);
  redirect(
    result.ok
      ? `/admin/purchases/${id}`
      : `/admin/purchases/${id}?error=${result.error}`,
  );
}

export async function cancelPurchaseAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const result = await cancelPurchase(id);
  redirect(
    result.ok
      ? `/admin/purchases/${id}`
      : `/admin/purchases/${id}?error=${result.error}`,
  );
}

export async function deleteSubmissionAction(formData: FormData) {
  await requireAdmin();
  await deleteSubmission(text(formData, "id"));
  redirect("/admin/allotments?channel=b2b");
}

export async function deleteBookingAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const removed = await deleteBooking(id);
  redirect(removed ? "/admin/allotments?channel=b2c" : `/admin/bookings/${id}`);
}

export async function deletePurchaseAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const purchase = await getPurchase(id);
  const removed = await deletePurchase(id);
  redirect(
    removed || !purchase
      ? "/admin/purchases"
      : `/admin/purchases/${id}?error=purchase`,
  );
}

function allotmentLineInputs(formData: FormData) {
  const source = text(formData, "saleSource") === "direct" ? "direct" : "contract";
  if (source === "direct") return null;
  const rooms = formData.getAll("lineRoom").map((value) => String(value).trim());
  const meals = formData.getAll("lineMeal").map((value) => String(value).trim());
  const views = formData.getAll("lineView").map((value) => String(value).trim());
  const quantities = formData.getAll("lineQuantity");
  const lines: AllotmentLineInput[] = [];

  for (let index = 0; index < rooms.length; index += 1) {
    const roomId = rooms[index] ?? "";
    if (!roomId) continue;
    const quantity = Number(quantities[index]);
    const mealCode = mealPlanCode(meals[index] ?? "") ?? "";
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5000) {
      return null;
    }
    lines.push({
      roomId: "",
      offerId: null,
      purchaseLineId: null,
      contractPeriodId: roomId,
      quantity,
      costPerNight: 0,
      agencyPricePerNight: 0,
      quote: true,
      mealCode,
      viewName: views[index] ?? "",
    });
  }
  return lines;
}

async function directAllotmentLines(formData: FormData) {
  const hotels = formData.getAll("directHotel").map((value) => String(value).trim());
  const rooms = formData.getAll("directRoom").map((value) => String(value).trim());
  const views = formData.getAll("directView").map((value) => String(value).trim());
  const meals = formData.getAll("directMeals").map((value) => String(value));
  const quantities = formData.getAll("directQuantity");
  const costs = formData.getAll("directCost");
  const prices = formData.getAll("directPrice");
  const [roomLinks, mealLinks, viewLinks, roomTypes] = await Promise.all([
    listHotelRoomLinks(),
    listHotelMealLinks(),
    listHotelViewLinks(),
    listRoomTypes(),
  ]);
  const lines: AllotmentLineInput[] = [];
  for (let index = 0; index < hotels.length; index += 1) {
    const hotelId = hotels[index] ?? "";
    const roomTypeId = rooms[index] ?? "";
    const costRaw = String(costs[index] ?? "").trim();
    const priceRaw = String(prices[index] ?? "").trim();
    if (!hotelId && !roomTypeId && !costRaw && !priceRaw) continue;
    const hotel = await getHotel(hotelId);
    const roomType = roomTypes.find((type) => type.id === roomTypeId);
    const quantity = Number(quantities[index]);
    const cost = parseMoney(costs[index] ?? null);
    const price = parseMoney(prices[index] ?? null);
    const mealCodes = (meals[index] ?? "")
      .split(",")
      .map((code) => mealPlanCode(code.trim()))
      .filter((code): code is NonNullable<typeof code> => Boolean(code));
    const viewName = views[index]?.trim().slice(0, 80) ?? "";
    const allowedRooms = new Set(
      roomLinks.filter((link) => link.hotelId === hotelId).map((link) => link.roomTypeId),
    );
    const allowedMeals = new Set(
      mealLinks.filter((link) => link.hotelId === hotelId).map((link) => link.code),
    );
    const allowedViews = new Set(
      viewLinks.filter((link) => link.hotelId === hotelId).map((link) => link.name),
    );
    if (
      !hotel ||
      !roomType ||
      !allowedRooms.has(roomTypeId) ||
      mealCodes.some((code) => !allowedMeals.has(code)) ||
      (allowedViews.size > 0 ? !allowedViews.has(viewName) : Boolean(viewName)) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 5000 ||
      cost === null ||
      price === null
    ) {
      return null;
    }
    lines.push({
      roomId: "",
      offerId: null,
      purchaseLineId: null,
      contractPeriodId: null,
      quantity,
      costPerNight: cost,
      agencyPricePerNight: price,
      amountBasis: "stay",
      boardSnapshot: mealCodes[0] ?? "room_only",
      viewSnapshot: viewName,
      directHotel: hotel.name,
      directRoom: roomType.name,
      rateSnapshot: {
        meals: mealCodes,
        hotelId,
        roomTypeId,
        view: { name: viewName, cost: 0, price: 0 },
      },
    });
  }
  return lines;
}

function allotmentRedirect(
  id: string | null,
  error?: string,
  remaining?: number,
) {
  const base = id ? `/admin/allotments/${id}` : "/admin/allotments/new";
  if (!error) return base;
  const extra =
    error === "quantity" && remaining !== undefined
      ? `&remaining=${remaining}`
      : "";
  return `${base}?error=${error}${extra}`;
}

export async function saveAllotmentAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id") || null;
  const intent = text(formData, "intent");
  const termsAccepted = formData.get("termsAccepted") === "on";
  const saleSource = text(formData, "saleSource") === "direct" ? "direct" : "contract";
  const lines =
    saleSource === "direct"
      ? await directAllotmentLines(formData)
      : allotmentLineInputs(formData);
  if (!lines) redirect(allotmentRedirect(id, "invalid"));
  if ((intent === "confirm" || intent === "hold") && lines.length === 0) {
    redirect(allotmentRedirect(id, "allotment-lines"));
  }
  const admin = await currentAdmin();

  const saved = await saveAllotment({
    id,
    agencyId: text(formData, "agencyId"),
    checkIn: dateValue(text(formData, "checkIn")),
    checkOut: dateValue(text(formData, "checkOut")),
    notes: text(formData, "notes").slice(0, 2000),
    termsAccepted,
    termsAcceptedBy: admin?.name ?? admin?.email ?? "",
    saleSource,
    commercialId: text(formData, "commercialId") || null,
    lines,
  });
  if (!saved.ok) redirect(allotmentRedirect(id, saved.error));

  if (intent === "hold" || intent === "confirm") {
    const allowOverbook = formData.get("useOverbook") === "on";
    const confirmed =
      intent === "hold"
        ? await holdAllotment(saved.id, allowOverbook)
        : await confirmAllotment(saved.id, allowOverbook);
    if (!confirmed.ok) {
      redirect(
        allotmentRedirect(
          saved.id,
          confirmed.error,
          "remaining" in confirmed ? confirmed.remaining : undefined,
        ),
      );
    }
  }
  redirect(`/admin/allotments/${saved.id}`);
}

export async function cancelAllotmentAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const penaltyRaw = text(formData, "penalty");
  const penalty = penaltyRaw ? parseMoney(penaltyRaw) : 0;
  if (penalty === null) redirect(detailsBack(id, "invalid"));
  const result = await cancelAllotment(id, penalty);
  if (!result.ok) redirect(detailsBack(id, result.error));
  await notifyIfAsked(formData, id, "client.cancel");
  redirect(detailsBack(id));
}

export async function cancelAllReservationAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const penaltyRaw = text(formData, "penalty");
  const penalty = penaltyRaw ? parseMoney(penaltyRaw) : 0;
  if (penalty === null) redirect(detailsBack(id, "invalid"));
  const result = await cancelAllReservation(id, { type: "admin" }, penalty);
  redirect(result.ok ? detailsBack(id) : detailsBack(id, result.error));
}

export async function confirmAllReservationAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const allotment = await getAllotment(id);
  if (!allotment) redirect(detailsBack(id, "allotment"));
  if (allotment.status === "request" || allotment.status === "provisional") {
    const confirmed = await confirmAllotment(id, formData.get("useOverbook") === "on");
    if (!confirmed.ok) {
      redirect(
        detailsBack(id, confirmed.error, "remaining" in confirmed ? confirmed.remaining : undefined),
      );
    }
  } else if (allotment.status !== "confirmed") {
    redirect(detailsBack(id, "allotment"));
  }
  const lined = await setAllReservationLines(id, "confirmed");
  redirect(lined.ok ? detailsBack(id) : detailsBack(id, lined.error));
}

export async function reservationNoShowAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const result = await noShowReservation(id, { type: "admin" });
  redirect(result.ok ? detailsBack(id) : detailsBack(id, result.error));
}

export async function unavailableReservationAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const result = await unavailableReservation(id, { type: "admin" });
  if (!result.ok) redirect(detailsBack(id, result.error));
  await notifyIfAsked(formData, id, "client.unavailable");
  redirect(detailsBack(id));
}

export async function setReservationRequestAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const result = await setReservationRequest(id, { type: "admin" });
  redirect(result.ok ? detailsBack(id) : detailsBack(id, result.error));
}

export async function bulkReservationAction(formData: FormData) {
  await requireAdmin();
  const ids = formData.getAll("ids").map((value) => String(value)).filter(Boolean);
  const verb = text(formData, "verb");
  const overbook = formData.get("useOverbook") === "on";
  if (!ids.length) redirect("/admin/allotments/actions?error=empty");
  let failed = 0;
  for (const id of ids) {
    let result: { ok: boolean } = { ok: false };
    if (verb === "confirm") result = await confirmAllotment(id, overbook);
    else if (verb === "confirm-all") {
      const current = await getAllotment(id);
      if (current && (current.status === "request" || current.status === "provisional")) {
        const confirmed = await confirmAllotment(id, overbook);
        if (!confirmed.ok) {
          failed += 1;
          continue;
        }
      }
      result = await setAllReservationLines(id, "confirmed");
    } else if (verb === "cancel") result = await cancelAllotment(id, 0);
    else if (verb === "cancel-all") result = await cancelAllReservation(id, { type: "admin" }, 0);
    else if (verb === "no-show") result = await noShowReservation(id, { type: "admin" });
    else if (verb === "unavailable") result = await unavailableReservation(id, { type: "admin" });
    else if (verb === "regret") result = await regretAllotment(id);
    if (!result.ok) failed += 1;
  }
  redirect(failed ? "/admin/allotments/actions?error=allotment" : "/admin/allotments/actions");
}

export async function deleteAllotmentAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const removed = await deleteAllotment(id);
  redirect(
    removed ? "/admin/allotments" : `/admin/allotments/${id}?error=allotment`,
  );
}

export async function reopenAllotmentAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const opened = await reopenAllotment(id);
  const remaining =
    "remaining" in opened && opened.remaining != null
      ? `&remaining=${opened.remaining}`
      : "";
  redirect(
    opened.ok
      ? detailsBack(id)
      : `${detailsBack(id, opened.error)}${remaining}`,
  );
}

export async function decideCancellationAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const decision = text(formData, "decision");
  const admin = await currentAdmin();
  if (decision !== "approved" && decision !== "denied") {
    redirect(`/admin/allotments/${id}?error=invalid`);
  }
  const result = await decideCancellation({
    allotmentId: id,
    decision,
    actorId: admin?.id,
    note: text(formData, "note"),
  });
  redirect(
    result.ok
      ? `/admin/allotments/${id}?decided=${decision}`
      : `/admin/allotments/${id}?error=${result.error}`,
  );
}

export async function setSubmissionStatusAction(id: string, status: string) {
  await requireAdmin();
  if (!submissionStatuses.includes(status as SubmissionStatus)) return;
  await setSubmissionStatus(id, status as SubmissionStatus);
}

export async function deleteAssignmentAction(formData: FormData) {
  await requireAdmin();
  await deleteAssignment(text(formData, "id"));
  const roomId = text(formData, "roomId");
  redirect(roomId ? `/admin/rooms/${roomId}` : "/admin/allotments");
}

export async function cancelBookingAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  await cancelBooking(id);
  const sale = await allotmentIdForBooking(id);
  redirect(sale ? `/admin/allotments/${sale}` : "/admin/allotments");
}

export async function saveRoomTypeAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id") || null;
  const guests = integer(formData, "guests");
  const childrenAllowed = formData.get("childrenAllowed") === "on";
  const ageText = text(formData, "maxChildAge");
  const maxChildAge = ageText === "" ? null : Number(ageText);
  const settings = text(formData, "returnTo") === "settings";
  const invalidRoomType =
    guests === null ||
    (childrenAllowed &&
      (maxChildAge === null ||
        !Number.isInteger(maxChildAge) ||
        maxChildAge < 0 ||
        maxChildAge > 17));
  if (invalidRoomType) {
    redirect(
      settings
        ? "/admin/settings?section=hotel&error=invalid"
        : id
          ? `/admin/room-types/${id}?error=invalid`
          : "/admin/settings?section=hotel&error=invalid",
    );
  }
  const saved = await saveRoomType({
    id,
    name: text(formData, "name"),
    guests,
    description: text(formData, "description"),
    childrenAllowed,
    maxChildAge,
  });
  if (!saved) {
    redirect(
      settings
        ? "/admin/settings?section=hotel&error=invalid"
        : id
          ? `/admin/room-types/${id}?error=invalid`
          : "/admin/settings?section=hotel&error=invalid",
    );
  }
  redirect(settings ? "/admin/settings?section=hotel&saved=hotel" : `/admin/room-types/${saved}`);
}

export async function saveHotelOfferingsAction(formData: FormData) {
  await requireAdmin();
  const hotelId = text(formData, "hotelId");
  const result = await saveHotelOfferings({
    hotelId,
    roomTypeIds: formData.getAll("roomTypeId").map((value) => String(value)),
    mealTypeIds: formData.getAll("mealTypeId").map((value) => String(value)),
    viewTypeIds: formData.getAll("viewTypeId").map((value) => String(value)),
  });
  redirect(
    result.ok
      ? `/admin/hotels/${hotelId}/offers?saved=offers`
      : `/admin/hotels/${hotelId}/offers?error=${result.error}`,
  );
}

export async function deleteRoomTypeAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const removed = await deleteRoomType(id);
  const settings = text(formData, "returnTo") === "settings";
  redirect(
    removed
      ? settings
        ? "/admin/settings?section=hotel&saved=hotel"
        : "/admin/settings?section=hotel"
      : settings
        ? "/admin/settings?section=hotel&error=room-type"
        : `/admin/room-types/${id}?error=room-type`,
  );
}

function catalogRedirect(result: { ok: true } | { ok: false; error: string }) {
  redirect(
    result.ok
      ? "/admin/settings?section=hotel&saved=hotel"
      : `/admin/settings?section=hotel&error=${result.error}`,
  );
}

export async function createMealTypeAction(formData: FormData) {
  await requireAdmin();
  catalogRedirect(await createMealType(text(formData, "name")));
}

export async function renameMealTypeAction(formData: FormData) {
  await requireAdmin();
  catalogRedirect(await renameMealType(text(formData, "id"), text(formData, "name")));
}

export async function deleteMealTypeAction(formData: FormData) {
  await requireAdmin();
  catalogRedirect(await deleteMealType(text(formData, "id")));
}

export async function createViewTypeAction(formData: FormData) {
  await requireAdmin();
  catalogRedirect(await createViewType(text(formData, "name")));
}

export async function renameViewTypeAction(formData: FormData) {
  await requireAdmin();
  catalogRedirect(await renameViewType(text(formData, "id"), text(formData, "name")));
}

export async function deleteViewTypeAction(formData: FormData) {
  await requireAdmin();
  catalogRedirect(await deleteViewType(text(formData, "id")));
}

export async function confirmHeldAllotmentAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const confirmed = await confirmAllotment(id, formData.get("useOverbook") === "on");
  redirect(
    confirmed.ok
      ? `/admin/allotments/${id}`
      : allotmentRedirect(
          id,
          confirmed.error,
          "remaining" in confirmed ? confirmed.remaining : undefined,
        ),
  );
}

export async function saveReservationHeaderAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id") || null;
  const saved = await saveReservationHeader({
    id,
    agencyId: text(formData, "agencyId"),
    hotelId: text(formData, "hotelId"),
    checkIn: dateValue(text(formData, "checkIn")),
    checkOut: dateValue(text(formData, "checkOut")),
    guestName: text(formData, "guestName"),
    notes: text(formData, "notes"),
    supplierReference: text(formData, "supplierReference"),
    supplierNotes: text(formData, "supplierNotes"),
    saleSource: text(formData, "saleSource") === "direct" ? "direct" : "contract",
    commercialId: text(formData, "commercialId") || null,
    payBefore: dateValue(text(formData, "payBefore")),
    payOnArrival: formData.get("payOnArrival") === "on",
  });
  if (!saved.ok) {
    redirect(id ? `/admin/allotments/${id}/details?error=${saved.error}` : allotmentRedirect(id, saved.error));
  }
  redirect(id ? `/admin/allotments/${saved.id}/details` : `/admin/allotments/${saved.id}/rooms`);
}

const noticeMailKinds = new Set<NoticeMailKind>([
  "client.confirmation",
  "client.cancel",
  "client.regret",
  "client.unavailable",
]);

function noticeKindOf(value: string): NoticeMailKind | null {
  return noticeMailKinds.has(value as NoticeMailKind) ? (value as NoticeMailKind) : null;
}

function policyIdsFrom(formData: FormData) {
  return formData.getAll("policyId").flatMap((value) => (typeof value === "string" ? [value] : []));
}

async function notifyIfAsked(formData: FormData, id: string, kind: NoticeMailKind) {
  if (formData.get("notify") !== "1") return;
  const mailed = await sendReservationNotice(id, kind, policyIdsFrom(formData), {
    to: text(formData, "mailTo"),
    cc: text(formData, "mailCc"),
    subject: text(formData, "mailSubject"),
    body: text(formData, "mailBody"),
  });
  if (!mailed.ok) redirect(detailsBack(id, mailed.error));
}

export async function previewReservationNoticeAction(input: {
  id: string;
  kind: string;
  policyIds: string[];
}) {
  await requireAdmin();
  const kind = noticeKindOf(input.kind);
  if (!kind || !input.id) return { ok: false as const, error: "invalid" };
  return composeReservationNotice(
    input.id,
    kind,
    Array.isArray(input.policyIds) ? input.policyIds : [],
  );
}

const hotelRoomMailKinds = new Set<HotelRoomMailKind>(["request", "amendment", "voucher"]);

function hotelRoomKind(value: string): HotelRoomMailKind | null {
  return hotelRoomMailKinds.has(value as HotelRoomMailKind) ? (value as HotelRoomMailKind) : null;
}

function roomsBack(id: string, error?: string) {
  return error ? `/admin/allotments/${id}/rooms?error=${error}` : `/admin/allotments/${id}/rooms`;
}

function hotelRoomPayload(source: { id: string; kind: string; lineIds: string[]; policyIds?: string[]; amendment?: string; rooming?: boolean }) {
  const kind = hotelRoomKind(source.kind);
  const lineIds = source.lineIds.map((id) => id.trim()).filter(Boolean).slice(0, 80);
  if (!kind || !source.id || !lineIds.length) return null;
  return {
    allotmentId: source.id,
    kind,
    lineIds,
    policyIds: Array.isArray(source.policyIds) ? source.policyIds : [],
    amendment: (source.amendment ?? "").slice(0, 2000),
    rooming: Boolean(source.rooming),
  };
}

export async function previewHotelRoomMailAction(input: {
  id: string;
  kind: string;
  lineIds: string[];
  policyIds: string[];
  amendment: string;
  rooming: boolean;
}) {
  await requireAdmin();
  const payload = hotelRoomPayload(input);
  if (!payload) return { ok: false as const, error: "invalid" };
  return composeHotelRoomNotice(payload);
}

async function markHotelRoomLines(id: string, lineIds: string[], kind: HotelRoomMailKind) {
  const next = kind === "amendment" ? "amended" : kind === "request" ? "waiting" : "";
  if (!next) return true;
  const allotment = await getAllotment(id);
  if (!allotment) return false;
  const wanted = new Set(lineIds);
  await transaction(async (sql) => {
    for (const line of allotment.lines) {
      if (!wanted.has(line.id)) continue;
      if (next === "waiting" && line.supplierStatus !== "new") continue;
      await sql.execute(
        `UPDATE allotment_lines SET supplier_status = ? WHERE id = ? AND allotment_id = ?`,
        [next, line.id, id],
      );
    }
  });
  return true;
}

export async function sendHotelRoomMailAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const payload = hotelRoomPayload({
    id,
    kind: text(formData, "kind"),
    lineIds: text(formData, "lines").split(","),
    policyIds: policyIdsFrom(formData),
    amendment: text(formData, "amendmentDetails"),
    rooming: formData.get("roomingList") === "on",
  });
  if (!payload) redirect(roomsBack(id, "invalid"));
  const marked = await markHotelRoomLines(payload.allotmentId, payload.lineIds, payload.kind);
  if (!marked) redirect(roomsBack(id, "allotment"));
  if (formData.get("notify") !== "1") redirect(roomsBack(id));
  const mailed = await sendHotelRoomNotice(payload, {
    to: text(formData, "mailTo"),
    cc: text(formData, "mailCc"),
    subject: text(formData, "mailSubject"),
    body: text(formData, "mailBody"),
  });
  if (!mailed.ok) redirect(roomsBack(id, mailed.error));
  const admin = await currentAdmin();
  await recordReservationCommunication({
    allotmentId: id,
    kind: "supplier_email",
    recipient: text(formData, "mailTo"),
    actorId: admin?.id,
  });
  redirect(roomsBack(id));
}

function detailsBack(id: string, error?: string, remaining?: number) {
  const base = `/admin/allotments/${id}/details`;
  if (!error) return base;
  const extra = error === "quantity" && remaining !== undefined ? `&remaining=${remaining}` : "";
  return `${base}?error=${error}${extra}`;
}

export async function holdReservationAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const held = await holdAllotment(id, formData.get("useOverbook") === "on");
  redirect(
    held.ok
      ? detailsBack(id)
      : detailsBack(id, held.error, "remaining" in held ? held.remaining : undefined),
  );
}

export async function confirmReservationAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const confirmed = await confirmAllotment(id, formData.get("useOverbook") === "on");
  if (!confirmed.ok) {
    redirect(
      detailsBack(id, confirmed.error, "remaining" in confirmed ? confirmed.remaining : undefined),
    );
  }
  await notifyIfAsked(formData, id, "client.confirmation");
  redirect(detailsBack(id));
}

export async function markReservationNoShowAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const allotment = await getAllotment(id);
  if (!allotment) redirect(detailsBack(id, "allotment"));
  for (const line of allotment.lines) {
    if (line.supplierStatus === "no_show" || line.supplierStatus === "cancelled") continue;
    const saved = await updateReservationLine({
      allotmentId: id,
      lineId: line.id,
      quantity: line.quantity,
      supplierStatus: "no_show",
    });
    if (!saved.ok) {
      redirect(detailsBack(id, saved.error, "remaining" in saved ? saved.remaining : undefined));
    }
  }
  redirect(detailsBack(id));
}

export async function returnToProvisionalAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const moved = await returnAllotmentToProvisional(id);
  redirect(
    moved.ok
      ? detailsBack(id)
      : detailsBack(id, moved.error, "remaining" in moved ? moved.remaining : undefined),
  );
}

export async function returnToRequestAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const moved = await returnAllotmentToRequest(id);
  redirect(moved.ok ? detailsBack(id) : detailsBack(id, moved.error));
}

export async function regretAllotmentAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const closed = await regretAllotment(id);
  if (!closed.ok) redirect(detailsBack(id, closed.error));
  await notifyIfAsked(formData, id, "client.regret");
  redirect(detailsBack(id));
}

export async function addReservationLineAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "allotmentId");
  const quantity = integer(formData, "quantity");
  if (!quantity) redirect(`/admin/allotments/${id}/rooms?error=quantity`);
  const saleSource = text(formData, "saleSource");
  let added;
  if (saleSource === "direct") {
    const allotment = await getAllotment(id);
    const hotel = allotment?.hotelId ? await getHotel(allotment.hotelId) : null;
    const [roomTypes, roomLinks, mealLinks, viewLinks] = await Promise.all([
      listRoomTypes(),
      listHotelRoomLinks(),
      listHotelMealLinks(),
      listHotelViewLinks(),
    ]);
    const roomType = roomTypes.find((type) => type.id === text(formData, "roomTypeId"));
    const costPerNight = parseMoney(formData.get("cost"));
    const pricePerNight = parseMoney(formData.get("price"));
    const mealCode = text(formData, "mealCode");
    const viewName = text(formData, "viewName");
    const hotelMeals = mealLinks.filter((link) => link.hotelId === hotel?.id);
    const hotelViews = viewLinks.filter((link) => link.hotelId === hotel?.id);
    const mealOk = hotelMeals.length === 0 || hotelMeals.some((link) => link.code === mealCode);
    const viewOk = hotelViews.length === 0 || hotelViews.some((link) => link.name === viewName);
    const roomOk = roomLinks.some(
      (link) => link.hotelId === hotel?.id && link.roomTypeId === roomType?.id,
    );
    if (
      !hotel ||
      !roomType ||
      !roomOk ||
      costPerNight === null ||
      pricePerNight === null ||
      !mealOk ||
      !viewOk
    ) {
      redirect(`/admin/allotments/${id}/rooms?error=invalid`);
    }
    added = await addReservationLine({
      allotmentId: id,
      quantity,
      direct: {
        roomTypeId: roomType.id,
        mealCode,
        viewName,
        costPerNight,
        pricePerNight,
        hotelName: hotel.name,
        roomName: roomType.name,
      },
    });
  } else {
    added = await addReservationLine({
          allotmentId: id,
          quantity,
          allowOverbook: formData.get("useOverbook") === "on",
          contractPeriodId: text(formData, "contractPeriodId") || null,
          roomTypeId: text(formData, "roomTypeId"),
          mealCode: text(formData, "mealCode"),
          viewName: text(formData, "viewName"),
        });
  }
  redirect(
    added.ok
      ? `/admin/allotments/${id}/rooms`
      : allotmentRedirect(
          `${id}/rooms`,
          added.error,
          "remaining" in added ? added.remaining : undefined,
        ),
  );
}

export async function updateReservationLineAction(formData: FormData) {
  await requireAdmin();
  const allotmentId = text(formData, "allotmentId");
  const quantity = integer(formData, "quantity");
  if (!quantity) redirect(`/admin/allotments/${allotmentId}/rooms?error=quantity`);
  const saved = await updateReservationLine({
    allotmentId,
    lineId: text(formData, "lineId"),
    quantity,
    supplierStatus: asLineSupplierStatus(text(formData, "supplierStatus")),
    allowOverbook: formData.get("useOverbook") === "on",
  });
  redirect(
    saved.ok
      ? `/admin/allotments/${allotmentId}/rooms`
      : `/admin/allotments/${allotmentId}/rooms?error=${saved.error}${"remaining" in saved && saved.remaining != null ? `&remaining=${saved.remaining}` : ""}`,
  );
}

export async function removeReservationLineAction(formData: FormData) {
  await requireAdmin();
  const allotmentId = text(formData, "allotmentId");
  const removed = await removeReservationLine(allotmentId, text(formData, "lineId"));
  redirect(
    removed.ok
      ? `/admin/allotments/${allotmentId}/rooms`
      : `/admin/allotments/${allotmentId}/rooms?error=${removed.error}`,
  );
}

export async function savePayTermsAction(formData: FormData) {
  await requireAdmin();
  const allotmentId = text(formData, "allotmentId");
  const lineIds = formData.getAll("lineId").map((value) => String(value));
  await savePayTerms({
    allotmentId,
    payBefore: dateValue(text(formData, "payBefore")),
    payOnArrival: formData.get("payOnArrival") === "on",
    lineDates: lineIds.map((id) => ({
      id,
      payBefore: dateValue(text(formData, `payBefore-${id}`)),
    })),
  });
  redirect(`/admin/allotments/${allotmentId}/payments`);
}

export async function addReservationPaymentAction(formData: FormData) {
  await requireAdmin();
  const allotmentId = text(formData, "allotmentId");
  const back = `/admin/allotments/${allotmentId}/payments`;
  const allotment = await getAllotment(allotmentId);
  if (!allotment) redirect(`${back}?error=allotment`);
  const amount = parseMoney(formData.get("amount"));
  const paidOn = dateValue(text(formData, "paidOn"));
  const method = text(formData, "method");
  const kind = text(formData, "kind") === "refund" ? "refund" : "payment";
  if (amount === null || !paidOn || !paymentMethods.includes(method as PaymentMethod)) {
    redirect(`${back}?error=invalid`);
  }
  const cardType = text(formData, "cardType");
  if (cardType && !cardTypes.includes(cardType as (typeof cardTypes)[number])) {
    redirect(`${back}?error=invalid`);
  }
  const totals = paymentTotals(allotment, await listReservationPayments(allotmentId));
  const saved = await addReservationPayment({
    allotmentId,
    kind,
    method: method as PaymentMethod,
    cardType,
    reference: text(formData, "reference"),
    amount,
    paidOn,
    chequeDate: dateValue(text(formData, "chequeDate")),
    note: text(formData, "note"),
    downPayment: kind === "payment" && formData.get("downPayment") === "on",
    due: totals.due,
    net: totals.net,
  });
  if (!saved.ok) redirect(`${back}?error=${saved.error}`);
  const admin = await currentAdmin();
  await transaction(async (sql) => {
    await appendReservationEvent(sql, {
      allotmentId,
      eventType: kind === "refund" ? "payment_refunded" : "payment_recorded",
      actorType: "admin",
      actorId: admin?.id,
      details: { amount },
    });
  });
  redirect(back);
}

export async function setPaymentPostedAction(formData: FormData) {
  await requireAdmin();
  const allotmentId = text(formData, "allotmentId");
  const saved = await setPaymentPosted(
    allotmentId,
    text(formData, "paymentId"),
    text(formData, "posted") === "1",
  );
  redirect(
    saved.ok
      ? `/admin/allotments/${allotmentId}/payments`
      : `/admin/allotments/${allotmentId}/payments?error=${saved.error}`,
  );
}

export async function deleteReservationPaymentAction(formData: FormData) {
  await requireAdmin();
  const allotmentId = text(formData, "allotmentId");
  const removed = await deleteReservationPayment(allotmentId, text(formData, "paymentId"));
  redirect(
    removed.ok
      ? `/admin/allotments/${allotmentId}/payments`
      : `/admin/allotments/${allotmentId}/payments?error=${removed.error}`,
  );
}

export async function saveContractRateAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  const price = parseMoney(formData.get("price"));
  const admin = await currentAdmin();
  const saved =
    price !== null &&
    (await saveContractRate({
      purchaseLineId: text(formData, "purchaseLineId"),
      agencyId: text(formData, "agencyId"),
      pricePerNight: price,
      actorId: admin?.id,
    }));
  redirect(
    saved
      ? purchaseTab(purchaseId, "periods")
      : `${purchaseTab(purchaseId, "periods")}?error=invalid`,
  );
}

export async function deleteContractRateAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  const admin = await currentAdmin();
  await deleteContractRate(text(formData, "id"), admin?.id);
  redirect(purchaseTab(purchaseId, "periods"));
}

export async function createContractPolicyAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  const releaseDays = integer(formData, "releaseDays");
  const admin = await currentAdmin();
  const saved =
    releaseDays !== null &&
    (await createContractPolicy({
      purchaseId,
      name: text(formData, "name"),
      generalTerms: text(formData, "generalTerms"),
      cancellationTerms: text(formData, "cancellationTerms"),
      paymentTerms: text(formData, "paymentTerms"),
      releaseDays,
      refundable: formData.get("refundable") === "on",
      actorId: admin?.id,
    }));
  redirect(
    saved
      ? purchaseTab(purchaseId, "policies")
      : `${purchaseTab(purchaseId, "policies")}?error=invalid`,
  );
}

export async function amendContractPeriodAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  const quantity = integer(formData, "quantity");
  const minNights = integer(formData, "minNights");
  const overbookLimit = integer(formData, "overbookLimit");
  const holdMinutes = integer(formData, "holdMinutes");
  const costPerNight = parseMoney(formData.get("cost"));
  const publicPrice = text(formData, "publicPrice")
    ? parseMoney(formData.get("publicPrice"))
    : null;
  const agencyPrice = text(formData, "agencyPrice")
    ? parseMoney(formData.get("agencyPrice"))
    : null;
  const saleMode = saleModeCode(text(formData, "saleMode"));
  const admin = await currentAdmin();
  const valid =
    quantity !== null &&
    minNights !== null &&
    overbookLimit !== null &&
    holdMinutes !== null &&
    costPerNight !== null;
  const result =
    valid && saleMode
      ? await amendContractPeriod({
          purchaseLineId: text(formData, "purchaseLineId"),
          policyId: text(formData, "policyId"),
          checkIn: dateValue(text(formData, "checkIn")),
          checkOut: dateValue(text(formData, "checkOut")),
          quantity,
          costPerNight,
          publicPricePerNight: publicPrice,
          defaultAgencyPricePerNight: agencyPrice,
          minNights,
          saleMode,
          stopSale: formData.get("stopSale") === "on",
          overbookLimit,
          holdMinutes,
          actorId: admin?.id,
        })
      : null;
  redirect(
    result?.ok
      ? purchaseTab(purchaseId, "periods")
      : `${purchaseTab(purchaseId, "periods")}?error=${result?.error ?? "invalid"}`,
  );
}

export async function saveContractPeriodRateAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  const price = parseMoney(formData.get("price"));
  const admin = await currentAdmin();
  const saved =
    price !== null &&
    (await saveContractPeriodRate({
      contractPeriodId: text(formData, "contractPeriodId"),
      agencyId: text(formData, "agencyId"),
      pricePerNight: price,
      actorId: admin?.id,
    }));
  redirect(
    saved
      ? purchaseTab(purchaseId, "periods")
      : `${purchaseTab(purchaseId, "periods")}?error=invalid`,
  );
}

export async function saveContractGroupRateAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  const price = parseMoney(formData.get("price"));
  const admin = await currentAdmin();
  const saved =
    price !== null &&
    (await saveContractGroupRate({
      contractPeriodId: text(formData, "contractPeriodId"),
      groupId: text(formData, "groupId"),
      pricePerNight: price,
      actorId: admin?.id,
    }));
  redirect(
    saved
      ? purchaseTab(purchaseId, "periods")
      : `${purchaseTab(purchaseId, "periods")}?error=invalid`,
  );
}

export async function deleteContractGroupRateAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  const admin = await currentAdmin();
  await deleteContractGroupRate(text(formData, "id"), admin?.id);
  redirect(purchaseTab(purchaseId, "periods"));
}

export async function deleteContractPeriodRateAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  const admin = await currentAdmin();
  await deleteContractPeriodRate(text(formData, "id"), admin?.id);
  redirect(purchaseTab(purchaseId, "periods"));
}

export async function setAdminLocaleAction(locale: string) {
  const next = locale === "fr" ? "fr" : "en";
  const store = await cookies();
  store.set("falco_admin_locale", next, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}

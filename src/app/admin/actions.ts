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
  accountDraft,
  createAdminUser,
  createFirstAdmin,
  deleteAdminUser,
  updateAdminUser,
} from "@/lib/admin-users";
import {
  addHotelPhoto,
  allotmentIdForBooking,
  addRoomPhoto,
  cities,
  createAgency,
  getAgency,
  updateAgency,
  createAssignment,
  createHotel,
  cancelPurchase,
  cancelAllotment,
  confirmAllotment,
  holdAllotment,
  markNoShow,
  saveContractRate,
  deleteContractRate,
  confirmPurchase,
  createRoom,
  deleteAllotment,
  reopenAllotment,
  deleteAssignment,
  deleteHotel,
  deleteHotelPhoto,
  deletePurchase,
  deleteRoom,
  deleteRoomPhoto,
  getHotel,
  getPurchase,
  getRoom,
  getRoomType,
  listRoomTypes,
  deleteRoomType,
  saveRoomType,
  roomHasPurchaseLines,
  saveAllotment,
  savePurchase,
  updateActivePurchaseCosts,
  updateHotel,
  saveRoomStay,
  updateRoom,
  type AllotmentLineInput,
  type City,
  type PurchaseLineInput,
} from "@/lib/inventory";
import { parseMoney } from "@/lib/money";
import {
  deleteSubmission,
  setSubmissionStatus,
  submissionStatuses,
  type SubmissionStatus,
} from "@/lib/submissions";
import { saveCompanyProfile } from "@/lib/company";
import { mealPlanCode, saleModeCode } from "@/lib/room-types";
import { selectedImages } from "@/lib/uploads";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function integer(formData: FormData, key: string) {
  const value = Number(text(formData, key));
  return Number.isInteger(value) ? value : null;
}

function hotelInput(formData: FormData) {
  const name = text(formData, "name");
  const city = text(formData, "city");
  const stars = integer(formData, "stars");
  if (name.length < 2 || name.length > 140) return null;
  if (!cities.includes(city as City) || stars === null) return null;
  if (stars < 1 || stars > 5) return null;

  return {
    name,
    city: city as City,
    address: text(formData, "address").slice(0, 240),
    description: text(formData, "description").slice(0, 2000),
    stars,
    distanceToHaram: text(formData, "distanceToHaram").slice(0, 120),
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
  });
  redirect(saved ? "/admin/settings?saved=company" : "/admin/settings?error=invalid");
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
  const input = hotelInput(formData);
  if (!input) redirect("/admin/hotels/new?error=invalid");

  const id = await createHotel(input);
  const photoError = await savePhotosSafely(formData, (file) =>
    addHotelPhoto(id, file),
  );
  redirect(`/admin/hotels/${id}${photoError ? "?error=photo" : ""}`);
}

export async function updateHotelAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const input = hotelInput(formData);
  if (!input || !(await getHotel(id))) redirect("/admin/hotels?error=invalid");

  await updateHotel(id, input);
  const photoError = await savePhotosSafely(formData, (file) =>
    addHotelPhoto(id, file),
  );
  redirect(`/admin/hotels/${id}${photoError ? "?error=photo" : ""}`);
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
  redirect(`/admin/hotels/${hotelId}`);
}

function publicPriceInput(formData: FormData) {
  const raw = text(formData, "publicPricePerNight");
  if (!raw) return null;
  const amount = parseMoney(raw);
  if (amount === null || amount < 1) return undefined;
  return amount;
}

function roomInput(formData: FormData) {
  const quantity = integer(formData, "quantity");
  const costPerNight = parseMoney(formData.get("costPerNight"));
  const publicPricePerNight = publicPriceInput(formData);
  if (quantity === null || quantity < 1 || quantity > 5000) return null;
  if (costPerNight === null || costPerNight < 0) return null;
  if (publicPricePerNight === undefined) return null;

  return {
    description: text(formData, "description").slice(0, 2000),
    quantity,
    costPerNight,
    publicPricePerNight,
  };
}

export async function createRoomAction(formData: FormData) {
  await requireAdmin();
  const hotelId = text(formData, "hotelId");
  const input = roomInput(formData);
  const type = await getRoomType(text(formData, "roomTypeId"));
  if (!input || !type || !(await getHotel(hotelId))) {
    redirect(`/admin/hotels/${hotelId}?error=invalid`);
  }

  const id = await createRoom({
    ...input,
    name: type.name,
    capacity: type.guests,
    roomTypeId: type.id,
    hotelId,
    checkIn: null,
    checkOut: null,
    offerId: null,
  });
  const photoError = await savePhotosSafely(formData, (file) =>
    addRoomPhoto(id, file),
  );
  redirect(`/admin/rooms/${id}${photoError ? "?error=photo" : ""}`);
}

export async function updateRoomAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const existing = await getRoom(id);
  if (!existing) redirect("/admin/hotels?error=invalid");

  const purchased = await roomHasPurchaseLines(id);
  const type = await getRoomType(text(formData, "roomTypeId"));
  if (!type) redirect(`/admin/rooms/${id}?error=invalid`);
  const name = type.name;
  const capacity = type.guests;

  const publicPricePerNight = publicPriceInput(formData);
  if (publicPricePerNight === undefined) {
    redirect(`/admin/rooms/${id}?error=invalid`);
  }

  const postedIn = text(formData, "checkIn");
  const postedOut = text(formData, "checkOut");
  const checkIn = dateValue(postedIn);
  const checkOut = dateValue(postedOut);
  if ((postedIn || postedOut || purchased) && (!checkIn || !checkOut)) {
    redirect(`/admin/rooms/${id}?error=dates`);
  }
  const costPerNight = purchased ? parseMoney(formData.get("costPerNight")) : null;
  if (purchased && (costPerNight === null || costPerNight < 0)) {
    redirect(`/admin/rooms/${id}?error=invalid`);
  }
  let stayIn = existing.checkIn;
  let stayOut = existing.checkOut;
  if (checkIn && checkOut) {
    const stay = await saveRoomStay(id, type.id, checkIn, checkOut);
    if (!stay.ok) redirect(`/admin/rooms/${id}?error=${stay.error}`);
    stayIn = checkIn;
    stayOut = checkOut;
  }

  if (purchased && costPerNight !== null) {
    await updateRoom(id, {
      roomTypeId: type.id,
      name,
      description: text(formData, "description").slice(0, 2000),
      capacity,
      quantity: existing.quantity,
      costPerNight,
      publicPricePerNight,
      checkIn: stayIn,
      checkOut: stayOut,
      offerId: existing.offerId,
    });
    if (costPerNight !== existing.costPerNight) {
      await updateActivePurchaseCosts(id, costPerNight);
    }
  } else {
    const input = roomInput(formData);
    if (!input) redirect(`/admin/rooms/${id}?error=invalid`);
    await updateRoom(id, {
      ...input,
      roomTypeId: type.id,
      name,
      capacity,
      checkIn: stayIn,
      checkOut: stayOut,
      offerId: existing.offerId,
    });
  }
  const photoError = await savePhotosSafely(formData, (file) =>
    addRoomPhoto(id, file),
  );
  redirect(`/admin/rooms/${id}${photoError ? "?error=photo" : ""}`);
}

export async function deleteRoomAction(formData: FormData) {
  await requireAdmin();
  const room = await getRoom(text(formData, "id"));
  if (!room) redirect("/admin/hotels");
  const removed = await deleteRoom(room.id);
  redirect(
    removed === true
      ? `/admin/hotels/${room.hotelId}`
      : `/admin/rooms/${room.id}?error=${removed || "invalid"}`,
  );
}

export async function deleteRoomPhotoAction(formData: FormData) {
  await requireAdmin();
  const roomId = text(formData, "roomId");
  await deleteRoomPhoto(text(formData, "photoId"));
  redirect(`/admin/rooms/${roomId}`);
}

function clientInput(formData: FormData) {
  const name = text(formData, "name");
  const kind = text(formData, "kind") === "individual" ? "individual" : "agency";
  if (name.length < 2 || name.length > 160) return null;
  return {
    name,
    kind: kind as "agency" | "individual",
    country: text(formData, "country").slice(0, 80),
    contactName: text(formData, "contactName").slice(0, 120),
    email: text(formData, "email").slice(0, 160),
    phone: text(formData, "phone").slice(0, 40),
    commercialRegistration:
      kind === "agency"
        ? text(formData, "commercialRegistration").slice(0, 40)
        : "",
    vatNumber: kind === "agency" ? text(formData, "vatNumber").slice(0, 40) : "",
  };
}

async function savePortal(formData: FormData, agencyId: string, kind: string) {
  const saved = await saveAgencyLogin({
    agencyId,
    kind,
    email: text(formData, "portalEmail"),
    password: String(formData.get("portalPassword") ?? ""),
  });
  return saved.ok;
}

export async function createAgencyAction(formData: FormData) {
  await requireAdmin();
  const input = clientInput(formData);
  if (!input) redirect("/admin/agencies/new?error=invalid");
  const id = await createAgency(input);
  if (!(await savePortal(formData, id, input.kind))) {
    redirect(`/admin/agencies/${id}?error=invalid`);
  }
  redirect(`/admin/agencies/${id}`);
}

export async function updateAgencyAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const input = clientInput(formData);
  if (!input || !(await getAgency(id))) {
    redirect(`/admin/agencies/${id}?error=invalid`);
  }
  await updateAgency(id, input);
  if (!(await savePortal(formData, id, input.kind))) {
    redirect(`/admin/agencies/${id}?error=invalid`);
  }
  redirect(`/admin/agencies/${id}`);
}

export async function assignRoomAction(formData: FormData) {
  await requireAdmin();
  const roomId = text(formData, "roomId");
  const costPerNight = parseMoney(formData.get("costPerNight"));
  const agencyPricePerNight = parseMoney(formData.get("agencyPricePerNight"));
  const quantity = integer(formData, "quantity");
  if (
    costPerNight === null ||
    agencyPricePerNight === null ||
    quantity === null
  ) {
    redirect(`/admin/rooms/${roomId}?error=invalid`);
  }

  const result = await createAssignment({
    roomId,
    agencyId: text(formData, "agencyId"),
    quantity,
    checkIn: text(formData, "checkIn"),
    checkOut: text(formData, "checkOut"),
    costPerNight,
    agencyPricePerNight,
    notes: text(formData, "notes").slice(0, 1000),
  });

  if (!result.ok) {
    const remaining =
      "remaining" in result ? `&remaining=${result.remaining}` : "";
    redirect(`/admin/rooms/${roomId}?error=${result.error}${remaining}`);
  }
  redirect(`/admin/rooms/${roomId}`);
}

function dateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

async function purchaseLineInputs(formData: FormData) {
  const catalog = await listRoomTypes();
  const byId = new Map(catalog.map((type) => [type.id, type]));
  const names = formData
    .getAll("lineRoomType")
    .map((value) => String(value).trim());
  const descriptions = formData
    .getAll("lineDescription")
    .map((value) => String(value).trim());
  const quantities = formData.getAll("lineQuantity");
  const checkIns = formData.getAll("lineCheckIn");
  const checkOuts = formData.getAll("lineCheckOut");
  const prices = formData.getAll("linePrice");
  const publicPrices = formData.getAll("linePublicPrice");
  const boards = formData.getAll("lineBoard");
  const views = formData.getAll("lineView");
  const minimums = formData.getAll("lineMinNights");
  const modes = formData.getAll("lineSaleMode");
  const lines: PurchaseLineInput[] = [];

  for (let index = 0; index < names.length; index += 1) {
    const type = byId.get(names[index] ?? "") ?? null;
    const price = String(prices[index] ?? "").trim();
    const publicRaw = String(publicPrices[index] ?? "").trim();
    const checkIn = dateValue(String(checkIns[index] ?? ""));
    const checkOut = dateValue(String(checkOuts[index] ?? ""));
    if (!type && !price && !publicRaw && !checkIn && !checkOut) continue;

    const quantity = Number(quantities[index]);
    const costPerNight = parseMoney(prices[index] ?? null);
    const publicPricePerNight = publicRaw ? parseMoney(publicRaw) : null;
    const board = mealPlanCode(String(boards[index] ?? ""));
    const saleMode = saleModeCode(String(modes[index] ?? "")) ?? "book";
    const minNights = Number(minimums[index] ?? 1);
    if (
      !type ||
      !board ||
      !Number.isInteger(minNights) ||
      minNights < 1 ||
      minNights > 120 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 5000 ||
      costPerNight === null ||
      costPerNight < 0 ||
      (publicRaw && (publicPricePerNight === null || publicPricePerNight < 1))
    ) {
      return null;
    }

    lines.push({
      roomTypeId: type.id,
      roomName: type.name,
      description: (descriptions[index] ?? "").slice(0, 500),
      capacity: type.guests,
      quantity,
      costPerNight,
      publicPricePerNight,
      checkIn,
      checkOut,
      board,
      view: String(views[index] ?? "").trim().slice(0, 80),
      minNights,
      saleMode,
    });
  }

  return lines;
}

function purchaseRedirect(id: string | null, hotelId: string, error?: string) {
  const base = id ? `/admin/purchases/${id}` : "/admin/purchases/new";
  if (!error) return base;
  const hotel = !id && hotelId ? `&hotel=${encodeURIComponent(hotelId)}` : "";
  return `${base}?error=${error}${hotel}`;
}

export async function savePurchaseAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id") || null;
  const hotelId = text(formData, "hotelId");
  const intent = text(formData, "intent");
  const lines = await purchaseLineInputs(formData);

  if (!lines) {
    redirect(purchaseRedirect(id, hotelId, "invalid"));
  }
  if (intent === "confirm" && lines.length === 0) {
    redirect(purchaseRedirect(id, hotelId, "lines"));
  }

  const saved = await savePurchase({
    id,
    hotelId,
    notes: text(formData, "notes").slice(0, 2000),
    lines,
  });
  if (!saved.ok) redirect(purchaseRedirect(id, hotelId, saved.error));

  if (intent === "confirm") {
    const confirmed = await confirmPurchase(saved.id);
    if (!confirmed.ok) {
      redirect(purchaseRedirect(saved.id, hotelId, confirmed.error));
    }
  }
  redirect(`/admin/purchases/${saved.id}`);
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
  const rooms = formData
    .getAll("lineRoom")
    .map((value) => String(value).trim());
  const quantities = formData.getAll("lineQuantity");
  const costs = formData.getAll("lineCost");
  const prices = formData.getAll("linePrice");
  const lines: AllotmentLineInput[] = [];

  for (let index = 0; index < rooms.length; index += 1) {
    const roomId = rooms[index] ?? "";
    const costRaw = String(costs[index] ?? "").trim();
    const priceRaw = String(prices[index] ?? "").trim();
    if (!roomId && !costRaw && !priceRaw) continue;

    const quantity = Number(quantities[index]);
    const costPerNight = parseMoney(costs[index] ?? null);
    const agencyPricePerNight = parseMoney(prices[index] ?? null);
    if (
      !roomId ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 5000 ||
      costPerNight === null ||
      agencyPricePerNight === null
    ) {
      return null;
    }

    lines.push({
      roomId: "",
      offerId: null,
      purchaseLineId: roomId,
      quantity,
      costPerNight,
      agencyPricePerNight,
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
  const lines = allotmentLineInputs(formData);
  if (!lines) redirect(allotmentRedirect(id, "invalid"));
  if ((intent === "confirm" || intent === "hold") && lines.length === 0) {
    redirect(allotmentRedirect(id, "allotment-lines"));
  }

  const saved = await saveAllotment({
    id,
    agencyId: text(formData, "agencyId"),
    checkIn: dateValue(text(formData, "checkIn")),
    checkOut: dateValue(text(formData, "checkOut")),
    notes: text(formData, "notes").slice(0, 2000),
    lines,
  });
  if (!saved.ok) redirect(allotmentRedirect(id, saved.error));

  if (intent === "hold" || intent === "confirm") {
    const confirmed =
      intent === "hold" ? await holdAllotment(saved.id) : await confirmAllotment(saved.id);
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
  const result = await cancelAllotment(id);
  redirect(
    result.ok
      ? `/admin/allotments/${id}`
      : `/admin/allotments/${id}?error=${result.error}`,
  );
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
  redirect(
    opened ? `/admin/allotments/${id}` : `/admin/allotments/${id}?error=allotment`,
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
  if (guests === null) {
    redirect(id ? `/admin/room-types/${id}?error=invalid` : "/admin/room-types/new?error=invalid");
  }
  const saved = await saveRoomType({
    id,
    name: text(formData, "name"),
    guests,
    description: text(formData, "description"),
  });
  if (!saved) {
    redirect(id ? `/admin/room-types/${id}?error=invalid` : "/admin/room-types/new?error=invalid");
  }
  redirect(`/admin/room-types/${saved}`);
}

export async function deleteRoomTypeAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const removed = await deleteRoomType(id);
  redirect(removed ? "/admin/room-types" : `/admin/room-types/${id}?error=room-type`);
}

export async function confirmHeldAllotmentAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const confirmed = await confirmAllotment(id);
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

export async function markNoShowAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const marked = await markNoShow(id);
  redirect(marked.ok ? `/admin/allotments/${id}` : `/admin/allotments/${id}?error=allotment`);
}

export async function saveContractRateAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  const price = parseMoney(formData.get("price"));
  const saved =
    price !== null &&
    (await saveContractRate({
      purchaseLineId: text(formData, "purchaseLineId"),
      agencyId: text(formData, "agencyId"),
      pricePerNight: price,
    }));
  redirect(
    saved
      ? `/admin/purchases/${purchaseId}`
      : `/admin/purchases/${purchaseId}?error=invalid`,
  );
}

export async function deleteContractRateAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  await deleteContractRate(text(formData, "id"));
  redirect(`/admin/purchases/${purchaseId}`);
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

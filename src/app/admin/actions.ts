"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  createAdminSession,
  requireAdmin,
} from "@/lib/admin-auth";
import {
  addHotelPhoto,
  addRoomPhoto,
  cities,
  createAgency,
  createAssignment,
  createHotel,
  cancelPurchase,
  cancelAllotment,
  confirmAllotment,
  confirmPurchase,
  createRoom,
  deleteAllotment,
  deleteAssignment,
  deleteHotel,
  deleteHotelPhoto,
  deletePurchase,
  deleteRoom,
  deleteRoomPhoto,
  getHotel,
  getPurchase,
  getRoom,
  roomHasPurchaseLines,
  saveAllotment,
  savePurchase,
  updateHotel,
  updateRoom,
  type AllotmentLineInput,
  type City,
  type PurchaseLineInput,
} from "@/lib/inventory";
import { parseMoney } from "@/lib/money";
import {
  setSubmissionStatus,
  submissionStatuses,
  type SubmissionStatus,
} from "@/lib/submissions";
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
  const accepted = await createAdminSession(text(formData, "password"));
  if (!accepted) redirect("/admin/login?error=invalid");
  redirect("/admin");
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
  redirect(`/admin/hotels?hotel=${hotelId}`);
}

function roomInput(formData: FormData) {
  const name = text(formData, "name");
  const capacity = integer(formData, "capacity");
  const quantity = integer(formData, "quantity");
  const costPerNight = parseMoney(formData.get("costPerNight"));
  if (name.length < 2 || capacity === null || quantity === null) return null;
  if (capacity < 1 || capacity > 20 || quantity < 1 || quantity > 5000)
    return null;
  if (costPerNight === null || costPerNight < 0) return null;

  return {
    name,
    description: text(formData, "description").slice(0, 2000),
    capacity,
    quantity,
    costPerNight,
  };
}

export async function createRoomAction(formData: FormData) {
  await requireAdmin();
  const hotelId = text(formData, "hotelId");
  const input = roomInput(formData);
  if (!input || !(await getHotel(hotelId))) {
    redirect(`/admin/hotels/${hotelId}?error=invalid`);
  }

  const id = await createRoom({ ...input, hotelId });
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
  const name = text(formData, "name");
  const capacity = integer(formData, "capacity");
  if (
    name.length < 2 ||
    name.length > 140 ||
    capacity === null ||
    capacity < 1 ||
    capacity > 20
  ) {
    redirect(`/admin/rooms/${id}?error=invalid`);
  }

  if (purchased) {
    await updateRoom(id, {
      name,
      description: text(formData, "description").slice(0, 2000),
      capacity,
      quantity: existing.quantity,
      costPerNight: existing.costPerNight,
    });
  } else {
    const input = roomInput(formData);
    if (!input) redirect(`/admin/rooms/${id}?error=invalid`);
    await updateRoom(id, input);
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
      : `/admin/rooms/${room.id}?error=${removed === "allotted" ? "allotted" : "purchased"}`,
  );
}

export async function deleteRoomPhotoAction(formData: FormData) {
  await requireAdmin();
  const roomId = text(formData, "roomId");
  await deleteRoomPhoto(text(formData, "photoId"));
  redirect(`/admin/rooms/${roomId}`);
}

export async function createAgencyAction(formData: FormData) {
  await requireAdmin();
  const name = text(formData, "name");
  if (name.length < 2) redirect("/admin/agencies?error=invalid");

  await createAgency({
    name,
    country: text(formData, "country").slice(0, 80),
    contactName: text(formData, "contactName").slice(0, 120),
    email: text(formData, "email").slice(0, 160),
    phone: text(formData, "phone").slice(0, 40),
  });
  redirect("/admin/agencies");
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

function purchaseLineInputs(formData: FormData) {
  const names = formData.getAll("lineName").map((value) => String(value).trim());
  const descriptions = formData.getAll("lineDescription").map((value) =>
    String(value).trim(),
  );
  const capacities = formData.getAll("lineCapacity");
  const checkIns = formData.getAll("lineCheckIn");
  const checkOuts = formData.getAll("lineCheckOut");
  const prices = formData.getAll("linePrice");
  const lines: PurchaseLineInput[] = [];

  for (let index = 0; index < names.length; index += 1) {
    const name = names[index] ?? "";
    const price = String(prices[index] ?? "").trim();
    const checkIn = dateValue(String(checkIns[index] ?? ""));
    const checkOut = dateValue(String(checkOuts[index] ?? ""));
    if (!name && !price && !checkIn && !checkOut) continue;

    const capacity = Number(capacities[index]);
    const costPerNight = parseMoney(prices[index] ?? null);
    if (
      name.length < 2 ||
      name.length > 140 ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 20 ||
      costPerNight === null ||
      costPerNight < 0
    ) {
      return null;
    }

    lines.push({
      roomName: name,
      description: (descriptions[index] ?? "").slice(0, 500),
      capacity,
      quantity: 1,
      costPerNight,
      checkIn,
      checkOut,
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
  const lines = purchaseLineInputs(formData);

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
    result.ok ? `/admin/purchases/${id}` : `/admin/purchases/${id}?error=${result.error}`,
  );
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
  const rooms = formData.getAll("lineRoom").map((value) => String(value).trim());
  const costs = formData.getAll("lineCost");
  const prices = formData.getAll("linePrice");
  const lines: AllotmentLineInput[] = [];

  for (let index = 0; index < rooms.length; index += 1) {
    const roomId = rooms[index] ?? "";
    const costRaw = String(costs[index] ?? "").trim();
    const priceRaw = String(prices[index] ?? "").trim();
    if (!roomId && !costRaw && !priceRaw) continue;

    const costPerNight = parseMoney(costs[index] ?? null);
    const agencyPricePerNight = parseMoney(prices[index] ?? null);
    if (!roomId || costPerNight === null || agencyPricePerNight === null) {
      return null;
    }

    lines.push({
      roomId,
      quantity: 1,
      costPerNight,
      agencyPricePerNight,
    });
  }

  return lines;
}

function allotmentRedirect(id: string | null, error?: string, remaining?: number) {
  const base = id ? `/admin/assignments/${id}` : "/admin/assignments/new";
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
  if (intent === "confirm" && lines.length === 0) {
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

  if (intent === "confirm") {
    const confirmed = await confirmAllotment(saved.id);
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
  redirect(`/admin/assignments/${saved.id}`);
}

export async function cancelAllotmentAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const result = await cancelAllotment(id);
  redirect(
    result.ok
      ? `/admin/assignments/${id}`
      : `/admin/assignments/${id}?error=${result.error}`,
  );
}

export async function deleteAllotmentAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const removed = await deleteAllotment(id);
  redirect(removed ? "/admin/assignments" : `/admin/assignments/${id}?error=allotment`);
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
  redirect(roomId ? `/admin/rooms/${roomId}` : "/admin/assignments");
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

"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { parseMoney } from "@/lib/money";
import { addServiceType, deleteDeskService, deleteServiceType, saveDeskService } from "@/lib/services";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function integer(formData: FormData, name: string) {
  const value = Number(text(formData, name));
  return Number.isInteger(value) ? value : null;
}

export async function addServiceTypeAction(formData: FormData) {
  await requireAdmin();
  const id = await addServiceType(text(formData, "name"));
  redirect(id ? "/admin/services/types?saved=type" : "/admin/services/types?error=invalid");
}

export async function deleteServiceTypeAction(formData: FormData) {
  await requireAdmin();
  const removed = await deleteServiceType(text(formData, "id"));
  redirect(removed ? "/admin/services/types?saved=type" : "/admin/services/types?error=invalid");
}

export async function saveDeskServiceAction(formData: FormData) {
  await requireAdmin();
  const id = text(formData, "id");
  const quantity = integer(formData, "quantity");
  const unitPrice = parseMoney(formData.get("unitPrice"));
  const unitCost = formData.has("unitCost") ? parseMoney(formData.get("unitCost")) : null;
  const saved =
    quantity !== null && unitPrice !== null && (unitCost !== null || !formData.has("unitCost"))
      ? await saveDeskService({
          id: id || undefined,
          typeId: text(formData, "typeId"),
          agencyId: text(formData, "agencyId"),
          hotelId: text(formData, "hotelId"),
          bookingNumber: text(formData, "bookingNumber"),
          serviceDate: text(formData, "serviceDate"),
          endDate: text(formData, "endDate"),
          quantity: quantity ?? 0,
          unitCost,
          unitPrice: unitPrice ?? 0,
          taxType: text(formData, "taxType") || "sales",
          guestName: text(formData, "guestName"),
          description: text(formData, "description"),
          internalNotes: text(formData, "internalNotes"),
          clientStatus: text(formData, "clientStatus"),
          paymentStatus: text(formData, "paymentStatus"),
          providerStatus: text(formData, "providerStatus"),
          allotmentId: formData.has("allotmentId") ? text(formData, "allotmentId") : undefined,
        })
      : null;
  const next = text(formData, "next");
  if (next.startsWith("/admin/allotments/")) {
    const back = next.split("?")[0];
    redirect(saved ? `${back}?saved=service` : `${back}?error=invalid${id ? `&edit=${id}` : "&new=1"}`);
  }
  if (saved) redirect(`/admin/services/${saved}?saved=service`);
  redirect(id ? `/admin/services/${id}?error=invalid` : "/admin/services/new?error=invalid");
}

export async function deleteDeskServiceAction(formData: FormData) {
  await requireAdmin();
  await deleteDeskService(text(formData, "id"), formData.has("allotmentId") ? text(formData, "allotmentId") : undefined);
  const next = text(formData, "next");
  const back = next.startsWith("/admin/allotments/") || next.startsWith("/admin/services")
    ? next.split("?")[0]
    : "/admin/services";
  redirect(`${back}?saved=service`);
}

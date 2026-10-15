"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  addPolicyTemplate,
  addReservationPolicy,
  addReservationPolicyFromTemplate,
  deletePolicyTemplate,
  deleteReservationPolicy,
  savePolicyTemplate,
  saveReservationPolicy,
} from "@/lib/policies";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

export async function addPolicyTemplateAction() {
  await requireAdmin();
  const locale = await getAdminLocale();
  const id = await addPolicyTemplate(locale === "fr" ? "Politique" : "Policy");
  redirect(id ? "/admin/settings?section=policies&saved=policy" : "/admin/settings?section=policies&error=invalid");
}

export async function savePolicyTemplateAction(formData: FormData) {
  await requireAdmin();
  const saved = await savePolicyTemplate(
    text(formData, "id"),
    text(formData, "name"),
    text(formData, "content"),
    text(formData, "contentAr"),
  );
  redirect(
    saved
      ? "/admin/settings?section=policies&saved=policy"
      : "/admin/settings?section=policies&error=invalid",
  );
}

export async function deletePolicyTemplateAction(formData: FormData) {
  await requireAdmin();
  await deletePolicyTemplate(text(formData, "id"));
  redirect("/admin/settings?section=policies&saved=policy");
}

function details(id: string, flag: "saved" | "error") {
  return flag === "saved"
    ? `/admin/allotments/${id}/details?saved=policy`
    : `/admin/allotments/${id}/details?error=invalid`;
}

export async function addReservationPolicyAction(formData: FormData) {
  await requireAdmin();
  const allotmentId = text(formData, "allotmentId");
  const locale = await getAdminLocale();
  const id = await addReservationPolicy(allotmentId, locale === "fr" ? "Politique" : "Policy");
  redirect(id ? details(allotmentId, "saved") : details(allotmentId, "error"));
}

export async function addReservationPolicyFromTemplateAction(formData: FormData) {
  await requireAdmin();
  const allotmentId = text(formData, "allotmentId");
  const id = await addReservationPolicyFromTemplate(allotmentId, text(formData, "templateId"));
  redirect(id ? details(allotmentId, "saved") : details(allotmentId, "error"));
}

export async function saveReservationPolicyAction(formData: FormData) {
  await requireAdmin();
  const allotmentId = text(formData, "allotmentId");
  const saved = await saveReservationPolicy(
    allotmentId,
    text(formData, "id"),
    text(formData, "name"),
    text(formData, "content"),
    text(formData, "contentAr"),
  );
  redirect(saved ? details(allotmentId, "saved") : details(allotmentId, "error"));
}

export async function deleteReservationPolicyAction(formData: FormData) {
  await requireAdmin();
  const allotmentId = text(formData, "allotmentId");
  await deleteReservationPolicy(allotmentId, text(formData, "id"));
  redirect(details(allotmentId, "saved"));
}

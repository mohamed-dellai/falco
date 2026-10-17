"use server";

import { redirect } from "next/navigation";
import { currentAdmin, requireAdmin } from "@/lib/admin-auth";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  assignContractPeriodPolicy,
  createContractPolicy,
  deleteContractPolicy,
  saveContractPolicyText,
} from "@/lib/contracts";
import {
  addPolicyTemplate,
  addReservationPolicy,
  addReservationPolicyFromTemplate,
  deletePolicyTemplate,
  deleteReservationPolicy,
  getPolicyTemplate,
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

function contractPolicies(id: string, flag: "saved" | "error") {
  return flag === "saved"
    ? `/admin/purchases/${id}/policies?saved=policy`
    : `/admin/purchases/${id}/policies?error=invalid`;
}

export async function addContractPolicyAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  const locale = await getAdminLocale();
  const admin = await currentAdmin();
  const id = await createContractPolicy({
    purchaseId,
    name: locale === "fr" ? "Politique" : "Policy",
    generalTerms: "",
    cancellationTerms: "",
    paymentTerms: "",
    releaseDays: 0,
    refundable: true,
    actorId: admin?.id,
  });
  redirect(id ? contractPolicies(purchaseId, "saved") : contractPolicies(purchaseId, "error"));
}

export async function addContractPolicyFromTemplateAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  const template = await getPolicyTemplate(text(formData, "templateId"));
  const admin = await currentAdmin();
  const id = template
    ? await createContractPolicy({
        purchaseId,
        name: template.name,
        generalTerms: template.content,
        cancellationTerms: "",
        paymentTerms: "",
        releaseDays: 0,
        refundable: true,
        contentAr: template.contentAr,
        actorId: admin?.id,
      })
    : null;
  redirect(id ? contractPolicies(purchaseId, "saved") : contractPolicies(purchaseId, "error"));
}

export async function saveContractPolicyAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  const saved = await saveContractPolicyText(
    purchaseId,
    text(formData, "id"),
    text(formData, "name"),
    text(formData, "content"),
    text(formData, "contentAr"),
  );
  redirect(saved ? contractPolicies(purchaseId, "saved") : contractPolicies(purchaseId, "error"));
}

export async function deleteContractPolicyAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  await deleteContractPolicy(purchaseId, text(formData, "id"));
  redirect(contractPolicies(purchaseId, "saved"));
}

export async function assignContractPeriodPolicyAction(formData: FormData) {
  await requireAdmin();
  const purchaseId = text(formData, "purchaseId");
  const saved = await assignContractPeriodPolicy(
    purchaseId,
    text(formData, "periodId"),
    text(formData, "policyId"),
  );
  redirect(saved ? contractPolicies(purchaseId, "saved") : contractPolicies(purchaseId, "error"));
}

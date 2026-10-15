"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  addMailTemplate,
  deleteMailTemplate,
  isMailTemplateKind,
  listMailTemplates,
  saveMailTemplate,
  setDefaultMailTemplate,
} from "@/lib/mail-templates";

function back(kind: string, extra?: string) {
  const query = new URLSearchParams({ kind });
  if (extra) {
    const [key, value] = extra.split("=");
    if (key && value) query.set(key, value);
  }
  return `/admin/allotments/mailing?${query.toString()}`;
}

export async function saveMailTemplateAction(formData: FormData) {
  await requireAdmin();
  const kind = String(formData.get("kind") ?? "");
  if (!isMailTemplateKind(kind)) redirect("/admin/allotments/mailing?error=invalid");
  const saved = await saveMailTemplate(String(formData.get("id") ?? ""), {
    name: String(formData.get("name") ?? ""),
    subjectEn: String(formData.get("subjectEn") ?? ""),
    bodyEn: String(formData.get("bodyEn") ?? ""),
    subjectAr: String(formData.get("subjectAr") ?? ""),
    bodyAr: String(formData.get("bodyAr") ?? ""),
  });
  redirect(back(kind, saved ? "saved=template" : "error=invalid"));
}

export async function addMailTemplateAction(formData: FormData) {
  await requireAdmin();
  const kind = String(formData.get("kind") ?? "");
  if (!isMailTemplateKind(kind)) redirect("/admin/allotments/mailing?error=invalid");
  const locale = await getAdminLocale();
  const existing = await listMailTemplates(kind);
  const name = locale === "fr" ? `Modèle ${existing.length + 1}` : `Template ${existing.length + 1}`;
  const id = await addMailTemplate(kind, name);
  redirect(back(kind, id ? `template=${id}` : "error=invalid"));
}

export async function setDefaultMailTemplateAction(formData: FormData) {
  await requireAdmin();
  const kind = String(formData.get("kind") ?? "");
  if (!isMailTemplateKind(kind)) redirect("/admin/allotments/mailing?error=invalid");
  const saved = await setDefaultMailTemplate(String(formData.get("id") ?? ""), kind);
  redirect(back(kind, saved ? "saved=template" : "error=invalid"));
}

export async function deleteMailTemplateAction(formData: FormData) {
  await requireAdmin();
  const kind = String(formData.get("kind") ?? "");
  if (!isMailTemplateKind(kind)) redirect("/admin/allotments/mailing?error=invalid");
  const result = await deleteMailTemplate(String(formData.get("id") ?? ""), kind);
  redirect(back(kind, result === "deleted" ? "saved=template" : "error=mail-template-last"));
}

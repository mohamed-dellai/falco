"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { createIssuedInvoice, updateIssuedInvoice } from "@/lib/invoices";
import { parseMoney } from "@/lib/money";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createInvoiceAction(formData: FormData) {
  await requireAdmin();
  const anchor = text(formData, "anchor");
  const stays = formData.getAll("stay").map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean);
  const ids = [...new Set([anchor, ...stays])];
  const result = await createIssuedInvoice(ids, formData.get("vatCharge") === "on");
  if (!result.ok) {
    redirect(`/admin/allotments/${anchor}/invoice?error=${result.error}`);
  }
  redirect(`/admin/accounting/invoices/${result.invoice.id}`);
}

export async function updateInvoiceAction(formData: FormData) {
  await requireAdmin();
  const invoiceId = text(formData, "invoiceId");
  const ids = formData.getAll("lineId").map((value) => (typeof value === "string" ? value.trim() : ""));
  const labels = formData.getAll("label").map((value) => (typeof value === "string" ? value : ""));
  const details = formData.getAll("detail").map((value) => (typeof value === "string" ? value : ""));
  const quantities = formData.getAll("quantity");
  const nets = formData.getAll("net");
  const vats = formData.getAll("vat");
  const back = `/admin/accounting/invoices/${invoiceId}/edit`;
  if (!ids.length || ids.some((id) => !id) || new Set([ids.length, labels.length, details.length, quantities.length, nets.length, vats.length]).size !== 1) {
    redirect(`${back}?error=invalid`);
  }
  const lines = ids.map((id, index) => {
    const quantity = Number(quantities[index]);
    const net = parseMoney(nets[index] ?? null);
    const vat = parseMoney(vats[index] ?? null);
    return {
      id,
      label: labels[index] ?? "",
      detail: details[index] ?? "",
      quantity,
      net: net ?? -1,
      vat: vat ?? -1,
    };
  });
  const saved = await updateIssuedInvoice(invoiceId, lines);
  if (!saved.ok) redirect(`${back}?error=invalid`);
  redirect(`/admin/accounting/invoices/${invoiceId}`);
}

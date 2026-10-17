"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { createIssuedInvoice } from "@/lib/invoices";

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

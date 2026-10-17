import { redirect } from "next/navigation";

export default function AccountingIndex() {
  redirect("/admin/accounting/invoices");
}

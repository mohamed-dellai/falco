import { cookies } from "next/headers";
import type { AdminLocale } from "@/lib/admin-copy";

export async function getAdminLocale(): Promise<AdminLocale> {
  const value = (await cookies()).get("falco_admin_locale")?.value;
  return value === "fr" ? "fr" : "en";
}

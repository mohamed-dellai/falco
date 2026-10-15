import { notFound } from "next/navigation";
import { currentAdmin } from "@/lib/admin-auth";
import { getCompanyLogo } from "@/lib/company";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) notFound();
  const logo = await getCompanyLogo();
  if (!logo) notFound();
  return new Response(new Uint8Array(logo.bytes), {
    headers: {
      "Content-Type": logo.type,
      "Cache-Control": "no-store",
    },
  });
}

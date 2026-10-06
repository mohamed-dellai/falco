import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  params.set("section", "accounts");
  if (query.q) params.set("q", query.q);
  if (query.error) params.set("error", query.error);
  redirect(`/admin/settings?${params.toString()}`);
}

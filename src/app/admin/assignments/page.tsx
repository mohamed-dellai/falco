import { redirect } from "next/navigation";

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  redirect(`/admin/allotments${params.size ? `?${params}` : ""}`);
}

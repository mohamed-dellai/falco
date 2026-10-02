import { redirect } from "next/navigation";

export default async function NewAllotmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; remaining?: string; room?: string }>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  redirect(`/admin/allotments/new${params.size ? `?${params}` : ""}`);
}

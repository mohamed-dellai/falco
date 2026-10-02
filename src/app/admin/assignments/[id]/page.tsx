import { redirect } from "next/navigation";

export default async function AllotmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; remaining?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const paramsString = new URLSearchParams(
    Object.entries(query).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  ).toString();
  redirect(`/admin/allotments/${id}${paramsString ? `?${paramsString}` : ""}`);
}

import { requireAdmin } from "@/lib/admin-auth";
import { PurchaseSelling } from "../selling";

export const dynamic = "force-dynamic";

export default async function PurchasePeriodsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  return <PurchaseSelling id={id} error={query.error} part="periods" />;
}

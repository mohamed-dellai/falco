import { AdminError } from "@/components/admin-shell";
import { PurchaseForm } from "@/components/purchase-form";
import { requireAdmin } from "@/lib/admin-auth";
import { loadPurchasePage } from "../load";

export const dynamic = "force-dynamic";

export default async function PurchaseBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const desk = await loadPurchasePage(id);

  return (
    <>
      <AdminError code={query.error} />
      <PurchaseForm
        part="board"
        hotels={desk.hotels}
        purchase={desk.purchase}
        roomTypes={desk.roomTypes}
        meals={desk.meals}
        views={desk.views.map((view) => view.name)}
        hotelRooms={desk.hotelRooms}
        hotelMeals={desk.hotelMeals}
        hotelViews={desk.hotelViews}
      />
    </>
  );
}

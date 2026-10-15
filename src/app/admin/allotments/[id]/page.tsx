import { notFound } from "next/navigation";
import { AdminError } from "@/components/admin-shell";
import { ReservationOperationsPanel } from "@/components/reservation-operations-panel";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAllotment } from "@/lib/inventory";
import { listReservationEvents } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export default async function AllotmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    remaining?: string;
    decided?: string;
  }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const { id } = await params;
  const query = await searchParams;
  const [allotment, events] = await Promise.all([
    getAllotment(id),
    listReservationEvents(id),
  ]);
  if (!allotment) notFound();

  return (
    <>
      <AdminError code={query.error} remaining={query.remaining} />
      <ReservationOperationsPanel
        allotment={allotment}
        events={events}
        locale={locale}
        notice={
          query.decided === "approved"
            ? "approved"
            : query.decided === "denied"
              ? "denied"
              : undefined
        }
      />
    </>
  );
}

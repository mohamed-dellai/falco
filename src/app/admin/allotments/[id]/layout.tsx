import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { ReservationFrame } from "@/components/reservation-frame";
import { ReservationSectionNav } from "@/components/reservation-section-nav";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAllotment } from "@/lib/inventory";
import { listReservationPayments, paymentTotals } from "@/lib/reservation-payments";

export const dynamic = "force-dynamic";

export default async function ReservationSectionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const [allotment, payments] = await Promise.all([
    getAllotment(id),
    listReservationPayments(id),
  ]);
  if (!allotment) notFound();
  const totals = paymentTotals(allotment, payments);

  return (
    <AdminShell
      title={allotment.number}
      crumbs={[{ href: "/admin/allotments", label: copy.allotments }]}
    >
      <ReservationFrame
        nav={
          <ReservationSectionNav
            allotmentId={allotment.id}
            copy={copy}
            paymentAttention={totals.due > 0}
          />
        }
      >
        {children}
      </ReservationFrame>
    </AdminShell>
  );
}

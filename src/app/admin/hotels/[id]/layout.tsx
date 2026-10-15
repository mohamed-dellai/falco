import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { adminButtonClass } from "@/components/admin-ui";
import { HotelSectionNav } from "@/components/hotel-section-nav";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getHotel } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function HotelSectionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const hotel = await getHotel(id);
  if (!hotel) notFound();
  const copy = adminCopy(await getAdminLocale());

  return (
    <AdminShell
      title={hotel.name}
      crumbs={[{ href: "/admin/hotels", label: copy.hotels }]}
      actions={
        <Link href={`/admin/purchases/new?hotel=${hotel.id}`} className={adminButtonClass}>
          {copy.newPurchase}
        </Link>
      }
    >
      <HotelSectionNav hotelId={hotel.id} copy={copy} />
      {children}
    </AdminShell>
  );
}

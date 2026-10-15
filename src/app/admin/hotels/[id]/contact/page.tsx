import { notFound } from "next/navigation";
import { updateHotelContactAction } from "@/app/admin/actions";
import { AdminError } from "@/components/admin-shell";
import {
  AdminField,
  AdminNotice,
  AdminPanel,
  adminButtonClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getHotel } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function HotelContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const { id } = await params;
  const query = await searchParams;
  const hotel = await getHotel(id);
  if (!hotel) notFound();

  return (
    <div className="grid max-w-3xl gap-4">
      <AdminError code={query.error} />
      {query.saved === "contact" && (
        <AdminNotice tone="success">{copy.contactSaved}</AdminNotice>
      )}
      <AdminPanel title={copy.supplierReservations}>
        <p className="mb-4 text-sm text-[var(--desk-muted)]">{copy.supplierReservationsHint}</p>
        <form action={updateHotelContactAction} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="id" value={hotel.id} />
          <AdminField label={copy.reservationEmail}>
            <input
              name="reservationEmail"
              type="email"
              defaultValue={hotel.reservationEmail}
              className={adminFieldClass}
            />
          </AdminField>
          <AdminField label={copy.reservationPhone}>
            <input
              name="reservationPhone"
              type="tel"
              defaultValue={hotel.reservationPhone}
              className={adminFieldClass}
            />
          </AdminField>
          <AdminField label={copy.reservationWhatsapp}>
            <input
              name="reservationWhatsapp"
              type="tel"
              defaultValue={hotel.reservationWhatsapp}
              className={adminFieldClass}
            />
          </AdminField>
          <div className="sm:col-span-3">
            <AdminSubmitButton pendingLabel={copy.saving} className={`${adminButtonClass} w-fit`}>
              {copy.saveContact}
            </AdminSubmitButton>
          </div>
        </form>
      </AdminPanel>
    </div>
  );
}

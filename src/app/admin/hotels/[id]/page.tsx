import { notFound } from "next/navigation";
import { deleteHotelAction, updateHotelAction } from "@/app/admin/actions";
import { HotelFields } from "@/app/admin/hotels/new/page";
import { AdminError } from "@/components/admin-shell";
import {
  AdminNotice,
  AdminPanel,
  adminButtonClass,
  adminButtonDangerClass,
} from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { NamedConfirm } from "@/components/named-confirm";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getHotel } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function HotelDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const { id } = await params;
  const query = await searchParams;
  const hotel = await getHotel(id);
  if (!hotel) notFound();

  return (
    <div className="grid max-w-3xl gap-4">
      <AdminError code={query.error} />
      {query.saved === "hotel" && <AdminNotice tone="success">{copy.hotelSaved}</AdminNotice>}
      <AdminPanel title={copy.hotelRecord}>
        <form action={updateHotelAction} className="grid gap-3">
          <input type="hidden" name="id" value={hotel.id} />
          <HotelFields hotel={hotel} copy={copy} locale={locale} />
          <AdminSubmitButton pendingLabel={copy.saving} className={`${adminButtonClass} w-fit`}>
            {copy.saveHotel}
          </AdminSubmitButton>
        </form>
      </AdminPanel>
      <NamedConfirm
        title={copy.deleteHotelTitle}
        body={fill(copy.deleteHotelBody, { hotel: hotel.name })}
        confirm={copy.deleteHotel}
        pendingLabel={copy.deleting}
        cancelLabel={copy.keepHotel}
        action={deleteHotelAction}
        fields={{ id: hotel.id }}
        trigger={copy.deleteHotel}
        triggerClassName={adminButtonDangerClass}
      />
    </div>
  );
}

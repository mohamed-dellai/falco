import { notFound } from "next/navigation";
import { updateHotelRulesAction } from "@/app/admin/actions";
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

export default async function HotelRulesPage({
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
    <div className="grid max-w-xl gap-4">
      <AdminError code={query.error} />
      {query.saved === "rules" && <AdminNotice tone="success">{copy.rulesSaved}</AdminNotice>}
      <AdminPanel title={copy.hotelSectionRules}>
        <form action={updateHotelRulesAction} className="grid gap-4">
          <input type="hidden" name="id" value={hotel.id} />
          <AdminField label={copy.minAdvanceDays} hint={copy.minAdvanceDaysHint}>
            <input
              name="minAdvanceDays"
              type="number"
              min={0}
              max={30}
              required
              defaultValue={hotel.minAdvanceDays}
              className={adminFieldClass}
            />
          </AdminField>
          <AdminField label={copy.cutoffTime} hint={copy.cutoffTimeHint}>
            <input
              name="cutoffTime"
              type="time"
              defaultValue={hotel.cutoffTime}
              className={adminFieldClass}
            />
          </AdminField>
          <label className="flex items-start gap-3 rounded-xl border border-[var(--desk-line)] px-4 py-3">
            <input
              type="checkbox"
              name="payOnArrival"
              value="1"
              defaultChecked={hotel.payOnArrival}
              className="mt-1 size-4"
            />
            <span>
              <span className="block text-sm font-semibold">{copy.payOnArrival}</span>
              <span className="mt-1 block text-sm text-[var(--desk-muted)]">
                {copy.payOnArrivalHint}
              </span>
            </span>
          </label>
          <AdminSubmitButton pendingLabel={copy.saving} className={`${adminButtonClass} w-fit`}>
            {copy.saveRules}
          </AdminSubmitButton>
        </form>
      </AdminPanel>
    </div>
  );
}

import { notFound } from "next/navigation";
import { updateHotelVisibilityAction } from "@/app/admin/actions";
import { AdminError } from "@/components/admin-shell";
import { AdminNotice, AdminPanel, adminButtonClass } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getHotel } from "@/lib/inventory";

export const dynamic = "force-dynamic";

function Switch({
  name,
  label,
  hint,
  checked,
}: {
  name: string;
  label: string;
  hint: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-[var(--desk-line)] px-4 py-3">
      <input
        type="checkbox"
        name={name}
        value="1"
        defaultChecked={checked}
        className="mt-1 size-4"
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-sm text-[var(--desk-muted)]">{hint}</span>
      </span>
    </label>
  );
}

export default async function HotelVisibilityPage({
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
      {query.saved === "visibility" && (
        <AdminNotice tone="success">{copy.visibilitySaved}</AdminNotice>
      )}
      <AdminPanel title={copy.hotelSectionVisibility}>
        <form action={updateHotelVisibilityAction} className="grid gap-3">
          <input type="hidden" name="id" value={hotel.id} />
          <Switch
            name="publishedWebsite"
            label={copy.publishedWebsite}
            hint={copy.publishedWebsiteHint}
            checked={hotel.publishedWebsite}
          />
          <Switch
            name="publishedDesk"
            label={copy.publishedDesk}
            hint={copy.publishedDeskHint}
            checked={hotel.publishedDesk}
          />
          <AdminSubmitButton pendingLabel={copy.saving} className={`${adminButtonClass} w-fit`}>
            {copy.saveVisibility}
          </AdminSubmitButton>
        </form>
      </AdminPanel>
    </div>
  );
}

import { AdminError, AdminShell } from "@/components/admin-shell";
import {
  AdminField,
  AdminPanel,
  adminButtonClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { createHotelAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, type AdminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { cities } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function NewHotelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const copy = adminCopy(await getAdminLocale());

  return (
    <AdminShell
      title={copy.addHotel}
      crumbs={[{ href: "/admin/hotels", label: copy.hotels }]}
    >
      <AdminError code={query.error} />
      <AdminPanel title={copy.hotelRecord} className="max-w-3xl">
        <form action={createHotelAction} className="grid gap-3">
          <HotelFields copy={copy} />
          <AdminField label={copy.photos} hint={copy.photoRule}>
            <input
              name="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="desk-focus block min-h-11 w-full rounded-xl border border-dashed border-[var(--desk-line-strong)] bg-[var(--desk-canvas)] px-3 py-2 text-sm file:me-3 file:rounded-lg file:border-0 file:bg-[var(--desk-ink)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
            />
          </AdminField>
          <AdminSubmitButton
            pendingLabel={copy.saving}
            className={`${adminButtonClass} w-fit`}
          >
            {copy.saveHotel}
          </AdminSubmitButton>
        </form>
      </AdminPanel>
    </AdminShell>
  );
}

export function HotelFields({
  hotel,
  copy,
}: {
  hotel?: {
    name: string;
    city: string;
    address: string;
    description: string;
    stars: number;
    distanceToHaram: string;
  };
  copy: AdminCopy;
}) {
  return (
    <>
      <AdminField label={copy.hotelName}>
        <input
          name="name"
          required
          defaultValue={hotel?.name}
          className={adminFieldClass}
        />
      </AdminField>
      <div className="grid gap-4 sm:grid-cols-3">
        <AdminField label={copy.city}>
          <select
            name="city"
            defaultValue={hotel?.city ?? "makkah"}
            className={adminFieldClass}
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {copy[city]}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label={copy.stars}>
          <input
            name="stars"
            type="number"
            min={1}
            max={5}
            required
            defaultValue={hotel?.stars ?? 4}
            className={adminFieldClass}
          />
        </AdminField>
        <AdminField label={copy.distanceHaram}>
          <input
            name="distanceToHaram"
            defaultValue={hotel?.distanceToHaram}
            className={adminFieldClass}
          />
        </AdminField>
      </div>
      <AdminField label={copy.address}>
        <input
          name="address"
          defaultValue={hotel?.address}
          className={adminFieldClass}
        />
      </AdminField>
      <AdminField label={copy.description}>
        <textarea
          name="description"
          defaultValue={hotel?.description}
          className={`${adminFieldClass} !h-auto min-h-28 py-2`}
        />
      </AdminField>
    </>
  );
}

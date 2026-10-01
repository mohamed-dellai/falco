import {
  AdminError,
  AdminPanel,
  AdminShell,
  adminButtonClass,
  adminFieldClass,
} from "@/components/admin-shell";
import { createHotelAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin-auth";
import { cities } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function NewHotelPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;

  return (
    <AdminShell title="Add hotel">
      <AdminError code={query.error} />
      <AdminPanel title="Hotel record" className="max-w-3xl">
        <form action={createHotelAction} className="grid gap-3">
          <HotelFields />
          <label className="grid gap-1 text-xs font-semibold text-[#334155]">
            Photos
            <input
              name="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className={adminFieldClass}
            />
          </label>
          <button type="submit" className={`${adminButtonClass} w-fit`}>
            Save hotel
          </button>
        </form>
      </AdminPanel>
    </AdminShell>
  );
}

export function HotelFields({
  hotel,
}: {
  hotel?: {
    name: string;
    city: string;
    address: string;
    description: string;
    stars: number;
    distanceToHaram: string;
  };
}) {
  return (
    <>
      <label className="grid gap-1 text-xs font-semibold text-[#334155]">
        Hotel name
        <input
          name="name"
          required
          defaultValue={hotel?.name}
          className={adminFieldClass}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1 text-xs font-semibold text-[#334155]">
          City
          <select
            name="city"
            defaultValue={hotel?.city ?? "makkah"}
            className={adminFieldClass}
          >
            {cities.map((city) => (
              <option key={city} value={city}>
                {city[0]!.toUpperCase() + city.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#334155]">
          Stars
          <input
            name="stars"
            type="number"
            min={1}
            max={5}
            required
            defaultValue={hotel?.stars ?? 4}
            className={adminFieldClass}
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[#334155]">
          Distance to the Haram
          <input
            name="distanceToHaram"
            defaultValue={hotel?.distanceToHaram}
            className={adminFieldClass}
          />
        </label>
      </div>
      <label className="grid gap-1 text-xs font-semibold text-[#334155]">
        Address
        <input
          name="address"
          defaultValue={hotel?.address}
          className={adminFieldClass}
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-[#334155]">
        Description
        <textarea
          name="description"
          defaultValue={hotel?.description}
          className={`${adminFieldClass} !h-auto min-h-28 py-2`}
        />
      </label>
    </>
  );
}

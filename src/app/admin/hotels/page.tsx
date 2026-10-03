import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { AdminError, AdminShell } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminSearchForm,
  AdminTableFrame,
  adminButtonClass,
} from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, countText, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listHotels, listRooms, roomHasPeriod } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function HotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ hotel?: string; error?: string; q?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  if (query.hotel) {
    const error = query.error ? `?error=${encodeURIComponent(query.error)}` : "";
    redirect(`/admin/hotels/${query.hotel}${error}`);
  }

  const allHotels = await listHotels();
  const rooms = await listRooms();
  const roomsByHotel = new Map<string, number>();
  for (const room of rooms) {
    if (!roomHasPeriod(room)) continue;
    roomsByHotel.set(room.hotelId, (roomsByHotel.get(room.hotelId) ?? 0) + 1);
  }
  const search = query.q?.trim().toLocaleLowerCase(locale) ?? "";
  const hotels = search
    ? allHotels.filter((hotel) =>
        [hotel.name, copy[hotel.city], hotel.address, hotel.distanceToHaram]
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(search),
      )
    : allHotels;

  return (
    <AdminShell
      title={copy.hotels}
      note={
        <span aria-live="polite" className="text-sm text-[var(--desk-muted)]">
          {countText(hotels.length, copy.hotelCountOne, copy.hotelCount)}
        </span>
      }
      actions={
        <Link href="/admin/hotels/new" className={adminButtonClass}>
          <Plus aria-hidden="true" size={16} />
          {copy.newHotel}
        </Link>
      }
    >
      <AdminError code={query.error} />
      <div className="mb-5">
        <AdminSearchForm
          action="/admin/hotels"
          label={copy.searchHotels}
          placeholder={copy.searchHotels}
          value={query.q}
        />
      </div>
      {hotels.length ? (
        <>
          <div className="grid gap-3 lg:hidden">
            {hotels.map((hotel) => {
              const roomCount = roomsByHotel.get(hotel.id) ?? 0;
              return (
                <Link
                  key={hotel.id}
                  href={`/admin/hotels/${hotel.id}`}
                  className="desk-focus rounded-2xl border border-[var(--desk-line)] bg-white p-4"
                >
                  <h2 className="font-semibold">{hotel.name}</h2>
                  <p className="mt-1 text-xs text-[var(--desk-muted)]">
                    {copy[hotel.city]} · {fill(copy.star, { count: hotel.stars })}
                    {hotel.distanceToHaram ? ` · ${hotel.distanceToHaram}` : ""}
                  </p>
                  <p className="mt-3 border-t border-[var(--desk-line)] pt-3 text-xs text-[var(--desk-muted)]">
                    {countText(
                      roomCount,
                      copy.listedRoomCountOne,
                      copy.listedRoomCount,
                    )}
                  </p>
                </Link>
              );
            })}
          </div>
          <div className="hidden lg:block">
            <AdminTableFrame>
              <table className="desk-table w-full border-collapse text-start text-sm">
                <thead className="bg-[var(--desk-canvas)]">
                  <tr>
                    <th className="px-4 py-3 text-start">{copy.hotel}</th>
                    <th className="px-4 py-3 text-start">{copy.city}</th>
                    <th className="px-4 py-3 text-end">{copy.stars}</th>
                    <th className="px-4 py-3 text-start">{copy.distanceHaram}</th>
                    <th className="px-4 py-3 text-end">{copy.rooms}</th>
                  </tr>
                </thead>
                <tbody>
                  {hotels.map((hotel) => (
                    <tr key={hotel.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/hotels/${hotel.id}`}
                          className="desk-focus rounded-sm font-semibold text-[var(--desk-primary)] hover:underline"
                        >
                          {hotel.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{copy[hotel.city]}</td>
                      <td className="px-4 py-3 text-end font-plex">
                        {hotel.stars}
                      </td>
                      <td className="px-4 py-3">
                        {hotel.distanceToHaram || "—"}
                      </td>
                      <td className="px-4 py-3 text-end font-plex">
                        {roomsByHotel.get(hotel.id) ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableFrame>
          </div>
        </>
      ) : (
        <AdminEmptyState
          title={
            search
              ? fill(copy.noMatches, {
                  query: query.q ?? "",
                  count: allHotels.length,
                })
              : copy.noHotels
          }
          action={
            !search ? (
              <Link href="/admin/hotels/new" className={adminButtonClass}>
                {copy.newHotel}
              </Link>
            ) : undefined
          }
        />
      )}
    </AdminShell>
  );
}

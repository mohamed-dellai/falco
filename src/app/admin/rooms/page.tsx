import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminSearchForm,
  AdminTableFrame,
} from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listHotels, listRooms } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const [rooms, hotels] = await Promise.all([listRooms(), listHotels()]);
  const hotelsById = new Map(hotels.map((hotel) => [hotel.id, hotel]));
  const search = query.q?.trim().toLocaleLowerCase(locale) ?? "";
  const rows = rooms
    .map((room) => {
      const hotel = hotelsById.get(room.hotelId);
      return {
        ...room,
        hotelName: hotel?.name ?? "—",
        city: hotel ? copy[hotel.city] : "",
      };
    })
    .filter((room) =>
      search
        ? [room.name, room.hotelName, room.city, room.description]
            .join(" ")
            .toLocaleLowerCase(locale)
            .includes(search)
        : true,
    )
    .sort((left, right) =>
      `${left.hotelName} ${left.name}`.localeCompare(
        `${right.hotelName} ${right.name}`,
        locale,
      ),
    );

  return (
    <AdminShell
      title={copy.rooms}
      note={
        <span aria-live="polite" className="text-sm text-[var(--desk-muted)]">
          {fill(copy.listedRoomCount, { count: rows.length })}
        </span>
      }
    >
      <div className="mb-5">
        <AdminSearchForm
          action="/admin/rooms"
          label={copy.searchRooms}
          placeholder={copy.searchRooms}
          value={query.q}
        />
      </div>
      {rows.length ? (
        <>
          <div className="grid gap-3 lg:hidden">
            {rows.map((room) => (
              <Link
                key={room.id}
                href={`/admin/rooms/${room.id}`}
                className="desk-focus rounded-2xl border border-[var(--desk-line)] bg-white p-4"
              >
                <p className="text-xs text-[var(--desk-muted)]">
                  {room.hotelName}
                  {room.city ? ` · ${room.city}` : ""}
                </p>
                <h2 className="mt-1 font-semibold">{room.name}</h2>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--desk-line)] pt-3 text-xs">
                  <span>
                    <span className="block text-[var(--desk-muted)]">
                      {copy.guests}
                    </span>
                    <strong className="font-plex">{room.capacity}</strong>
                  </span>
                  <span>
                    <span className="block text-[var(--desk-muted)]">
                      {copy.roomsHeld}
                    </span>
                    <strong className="font-plex">{room.quantity}</strong>
                  </span>
                  <span className="text-end">
                    <span className="block text-[var(--desk-muted)]">
                      {copy.costNight}
                    </span>
                    <strong className="font-plex">
                      {formatMoney(room.costPerNight, locale)}
                    </strong>
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="hidden lg:block">
            <AdminTableFrame>
              <table className="desk-table w-full border-collapse text-start text-sm">
                <thead className="bg-[var(--desk-canvas)]">
                  <tr>
                    <th className="px-4 py-3 text-start">{copy.roomType}</th>
                    <th className="px-4 py-3 text-start">{copy.hotel}</th>
                    <th className="px-4 py-3 text-end">{copy.guests}</th>
                    <th className="px-4 py-3 text-end">{copy.roomsHeld}</th>
                    <th className="px-4 py-3 text-end">{copy.costNight}</th>
                    <th className="px-4 py-3 text-end">
                      {copy.publicPriceNight}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((room) => (
                    <tr key={room.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/rooms/${room.id}`}
                          className="desk-focus rounded-sm font-semibold text-[var(--desk-primary)] hover:underline"
                        >
                          {room.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {room.hotelName}
                        {room.city && (
                          <span className="block text-xs text-[var(--desk-muted)]">
                            {room.city}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end font-plex">
                        {room.capacity}
                      </td>
                      <td className="px-4 py-3 text-end font-plex">
                        {room.quantity}
                      </td>
                      <td className="px-4 py-3 text-end font-plex">
                        {formatMoney(room.costPerNight, locale)}
                      </td>
                      <td className="px-4 py-3 text-end font-plex">
                        {room.publicPricePerNight == null
                          ? "—"
                          : formatMoney(room.publicPricePerNight, locale)}
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
                  count: rooms.length,
                })
              : copy.noRoomsYet
          }
        />
      )}
    </AdminShell>
  );
}

import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminError, AdminShell } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminSearchForm,
  AdminTableFrame,
  adminButtonClass,
  adminButtonSecondaryClass,
} from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { heldOn, listHotels, listRooms, openQuantity } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";

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
  const allHotels = await listHotels();
  const search = query.q?.trim().toLocaleLowerCase(locale) ?? "";
  const hotels = search
    ? allHotels.filter((hotel) =>
        [hotel.name, copy[hotel.city], hotel.address, hotel.distanceToHaram]
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(search),
      )
    : allHotels;
  const selected =
    hotels.find((hotel) => hotel.id === query.hotel) ?? hotels[0];
  const rooms = selected ? await listRooms(selected.id) : [];
  const roomCards = await Promise.all(
    rooms.map(async (room) => ({
      ...room,
      heldToday: await heldOn(room),
      openToday: await openQuantity(room),
    })),
  );

  return (
    <AdminShell
      title={copy.hotels}
      note={
        <p aria-live="polite" className="text-sm text-[var(--desk-muted)]">
          {fill(copy.hotelCount, { count: hotels.length })}
        </p>
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
      {hotels.length === 0 ? (
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
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[20rem_1fr]">
          <ul className="overflow-hidden rounded-xl border border-[var(--desk-line)] bg-white">
            {hotels.map((hotel) => {
              const active = hotel.id === selected?.id;
              return (
                <li
                  key={hotel.id}
                  data-search-item
                  className="border-b border-[var(--desk-line-soft)]"
                >
                  <Link
                    href={`/admin/hotels?hotel=${hotel.id}${query.q ? `&q=${encodeURIComponent(query.q)}` : ""}`}
                    className={`desk-focus block px-4 py-3 ${active ? "bg-[var(--desk-surface-muted)]" : "hover:bg-[var(--desk-canvas)]"}`}
                  >
                    <span className="block text-sm font-semibold">
                      {hotel.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--desk-muted)]">
                      {copy[hotel.city]} ·{" "}
                      {fill(copy.star, { count: hotel.stars })}
                      {hotel.distanceToHaram
                        ? ` · ${hotel.distanceToHaram}`
                        : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {selected && (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-news text-[28px] font-medium tracking-tight">
                    {selected.name}
                  </h2>
                  <p className="text-sm text-[var(--desk-muted)]">
                    {copy[selected.city]} ·{" "}
                    {fill(copy.star, { count: selected.stars })} ·{" "}
                    {fill(copy.roomTypeCount, { count: roomCards.length })}
                  </p>
                </div>
                <Link
                  href={`/admin/hotels/${selected.id}`}
                  className={adminButtonSecondaryClass}
                >
                  {copy.editDetails}
                </Link>
              </div>

              {roomCards.length ? (
                <>
                  <div className="grid gap-3 lg:hidden">
                    {roomCards.map((room) => (
                      <Link
                        key={room.id}
                        href={`/admin/rooms/${room.id}`}
                        className="desk-focus rounded-2xl border border-[var(--desk-line)] bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{room.name}</h3>
                            <p className="mt-1 text-xs text-[var(--desk-muted)]">
                              {copy.sleeps} {room.capacity}
                            </p>
                          </div>
                          <strong className="font-plex text-sm">
                            {formatMoney(room.costPerNight, locale)}
                          </strong>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--desk-line)] pt-3 text-sm">
                          <span className="text-[var(--desk-muted)]">
                            {copy.heldToday}{" "}
                            <strong className="font-plex text-[var(--desk-ink)]">
                              {room.heldToday}
                            </strong>
                          </span>
                          <span className="text-end text-[var(--desk-muted)]">
                            {copy.free}{" "}
                            <strong className="font-plex text-[var(--desk-ink)]">
                              {room.openToday}
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
                            <th className="px-4 py-3 text-start">
                              {copy.roomType}
                            </th>
                            <th className="px-4 py-3 text-end">
                              {copy.sleeps}
                            </th>
                            <th className="px-4 py-3 text-end">
                              {copy.heldToday}
                            </th>
                            <th className="px-4 py-3 text-end">{copy.free}</th>
                            <th className="px-4 py-3 text-end">
                              {copy.priceNight}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {roomCards.map((room) => (
                            <tr key={room.id}>
                              <td className="px-4 py-3">
                                <Link
                                  href={`/admin/rooms/${room.id}`}
                                  className="desk-focus rounded-sm font-medium text-[var(--desk-primary)] hover:underline"
                                >
                                  {room.name}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-end font-plex">
                                {room.capacity}
                              </td>
                              <td className="px-4 py-3 text-end font-plex">
                                {room.heldToday}
                              </td>
                              <td className="px-4 py-3 text-end font-plex">
                                {room.openToday}
                              </td>
                              <td className="px-4 py-3 text-end font-plex">
                                {formatMoney(room.costPerNight, locale)}
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
                  title={copy.roomsAfterPurchase}
                  action={
                    <Link
                      href={`/admin/purchases/new?hotel=${selected.id}`}
                      className={adminButtonClass}
                    >
                      {copy.newPurchase}
                    </Link>
                  }
                />
              )}
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}

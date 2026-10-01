import Link from "next/link";
import { deleteHotelPhotoAction } from "@/app/admin/actions";
import { AdminError, AdminShell, adminButtonClass } from "@/components/admin-shell";
import { PhotoUploader } from "@/components/photo-uploader";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  heldOn,
  listHotelPhotos,
  listHotels,
  listRooms,
  openQuantity,
} from "@/lib/inventory";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function HotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ hotel?: string; error?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const hotels = await listHotels();
  const selected = hotels.find((hotel) => hotel.id === query.hotel) ?? hotels[0];
  const [rooms, photos] = selected
    ? await Promise.all([listRooms(selected.id), listHotelPhotos(selected.id)])
    : [[], []];
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
      searchPlaceholder={copy.searchHotels}
      note={
        <p
          data-search-count
          data-search-total={String(hotels.length)}
          data-search-idle={fill(copy.hotelCount, { count: hotels.length })}
          className="text-sm text-[#5c6470]"
        >
          {fill(copy.hotelCount, { count: hotels.length })}
        </p>
      }
      actions={
        <Link href="/admin/hotels/new" className={adminButtonClass}>
          <i aria-hidden="true" className="ti ti-plus text-[15px]" />
          {copy.newHotel}
        </Link>
      }
    >
      <AdminError code={query.error} />
      {hotels.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#c5ced8] bg-white px-4 py-8 text-sm text-[#5c6470]">
          {copy.noHotels}{" "}
          <Link href="/admin/hotels/new" className="font-semibold text-[#0e4d8c]">
            {copy.newHotel}
          </Link>
        </p>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[20rem_1fr]">
          <ul className="overflow-hidden rounded-xl border border-[#dfe5ec] bg-white">
            {hotels.map((hotel) => {
              const active = hotel.id === selected?.id;
              return (
                <li key={hotel.id} data-search-item className="border-b border-[#eef0f3]">
                  <Link
                    href={`/admin/hotels?hotel=${hotel.id}`}
                    className={`block px-4 py-3 ${active ? "bg-[#fbf9f5]" : "hover:bg-[#fbf9f5]"}`}
                  >
                    <span className="block text-sm font-semibold">{hotel.name}</span>
                    <span className="mt-0.5 block text-xs text-[#5c6470]">
                      {copy[hotel.city]} · {fill(copy.star, { count: hotel.stars })}
                      {hotel.distanceToHaram ? ` · ${hotel.distanceToHaram}` : ""}
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
                  <p className="text-sm text-[#5c6470]">
                    {copy[selected.city]} · {fill(copy.star, { count: selected.stars })} ·{" "}
                    {fill(copy.roomTypeCount, { count: roomCards.length })}
                  </p>
                </div>
                <Link
                  href={`/admin/hotels/${selected.id}`}
                  className="text-sm font-semibold text-[#0e4d8c]"
                >
                  {copy.editDetails}
                </Link>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#dfe5ec] bg-white">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead className="bg-[#fbf9f5] text-[11px] font-semibold tracking-wide text-[#5c6470] uppercase">
                    <tr>
                      <th className="px-3 py-2">{copy.roomType}</th>
                      <th className="px-3 py-2 text-end">{copy.sleeps}</th>
                      <th className="px-3 py-2 text-end">{copy.heldToday}</th>
                      <th className="px-3 py-2 text-end">{copy.free}</th>
                      <th className="px-3 py-2 text-end">{copy.priceNight}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomCards.map((room) => (
                      <tr key={room.id} className="border-t border-[#eef0f3]">
                        <td className="px-3 py-2">
                          <Link
                            href={`/admin/rooms/${room.id}`}
                            className="font-medium text-[#0e4d8c] hover:underline"
                          >
                            {room.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-end font-plex">{room.capacity}</td>
                        <td className="px-3 py-2 text-end font-plex">{room.heldToday}</td>
                        <td className="px-3 py-2 text-end font-plex">{room.openToday}</td>
                        <td className="px-3 py-2 text-end font-plex">
                          {formatMoney(room.costPerNight, locale)}
                        </td>
                      </tr>
                    ))}
                    {roomCards.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-sm text-[#5c6470]">
                          {copy.roomsAfterPurchase}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <section className="rounded-xl border border-[#dfe5ec] bg-white p-4">
                <h3 className="text-sm font-semibold">
                  {fill(copy.photosAdded, { count: photos.length })}
                </h3>
                <p className="mt-1 text-xs text-[#5c6470]">{copy.photoRule}</p>
                {photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {photos.map((photo) => (
                      <figure
                        key={photo.id}
                        className="overflow-hidden rounded-lg border border-[#eef0f3]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt="" className="h-24 w-full object-cover" />
                        <form action={deleteHotelPhotoAction}>
                          <input type="hidden" name="hotelId" value={selected.id} />
                          <input type="hidden" name="photoId" value={photo.id} />
                          <button
                            type="submit"
                            className="w-full px-2 py-1.5 text-xs font-semibold text-[#9b1c1c]"
                          >
                            {copy.remove}
                          </button>
                        </form>
                      </figure>
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <PhotoUploader hotelId={selected.id} />
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteHotelAction,
  deleteHotelPhotoAction,
  updateHotelAction,
} from "@/app/admin/actions";
import { HotelFields } from "@/app/admin/hotels/new/page";
import {
  AdminError,
  AdminPanel,
  AdminShell,
  adminButtonClass,
  adminFieldClass,
} from "@/components/admin-shell";
import { PurchaseStatusPill } from "@/components/purchase-form";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getHotel,
  heldOn,
  listHotelPhotos,
  listPurchases,
  listRooms,
  openQuantity,
  purchaseAmount,
  purchasePeriod,
} from "@/lib/inventory";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function HotelAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const hotel = await getHotel(id);
  if (!hotel) notFound();

  const [photos, rooms, purchases] = await Promise.all([
    listHotelPhotos(id),
    listRooms(id),
    listPurchases({ hotelId: id }),
  ]);
  const roomCards = await Promise.all(
    rooms.map(async (room) => ({
      ...room,
      heldToday: await heldOn(room),
      openToday: await openQuantity(room),
    })),
  );

  return (
    <AdminShell
      title={hotel.name}
      crumbs={[{ href: "/admin/hotels", label: "Hotels" }]}
      actions={
        <Link
          href={`/admin/purchases/new?hotel=${hotel.id}`}
          className={adminButtonClass}
        >
          New purchase
        </Link>
      }
    >
      <AdminError code={query.error} />
      <div className="grid items-start gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminPanel title="Hotel record">
          <form action={updateHotelAction} className="grid gap-3">
            <input type="hidden" name="id" value={hotel.id} />
            <HotelFields hotel={hotel} />
            <label className="grid gap-1 text-xs font-semibold text-[#334155]">
              Add photos
              <input
                name="photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className={adminFieldClass}
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <button type="submit" className={adminButtonClass}>
                Save hotel
              </button>
            </div>
          </form>
        </AdminPanel>

        <AdminPanel title="Photos">
          {photos.length ? (
            <div className="grid grid-cols-2 gap-2">
              {photos.map((photo) => (
                <figure
                  key={photo.id}
                  className="overflow-hidden rounded border border-[#e6ebf0]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt=""
                    className="h-24 w-full object-cover"
                  />
                  <form action={deleteHotelPhotoAction}>
                    <input type="hidden" name="hotelId" value={hotel.id} />
                    <input type="hidden" name="photoId" value={photo.id} />
                    <button
                      type="submit"
                      className="w-full px-2 py-1.5 text-xs font-semibold text-red-700"
                    >
                      Remove
                    </button>
                  </form>
                </figure>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#5c6776]">No photos yet.</p>
          )}
          <form action={deleteHotelAction} className="mt-4 border-t border-[#e6ebf0] pt-3">
            <input type="hidden" name="id" value={hotel.id} />
            <button type="submit" className="text-xs font-semibold text-red-700">
              Delete hotel and its rooms
            </button>
          </form>
        </AdminPanel>
      </div>

      <h2 className="mt-6 mb-2 text-sm font-semibold">Rooms</h2>
      {roomCards.length ? (
        <div className="overflow-x-auto rounded border border-[#d5dbe3] bg-white">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-[#f4f7fa] text-[11px] font-semibold uppercase tracking-wide text-[#5c6776]">
              <tr>
                <th className="px-3 py-2">Room</th>
                <th className="px-3 py-2 text-end">Sleeps</th>
                <th className="px-3 py-2 text-end">Held today</th>
                <th className="px-3 py-2 text-end">Open today</th>
                <th className="px-3 py-2 text-end">Cost / night</th>
              </tr>
            </thead>
            <tbody>
              {roomCards.map((room) => (
                <tr key={room.id} data-search-item className="border-t border-[#e6ebf0]">
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/rooms/${room.id}`}
                      className="font-medium text-[#0e4d8c] hover:underline"
                    >
                      {room.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {room.capacity}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {room.heldToday}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {room.openToday}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {formatMoney(room.costPerNight, "en")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded border border-dashed border-[#c5ced8] bg-white px-4 py-6 text-sm text-[#5c6776]">
          Rooms appear here after a purchase is confirmed.
        </p>
      )}

      <h2 className="mt-6 mb-2 text-sm font-semibold">Purchases</h2>
      {purchases.length ? (
        <div className="overflow-x-auto rounded border border-[#d5dbe3] bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead className="bg-[#f4f7fa] text-[11px] font-semibold uppercase tracking-wide text-[#5c6776]">
              <tr>
                <th className="px-3 py-2">Number</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2 text-end">Total</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.id} data-search-item className="border-t border-[#e6ebf0]">
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/purchases/${purchase.id}`}
                      className="font-medium text-[#0e4d8c] hover:underline"
                    >
                      {purchase.number}
                    </Link>
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {purchasePeriod(purchase.lines)}
                  </td>
                  <td className="px-3 py-2 text-end tabular-nums">
                    {formatMoney(purchaseAmount(purchase), "en")}
                  </td>
                  <td className="px-3 py-2">
                    <PurchaseStatusPill status={purchase.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded border border-dashed border-[#c5ced8] bg-white px-4 py-6 text-sm text-[#5c6776]">
          No purchases for this hotel yet.
        </p>
      )}
    </AdminShell>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteRoomAction,
  deleteRoomPhotoAction,
  updateRoomAction,
} from "@/app/admin/actions";
import { AssignmentTable } from "@/components/assignment-table";
import {
  AdminError,
  AdminPanel,
  AdminShell,
  adminButtonClass,
  adminFieldClass,
} from "@/components/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import {
  costForStay,
  getHotel,
  getRoom,
  heldOn,
  listAssignments,
  listRoomPhotos,
  listRoomPurchases,
  openQuantity,
  roomHasPurchaseLines,
} from "@/lib/inventory";
import { formatMoney, moneyInput } from "@/lib/money";
import { PurchaseStatusPill } from "@/components/purchase-form";

export const dynamic = "force-dynamic";

export default async function RoomAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; remaining?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const room = await getRoom(id);
  if (!room) notFound();
  const hotel = await getHotel(room.hotelId);
  if (!hotel) notFound();

  const [photos, assignments, openToday, heldToday, stayCost, purchased, purchases] =
    await Promise.all([
      listRoomPhotos(id),
      listAssignments(),
      openQuantity(room),
      heldOn(room),
      costForStay(room),
      roomHasPurchaseLines(id),
      listRoomPurchases(id),
    ]);
  const roomAssignments = assignments.filter(
    (assignment) => assignment.roomId === room.id,
  );

  return (
    <AdminShell
      title={room.name}
      crumbs={[
        { href: "/admin/hotels", label: "Hotels" },
        { href: `/admin/hotels/${hotel.id}`, label: hotel.name },
      ]}
    >
      <div className="mb-4 grid gap-px overflow-hidden rounded border border-[#d5dbe3] bg-[#d5dbe3] sm:grid-cols-3">
        <Stat label="Open today" value={String(openToday)} />
        <Stat label="Held today" value={String(heldToday)} />
        <Stat label="Cost / night" value={formatMoney(stayCost, "en")} />
      </div>
      <AdminError code={query.error} remaining={query.remaining} />

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <AdminPanel title="Room record">
          <form action={updateRoomAction} className="grid gap-3">
            <input type="hidden" name="id" value={room.id} />
            <label className="grid gap-1 text-xs font-semibold text-[#334155]">
              Room name
              <input
                name="name"
                required
                defaultValue={room.name}
                className={adminFieldClass}
              />
            </label>
            <div className={`grid gap-3 ${purchased ? "" : "sm:grid-cols-3"}`}>
              <label className="grid gap-1 text-xs font-semibold text-[#334155]">
                Guests
                <input
                  name="capacity"
                  type="number"
                  min={1}
                  required
                  defaultValue={room.capacity}
                  className={adminFieldClass}
                />
              </label>
              {!purchased && (
                <>
                  <label className="grid gap-1 text-xs font-semibold text-[#334155]">
                    Rooms held
                    <input
                      name="quantity"
                      type="number"
                      min={1}
                      required
                      defaultValue={room.quantity}
                      className={adminFieldClass}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold text-[#334155]">
                    Cost / night (SAR)
                    <input
                      name="costPerNight"
                      required
                      defaultValue={moneyInput(room.costPerNight)}
                      className={adminFieldClass}
                    />
                  </label>
                </>
              )}
            </div>
            {purchased && (
              <p className="text-xs text-[#5c6776]">
                Quantity and cost come from confirmed purchases.
              </p>
            )}
            <label className="grid gap-1 text-xs font-semibold text-[#334155]">
              Description
              <textarea
                name="description"
                defaultValue={room.description}
                className={`${adminFieldClass} !h-auto min-h-20 py-2`}
              />
            </label>
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
            <button type="submit" className={`${adminButtonClass} w-fit`}>
              Save room
            </button>
          </form>
        </AdminPanel>

        <AdminPanel title="Allot this room">
          <p className="text-sm leading-6 text-[#5c6776]">
            Choose the agency, the stay, and the price. Save a draft or confirm
            the hold.
          </p>
          <Link
            href={`/admin/assignments/new?room=${room.id}`}
            className={`${adminButtonClass} mt-3`}
          >
            New allotment
          </Link>
        </AdminPanel>
      </div>

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-6">
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className="overflow-hidden rounded border border-[#d5dbe3] bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="h-20 w-full object-cover" />
              <form action={deleteRoomPhotoAction}>
                <input type="hidden" name="roomId" value={room.id} />
                <input type="hidden" name="photoId" value={photo.id} />
                <button
                  type="submit"
                  className="w-full px-2 py-1 text-xs font-semibold text-red-700"
                >
                  Remove
                </button>
              </form>
            </figure>
          ))}
        </div>
      )}

      {purchases.length > 0 && (
        <>
          <h2 className="mt-6 mb-2 text-sm font-semibold">Purchases</h2>
          <div className="overflow-x-auto rounded border border-[#d5dbe3] bg-white">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-[#f4f7fa] text-[11px] font-semibold uppercase tracking-wide text-[#5c6776]">
                <tr>
                  <th className="px-3 py-2">Number</th>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2 text-end">Cost / night</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.lineId} data-search-item className="border-t border-[#e6ebf0]">
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/purchases/${purchase.id}`}
                        className="font-medium text-[#0e4d8c] hover:underline"
                      >
                        {purchase.number}
                      </Link>
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {purchase.checkIn} → {purchase.checkOut}
                    </td>
                    <td className="px-3 py-2 text-end tabular-nums">
                      {formatMoney(purchase.costPerNight, "en")}
                    </td>
                    <td className="px-3 py-2">
                      <PurchaseStatusPill status={purchase.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="mt-6 mb-2 text-sm font-semibold">Allotments</h2>
      <AssignmentTable assignments={roomAssignments} allowRelease />

      <form action={deleteRoomAction} className="mt-4">
        <input type="hidden" name="id" value={room.id} />
        <button type="submit" className="text-xs font-semibold text-red-700">
          Delete room
        </button>
      </form>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="bg-white px-4 py-3">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#5c6776]">
        {label}
      </span>
      <strong className="mt-1 block text-lg font-semibold tabular-nums">
        {value}
      </strong>
    </article>
  );
}

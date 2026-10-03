import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteHotelAction,
  deleteHotelPhotoAction,
  updateHotelAction,
} from "@/app/admin/actions";
import { HotelFields } from "@/app/admin/hotels/new/page";
import { AdminError, AdminShell } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminPanel,
  AdminSectionHeader,
  AdminTableFrame,
  adminButtonClass,
  adminButtonDangerClass,
} from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { NamedConfirm } from "@/components/named-confirm";
import { PhotoUploader } from "@/components/photo-uploader";
import {
  DeleteCancelledPurchase,
  PurchaseStatusPill,
} from "@/components/purchase-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  getHotel,
  heldOn,
  listHotelPhotos,
  listPurchases,
  listRooms,
  purchaseAmount,
  roomHasPeriod,
  purchaseSpan,
} from "@/lib/inventory";
import { formatDateRange, formatMoney } from "@/lib/money";
import { roomTypeLabel } from "@/lib/room-types";

export const dynamic = "force-dynamic";

function displayPeriod(
  lines: Array<{ checkIn: string; checkOut: string }>,
  locale: "en" | "fr",
) {
  const period = purchaseSpan(lines);
  return period
    ? formatDateRange(period.checkIn, period.checkOut, locale)
    : "—";
}

export default async function HotelAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
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
    rooms.filter(roomHasPeriod).map(async (room) => ({
      ...room,
      heldToday: await heldOn(room),
    })),
  );

  return (
    <AdminShell
      title={hotel.name}
      crumbs={[{ href: "/admin/hotels", label: copy.hotels }]}
      actions={
        <Link
          href={`/admin/purchases/new?hotel=${hotel.id}`}
          className={adminButtonClass}
        >
          {copy.newPurchase}
        </Link>
      }
    >
      <AdminError code={query.error} />
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <AdminPanel title={copy.hotelRecord}>
          <form action={updateHotelAction} className="grid gap-3">
            <input type="hidden" name="id" value={hotel.id} />
            <HotelFields hotel={hotel} copy={copy} />
            <AdminSubmitButton
              pendingLabel={copy.saving}
              className={`${adminButtonClass} w-fit`}
            >
              {copy.saveHotel}
            </AdminSubmitButton>
          </form>
        </AdminPanel>

        <AdminPanel title={copy.photos}>
          <PhotoUploader hotelId={hotel.id} />
          {photos.length ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photos.map((photo, index) => (
                <figure
                  key={photo.id}
                  className="overflow-hidden rounded-xl border border-[var(--desk-line)] bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={fill(copy.photoAlt, {
                      record: hotel.name,
                      count: index + 1,
                    })}
                    className="h-24 w-full object-cover"
                  />
                  <div className="flex justify-center px-2 py-2">
                    <NamedConfirm
                      title={copy.removePhotoTitle}
                      body={fill(copy.removePhotoBody, { record: hotel.name })}
                      confirm={copy.removePhotoConfirm}
                      pendingLabel={copy.removing}
                      cancelLabel={copy.keepPhoto}
                      action={deleteHotelPhotoAction}
                      fields={{ hotelId: hotel.id, photoId: photo.id }}
                      trigger={copy.remove}
                    />
                  </div>
                </figure>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--desk-muted)]">
              {copy.noPhotos}
            </p>
          )}
        </AdminPanel>
      </div>

      <div className="mt-6">
        <AdminSectionHeader title={copy.roomsForHotel} />
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
                <h2 className="font-semibold">
                  {roomTypeLabel(room.name, (type) => copy[type])}
                </h2>
                <p className="mt-1 font-plex text-xs text-[var(--desk-muted)]">
                  {formatDateRange(room.checkIn, room.checkOut, locale)}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--desk-line)] pt-3 text-xs">
                  <span>
                    <span className="block text-[var(--desk-muted)]">
                      {copy.guests}
                    </span>
                    <strong className="font-plex">{room.capacity}</strong>
                  </span>
                  <span>
                    <span className="block text-[var(--desk-muted)]">
                      {copy.heldToday}
                    </span>
                    <strong className="font-plex">{room.heldToday}</strong>
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
                    <th className="px-4 py-3 text-start">{copy.period}</th>
                    <th className="px-4 py-3 text-end">{copy.guests}</th>
                    <th className="px-4 py-3 text-end">{copy.heldToday}</th>
                    <th className="px-4 py-3 text-end">{copy.costNight}</th>
                    <th className="px-4 py-3 text-end">
                      {copy.publicPriceNight}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roomCards.map((room) => (
                    <tr key={room.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/rooms/${room.id}`}
                          className="desk-focus rounded-sm font-semibold text-[var(--desk-primary)] hover:underline"
                        >
                          {roomTypeLabel(room.name, (type) => copy[type])}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-plex text-xs">
                        {formatDateRange(room.checkIn, room.checkOut, locale)}
                      </td>
                      <td className="px-4 py-3 text-end font-plex">
                        {room.capacity}
                      </td>
                      <td className="px-4 py-3 text-end font-plex">
                        {room.heldToday}
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
        <AdminEmptyState title={copy.roomsAfterPurchase} />
      )}

      <div className="mt-6">
        <AdminSectionHeader title={copy.purchasesForHotel} />
      </div>
      {purchases.length ? (
        <>
          <div className="grid gap-3 lg:hidden">
            {purchases.map((purchase) => (
              <article
                key={purchase.id}
                className="rounded-2xl border border-[var(--desk-line)] bg-white"
              >
                <Link
                  href={`/admin/purchases/${purchase.id}`}
                  className="desk-focus block p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-plex text-xs text-[var(--desk-muted)]">
                        {purchase.number}
                      </p>
                      <p className="mt-2 font-plex text-xs">
                        {displayPeriod(purchase.lines, locale)}
                      </p>
                    </div>
                    <PurchaseStatusPill status={purchase.status} />
                  </div>
                  <div className="mt-3 flex items-end justify-between border-t border-[var(--desk-line)] pt-3">
                    <span className="text-xs text-[var(--desk-muted)]">
                      {purchase.lines.length}{" "}
                      {copy.roomTypes.toLocaleLowerCase(locale)}
                    </span>
                    <strong className="font-plex text-sm">
                      {formatMoney(purchaseAmount(purchase), locale)}
                    </strong>
                  </div>
                </Link>
                {purchase.status === "cancelled" && (
                  <div className="border-t border-[var(--desk-line)] px-4 py-3">
                    <DeleteCancelledPurchase
                      id={purchase.id}
                      number={purchase.number}
                      compact
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
          <div className="hidden lg:block">
            <AdminTableFrame>
              <table className="desk-table w-full border-collapse text-start text-sm">
                <thead className="bg-[var(--desk-canvas)]">
                  <tr>
                    <th className="px-4 py-3 text-start">{copy.number}</th>
                    <th className="px-4 py-3 text-start">{copy.period}</th>
                    <th className="px-4 py-3 text-end">{copy.rooms}</th>
                    <th className="px-4 py-3 text-end">{copy.total}</th>
                    <th className="px-4 py-3 text-start">{copy.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/purchases/${purchase.id}`}
                          className="desk-focus rounded-sm font-plex font-medium text-[var(--desk-primary)] hover:underline"
                        >
                          {purchase.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-plex text-xs">
                        {displayPeriod(purchase.lines, locale)}
                      </td>
                      <td className="px-4 py-3 text-end font-plex">
                        {purchase.lines.length}
                      </td>
                      <td className="px-4 py-3 text-end font-plex">
                        {formatMoney(purchaseAmount(purchase), locale)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <PurchaseStatusPill status={purchase.status} />
                          {purchase.status === "cancelled" && (
                            <DeleteCancelledPurchase
                              id={purchase.id}
                              number={purchase.number}
                              compact
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableFrame>
          </div>
        </>
      ) : (
        <AdminEmptyState title={copy.noPurchasesHotel} />
      )}

      <div className="mt-5">
        <NamedConfirm
          title={copy.deleteHotelTitle}
          body={fill(copy.deleteHotelBody, { hotel: hotel.name })}
          confirm={copy.deleteHotel}
          pendingLabel={copy.deleting}
          cancelLabel={copy.keepHotel}
          action={deleteHotelAction}
          fields={{ id: hotel.id }}
          trigger={copy.deleteHotel}
          triggerClassName={adminButtonDangerClass}
        />
      </div>
    </AdminShell>
  );
}

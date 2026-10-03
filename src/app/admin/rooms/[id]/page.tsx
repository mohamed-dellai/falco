import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteRoomAction,
  deleteRoomPhotoAction,
  updateRoomAction,
} from "@/app/admin/actions";
import { AssignmentTable } from "@/components/assignment-table";
import { CalendarSwitch, DateField } from "@/components/calendar-date-field";
import { AdminError, AdminShell } from "@/components/admin-shell";
import {
  AdminField,
  AdminPanel,
  AdminSectionHeader,
  AdminStatStrip,
  AdminTableFrame,
  adminButtonClass,
  adminButtonDangerClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { NamedConfirm } from "@/components/named-confirm";
import { PhotoUploader } from "@/components/photo-uploader";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
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
import { formatDateRange, formatMoney, moneyInput } from "@/lib/money";
import { roomTypeCode, roomTypes } from "@/lib/room-types";
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
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const { id } = await params;
  const query = await searchParams;
  const room = await getRoom(id);
  if (!room) notFound();
  const hotel = await getHotel(room.hotelId);
  if (!hotel) notFound();

  const [
    photos,
    assignments,
    openToday,
    heldToday,
    stayCost,
    purchased,
    purchases,
  ] = await Promise.all([
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
  const typeCode = roomTypeCode(room.name);
  const typeName = typeCode ? copy[typeCode] : room.name;

  return (
    <AdminShell
      title={typeName}
      note={
        room.checkIn && room.checkOut ? (
          <span className="font-plex text-sm text-[var(--desk-muted)]">
            {formatDateRange(room.checkIn, room.checkOut, locale)}
          </span>
        ) : undefined
      }
      crumbs={[
        { href: "/admin/rooms", label: copy.rooms },
        { href: `/admin/hotels/${hotel.id}`, label: hotel.name },
      ]}
    >
      <div className="mb-5">
        <AdminStatStrip
          items={[
            { label: copy.roomsHeld, value: heldToday },
            { label: copy.openToday, value: openToday },
            {
              label: copy.soldToday,
              value: Math.max(0, heldToday - openToday),
            },
            {
              label: copy.costNight,
              value: formatMoney(stayCost, locale),
            },
          ]}
        />
      </div>
      <AdminError code={query.error} remaining={query.remaining} />

      <div className="grid items-start gap-4 xl:grid-cols-2">
        <AdminPanel title={copy.roomRecord}>
          <form action={updateRoomAction} className="grid gap-3">
            <input type="hidden" name="id" value={room.id} />
            <AdminField label={copy.roomType}>
              <select
                name="name"
                required
                defaultValue={typeCode ?? room.name}
                className={adminFieldClass}
              >
                {roomTypes.map((type) => (
                  <option key={type} value={type}>
                    {copy[type]}
                  </option>
                ))}
                {!typeCode && <option value={room.name}>{room.name}</option>}
              </select>
            </AdminField>
            <CalendarSwitch
              label={copy.calendar}
              normal={copy.normalCalendar}
              arabic={copy.arabicCalendar}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label={copy.from}>
                <DateField
                  name="checkIn"
                  label={copy.from}
                  locale={locale}
                  required={purchased}
                  defaultValue={room.checkIn ?? ""}
                />
              </AdminField>
              <AdminField label={copy.to}>
                <DateField
                  name="checkOut"
                  label={copy.to}
                  locale={locale}
                  required={purchased}
                  defaultValue={room.checkOut ?? ""}
                />
              </AdminField>
            </div>
            <p className="text-xs text-[var(--desk-muted)]">{copy.roomStayHint}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <AdminField label={copy.guests}>
                <input
                  name="capacity"
                  type="number"
                  min={1}
                  required
                  defaultValue={room.capacity}
                  className={adminFieldClass}
                />
              </AdminField>
              <AdminField label={copy.roomsHeld}>
                {purchased ? (
                  <span className="flex min-h-11 items-center font-plex text-sm lg:min-h-10">
                    {heldToday}
                  </span>
                ) : (
                  <input
                    name="quantity"
                    type="number"
                    min={1}
                    required
                    defaultValue={room.quantity}
                    className={adminFieldClass}
                  />
                )}
              </AdminField>
              <AdminField label={copy.costNight}>
                <input
                  name="costPerNight"
                  required
                  defaultValue={moneyInput(room.costPerNight)}
                  className={adminFieldClass}
                />
              </AdminField>
            </div>
            {purchased && (
              <p className="text-xs text-[var(--desk-muted)]">
                {copy.quantityCostPurchase}
              </p>
            )}
            <AdminField
              label={copy.publicPriceNight}
              hint={copy.publicPriceHint}
            >
              <input
                name="publicPricePerNight"
                defaultValue={
                  room.publicPricePerNight == null
                    ? ""
                    : moneyInput(room.publicPricePerNight)
                }
                className={adminFieldClass}
              />
            </AdminField>
            <AdminField label={copy.description}>
              <textarea
                name="description"
                defaultValue={room.description}
                className={`${adminFieldClass} !h-auto min-h-20 py-2`}
              />
            </AdminField>
            <AdminSubmitButton
              pendingLabel={copy.saving}
              className={`${adminButtonClass} w-fit`}
            >
              {copy.saveRoom}
            </AdminSubmitButton>
          </form>
        </AdminPanel>

        <div className="grid gap-4">
          <AdminPanel title={copy.photos}>
            <PhotoUploader roomId={room.id} />
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
                        record: typeName,
                        count: index + 1,
                      })}
                      className="h-24 w-full object-cover"
                    />
                    <div className="flex justify-center px-2 py-2">
                      <NamedConfirm
                        title={copy.removePhotoTitle}
                        body={fill(copy.removePhotoBody, { record: typeName })}
                        confirm={copy.removePhotoConfirm}
                        pendingLabel={copy.removing}
                        cancelLabel={copy.keepPhoto}
                        action={deleteRoomPhotoAction}
                        fields={{ roomId: room.id, photoId: photo.id }}
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
      </div>

      {purchases.length > 0 && (
        <>
          <div className="mt-6">
            <AdminSectionHeader title={copy.purchases} />
          </div>
          <div className="grid gap-3 lg:hidden">
            {purchases.map((purchase) => (
              <Link
                key={purchase.lineId}
                href={`/admin/purchases/${purchase.id}`}
                className="desk-focus rounded-2xl border border-[var(--desk-line)] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-plex text-xs text-[var(--desk-muted)]">
                    {purchase.number}
                  </span>
                  <PurchaseStatusPill status={purchase.status} />
                </div>
                <p className="mt-3 font-plex text-xs">
                  {formatDateRange(purchase.checkIn, purchase.checkOut, locale)}
                </p>
                <p className="mt-3 border-t border-[var(--desk-line)] pt-3 text-end font-plex text-sm">
                  {formatMoney(purchase.costPerNight, locale)}
                </p>
              </Link>
            ))}
          </div>
          <div className="hidden lg:block">
            <AdminTableFrame>
              <table className="desk-table w-full border-collapse text-start text-sm">
                <thead className="bg-[var(--desk-canvas)]">
                  <tr>
                    <th className="px-4 py-3 text-start">{copy.number}</th>
                    <th className="px-4 py-3 text-start">{copy.period}</th>
                    <th className="px-4 py-3 text-end">{copy.costNight}</th>
                    <th className="px-4 py-3 text-start">{copy.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.lineId}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/purchases/${purchase.id}`}
                          className="desk-focus rounded-sm font-plex font-medium text-[var(--desk-primary)] hover:underline"
                        >
                          {purchase.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-plex text-xs">
                        {formatDateRange(
                          purchase.checkIn,
                          purchase.checkOut,
                          locale,
                        )}
                      </td>
                      <td className="px-4 py-3 text-end font-plex">
                        {formatMoney(purchase.costPerNight, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <PurchaseStatusPill status={purchase.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableFrame>
          </div>
        </>
      )}

      <div className="mt-6">
        <AdminSectionHeader title={copy.activeRoomHolds} />
      </div>
      <AssignmentTable assignments={roomAssignments} allowRelease />

      <div className="mt-5">
        <NamedConfirm
          title={copy.deleteRoomTitle}
          body={fill(copy.deleteRoomBody, { room: typeName })}
          confirm={copy.deleteRoom}
          pendingLabel={copy.deleting}
          cancelLabel={copy.keepRoom}
          action={deleteRoomAction}
          fields={{ id: room.id }}
          trigger={copy.deleteRoom}
          triggerClassName={adminButtonDangerClass}
        />
      </div>
    </AdminShell>
  );
}

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
  hotelDailyChart,
  listHotelPhotos,
  listPurchases,
  purchaseAmount,
  purchaseSpan,
} from "@/lib/inventory";
import { formatDateRange, formatMoney } from "@/lib/money";
import { mealPlanLabel, roomTypeLabel, type MealPlan } from "@/lib/room-types";

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

  const [photos, purchases, chart] = await Promise.all([
    listHotelPhotos(id),
    listPurchases({ hotelId: id }),
    hotelDailyChart(id),
  ]);
  const boards: Record<MealPlan, string> = {
    room_only: copy.roomOnly,
    breakfast: copy.breakfastBoard,
    half_board: copy.halfBoard,
    full_board: copy.fullBoard,
  };

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
        <AdminSectionHeader title={copy.chartTitle} />
      </div>
      {chart.length ? (
        <div className="grid gap-4">
          {chart.map((offer) => (
            <AdminPanel key={offer.id}>
              <h2 className="font-semibold">
                {roomTypeLabel(offer.name, (type) => copy[type])}
                <span className="ms-2 text-sm font-medium text-[var(--desk-muted)]">
                  {copy.guests} {offer.guests} · {mealPlanLabel(offer.board, boards)}
                  {offer.view.trim() ? ` · ${offer.view.trim()}` : ""}
                </span>
              </h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-start text-sm">
                  <thead>
                    <tr className="text-[var(--desk-muted)]">
                      <th className="px-2 py-2 text-start">{copy.stay}</th>
                      <th className="px-2 py-2 text-end">{copy.chartHeld}</th>
                      <th className="px-2 py-2 text-end">{copy.chartTaken}</th>
                      <th className="px-2 py-2 text-end">{copy.chartFree}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offer.days.map((day) => (
                      <tr key={day.day} className="border-t border-[var(--desk-line)]">
                        <td className="px-2 py-2 font-plex">{day.day}</td>
                        <td className="px-2 py-2 text-end font-plex">{day.held}</td>
                        <td className="px-2 py-2 text-end font-plex">{day.taken}</td>
                        <td className="px-2 py-2 text-end font-plex">{day.free}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminPanel>
          ))}
        </div>
      ) : (
        <AdminEmptyState title={copy.chartEmpty} />
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

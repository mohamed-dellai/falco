import { notFound } from "next/navigation";
import {
  deleteContractRateAction,
  saveContractRateAction,
} from "@/app/admin/actions";
import { AdminError, AdminShell } from "@/components/admin-shell";
import {
  AdminNotice,
  AdminPanel,
  adminButtonClass,
  adminButtonDangerClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { PurchaseForm } from "@/components/purchase-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  getPurchase,
  listAgencies,
  listHotels,
  listLineRates,
  listRoomTypes,
} from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { mealPlanLabel, roomTypeLabel } from "@/lib/room-types";

export const dynamic = "force-dynamic";

export default async function PurchasePage({
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
  const [purchase, hotels, roomTypes, agencies, rates] = await Promise.all([
    getPurchase(id),
    listHotels(),
    listRoomTypes(),
    listAgencies(),
    listLineRates(id),
  ]);
  if (!purchase) notFound();

  return (
    <AdminShell
      title={purchase.number}
      crumbs={[{ href: "/admin/purchases", label: copy.purchases }]}
    >
      <AdminError code={query.error} />
      {purchase.status === "confirmed" && (
        <div className="mb-4">
          <AdminNotice tone="success">
            {copy.purchaseConfirmedNotice}
          </AdminNotice>
        </div>
      )}
      {purchase.status === "cancelled" && (
        <div className="mb-4">
          <AdminNotice>{copy.purchaseCancelledNotice}</AdminNotice>
        </div>
      )}
      <PurchaseForm hotels={hotels} purchase={purchase} roomTypes={roomTypes} />
      {purchase.status === "confirmed" && (
        <AdminPanel title={copy.agencyRates} className="mt-6 max-w-3xl">
          <div className="grid gap-4">
            {purchase.lines.map((line) => {
              const lineRates = rates.filter((rate) => rate.purchaseLineId === line.id);
              const companies = agencies.filter((agency) => agency.kind === "agency");
              return (
                <div key={line.id} className="border-t border-[var(--desk-line)] pt-4 first:border-t-0 first:pt-0">
                  <p className="font-semibold">
                    {roomTypeLabel(line.roomName, (type) => copy[type])}
                    {" · "}
                    {mealPlanLabel(line.board, {
                      room_only: copy.roomOnly,
                      breakfast: copy.breakfastBoard,
                      half_board: copy.halfBoard,
                      full_board: copy.fullBoard,
                    })}
                    {line.view.trim() ? ` · ${line.view.trim()}` : ""}
                    {" · "}
                    {line.checkIn} → {line.checkOut}
                  </p>
                  {lineRates.length ? (
                    <ul className="mt-2 grid gap-2">
                      {lineRates.map((rate) => (
                        <li key={rate.id} className="flex items-center justify-between gap-3 text-sm">
                          <span>
                            {rate.agencyName} · {formatMoney(rate.pricePerNight, locale)}
                          </span>
                          <form action={deleteContractRateAction}>
                            <input type="hidden" name="id" value={rate.id} />
                            <input type="hidden" name="purchaseId" value={purchase.id} />
                            <button type="submit" className={adminButtonDangerClass}>
                              {copy.deleteAction}
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--desk-muted)]">{copy.noCompanyRate}</p>
                  )}
                  {companies.length > 0 && (
                    <form action={saveContractRateAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
                      <input type="hidden" name="purchaseId" value={purchase.id} />
                      <input type="hidden" name="purchaseLineId" value={line.id} />
                      <label className="grid gap-1 text-xs font-semibold">
                        {copy.agency}
                        <select name="agencyId" required className={adminFieldClass}>
                          {companies.map((agency) => (
                            <option key={agency.id} value={agency.id}>
                              {agency.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-semibold">
                        {copy.rateNight}
                        <input
                          name="price"
                          required
                          inputMode="decimal"
                          placeholder="0.00"
                          className={adminFieldClass}
                        />
                      </label>
                      <button type="submit" className={adminButtonClass}>
                        {copy.saveRate}
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </AdminPanel>
      )}
    </AdminShell>
  );
}

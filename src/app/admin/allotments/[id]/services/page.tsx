import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteDeskServiceAction } from "@/app/admin/services/actions";
import { ServiceForm } from "@/app/admin/services/service-form";
import { AdminError } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminNotice,
  AdminTableFrame,
  adminButtonClass,
  adminButtonDangerClass,
} from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, type AdminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAllotment, listHotels } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import {
  getDeskService,
  listDeskServices,
  listServiceTypes,
  serviceTotals,
  type ServiceClientStatus,
  type ServicePaymentStatus,
  type ServiceProviderStatus,
} from "@/lib/services";

export const dynamic = "force-dynamic";

function clientLabel(copy: AdminCopy, status: ServiceClientStatus) {
  if (status === "provisional") return copy.serviceTentative;
  if (status === "confirmed") return copy.serviceConfirmed;
  if (status === "cancelled") return copy.serviceCancelled;
  return copy.serviceNew;
}

function paymentLabel(copy: AdminCopy, status: ServicePaymentStatus) {
  if (status === "partial") return copy.servicePartial;
  if (status === "paid") return copy.servicePaid;
  return copy.serviceNotPaid;
}

function providerLabel(copy: AdminCopy, status: ServiceProviderStatus) {
  if (status === "provisional") return copy.serviceTentative;
  if (status === "confirmed") return copy.serviceConfirmed;
  if (status === "cancelled") return copy.serviceCancelled;
  return copy.serviceNew;
}

export default async function ReservationServicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; edit?: string; new?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const { id } = await params;
  const query = await searchParams;
  const allotment = await getAllotment(id);
  if (!allotment) notFound();
  const back = `/admin/allotments/${allotment.id}/services`;
  const [types, hotels, services, editing] = await Promise.all([
    listServiceTypes(),
    allotment.hotelId ? Promise.resolve([]) : listHotels(),
    listDeskServices({ allotmentId: allotment.id }),
    query.edit ? getDeskService(query.edit) : Promise.resolve(null),
  ]);
  const service = editing && editing.allotmentId === allotment.id ? editing : null;
  const showForm = Boolean(service) || query.new === "1";

  return (
    <>
      <AdminError code={query.error} />
      {query.saved === "service" ? (
        <div className="mb-4">
          <AdminNotice tone="success">{copy.serviceSaved}</AdminNotice>
        </div>
      ) : null}
      {showForm ? (
        <div className="mb-4">
          <ServiceForm
            copy={copy}
            locale={locale}
            types={types}
            agencies={[]}
            hotels={hotels}
            service={service}
            closeHref={back}
            stay={{
              allotmentId: allotment.id,
              agencyId: allotment.agencyId,
              agencyName: allotment.agencyName,
              hotelId: allotment.hotelId ?? "",
              hotelName: allotment.hotelName ?? "",
              bookingNumber: allotment.number,
              guestName: allotment.guestName,
              serviceDate: allotment.checkIn,
              next: back,
            }}
          />
        </div>
      ) : (
        <div className="mb-4">
          <Link href={`${back}?new=1`} className={adminButtonClass}>
            {copy.serviceAdd}
          </Link>
        </div>
      )}
      {services.length ? (
        <AdminTableFrame>
          <table className="desk-table w-full min-w-[860px] border-collapse text-start text-sm">
            <thead>
              <tr>
                <th>{copy.serviceNumber}</th>
                <th>{copy.serviceType}</th>
                <th>{copy.serviceDate}</th>
                <th>{copy.serviceQty}</th>
                <th>{copy.serviceTotalCost}</th>
                <th>{copy.serviceTotalPrice}</th>
                <th>{copy.serviceVat}</th>
                <th>{copy.serviceClientStatus}</th>
                <th>{copy.serviceProviderStatus}</th>
                <th>{copy.servicePaymentStatus}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {services.map((row) => {
                const totals = serviceTotals(row);
                return (
                  <tr key={row.id}>
                    <td className="tabular-nums">{row.number}</td>
                    <td>{row.typeName}</td>
                    <td className="tabular-nums">{row.serviceDate}</td>
                    <td className="tabular-nums">{row.quantity}</td>
                    <td className="tabular-nums">{formatMoney(totals.cost, locale)}</td>
                    <td className="tabular-nums">{formatMoney(totals.gross, locale)}</td>
                    <td className="tabular-nums">{formatMoney(totals.vat, locale)}</td>
                    <td>{clientLabel(copy, row.clientStatus)}</td>
                    <td>{providerLabel(copy, row.providerStatus)}</td>
                    <td>{paymentLabel(copy, row.paymentStatus)}</td>
                    <td className="text-end">
                      <Link href={`${back}?edit=${row.id}`} className="font-semibold text-[var(--desk-ink)]">
                        {copy.serviceEdit}
                      </Link>
                      <form action={deleteDeskServiceAction} className="mt-1">
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="allotmentId" value={allotment.id} />
                        <input type="hidden" name="next" value={back} />
                        <button type="submit" className={adminButtonDangerClass}>
                          {copy.serviceDelete}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </AdminTableFrame>
      ) : (
        <AdminEmptyState title={copy.serviceEmpty} />
      )}
    </>
  );
}

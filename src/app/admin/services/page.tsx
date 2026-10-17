import Link from "next/link";
import { deleteDeskServiceAction } from "@/app/admin/services/actions";
import { clientLabel, paymentLabel, providerLabel } from "@/app/admin/services/service-form";
import { AdminError } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminField,
  AdminNotice,
  AdminTableFrame,
  adminButtonSecondaryClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { NamedConfirm } from "@/components/named-confirm";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { formatDate, formatMoney } from "@/lib/money";
import {
  listDeskServices,
  listServiceTypes,
  serviceClientStatuses,
  servicePaymentStatuses,
  serviceProviderStatuses,
  serviceTotals,
  type ServiceClientStatus,
  type ServicePaymentStatus,
  type ServiceProviderStatus,
} from "@/lib/services";

export const dynamic = "force-dynamic";

function clientTone(status: ServiceClientStatus) {
  if (status === "confirmed") return "success";
  if (status === "provisional") return "warning";
  if (status === "cancelled") return "danger";
  return "muted";
}

function paymentTone(status: ServicePaymentStatus) {
  if (status === "paid") return "success";
  if (status === "partial") return "warning";
  return "muted";
}

function providerTone(status: ServiceProviderStatus) {
  if (status === "confirmed") return "success";
  if (status === "provisional") return "warning";
  if (status === "cancelled") return "danger";
  return "muted";
}

function StatusWord({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "muted";
  children: string;
}) {
  const dot = {
    success: "bg-[var(--desk-success)]",
    warning: "bg-[var(--desk-warning)]",
    danger: "bg-[var(--desk-danger)]",
    muted: "bg-[var(--desk-line-strong)]",
  }[tone];
  const text = {
    success: "text-[var(--desk-success)]",
    warning: "text-[var(--desk-warning)]",
    danger: "text-[var(--desk-danger)]",
    muted: "text-[var(--desk-muted)]",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-semibold ${text}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
      {children}
    </span>
  );
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; type?: string; client?: string; payment?: string; provider?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const [types, services] = await Promise.all([
    listServiceTypes(),
    listDeskServices({
      typeId: query.type,
      clientStatus: query.client,
      paymentStatus: query.payment,
      providerStatus: query.provider,
    }),
  ]);
  const filtersOpen = Boolean(query.type || query.client || query.payment || query.provider);

  return (
    <>
      <AdminError code={query.error} />
      {query.saved ? (
        <div className="mb-4">
          <AdminNotice tone="success">{copy.serviceSaved}</AdminNotice>
        </div>
      ) : null}

      <section className="overflow-hidden rounded border border-[var(--desk-line)] bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--desk-line)] px-3 py-2">
          <Link
            href="/admin/services/new"
            className="desk-focus inline-flex h-8 items-center rounded bg-[var(--desk-primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--desk-primary-hover)]"
          >
            {copy.serviceAdd}
          </Link>
          <p className="font-plex text-sm font-semibold text-[var(--desk-ink)]">{services.length}</p>
        </div>
        <details className="border-b border-[var(--desk-line)]" {...(filtersOpen ? { open: true } : {})}>
          <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-[var(--desk-ink)]">
            {copy.searchOptions}
          </summary>
          <form method="get" className="grid gap-3 px-4 pb-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminField label={copy.serviceType}>
              <select name="type" defaultValue={query.type ?? ""} className={adminFieldClass}>
                <option value="">{copy.serviceAll}</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label={copy.serviceClientStatus}>
              <select name="client" defaultValue={query.client ?? ""} className={adminFieldClass}>
                <option value="">{copy.serviceAll}</option>
                {serviceClientStatuses.map((status) => (
                  <option key={status} value={status}>
                    {clientLabel(copy, status)}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label={copy.servicePaymentStatus}>
              <select name="payment" defaultValue={query.payment ?? ""} className={adminFieldClass}>
                <option value="">{copy.serviceAll}</option>
                {servicePaymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {paymentLabel(copy, status)}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label={copy.serviceProviderStatus}>
              <select name="provider" defaultValue={query.provider ?? ""} className={adminFieldClass}>
                <option value="">{copy.serviceAll}</option>
                {serviceProviderStatuses.map((status) => (
                  <option key={status} value={status}>
                    {providerLabel(copy, status)}
                  </option>
                ))}
              </select>
            </AdminField>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-4">
              <button
                type="submit"
                className="desk-focus inline-flex h-8 items-center rounded bg-[var(--desk-primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--desk-primary-hover)]"
              >
                {copy.search}
              </button>
              <Link href="/admin/services" className={adminButtonSecondaryClass}>
                {copy.listClear}
              </Link>
            </div>
          </form>
        </details>

      {services.length ? (
        <AdminTableFrame>
          <table className="desk-table w-full min-w-[980px] border-collapse text-start text-sm">
            <thead>
              <tr>
                <th>{copy.serviceNumber}</th>
                <th>{copy.serviceType}</th>
                <th>{copy.serviceClient}</th>
                <th>{copy.serviceDate}</th>
                <th className="text-end">{copy.serviceQty}</th>
                <th className="text-end">{copy.serviceTotalCost}</th>
                <th className="text-end">{copy.serviceTotalPrice}</th>
                <th>{copy.serviceClientStatus}</th>
                <th>{copy.servicePaymentStatus}</th>
                <th>{copy.serviceProviderStatus}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {services.map((service) => {
                const totals = serviceTotals(service);
                return (
                  <tr key={service.id}>
                    <td className="font-plex tabular-nums">
                      <Link href={`/admin/services/${service.id}`} className="font-bold text-[var(--desk-ink)]">
                        {service.number}
                      </Link>
                      {service.allotmentId ? (
                        <div className="text-xs">
                          <Link href={`/admin/allotments/${service.allotmentId}/services`} className="text-[var(--desk-muted)]">
                            {service.bookingNumber || service.number}
                          </Link>
                        </div>
                      ) : service.bookingNumber ? (
                        <div className="text-xs text-[var(--desk-muted)]">{service.bookingNumber}</div>
                      ) : null}
                    </td>
                    <td className="font-semibold text-[var(--desk-ink)]">{service.typeName}</td>
                    <td>
                      <span className="block text-[var(--desk-ink)]">{service.agencyName || "—"}</span>
                      <span className="text-xs text-[var(--desk-muted)]">{service.hotelName || "—"}</span>
                    </td>
                    <td className="tabular-nums">
                      {formatDate(service.serviceDate, locale)}
                      {service.endDate ? <div className="text-xs text-[var(--desk-muted)]">{formatDate(service.endDate, locale)}</div> : null}
                    </td>
                    <td className="font-plex text-end tabular-nums">{service.quantity}</td>
                    <td className="font-plex text-end tabular-nums">{formatMoney(totals.cost, locale)}</td>
                    <td className="font-plex text-end font-bold text-[var(--desk-gold)] tabular-nums">{formatMoney(totals.gross, locale)}</td>
                    <td>
                      <StatusWord tone={clientTone(service.clientStatus)}>{clientLabel(copy, service.clientStatus)}</StatusWord>
                    </td>
                    <td>
                      <StatusWord tone={paymentTone(service.paymentStatus)}>{paymentLabel(copy, service.paymentStatus)}</StatusWord>
                    </td>
                    <td>
                      <StatusWord tone={providerTone(service.providerStatus)}>{providerLabel(copy, service.providerStatus)}</StatusWord>
                    </td>
                    <td className="text-end">
                      <Link
                        href={`/admin/services/${service.id}`}
                        className="desk-focus text-[13px] font-bold text-[var(--desk-ink)]"
                      >
                        {copy.serviceEdit}
                      </Link>
                      <div className="mt-1">
                        <NamedConfirm
                          title={copy.serviceDeleteTitle}
                          body={fill(copy.serviceDeleteBody, { name: service.typeName })}
                          confirm={copy.serviceDelete}
                          pendingLabel={copy.serviceDelete}
                          action={deleteDeskServiceAction}
                          fields={{ id: service.id }}
                          trigger={copy.serviceDelete}
                          cancelLabel={copy.cancelAction}
                        />
                      </div>
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
      </section>
    </>
  );
}

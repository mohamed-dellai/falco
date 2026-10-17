import Link from "next/link";
import { saveDeskServiceAction } from "@/app/admin/services/actions";
import { AdminError } from "@/components/admin-shell";
import { AdminField, AdminNotice, AdminPanel, adminButtonClass, adminButtonSecondaryClass, adminFieldClass } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { DateField } from "@/components/calendar-date-field";
import type { AdminCopy } from "@/lib/admin-copy";
import { moneyInput } from "@/lib/money";
import { serviceTaxTypes, type DeskService, type ServiceClientStatus, type ServicePaymentStatus, type ServiceProviderStatus, type ServiceTaxType } from "@/lib/services";

export function clientLabel(copy: AdminCopy, status: ServiceClientStatus) {
  if (status === "provisional") return copy.serviceTentative;
  if (status === "confirmed") return copy.serviceConfirmed;
  if (status === "cancelled") return copy.serviceCancelled;
  return copy.serviceNew;
}

export function paymentLabel(copy: AdminCopy, status: ServicePaymentStatus) {
  if (status === "partial") return copy.servicePartial;
  if (status === "paid") return copy.servicePaid;
  return copy.serviceNotPaid;
}

export function providerLabel(copy: AdminCopy, status: ServiceProviderStatus) {
  if (status === "provisional") return copy.serviceTentative;
  if (status === "confirmed") return copy.serviceConfirmed;
  if (status === "cancelled") return copy.serviceCancelled;
  return copy.serviceNew;
}

function taxLabel(copy: AdminCopy, tax: ServiceTaxType) {
  if (tax === "profit") return copy.serviceTaxProfit;
  if (tax === "none") return copy.serviceTaxNone;
  return copy.serviceTaxSales;
}

export function ServiceForm({
  copy,
  locale,
  types,
  agencies,
  hotels,
  service,
  closeHref,
  error,
  saved,
  stay,
}: {
  copy: AdminCopy;
  locale: string;
  types: Array<{ id: string; name: string }>;
  agencies: Array<{ id: string; name: string }>;
  hotels: Array<{ id: string; name: string }>;
  service: DeskService | null;
  closeHref: string;
  error?: string;
  saved?: string;
  stay?: {
    allotmentId: string;
    agencyId: string;
    agencyName: string;
    hotelId: string;
    hotelName: string;
    bookingNumber: string;
    guestName: string;
    serviceDate: string;
    next: string;
  } | null;
}) {
  const hotelLocked = Boolean(stay?.hotelId);
  return (
    <>
      <AdminError code={error} />
      {saved ? (
        <div className="mb-4">
          <AdminNotice tone="success">{copy.serviceSaved}</AdminNotice>
        </div>
      ) : null}
      <AdminPanel title={service ? `${copy.serviceEdit} ${service.number}` : copy.serviceAdd}>
        <form action={saveDeskServiceAction} className="grid gap-4">
          {service ? <input type="hidden" name="id" value={service.id} /> : null}
          {stay ? (
            <>
              <input type="hidden" name="next" value={stay.next} />
              <input type="hidden" name="allotmentId" value={stay.allotmentId} />
              <input type="hidden" name="agencyId" value={stay.agencyId} />
              <input type="hidden" name="bookingNumber" value={stay.bookingNumber} />
              {hotelLocked ? <input type="hidden" name="hotelId" value={stay.hotelId} /> : null}
            </>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <AdminField label={copy.serviceType}>
              <select name="typeId" required defaultValue={service?.typeId ?? ""} className={adminFieldClass}>
                <option value="" disabled>
                  {copy.serviceType}
                </option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label={copy.serviceSupplier}>
              {hotelLocked ? (
                <input value={stay?.hotelName ?? ""} readOnly className={adminFieldClass} />
              ) : (
                <select name="hotelId" required defaultValue={service?.hotelId ?? ""} className={adminFieldClass}>
                  <option value="" disabled>
                    {copy.serviceSupplier}
                  </option>
                  {hotels.map((hotel) => (
                    <option key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </option>
                  ))}
                </select>
              )}
            </AdminField>
            <AdminField label={copy.serviceClient}>
              {stay ? (
                <input value={stay.agencyName} readOnly className={adminFieldClass} />
              ) : (
                <select name="agencyId" required defaultValue={service?.agencyId ?? ""} className={adminFieldClass}>
                  <option value="" disabled>
                    {copy.serviceClient}
                  </option>
                  {agencies.map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              )}
            </AdminField>
            <AdminField label={copy.serviceDate}>
              <DateField
                name="serviceDate"
                label={copy.serviceDate}
                locale={locale}
                required
                defaultValue={service?.serviceDate || stay?.serviceDate || ""}
              />
            </AdminField>
            <AdminField label={copy.serviceUnitPrice}>
              <input
                name="unitPrice"
                inputMode="decimal"
                required
                defaultValue={service ? moneyInput(service.unitPrice) : "0"}
                className={`${adminFieldClass} font-plex tabular-nums`}
              />
            </AdminField>
            <AdminField label={copy.serviceQty}>
              <input
                name="quantity"
                type="number"
                min={1}
                max={999}
                required
                defaultValue={service?.quantity ?? 1}
                className={`${adminFieldClass} font-plex tabular-nums`}
              />
            </AdminField>
            <AdminField label={copy.serviceTaxType}>
              <select name="taxType" defaultValue={service?.taxType ?? "sales"} className={adminFieldClass}>
                {serviceTaxTypes.map((tax) => (
                  <option key={tax} value={tax}>
                    {taxLabel(copy, tax)}
                  </option>
                ))}
              </select>
            </AdminField>
          </div>
          <AdminField label={copy.guestName}>
            <input
              name="guestName"
              maxLength={120}
              defaultValue={service?.guestName || stay?.guestName || ""}
              className={adminFieldClass}
            />
          </AdminField>
          <AdminField label={copy.serviceDescription}>
            <textarea
              name="description"
              rows={3}
              maxLength={2000}
              defaultValue={service?.description ?? ""}
              className={`${adminFieldClass} !h-auto py-2`}
            />
          </AdminField>
          <AdminField label={copy.serviceInternalNotes}>
            <textarea
              name="internalNotes"
              rows={3}
              maxLength={2000}
              defaultValue={service?.internalNotes ?? ""}
              className={`${adminFieldClass} !h-auto py-2`}
            />
          </AdminField>
          <div className="flex justify-end gap-2">
            <Link href={closeHref} className={adminButtonSecondaryClass}>
              {copy.cancelAction}
            </Link>
            <AdminSubmitButton pendingLabel={copy.serviceSave} className={adminButtonClass}>
              {copy.serviceSave}
            </AdminSubmitButton>
          </div>
        </form>
      </AdminPanel>
    </>
  );
}

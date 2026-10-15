import Link from "next/link";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import {
  adminButtonClass,
  adminButtonSecondaryClass,
  adminFieldClass,
  AdminStatusPill,
} from "@/components/admin-ui";
import {
  AllotmentStatusPill,
  DeleteCancelledAllotment,
  SaleChannelMark,
} from "@/components/allotment-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, countText, fill, type AdminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  allotmentStatuses,
  allotmentValue,
  cities,
  lineSupplierStatuses,
  listAllotments,
  listHotels,
  saleChannels,
  type Allotment,
  type AllotmentStatus,
  type City,
  type LineSupplierStatus,
  type SaleChannel,
} from "@/lib/inventory";
import { formatDate, formatDateRange, formatMoney, parseMoney } from "@/lib/money";
import {
  listPaymentRollups,
  paymentListStatus,
  type PaymentListStatus,
  type PaymentRollup,
} from "@/lib/reservation-payments";

export const dynamic = "force-dynamic";

type QueryValue = string | string[] | undefined;

const paymentStatuses = ["unpaid", "partial", "paid", "refund_due"] as const;
const listActions = [
  "posted",
  "unposted",
  "arrival",
  "b2b",
  "b2c",
  "desk",
  "sent",
  "unsent",
] as const;

function many(value: QueryValue) {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .map((item) => item.trim())
    .filter(Boolean);
}

function one(value: QueryValue) {
  const first = many(value)[0] ?? "";
  return first;
}

function asStatus(value: string) {
  if (value === "draft") return "request" as const;
  return allotmentStatuses.includes(value as AllotmentStatus)
    ? (value as AllotmentStatus)
    : undefined;
}

function asSupplier(value: string) {
  return lineSupplierStatuses.includes(value as LineSupplierStatus)
    ? (value as LineSupplierStatus)
    : undefined;
}

function asChannel(value: string) {
  if (value === "website") return "website" as const;
  return saleChannels.includes(value as SaleChannel)
    ? (value as SaleChannel)
    : undefined;
}

function asCity(value: string) {
  return cities.includes(value as City) ? (value as City) : undefined;
}

function asPay(value: string) {
  return paymentStatuses.includes(value as PaymentListStatus)
    ? (value as PaymentListStatus)
    : undefined;
}

function asAction(value: string) {
  return listActions.includes(value as (typeof listActions)[number])
    ? (value as (typeof listActions)[number])
    : undefined;
}

function day(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function stayHotel(allotment: Allotment) {
  if (allotment.hotelName) return allotment.hotelName;
  return [...new Set(allotment.lines.map((line) => line.hotelName).filter(Boolean))].join(", ");
}

function supplierCounts(allotment: Allotment) {
  const counts = new Map<LineSupplierStatus, number>();
  for (const line of allotment.lines) {
    counts.set(line.supplierStatus, (counts.get(line.supplierStatus) ?? 0) + line.quantity);
  }
  return [...counts.entries()];
}

function requestSent(allotment: Allotment) {
  return allotment.lines.some((line) => line.supplierStatus !== "new");
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold text-[var(--desk-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export default async function AllotmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, QueryValue>>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const number = one(query.number) || one(query.q);
  const hotelConf = one(query.hotelConf);
  const guest = one(query.guest);
  const client = one(query.client);
  const hotelId = one(query.hotel);
  const arrivalFrom = day(one(query.arrivalFrom));
  const arrivalTo = day(one(query.arrivalTo));
  const departFrom = day(one(query.departFrom));
  const departTo = day(one(query.departTo));
  const stayFrom = day(one(query.stayFrom));
  const stayTo = day(one(query.stayTo));
  const createdFrom = day(one(query.createdFrom));
  const createdTo = day(one(query.createdTo));
  const payBefore = day(one(query.payBefore));
  const paymentNo = one(query.paymentNo).toLocaleLowerCase(locale);
  const amount = parseMoney(one(query.amount));
  const city = asCity(one(query.city));
  const channel = asChannel(one(query.channel));
  const source =
    one(query.source) === "direct" || one(query.source) === "contract"
      ? (one(query.source) as "direct" | "contract")
      : undefined;
  const action = asAction(one(query.action));
  const closed =
    one(query.closed) === "cancelled" || one(query.closed) === "regret"
      ? (one(query.closed) as "cancelled" | "regret")
      : undefined;
  const statuses = many(query.status).flatMap((value) => {
    const status = asStatus(value);
    return status ? [status] : [];
  });
  const supplierFilter = many(query.supplier).flatMap((value) => {
    const status = asSupplier(value);
    return status ? [status] : [];
  });
  const payFilter = many(query.pay).flatMap((value) => {
    const status = asPay(value);
    return status ? [status] : [];
  });
  const queue = one(query.cancel) === "requested";

  const supplierLabels: Record<LineSupplierStatus, string> = {
    new: copy.supplierNew,
    waiting: copy.supplierWaiting,
    provisional: copy.supplierLineProvisional,
    confirmed: copy.supplierLineConfirmed,
    amended: copy.supplierAmended,
    cancelled: copy.supplierLineCancelled,
    no_show: copy.supplierNoShow,
  };
  const payLabels: Record<PaymentListStatus, string> = {
    unpaid: copy.payUnpaid,
    partial: copy.payPartial,
    paid: copy.paymentPaid,
    refund_due: copy.paymentRefundDue,
  };
  const cityLabels: Record<City, string> = {
    makkah: copy.makkah,
    madinah: copy.madinah,
    jeddah: copy.jeddah,
  };

  const [all, hotels, rollups] = await Promise.all([
    listAllotments(),
    listHotels(),
    listPaymentRollups(),
  ]);
  const hotelById = new Map(hotels.map((hotel) => [hotel.id, hotel]));
  const hotelByName = new Map(
    hotels.map((hotel) => [hotel.name.toLocaleLowerCase(locale), hotel]),
  );

  function hotelCity(allotment: Allotment) {
    const header = allotment.hotelId ? hotelById.get(allotment.hotelId) : undefined;
    if (header) return header.city;
    for (const line of allotment.lines) {
      const match = hotelByName.get(line.hotelName.toLocaleLowerCase(locale));
      if (match) return match.city;
    }
    return undefined;
  }

  function matchesHotel(allotment: Allotment) {
    if (!hotelId) return true;
    if (allotment.hotelId === hotelId) return true;
    const hotel = hotelById.get(hotelId);
    if (!hotel) return false;
    const wanted = hotel.name.toLocaleLowerCase(locale);
    return allotment.lines.some(
      (line) => line.hotelName.toLocaleLowerCase(locale) === wanted,
    );
  }

  const allotments = all.filter((allotment) => {
    const rollup = rollups.get(allotment.id);
    const value = allotmentValue(allotment);
    const pay = paymentListStatus(value.revenue, rollup);
    const created = allotment.createdAt.slice(0, 10);
    if (queue && !(allotment.cancellationRequestedAt && allotment.status !== "cancelled")) {
      return false;
    }
    if (number && !allotment.number.toLocaleLowerCase(locale).includes(number.toLocaleLowerCase(locale))) {
      return false;
    }
    if (
      hotelConf &&
      !allotment.supplierReference.toLocaleLowerCase(locale).includes(hotelConf.toLocaleLowerCase(locale))
    ) {
      return false;
    }
    if (guest && !allotment.guestName.toLocaleLowerCase(locale).includes(guest.toLocaleLowerCase(locale))) {
      return false;
    }
    if (client && !allotment.agencyName.toLocaleLowerCase(locale).includes(client.toLocaleLowerCase(locale))) {
      return false;
    }
    if (!matchesHotel(allotment)) return false;
    if (city && hotelCity(allotment) !== city) return false;
    if (arrivalFrom && allotment.checkIn < arrivalFrom) return false;
    if (arrivalTo && allotment.checkIn > arrivalTo) return false;
    if (departFrom && allotment.checkOut < departFrom) return false;
    if (departTo && allotment.checkOut > departTo) return false;
    if (stayFrom && allotment.checkOut <= stayFrom) return false;
    if (stayTo && allotment.checkIn > stayTo) return false;
    if (createdFrom && created < createdFrom) return false;
    if (createdTo && created > createdTo) return false;
    if (payBefore && allotment.payBefore !== payBefore) return false;
    if (statuses.length && !statuses.includes(allotment.status)) return false;
    if (supplierFilter.length && !allotment.lines.some((line) => supplierFilter.includes(line.supplierStatus))) {
      return false;
    }
    if (payFilter.length && !payFilter.includes(pay)) return false;
    if (paymentNo && !(rollup?.codes.toLocaleLowerCase(locale).includes(paymentNo))) return false;
    if (amount != null && value.revenue !== amount) return false;
    if (closed && allotment.status !== closed) return false;
    if (source && allotment.saleSource !== source) return false;
    if (channel === "website" && allotment.channel === "desk") return false;
    if (channel && channel !== "website" && allotment.channel !== channel) return false;
    if (action === "posted" && !rollup?.posted) return false;
    if (action === "unposted" && rollup?.posted) return false;
    if (action === "arrival" && !allotment.payOnArrival) return false;
    if (action === "b2b" && allotment.channel !== "b2b") return false;
    if (action === "b2c" && allotment.channel !== "b2c") return false;
    if (action === "desk" && allotment.channel !== "desk") return false;
    if (action === "sent" && !requestSent(allotment)) return false;
    if (action === "unsent" && requestSent(allotment)) return false;
    return true;
  });

  const selectedStatus = statuses[0] ?? "";
  const selectedSupplier = supplierFilter[0] ?? "";
  const selectedPay = payFilter[0] ?? "";
  const filtersOpen = Boolean(
    number ||
      hotelId ||
      statuses.length ||
      hotelConf ||
      client ||
      guest ||
      city ||
      arrivalFrom ||
      arrivalTo ||
      departFrom ||
      departTo ||
      stayFrom ||
      stayTo ||
      createdFrom ||
      createdTo ||
      payBefore ||
      paymentNo ||
      amount != null ||
      closed ||
      channel ||
      source ||
      action ||
      supplierFilter.length ||
      payFilter.length,
  );

  return (
    <AdminShell
      title={copy.allotments}
      note={
        <span aria-live="polite" className="text-sm text-[var(--desk-muted)]">
          {countText(allotments.length, copy.allotmentCountOne, copy.allotmentCount)}
        </span>
      }
      actions={
        <Link href="/admin/purchases/new" className={adminButtonSecondaryClass}>
          {copy.newPurchase}
        </Link>
      }
    >
      {queue && (
        <p className="mb-4 rounded-lg border border-[var(--desk-warning-line)] bg-[var(--desk-warning-soft)] px-3 py-2 text-sm font-semibold text-[var(--desk-warning)]">
          {copy.cancellationQueue}
        </p>
      )}
      <section className="overflow-hidden rounded border border-[var(--desk-line)] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--desk-line)] px-3 py-2">
        <Link
          href="/admin/allotments/new"
          className="desk-focus inline-flex h-8 items-center rounded bg-[var(--desk-primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--desk-primary-hover)]"
        >
          {copy.newAllotment}
        </Link>
        <p className="font-plex text-sm font-semibold text-[var(--desk-ink)]">{allotments.length}</p>
      </div>
      <details className="border-b border-[var(--desk-line)]" {...(filtersOpen ? { open: true } : {})}>
        <summary className="cursor-pointer px-4 py-2 text-sm font-semibold text-[var(--desk-ink)]">
          {copy.searchOptions}
        </summary>
      <form action="/admin/allotments" method="get" className="px-4 pb-4">
        {queue ? <input type="hidden" name="cancel" value="requested" /> : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label={copy.number}>
            <input name="number" defaultValue={number} className={adminFieldClass} />
          </Field>
          <Field label={copy.hotel}>
            <select name="hotel" defaultValue={hotelId} className={adminFieldClass}>
              <option value="">{copy.all}</option>
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.status}>
            <select name="status" defaultValue={selectedStatus} className={adminFieldClass}>
              <option value="">{copy.all}</option>
              <option value="request">{copy.statusRequest}</option>
              <option value="provisional">{copy.statusProvisional}</option>
              <option value="confirmed">{copy.confirmed}</option>
              <option value="cancelled">{copy.cancelled}</option>
              <option value="no_show">{copy.statusNoShow}</option>
              <option value="unavailable">{copy.statusUnavailable}</option>
              <option value="regret">{copy.statusRegret}</option>
            </select>
          </Field>
          <Field label={copy.docHotelConf}>
            <input name="hotelConf" defaultValue={hotelConf} className={adminFieldClass} />
          </Field>
          <Field label={copy.client}>
            <input name="client" defaultValue={client} className={adminFieldClass} />
          </Field>
          <Field label={copy.guestName}>
            <input name="guest" defaultValue={guest} className={adminFieldClass} />
          </Field>
          <Field label={copy.city}>
            <select name="city" defaultValue={city ?? ""} className={adminFieldClass}>
              <option value="">{copy.all}</option>
              {cities.map((item) => (
                <option key={item} value={item}>
                  {cityLabels[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.listArrivalFrom}>
            <input type="date" name="arrivalFrom" defaultValue={arrivalFrom} className={adminFieldClass} />
          </Field>
          <Field label={copy.listArrivalTo}>
            <input type="date" name="arrivalTo" defaultValue={arrivalTo} className={adminFieldClass} />
          </Field>
          <Field label={copy.listDepartFrom}>
            <input type="date" name="departFrom" defaultValue={departFrom} className={adminFieldClass} />
          </Field>
          <Field label={copy.listDepartTo}>
            <input type="date" name="departTo" defaultValue={departTo} className={adminFieldClass} />
          </Field>
          <Field label={copy.listStayFrom}>
            <input type="date" name="stayFrom" defaultValue={stayFrom} className={adminFieldClass} />
          </Field>
          <Field label={copy.listStayTo}>
            <input type="date" name="stayTo" defaultValue={stayTo} className={adminFieldClass} />
          </Field>
          <Field label={copy.listPayStatus}>
            <select name="pay" defaultValue={selectedPay} className={adminFieldClass}>
              <option value="">{copy.all}</option>
              {paymentStatuses.map((item) => (
                <option key={item} value={item}>
                  {payLabels[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.lineSupplier}>
            <select name="supplier" defaultValue={selectedSupplier} className={adminFieldClass}>
              <option value="">{copy.all}</option>
              {lineSupplierStatuses.map((item) => (
                <option key={item} value={item}>
                  {supplierLabels[item]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={copy.paymentAmount}>
            <input name="amount" defaultValue={one(query.amount)} inputMode="decimal" className={adminFieldClass} />
          </Field>
          <Field label={copy.listPaymentNo}>
            <input name="paymentNo" defaultValue={one(query.paymentNo)} className={adminFieldClass} />
          </Field>
          <Field label={copy.cancelled}>
            <select name="closed" defaultValue={closed ?? ""} className={adminFieldClass}>
              <option value="">{copy.all}</option>
              <option value="cancelled">{copy.cancelled}</option>
              <option value="regret">{copy.statusRegret}</option>
            </select>
          </Field>
          <Field label={copy.saleChannel}>
            <select name="channel" defaultValue={channel ?? ""} className={adminFieldClass}>
              <option value="">{copy.all}</option>
              <option value="desk">{copy.channelDesk}</option>
              <option value="b2c">{copy.channelB2c}</option>
              <option value="b2b">{copy.channelB2b}</option>
              <option value="website">{copy.channelB2c} / {copy.channelB2b}</option>
            </select>
          </Field>
          <Field label={copy.saleSource}>
            <select name="source" defaultValue={source ?? ""} className={adminFieldClass}>
              <option value="">{copy.all}</option>
              <option value="contract">{copy.saleFromContract}</option>
              <option value="direct">{copy.saleHotelDirect}</option>
            </select>
          </Field>
          <Field label={copy.listCreatedFrom}>
            <input type="date" name="createdFrom" defaultValue={createdFrom} className={adminFieldClass} />
          </Field>
          <Field label={copy.listCreatedTo}>
            <input type="date" name="createdTo" defaultValue={createdTo} className={adminFieldClass} />
          </Field>
          <Field label={copy.payBefore}>
            <input type="date" name="payBefore" defaultValue={payBefore} className={adminFieldClass} />
          </Field>
          <Field label={copy.listActivity}>
            <select name="action" defaultValue={action ?? ""} className={adminFieldClass}>
              <option value="">{copy.all}</option>
              <option value="posted">{copy.listPostedAccounts}</option>
              <option value="unposted">{copy.listNotPostedAccounts}</option>
              <option value="arrival">{copy.payOnArrival}</option>
              <option value="sent">{copy.listRequestSent}</option>
              <option value="unsent">{copy.listRequestUnsent}</option>
            </select>
          </Field>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-4">
            <button
              type="submit"
              className="desk-focus inline-flex h-8 items-center rounded bg-[var(--desk-primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--desk-primary-hover)]"
            >
              {copy.search}
            </button>
            <Link href="/admin/allotments" className={adminButtonSecondaryClass}>
              {copy.listClear}
            </Link>
          </div>
          </div>
      </form>
      </details>

      {allotments.length ? (
        <ReservationRows
          allotments={[...allotments].sort((left, right) => right.createdAt.localeCompare(left.createdAt))}
          rollups={rollups}
          copy={copy}
          locale={locale}
          payLabels={payLabels}
          supplierLabels={supplierLabels}
        />
      ) : (
        <div className="px-5 py-10 text-center">
          <p className="font-medium text-[var(--desk-ink)]">
            {number
              ? fill(copy.noMatches, { query: number, count: all.length })
              : copy.noAllotments}
          </p>
          {number ? null : (
            <Link href="/admin/allotments/new" className={`${adminButtonClass} mt-4`}>
              {copy.newAllotment}
            </Link>
          )}
        </div>
      )}
      </section>
    </AdminShell>
  );
}

function ReservationRows({
  allotments,
  rollups,
  copy,
  locale,
  payLabels,
  supplierLabels,
}: {
  allotments: Allotment[];
  rollups: Map<string, PaymentRollup>;
  copy: AdminCopy;
  locale: string;
  payLabels: Record<PaymentListStatus, string>;
  supplierLabels: Record<LineSupplierStatus, string>;
}) {
  return (
    <div className="divide-y divide-[var(--desk-line)]">
      {allotments.map((allotment, index) => {
        const value = allotmentValue(allotment);
        const rollup = rollups.get(allotment.id);
        const pay = paymentListStatus(value.revenue, rollup);
        const counts = supplierCounts(allotment);
        const hotel = stayHotel(allotment);
        const href = `/admin/allotments/${allotment.id}/rooms`;
        const created = allotment.createdAt.slice(0, 10);
        const showDay = index === 0 || allotments[index - 1].createdAt.slice(0, 10) !== created;
        return (
          <div
            key={allotment.id}
            className="grid items-start gap-2 px-3 py-2 hover:bg-[var(--desk-canvas)] sm:grid-cols-[4.5rem_minmax(0,1.15fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_7.5rem_8rem_5.5rem] sm:gap-3"
          >
            <Link
              href={href}
              className="desk-focus font-plex text-lg font-semibold text-[var(--desk-primary)] hover:underline"
            >
              {allotment.number}
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm text-[var(--desk-ink)]">
                {allotment.agencyName}
                {allotment.guestName ? ` - ${allotment.guestName}` : ""}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <AllotmentStatusPill status={allotment.status} />
                <SaleChannelMark channel={allotment.channel} />
                {allotment.status === "cancelled" ? (
                  <DeleteCancelledAllotment id={allotment.id} number={allotment.number} compact />
                ) : null}
              </div>
            </div>
            <div className="min-w-0">
              <Link href={href} className="desk-focus block truncate text-sm font-medium text-[var(--desk-primary)] hover:underline">
                {hotel || "—"}
              </Link>
              <p className="font-plex text-xs text-[var(--desk-muted)]">
                {formatDateRange(allotment.checkIn, allotment.checkOut, locale)}
              </p>
            </div>
            <div>
              <p className="font-plex text-sm font-semibold text-[var(--desk-ink)]">
                {formatMoney(value.revenue, locale)}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <AdminStatusPill
                  tone={
                    pay === "paid"
                      ? "success"
                      : pay === "refund_due"
                        ? "danger"
                        : pay === "partial"
                          ? "warning"
                          : "neutral"
                  }
                >
                  {payLabels[pay]}
                </AdminStatusPill>
                {rollup?.posted ? <AdminStatusPill>{copy.paymentPosted}</AdminStatusPill> : null}
              </div>
              <p className="mt-1 text-xs text-[var(--desk-muted)]">
                {copy.payBefore} {allotment.payBefore ? formatDate(allotment.payBefore, locale) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[var(--desk-muted)]">{copy.docHotelConf}</p>
              <p className="font-plex text-sm">{allotment.supplierReference || "—"}</p>
            </div>
            <div className="flex flex-wrap content-start gap-1">
              <p className="w-full text-[11px] font-semibold text-[var(--desk-muted)]">{copy.lineSupplier}</p>
              {counts.length
                ? counts.map(([status, count]) => (
                    <span
                      key={status}
                      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold text-white ${supplierTone(status)}`}
                    >
                      {count}x {supplierLabels[status]}
                    </span>
                  ))
                : <span className="text-xs text-[var(--desk-muted)]">—</span>}
            </div>
            <p className="font-plex text-xs text-[var(--desk-muted)] sm:text-end">
              {showDay ? formatDate(created, locale) : ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function supplierTone(status: LineSupplierStatus) {
  if (status === "confirmed") return "bg-[var(--desk-success)]";
  if (status === "new") return "bg-[var(--desk-ink)]";
  if (status === "cancelled" || status === "no_show") return "bg-[var(--desk-danger)]";
  return "bg-[var(--desk-warning)]";
}

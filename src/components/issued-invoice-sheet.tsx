import localFont from "next/font/local";
import { DualDate } from "@/components/calendar-date-field";
import type { CompanyProfile } from "@/lib/company";
import type { IssuedInvoice } from "@/lib/invoices";
import { formatMoney } from "@/lib/money";

const amiri = localFont({
  src: "../lib/fonts/Amiri-Regular.ttf",
  display: "swap",
});

const text = {
  en: {
    title: "Invoice",
    lead: "Tax invoice",
    bill: "Bill to",
    guest: "Guest",
    hotel: "Hotel",
    booking: "Booking",
    description: "Description",
    qty: "Qty",
    net: "Without VAT",
    vat: "VAT",
    total: "Total",
    cr: "CR",
    vatNo: "VAT number",
  },
  ar: {
    title: "فاتورة ضريبية",
    lead: "فاتورة",
    bill: "فاتورة إلى",
    guest: "الضيف",
    hotel: "الفندق",
    booking: "الحجز",
    description: "البيان",
    qty: "الكمية",
    net: "دون الضريبة",
    vat: "الضريبة",
    total: "الإجمالي",
    cr: "السجل التجاري",
    vatNo: "الرقم الضريبي",
  },
} as const;

export function IssuedInvoiceSheet({
  invoice,
  company,
  format,
  locale,
  clientAr,
  clientVat,
  phone,
  email,
  hotels,
}: {
  invoice: IssuedInvoice;
  company: CompanyProfile;
  format: "en" | "ar";
  locale: string;
  clientAr: string;
  clientVat: string;
  phone: string;
  email: string;
  hotels: Record<string, string>;
}) {
  const arabic = format === "ar";
  const labels = arabic ? text.ar : text.en;
  const client = arabic && clientAr.trim() ? clientAr.trim() : invoice.agencyName;
  const address = arabic ? company.address.ar || company.address.en : company.address.en;
  const moneyLocale = arabic ? "ar" : locale;

  return (
    <article
      dir={arabic ? "rtl" : "ltr"}
      lang={arabic ? "ar" : "en"}
      className={`mx-auto max-w-3xl overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm ${arabic ? amiri.className : ""}`}
    >
      <header className="border-b-2 border-[var(--desk-ink)] px-6 py-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-lg font-bold text-[var(--desk-ink)]">{company.legalName || company.name}</p>
            {address ? <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--desk-muted)]">{address}</p> : null}
            <p className="mt-2 text-xs text-[var(--desk-text)]">
              {company.vatNumber ? (
                <span className="me-4">
                  {labels.vatNo} <span className="tabular-nums">{company.vatNumber}</span>
                </span>
              ) : null}
              {company.commercialRegistration ? (
                <span>
                  {labels.cr} <span className="tabular-nums">{company.commercialRegistration}</span>
                </span>
              ) : null}
            </p>
          </div>
          <div className={arabic ? "text-start" : "text-end"}>
            <p className="text-[11px] font-bold tracking-[0.18em] text-[var(--desk-muted)] uppercase">{labels.lead}</p>
            <h2 className="mt-1 text-2xl font-bold text-[var(--desk-ink)]">{labels.title}</h2>
            <p className="mt-1 text-lg font-bold tabular-nums text-[var(--desk-ink)]">{invoice.number}</p>
            <div className="mt-2">
              <DualDate iso={invoice.issuedOn} locale={locale} className={arabic ? "text-start" : "text-end"} />
            </div>
          </div>
        </div>
      </header>
      <div className="grid gap-4 border-b border-[var(--desk-line)] px-6 py-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-[var(--desk-muted)] uppercase">{labels.bill}</p>
          <p className="mt-1 text-sm font-bold text-[var(--desk-ink)]">{client}</p>
          {clientVat ? (
            <p className="mt-1 text-xs text-[var(--desk-text)]">
              {labels.vatNo} <span className="tabular-nums">{clientVat}</span>
            </p>
          ) : null}
          {phone ? <p className="text-xs tabular-nums text-[var(--desk-text)]">{phone}</p> : null}
          {email ? <p className="text-xs text-[var(--desk-text)]">{email}</p> : null}
        </div>
        <div className={arabic ? "sm:text-start" : "sm:text-end"}>
          <p className="text-[11px] font-bold tracking-wide text-[var(--desk-muted)] uppercase">{labels.booking}</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--desk-ink)]">
            {invoice.stays.map((stay) => stay.number).join(", ")}
          </p>
        </div>
      </div>
      {invoice.stays.map((stay) => {
        const hotel = arabic && hotels[stay.allotmentId]?.trim() ? hotels[stay.allotmentId].trim() : stay.hotelName;
        return (
          <section key={stay.allotmentId} className="px-6 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold text-[var(--desk-ink)]">
                <span className="tabular-nums">{stay.number}</span>
                <span className="ms-2 font-semibold">{hotel}</span>
              </h3>
              <span className="text-xs text-[var(--desk-muted)]">{stay.guestName || "—"}</span>
            </div>
            <div className="mt-1 flex gap-4">
              <DualDate iso={stay.checkIn} locale={locale} />
              <DualDate iso={stay.checkOut} locale={locale} />
            </div>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-y border-[var(--desk-line)] bg-[var(--desk-canvas)] text-[11px] font-bold tracking-wide text-[var(--desk-muted)] uppercase">
                  <th className="px-2 py-2 text-start">{labels.description}</th>
                  <th className="px-2 py-2 text-end">{labels.qty}</th>
                  <th className="px-2 py-2 text-end">{labels.net}</th>
                  <th className="px-2 py-2 text-end">{labels.vat}</th>
                  <th className="px-2 py-2 text-end">{labels.total}</th>
                </tr>
              </thead>
              <tbody>
                {stay.lines.map((line) => (
                  <tr key={line.id} className="border-b border-[var(--desk-line)]">
                    <td className="px-2 py-2 text-[var(--desk-text)]">
                      {line.label}
                      {line.detail ? <span className="text-[var(--desk-muted)]"> · {line.detail}</span> : null}
                    </td>
                    <td className="px-2 py-2 text-end tabular-nums">{line.quantity}</td>
                    <td className="px-2 py-2 text-end tabular-nums">{formatMoney(line.net, moneyLocale)}</td>
                    <td className="px-2 py-2 text-end tabular-nums">{formatMoney(line.vat, moneyLocale)}</td>
                    <td className="px-2 py-2 text-end font-semibold tabular-nums">{formatMoney(line.gross, moneyLocale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
      <footer className="border-t border-[var(--desk-line)] px-6 py-4">
        <dl className="ms-auto grid w-full max-w-xs gap-1 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[var(--desk-muted)]">{labels.net}</dt>
            <dd className="tabular-nums">{formatMoney(invoice.net, moneyLocale)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[var(--desk-muted)]">{labels.vat}</dt>
            <dd className="tabular-nums">{formatMoney(invoice.vat, moneyLocale)}</dd>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-[var(--desk-ink)] pt-2">
            <dt className="font-bold text-[var(--desk-ink)]">{labels.total}</dt>
            <dd className="text-base font-bold tabular-nums text-[var(--desk-ink)]">{formatMoney(invoice.gross, moneyLocale)}</dd>
          </div>
        </dl>
      </footer>
    </article>
  );
}

import { adminButtonClass, adminButtonSecondaryClass } from "@/components/admin-ui";
import type { AdminCopy } from "@/lib/admin-copy";
import {
  documentToggles,
  type ClientDocumentKind,
  type DocumentOptions,
  type DocumentSheet,
} from "@/lib/reservation-documents";
import { formatMoney } from "@/lib/money";

const titles: Record<ClientDocumentKind, keyof AdminCopy> = {
  amendment: "docAmendment",
  option_date: "docOptionDate",
  no_show: "docNoShow",
  voucher: "docVoucher",
  invoice: "docInvoice",
  non_refundable: "docNonRefundable",
  supplier_voucher: "docSupplierVoucher",
  rooming_list: "docRoomingList",
  lease: "docLease",
  price_offer: "docPriceOffer",
};

const toggleLabel: Record<string, keyof AdminCopy> = {
  arabic: "docArabic",
  hotelConf: "docHotelConf",
  terms: "docTerms",
  vat: "docVatNumber",
  remaining: "docRemaining",
  vatCharge: "docVatCharge",
  groupRooms: "docGroupRooms",
  sellingPrices: "docSellingPrices",
  groupRoomNumber: "docGroupRoomNumber",
};

export function ReservationDocumentSheet({
  allotmentId,
  kind,
  options,
  sheet,
  copy,
  locale,
}: {
  allotmentId: string;
  kind: ClientDocumentKind;
  options: DocumentOptions;
  sheet: DocumentSheet;
  copy: AdminCopy;
  locale: string;
}) {
  const title = copy[titles[kind]];
  const page = `/admin/allotments/${allotmentId}/documents/${kind}`;

  return (
    <div className="grid gap-6">
      <form method="get" className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="tuned" value="1" />
        {documentToggles[kind].map((toggle) => (
          <label key={toggle} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name={toggle} defaultChecked={options[toggle as keyof DocumentOptions]} />
            {copy[toggleLabel[toggle]]}
          </label>
        ))}
        <button type="submit" formAction={page} className={adminButtonSecondaryClass}>
          {copy.docPreview}
        </button>
        <button
          type="submit"
          formAction={`${page}/pdf`}
          className={adminButtonClass}
        >
          {copy.docSend}
        </button>
        <span className="text-sm text-[var(--desk-muted)]">{copy.docDownloadNote}</span>
      </form>
      <article className="rounded border border-[var(--desk-line)] bg-white p-6">
        <p className="text-xs font-semibold tracking-wide text-[var(--desk-muted)] uppercase">{title}</p>
        <h2 className="mt-1 text-xl font-semibold">{sheet.reference}</h2>
        <p className="mt-3">{sheet.hotel}</p>
        <p>{sheet.guest}</p>
        <p>{sheet.stay}</p>
        {sheet.hotelConfirmation ? (
          <p className="mt-2 text-sm">
            {copy.docHotelConf}: {sheet.hotelConfirmation}
          </p>
        ) : null}
        <table className="mt-4 w-full text-sm">
          <tbody>
            {sheet.lines.map((line, index) => (
              <tr key={`${line.room}-${index}`} className="border-t border-[var(--desk-line)]">
                <td className="py-2">{line.quantity}</td>
                <td className="py-2">{line.room}</td>
                <td className="py-2">
                  {line.board}
                  {line.view ? ` · ${line.view}` : ""}
                </td>
                <td className="py-2 text-end">
                  {line.amount === null ? "" : formatMoney(line.amount, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sheet.total !== null ? (
          <p className="mt-3 text-sm font-semibold">
            {copy.paymentTotal}: {formatMoney(sheet.total, locale)}
          </p>
        ) : null}
        {sheet.vatAmount !== null ? (
          <p className="text-sm">
            {copy.docVatCharge}: {formatMoney(sheet.vatAmount, locale)}
          </p>
        ) : null}
        {sheet.paid !== null ? (
          <p className="text-sm">
            {copy.paymentPaid}: {formatMoney(sheet.paid, locale)}
          </p>
        ) : null}
        {sheet.due !== null ? (
          <p className="text-sm">
            {copy.paymentDue}: {formatMoney(sheet.due, locale)}
          </p>
        ) : null}
        {options.vat ? <p className="mt-3 text-sm text-[var(--desk-muted)]">{copy.docVatNumber}</p> : null}
        {sheet.terms.map((term) => (
          <p key={term} className="mt-2 text-sm text-[var(--desk-muted)]">
            {term}
          </p>
        ))}
      </article>
    </div>
  );
}

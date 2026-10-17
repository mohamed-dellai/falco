"use client";

import Link from "next/link";
import { useState } from "react";
import {
  cancelAllotmentAction,
  cancelAllReservationAction,
  confirmAllReservationAction,
  confirmReservationAction,
  previewReservationNoticeAction,
  regretAllotmentAction,
  reservationNoShowAction,
  setReservationRequestAction,
  unavailableReservationAction,
} from "@/app/admin/actions";
import { MailNotifyDialog } from "@/components/mail-notify-dialog";
import { fill, type AdminCopy } from "@/lib/admin-copy";
import type { Allotment } from "@/lib/inventory";

const chip =
  "desk-focus desk-press inline-flex h-8 items-center rounded-lg border px-2.5 text-[13px] font-bold transition";

function tone(active: boolean, kind: "primary" | "success" | "danger" | "warning" | "ink" | "gold") {
  const rest = {
    primary:
      "border-[var(--desk-primary)] bg-[var(--desk-primary-soft)] text-[var(--desk-primary-deep)] hover:bg-[var(--desk-primary)] hover:text-white",
    success:
      "border-[var(--desk-success)] bg-[var(--desk-success-soft)] text-[var(--desk-success)] hover:bg-[var(--desk-success)] hover:text-white",
    danger:
      "border-[var(--desk-danger)] bg-[var(--desk-danger-soft)] text-[var(--desk-danger)] hover:bg-[var(--desk-danger)] hover:text-white",
    warning:
      "border-[var(--desk-warning)] bg-[var(--desk-warning-soft)] text-[var(--desk-warning)] hover:bg-[var(--desk-warning)] hover:text-white",
    ink: "border-[var(--desk-ink)] bg-white text-[var(--desk-ink)] hover:bg-[var(--desk-ink)] hover:text-white",
    gold: "border-[var(--desk-gold)] bg-[var(--desk-gold-soft)] text-[var(--desk-warning)] hover:bg-[var(--desk-warning)] hover:text-white",
  } as const;
  const current = {
    primary: "border-[var(--desk-primary)] bg-[var(--desk-primary)] text-white",
    success: "border-[var(--desk-success)] bg-[var(--desk-success)] text-white",
    danger: "border-[var(--desk-danger)] bg-[var(--desk-danger)] text-white",
    warning: "border-[var(--desk-warning)] bg-[var(--desk-warning)] text-white",
    ink: "border-[var(--desk-ink)] bg-[var(--desk-ink)] text-white",
    gold: "border-[var(--desk-gold)] bg-[var(--desk-gold)] text-white",
  } as const;
  return `${chip} ${active ? current[kind] : rest[kind]}`;
}

export function ReservationActions({
  allotment,
  copy,
  policies,
  invoice = null,
}: {
  allotment: Allotment;
  copy: AdminCopy;
  policies: { id: string; name: string }[];
  invoice?: { id: string; number: number } | null;
}) {
  const [overbook, setOverbook] = useState(false);
  const [ask, setAsk] = useState<
    | "confirm"
    | "confirm-all"
    | "cancel"
    | "cancel-all"
    | "regret"
    | "unavailable"
    | "no-show"
    | null
  >(null);
  if (allotment.channel === "b2c") return null;
  const status = allotment.status;
  const lines = allotment.lines;
  const allConfirmed = lines.length > 0 && lines.every((line) => line.supplierStatus === "confirmed");
  const allCancelled = lines.length > 0 && lines.every((line) => line.supplierStatus === "cancelled");
  const canConfirm = status === "request" || status === "provisional";
  const open = canConfirm || status === "confirmed";
  const askAction = {
    confirm: confirmReservationAction,
    "confirm-all": confirmAllReservationAction,
    cancel: cancelAllotmentAction,
    "cancel-all": cancelAllReservationAction,
    regret: regretAllotmentAction,
    unavailable: unavailableReservationAction,
    "no-show": reservationNoShowAction,
  } as const;
  const askMail = {
    confirm: "client.confirmation",
    "confirm-all": "client.confirmation",
    cancel: "client.cancel",
    "cancel-all": "client.cancel",
    regret: "client.regret",
    unavailable: "client.unavailable",
    "no-show": "client.no_show",
  } as const;

  return (
    <>
    <div className="flex flex-col items-start gap-2">
    <form className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="id" value={allotment.id} />
      {status === "provisional" ? (
        <span className={tone(true, "gold")}>{copy.statusProvisional}</span>
      ) : null}
      {status === "request" ? (
        <span className={tone(true, "primary")}>{copy.statusRequest}</span>
      ) : (
        <button type="submit" formAction={setReservationRequestAction} className={tone(false, "primary")}>
          {copy.statusRequest}
        </button>
      )}
      {canConfirm && allotment.saleSource !== "direct" ? (
        <label className="me-1 flex items-center gap-2 text-sm font-bold text-[var(--desk-ink)]">
          <input
            type="checkbox"
            name="useOverbook"
            checked={overbook}
            onChange={(event) => setOverbook(event.target.checked)}
          />
          {copy.useOverbook}
        </label>
      ) : null}
      {status === "confirmed" ? (
        <span className={tone(true, "success")}>{copy.confirmed}</span>
      ) : canConfirm ? (
        <button type="button" onClick={() => setAsk("confirm")} className={tone(false, "success")}>
          {copy.confirmAction}
        </button>
      ) : null}
      {open && lines.length > 0 && !(status === "confirmed" && allConfirmed) ? (
        <button type="button" onClick={() => setAsk("confirm-all")} className={tone(false, "success")}>
          {copy.confirmAll}
        </button>
      ) : null}
      {status === "cancelled" ? (
        <span className={tone(true, "danger")}>{copy.cancelled}</span>
      ) : (
        <button type="button" onClick={() => setAsk("cancel")} className={tone(false, "danger")}>
          {copy.cancelAction}
        </button>
      )}
      {status === "cancelled" && (lines.length === 0 || allCancelled) ? null : (
        <button type="button" onClick={() => setAsk("cancel-all")} className={tone(false, "danger")}>
          {copy.cancelAll}
        </button>
      )}
      {status === "no_show" ? (
        <span className={tone(true, "warning")}>{copy.statusNoShow}</span>
      ) : (
        <button type="button" onClick={() => setAsk("no-show")} className={tone(false, "warning")}>
          {copy.statusNoShow}
        </button>
      )}
      {status === "unavailable" ? (
        <span className={tone(true, "gold")}>{copy.statusUnavailable}</span>
      ) : (
        <button type="button" onClick={() => setAsk("unavailable")} className={tone(false, "gold")}>
          {copy.statusUnavailable}
        </button>
      )}
      {status === "regret" ? (
        <span className={tone(true, "ink")}>{copy.statusRegret}</span>
      ) : (
        <button type="button" onClick={() => setAsk("regret")} className={tone(false, "ink")}>
          {copy.statusRegret}
        </button>
      )}
    </form>
    <div className="flex flex-wrap items-center gap-1.5">
      {invoice ? (
        <Link href={`/admin/accounting/invoices/${invoice.id}`} className={tone(true, "success")}>
          {fill(copy.invoiceIssued, { number: invoice.number })}
        </Link>
      ) : status === "confirmed" ? (
        <Link href={`/admin/allotments/${allotment.id}/invoice`} className={tone(false, "primary")}>
          {copy.invoiceCreate}
        </Link>
      ) : (
        <span className={tone(false, "ink")}>{copy.invoiceMissing}</span>
      )}
    </div>
    </div>
    {ask ? (
      <MailNotifyDialog
        action={askAction[ask]}
        allotmentId={allotment.id}
        policies={policies}
        overbook={(ask === "confirm" || ask === "confirm-all") && overbook}
        copy={copy}
        onClose={() => setAsk(null)}
        load={(policyIds) => previewReservationNoticeAction({ id: allotment.id, kind: askMail[ask], policyIds })}
        refreshKey={ask}
      />
    ) : null}
    </>
  );
}

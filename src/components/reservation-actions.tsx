"use client";

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
import type { NoticeMailKind } from "@/lib/reservation-mail";

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
}: {
  allotment: Allotment;
  copy: AdminCopy;
  policies: { id: string; name: string }[];
}) {
  const [overbook, setOverbook] = useState(false);
  const [ask, setAsk] = useState<
    | "client.confirmation"
    | "client.cancel"
    | "client.regret"
    | "client.unavailable"
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
    "client.confirmation": confirmReservationAction,
    "client.cancel": cancelAllotmentAction,
    "client.regret": regretAllotmentAction,
    "client.unavailable": unavailableReservationAction,
  } as const;

  return (
    <>
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
        <button type="button" onClick={() => setAsk("client.confirmation")} className={tone(false, "success")}>
          {copy.confirmAction}
        </button>
      ) : null}
      {open && lines.length > 0 && !(status === "confirmed" && allConfirmed) ? (
        <button type="submit" formAction={confirmAllReservationAction} className={tone(false, "success")}>
          {copy.confirmAll}
        </button>
      ) : null}
      {status === "cancelled" ? (
        <span className={tone(true, "danger")}>{copy.cancelled}</span>
      ) : (
        <button type="button" onClick={() => setAsk("client.cancel")} className={tone(false, "danger")}>
          {copy.cancelAction}
        </button>
      )}
      {status === "cancelled" && (lines.length === 0 || allCancelled) ? null : (
        <button
          type="submit"
          formAction={cancelAllReservationAction}
          className={tone(false, "danger")}
          onClick={(event) => {
            if (!window.confirm(fill(copy.cancelAllotmentTitle, { number: allotment.number }))) {
              event.preventDefault();
            }
          }}
        >
          {copy.cancelAll}
        </button>
      )}
      {status === "no_show" ? (
        <span className={tone(true, "warning")}>{copy.statusNoShow}</span>
      ) : (
        <button
          type="submit"
          formAction={reservationNoShowAction}
          className={tone(false, "warning")}
          onClick={(event) => {
            if (!window.confirm(copy.statusNoShow)) event.preventDefault();
          }}
        >
          {copy.statusNoShow}
        </button>
      )}
      {status === "unavailable" ? (
        <span className={tone(true, "gold")}>{copy.statusUnavailable}</span>
      ) : (
        <button type="button" onClick={() => setAsk("client.unavailable")} className={tone(false, "gold")}>
          {copy.statusUnavailable}
        </button>
      )}
      {status === "regret" ? (
        <span className={tone(true, "ink")}>{copy.statusRegret}</span>
      ) : (
        <button type="button" onClick={() => setAsk("client.regret")} className={tone(false, "ink")}>
          {copy.statusRegret}
        </button>
      )}
    </form>
    {ask ? (
      <MailNotifyDialog
        action={askAction[ask]}
        allotmentId={allotment.id}
        policies={policies}
        overbook={ask === "client.confirmation" && overbook}
        copy={copy}
        onClose={() => setAsk(null)}
        load={(policyIds) => previewReservationNoticeAction({ id: allotment.id, kind: ask, policyIds })}
        refreshKey={ask}
      />
    ) : null}
    </>
  );
}

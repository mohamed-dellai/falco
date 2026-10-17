"use client";

import { useState } from "react";
import { previewReceiptNoticeAction, sendReceiptNoticeAction } from "@/app/admin/actions";
import { adminButtonSecondaryClass } from "@/components/admin-ui";
import { MailNotifyDialog } from "@/components/mail-notify-dialog";
import type { AdminCopy } from "@/lib/admin-copy";

export function PaymentReceiptButton({
  allotmentId,
  paymentId,
  policies,
  copy,
}: {
  allotmentId: string;
  paymentId: string;
  policies: { id: string; name: string }[];
  copy: AdminCopy;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={adminButtonSecondaryClass} onClick={() => setOpen(true)}>
        {copy.paymentReceipt}
      </button>
      {open ? (
        <MailNotifyDialog
          action={sendReceiptNoticeAction}
          allotmentId={allotmentId}
          policies={policies}
          copy={copy}
          onClose={() => setOpen(false)}
          load={(policyIds) => previewReceiptNoticeAction({ id: allotmentId, paymentId, policyIds })}
          refreshKey={paymentId}
          extra={<input type="hidden" name="paymentId" value={paymentId} />}
        />
      ) : null}
    </>
  );
}

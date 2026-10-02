"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  adminButtonDangerClass,
  adminButtonSecondaryClass,
} from "@/components/admin-ui";

export function NamedConfirm({
  title,
  body,
  confirm,
  pendingLabel,
  action,
  fields,
  trigger,
  cancelLabel,
  triggerClassName,
}: {
  title: string;
  body: string;
  confirm: string;
  pendingLabel: string;
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  trigger: string;
  cancelLabel: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogId = useId();
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        className={
          triggerClassName ??
          "desk-focus rounded-lg text-xs font-semibold text-[var(--desk-danger)]"
        }
      >
        {trigger}
      </button>
      <dialog
        id={dialogId}
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="desk-dialog"
        onCancel={(event) => {
          if (pending) {
            event.preventDefault();
            return;
          }
          setOpen(false);
        }}
        onClose={() => {
          setOpen(false);
          setPending(false);
        }}
        onClick={(event) => {
          if (!pending && event.target === event.currentTarget) setOpen(false);
        }}
      >
        <form
          action={action}
          onSubmit={() => setPending(true)}
          className="p-5 sm:p-6"
        >
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <h2 id={titleId} className="font-news text-2xl font-medium">
            {title}
          </h2>
          <p
            id={bodyId}
            className="mt-2 text-sm leading-6 text-[var(--desk-text)]"
          >
            {body}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className={adminButtonSecondaryClass}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={pending}
              className={`${adminButtonDangerClass} min-w-36`}
            >
              {pending ? pendingLabel : confirm}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

"use client";

import { useState } from "react";

export function NamedConfirm({
  title,
  body,
  confirm,
  pendingLabel,
  action,
  fields,
  trigger,
  cancelLabel = "Keep allotment",
}: {
  title: string;
  body: string;
  confirm: string;
  pendingLabel: string;
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  trigger: string;
  cancelLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-[#9b1c1c]"
      >
        {trigger}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#081c36]/40 p-4">
      <form
        action={action}
        onSubmit={() => setPending(true)}
        className="w-full max-w-md rounded-xl border border-[#dfe5ec] bg-white p-5 shadow-[0_16px_40px_-20px_rgba(8,28,54,0.45)]"
      >
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <h2 className="font-news text-xl font-medium">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#334155]">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-9 rounded-lg border border-[#c5ced8] px-3 text-sm font-semibold"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 min-w-36 items-center justify-center rounded-lg border border-[#e7b4b4] px-3 text-sm font-semibold text-[#9b1c1c] disabled:opacity-70"
          >
            {pending ? pendingLabel : confirm}
          </button>
        </div>
      </form>
    </div>
  );
}

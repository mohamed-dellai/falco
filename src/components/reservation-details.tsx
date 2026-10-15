"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

export function ReservationDetails({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-[var(--desk-line)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="desk-focus flex w-full items-center justify-between gap-3 px-4 py-3 text-start text-sm font-semibold text-[var(--desk-ink)] hover:bg-[var(--desk-canvas)] sm:px-5"
      >
        {title}
        <ChevronDown
          aria-hidden
          className={`size-4 shrink-0 text-[var(--desk-muted)] motion-safe:transition motion-safe:duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? children : null}
    </div>
  );
}

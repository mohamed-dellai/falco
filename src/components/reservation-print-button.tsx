"use client";

import { adminButtonClass } from "@/components/admin-ui";

export function ReservationPrintButton({ label }: { label: string }) {
  return (
    <button type="button" className={adminButtonClass} onClick={() => window.print()}>
      {label}
    </button>
  );
}

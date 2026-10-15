"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminCopy } from "@/lib/admin-copy";

const sections = [
  { id: "details", suffix: "/details" },
  { id: "rooms", suffix: "/rooms" },
  { id: "documents", suffix: "/documents" },
  { id: "payments", suffix: "/payments" },
  { id: "history", suffix: "" },
] as const;

export function ReservationSectionNav({
  allotmentId,
  copy,
  paymentAttention = false,
}: {
  allotmentId: string;
  copy: AdminCopy;
  paymentAttention?: boolean;
}) {
  const pathname = usePathname();
  const base = `/admin/allotments/${allotmentId}`;
  const labels: Record<(typeof sections)[number]["id"], string> = {
    details: copy.reservationSectionDetails,
    rooms: copy.reservationSectionRooms,
    documents: copy.reservationSectionDocuments,
    payments: copy.reservationSectionPayments,
    history: copy.reservationSectionHistory,
  };
  const current = pathname.startsWith(`${base}/details`)
    ? "details"
    : pathname.startsWith(`${base}/documents`)
    ? "documents"
    : pathname.startsWith(`${base}/payments`)
      ? "payments"
      : pathname.startsWith(`${base}/rooms`) || pathname.startsWith(`${base}/supplier`)
        ? "rooms"
        : pathname === base
          ? "history"
          : "";

  return (
    <nav
      aria-label={copy.reservationRecord}
      className="flex items-center gap-6 overflow-x-auto border-b border-[var(--desk-line)]"
    >
      {sections.map((section) => {
        const href = `${base}${section.suffix}`;
        const selected = current === section.id;
        return (
          <Link
            key={section.id}
            href={href}
            aria-current={selected ? "page" : undefined}
            className={`desk-focus -mb-px inline-flex items-center gap-1.5 border-b-2 px-0.5 pb-2.5 text-sm whitespace-nowrap text-black ${
              selected
                ? "border-[var(--desk-primary)] font-bold"
                : "border-transparent font-semibold"
            }`}
          >
            {labels[section.id]}
            {section.id === "payments" && paymentAttention ? (
              <span
                className="size-1.5 rounded-full bg-[var(--desk-gold)]"
                title={copy.paymentDue}
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

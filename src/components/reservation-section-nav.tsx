"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminCopy } from "@/lib/admin-copy";

const sections = [
  { id: "details", suffix: "/details" },
  { id: "rooms", suffix: "/rooms" },
  { id: "services", suffix: "/services" },
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
    services: copy.reservationSectionServices,
    documents: copy.reservationSectionDocuments,
    payments: copy.reservationSectionPayments,
    history: copy.reservationSectionHistory,
  };
  const current = pathname.startsWith(`${base}/details`)
    ? "details"
    : pathname.startsWith(`${base}/services`)
      ? "services"
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
    <nav aria-label={copy.reservationRecord} className="folio-index">
      {sections.map((section) => {
        const href = `${base}${section.suffix}`;
        const selected = current === section.id;
        return (
          <Link
            key={section.id}
            href={href}
            aria-current={selected ? "page" : undefined}
            className="folio-tab desk-focus"
          >
            <span className="folio-spine" aria-hidden="true" />
            {labels[section.id]}
            {section.id === "payments" && paymentAttention ? (
              <span className="folio-due" title={copy.paymentDue} />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

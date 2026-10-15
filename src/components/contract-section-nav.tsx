"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminCopy } from "@/lib/admin-copy";
import type { PurchaseStatus } from "@/lib/inventory";

const sections = [
  { id: "details", suffix: "", confirmed: false },
  { id: "rooms", suffix: "/rooms", confirmed: false },
  { id: "board", suffix: "/board", confirmed: false },
  { id: "periods", suffix: "/periods", confirmed: true },
  { id: "policies", suffix: "/policies", confirmed: true },
  { id: "photos", suffix: "/photos", confirmed: true },
] as const;

export function ContractSectionNav({
  purchaseId,
  status,
  copy,
}: {
  purchaseId: string;
  status: PurchaseStatus;
  copy: AdminCopy;
}) {
  const pathname = usePathname();
  const base = `/admin/purchases/${purchaseId}`;
  const labels: Record<(typeof sections)[number]["id"], string> = {
    details: copy.contractSectionDetails,
    rooms: copy.contractSectionRooms,
    board: copy.contractSectionBoard,
    periods: copy.contractSectionPeriods,
    policies: copy.contractSectionPolicies,
    photos: copy.photos,
  };
  const open = status !== "draft";

  return (
    <nav
      aria-label={copy.contractRecord}
      className="mb-4 flex gap-1 overflow-x-auto border-b border-[var(--desk-line)]"
    >
      {sections
        .filter((section) => open || !section.confirmed)
        .map((section) => {
          const href = `${base}${section.suffix}`;
          const selected = pathname === href;
          return (
            <Link
              key={section.id}
              href={href}
              aria-current={selected ? "page" : undefined}
              className={`desk-focus -mb-px border-b-2 px-3 py-2 text-sm font-semibold whitespace-nowrap ${
                selected
                  ? "border-[var(--desk-primary)] text-[var(--desk-primary)]"
                  : "border-transparent text-[var(--desk-muted)] hover:text-[var(--desk-ink)]"
              }`}
            >
              {labels[section.id]}
            </Link>
          );
        })}
    </nav>
  );
}

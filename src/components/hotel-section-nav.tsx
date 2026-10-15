"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminCopy } from "@/lib/admin-copy";

const sections = [
  { id: "details", suffix: "" },
  { id: "visibility", suffix: "/visibility" },
  { id: "offers", suffix: "/offers" },
  { id: "rules", suffix: "/rules" },
  { id: "contact", suffix: "/contact" },
  { id: "photos", suffix: "/photos" },
  { id: "stock", suffix: "/stock" },
] as const;

export function HotelSectionNav({
  hotelId,
  copy,
}: {
  hotelId: string;
  copy: AdminCopy;
}) {
  const pathname = usePathname();
  const base = `/admin/hotels/${hotelId}`;
  const labels: Record<(typeof sections)[number]["id"], string> = {
    details: copy.hotelSectionDetails,
    visibility: copy.hotelSectionVisibility,
    offers: copy.hotelSectionOffers,
    rules: copy.hotelSectionRules,
    contact: copy.hotelSectionContact,
    photos: copy.photos,
    stock: copy.hotelSectionStock,
  };

  return (
    <nav
      aria-label={copy.hotelRecord}
      className="mb-4 flex gap-1 overflow-x-auto border-b border-[var(--desk-line)]"
    >
      {sections.map((section) => {
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminCopy } from "@/lib/admin-copy";

const sections = [
  { id: "services", href: "/admin/services" },
  { id: "types", href: "/admin/services/types" },
] as const;

export function ServiceSectionNav({ copy }: { copy: AdminCopy }) {
  const pathname = usePathname();
  const current = pathname.startsWith("/admin/services/types") ? "types" : "services";
  const labels = {
    services: copy.services,
    types: copy.serviceTypes,
  } as const;

  return (
    <nav aria-label={copy.services} className="folio-index">
      {sections.map((section) => {
        const selected = current === section.id;
        return (
          <Link
            key={section.id}
            href={section.href}
            aria-current={selected ? "page" : undefined}
            className="folio-tab desk-focus"
          >
            <span className="folio-spine" aria-hidden="true" />
            {labels[section.id]}
          </Link>
        );
      })}
    </nav>
  );
}

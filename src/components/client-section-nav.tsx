"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminCopy } from "@/lib/admin-copy";
import type { ClientKind } from "@/lib/inventory";

const sections = [
  { id: "details", suffix: "", kinds: ["agency", "individual"] },
  { id: "access", suffix: "/access", kinds: ["agency"] },
  { id: "selling", suffix: "/selling", kinds: ["agency", "individual"] },
  { id: "codes", suffix: "/codes", kinds: ["agency"] },
  { id: "identity", suffix: "/identity", kinds: ["individual"] },
] as const;

export function ClientSectionNav({
  clientId,
  kind,
  copy,
}: {
  clientId: string;
  kind: ClientKind;
  copy: AdminCopy;
}) {
  const pathname = usePathname();
  const base = `/admin/agencies/${clientId}`;
  const labels: Record<(typeof sections)[number]["id"], string> = {
    details: copy.clientSectionDetails,
    access: copy.clientSectionAccess,
    selling: copy.clientSectionSelling,
    codes: copy.clientSectionCodes,
    identity: copy.clientSectionIdentity,
  };

  return (
    <nav
      aria-label={copy.clientRecord}
      className="mb-4 flex gap-1 overflow-x-auto border-b border-[var(--desk-line)]"
    >
      {sections
        .filter((section) => section.kinds.some((item) => item === kind))
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

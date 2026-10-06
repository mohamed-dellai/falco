import Link from "next/link";
import type { AdminCopy } from "@/lib/admin-copy";

export type SettingsSection = "company" | "accounts";

const sections = [
  { id: "company", href: "/admin/settings" },
  { id: "accounts", href: "/admin/settings?section=accounts" },
] as const;

export function settingsSection(value: string | undefined): SettingsSection {
  return value === "accounts" ? "accounts" : "company";
}

export function SettingsNav({
  active,
  copy,
}: {
  active: SettingsSection;
  copy: AdminCopy;
}) {
  const labels: Record<SettingsSection, string> = {
    company: copy.company,
    accounts: copy.accounts,
  };

  return (
    <nav
      aria-label={copy.settings}
      className="mb-4 flex gap-1 overflow-x-auto border-b border-[var(--desk-line)]"
    >
      {sections.map((section) => {
        const selected = active === section.id;
        return (
          <Link
            key={section.id}
            href={section.href}
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

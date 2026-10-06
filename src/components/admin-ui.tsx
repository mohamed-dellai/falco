import Link from "next/link";
import type { ReactNode } from "react";
import { Search } from "lucide-react";

export const adminFieldClass = "desk-field";

export const adminButtonClass =
  "desk-focus desk-press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-[var(--desk-primary)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--desk-primary-hover)] disabled:pointer-events-none disabled:opacity-55 lg:h-9 lg:min-h-9";

export const adminButtonSecondaryClass =
  "desk-focus desk-press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[var(--desk-line)] bg-white px-3.5 text-xs font-semibold text-[var(--desk-ink)] shadow-sm transition hover:bg-[var(--desk-surface-muted)] disabled:pointer-events-none disabled:opacity-55 lg:h-9 lg:min-h-9";

export const adminButtonGhostClass =
  "desk-focus inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-[var(--desk-muted)] transition hover:bg-[var(--desk-surface-muted)] hover:text-[var(--desk-ink)] disabled:pointer-events-none disabled:opacity-55 lg:h-9 lg:min-h-9";

export const adminButtonDangerClass =
  "desk-focus desk-press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-[var(--desk-line)] bg-white px-3.5 text-xs font-semibold text-[var(--desk-danger)] transition hover:bg-[var(--desk-danger-soft)] disabled:pointer-events-none disabled:opacity-55 lg:h-9 lg:min-h-9";

export function AdminPanel({
  title,
  description,
  actions,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-lg border border-[var(--desk-line)] bg-[var(--desk-surface)] shadow-sm ${className}`}
    >
      {(title || description || actions) && (
        <header className="flex flex-wrap items-start gap-3 border-b border-[var(--desk-line)] px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="font-news text-lg font-medium tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm leading-5 text-[var(--desk-muted)]">
                {description}
              </p>
            )}
          </div>
          {actions}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function AdminSectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-news text-xl font-medium tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-sm text-[var(--desk-muted)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function AdminSearchForm({
  action,
  placeholder,
  value = "",
  hidden = {},
  label,
}: {
  action: string;
  placeholder: string;
  value?: string;
  hidden?: Record<string, string | undefined>;
  label: string;
}) {
  return (
    <form
      action={action}
      method="get"
      role="search"
      className="min-w-0 w-full sm:w-72"
    >
      {Object.entries(hidden).map(([name, fieldValue]) =>
        fieldValue ? (
          <input key={name} type="hidden" name={name} value={fieldValue} />
        ) : null,
      )}
      <label className="relative block">
        <span className="sr-only">{label}</span>
        <Search
          aria-hidden="true"
          size={16}
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--desk-muted)]"
        />
        <input
          type="search"
          name="q"
          defaultValue={value}
          placeholder={placeholder}
          className={`${adminFieldClass} ps-9`}
        />
      </label>
    </form>
  );
}

export function AdminFilterBar({
  label,
  items,
}: {
  label: string;
  items: Array<{
    href: string;
    label: string;
    active: boolean;
    count?: number;
  }>;
}) {
  return (
    <nav
      aria-label={label}
      className="flex min-w-0 max-w-full gap-0 overflow-x-auto rounded-lg border border-[var(--desk-line)] bg-white shadow-sm"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`desk-focus flex min-h-11 shrink-0 items-center gap-2 border-e border-[var(--desk-line)] px-3 py-1.5 text-xs font-semibold transition last:border-e-0 lg:min-h-8 ${
            item.active
              ? "bg-[var(--desk-surface-muted)] text-[var(--desk-ink)]"
              : "text-[var(--desk-muted)] hover:bg-[var(--desk-surface-muted)] hover:text-[var(--desk-ink)]"
          }`}
        >
          {item.label}
          {item.count !== undefined && (
            <span
              className="font-plex text-[11px] text-[var(--desk-muted)]"
            >
              {item.count}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

export function AdminStatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const styles = {
    neutral: "bg-[var(--desk-neutral-soft)] text-[var(--desk-text-soft)]",
    success: "bg-[var(--desk-success-soft)] text-[var(--desk-success)]",
    warning: "bg-[var(--desk-warning-soft)] text-[var(--desk-warning)]",
    danger: "bg-[var(--desk-danger-soft)] text-[var(--desk-danger)]",
    info: "bg-[var(--desk-primary-soft)] text-[var(--desk-primary)]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section
      className={`rounded-lg border border-dashed border-[var(--desk-line-strong)] bg-white px-5 text-center shadow-sm ${
        compact ? "py-5" : "py-10"
      }`}
    >
      <h2
        className={`font-news font-medium ${compact ? "text-base" : "text-xl"}`}
      >
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-[var(--desk-muted)]">
          {description}
        </p>
      )}
      {action && (
        <div className={`flex justify-center ${compact ? "mt-3" : "mt-4"}`}>
          {action}
        </div>
      )}
    </section>
  );
}

export function AdminTableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
      {children}
    </div>
  );
}

export function AdminField({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`grid gap-1.5 text-xs font-semibold text-[var(--desk-text)] ${className}`}
    >
      {label}
      {children}
      {hint && (
        <span className="font-normal leading-5 text-[var(--desk-muted)]">
          {hint}
        </span>
      )}
    </label>
  );
}

export function AdminStatStrip({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; detail?: string }>;
}) {
  return (
    <section className="grid gap-px overflow-hidden rounded-lg border border-[var(--desk-line)] bg-[var(--desk-line)] shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className="bg-white px-4 py-3.5">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--desk-muted)]">
            {item.label}
          </span>
          <strong className="font-news mt-1 block text-2xl font-medium">
            {item.value}
          </strong>
          {item.detail && (
            <span className="mt-0.5 block text-xs text-[var(--desk-muted)]">
              {item.detail}
            </span>
          )}
        </article>
      ))}
    </section>
  );
}

export function AdminNotice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "danger";
}) {
  const styles = {
    info: "border-[var(--desk-info-line)] bg-[var(--desk-primary-soft)] text-[var(--desk-primary)]",
    success:
      "border-[var(--desk-success-line)] bg-[var(--desk-success-soft)] text-[var(--desk-success)]",
    warning:
      "border-[var(--desk-warning-line)] bg-[var(--desk-warning-soft)] text-[var(--desk-warning)]",
    danger:
      "border-[var(--desk-danger-line)] bg-[var(--desk-danger-soft)] text-[var(--desk-danger)]",
  };
  return (
    <p
      className={`rounded-xl border px-4 py-3 text-sm leading-6 ${styles[tone]}`}
    >
      {children}
    </p>
  );
}

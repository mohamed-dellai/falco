"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useTransition } from "react";
import { setAdminLocaleAction } from "@/app/admin/actions";
import { adminCopy, type AdminCopy, type AdminLocale } from "@/lib/admin-copy";

const AdminLocaleContext = createContext<AdminLocale>("en");

export function AdminLocaleProvider({
  locale,
  children,
}: {
  locale: AdminLocale;
  children: React.ReactNode;
}) {
  return (
    <AdminLocaleContext.Provider value={locale}>
      {children}
    </AdminLocaleContext.Provider>
  );
}

export function useAdminCopy(): AdminCopy {
  return adminCopy(useContext(AdminLocaleContext));
}

export function useAdminLocale() {
  return useContext(AdminLocaleContext);
}

export function LanguageSwitch({
  tone = "dark",
  compact = false,
}: {
  tone?: "dark" | "light";
  compact?: boolean;
}) {
  const locale = useAdminLocale();
  const copy = useAdminCopy();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: AdminLocale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setAdminLocaleAction(next);
      router.refresh();
    });
  }

  const idle =
    tone === "dark"
      ? "text-white/50 hover:text-white"
      : "text-[var(--desk-muted)] hover:text-[var(--desk-ink)]";
  const active =
    tone === "dark"
      ? "text-[var(--desk-gold-soft)]"
      : "text-[var(--desk-primary)]";

  return (
    <div
      className={
        compact
          ? "flex items-center rounded-md bg-[var(--desk-surface-muted)] p-0.5 text-[10px] font-semibold"
          : "flex items-center gap-2 px-3 text-xs font-semibold"
      }
    >
      <button
        type="button"
        onClick={() => choose("en")}
        disabled={pending}
        lang="en"
        aria-label={copy.switchToEnglish}
        aria-pressed={locale === "en"}
        className={`desk-focus rounded-md disabled:opacity-55 ${
          compact ? "px-1.5 py-0.5" : "min-h-10 px-1"
        } ${
          locale === "en"
            ? compact
              ? "bg-white text-[var(--desk-ink)] shadow-sm"
              : active
            : idle
        }`}
      >
        {compact ? "EN" : copy.english}
      </button>
      {compact ? null : (
        <span
          aria-hidden="true"
          className={
            tone === "dark" ? "text-white/25" : "text-[var(--desk-line-strong)]"
          }
        >
          /
        </span>
      )}
      <button
        type="button"
        onClick={() => choose("fr")}
        disabled={pending}
        lang="fr"
        aria-label={copy.switchToFrench}
        aria-pressed={locale === "fr"}
        className={`desk-focus rounded-md disabled:opacity-55 ${
          compact ? "px-1.5 py-0.5" : "min-h-10 px-1"
        } ${
          locale === "fr"
            ? compact
              ? "bg-white text-[var(--desk-ink)] shadow-sm"
              : active
            : idle
        }`}
      >
        {compact ? "FR" : copy.french}
      </button>
    </div>
  );
}

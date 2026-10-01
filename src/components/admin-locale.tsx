"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext } from "react";
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
    <AdminLocaleContext.Provider value={locale}>{children}</AdminLocaleContext.Provider>
  );
}

export function useAdminCopy(): AdminCopy {
  return adminCopy(useContext(AdminLocaleContext));
}

export function useAdminLocale() {
  return useContext(AdminLocaleContext);
}

export function LanguageSwitch({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const locale = useAdminLocale();
  const copy = useAdminCopy();
  const router = useRouter();

  async function choose(next: AdminLocale) {
    if (next === locale) return;
    await setAdminLocaleAction(next);
    router.refresh();
  }

  const idle =
    tone === "dark"
      ? "text-white/50 hover:text-white"
      : "text-[#5c6470] hover:text-[#081c36]";
  const active = tone === "dark" ? "text-[#ffdf98]" : "text-[#0e4d8c]";

  return (
    <div className="flex items-center gap-2 px-3 text-xs font-semibold">
      <button
        type="button"
        onClick={() => choose("en")}
        className={locale === "en" ? active : idle}
        aria-pressed={locale === "en"}
      >
        {copy.english}
      </button>
      <span className={tone === "dark" ? "text-white/25" : "text-[#c5ced8]"}>/</span>
      <button
        type="button"
        onClick={() => choose("fr")}
        className={locale === "fr" ? active : idle}
        aria-pressed={locale === "fr"}
      >
        {copy.french}
      </button>
    </div>
  );
}

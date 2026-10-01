"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/admin/actions";
import { LanguageSwitch, useAdminCopy } from "@/components/admin-locale";
import { fill, type AdminCopy } from "@/lib/admin-copy";

const links = [
  { href: "/admin", label: "overview", icon: "ti-layout-dashboard", exact: true },
  { href: "/admin/hotels", label: "hotels", icon: "ti-building-hotel", exact: false },
  { href: "/admin/purchases", label: "purchases", icon: "ti-receipt", exact: false },
  { href: "/admin/agencies", label: "agencies", icon: "ti-building-store", exact: false },
  { href: "/admin/forms", label: "requests", icon: "ti-inbox", exact: false },
  { href: "/admin/assignments", label: "allotments", icon: "ti-bed", exact: false },
] as const;

export const adminFieldClass =
  "h-9 w-full rounded-lg border border-[#dfe5ec] bg-white px-2.5 text-sm text-[#081c36] outline-none focus:border-[#0e4d8c]";

export const adminButtonClass =
  "desk-press inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0e4d8c] px-3.5 text-sm font-semibold text-white hover:bg-[#0c4379] disabled:opacity-70";

export const adminButtonSecondaryClass =
  "desk-press inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#c5ced8] bg-white px-3.5 text-sm font-semibold text-[#172033] hover:border-[#0e4d8c]/45 hover:text-[#0e4d8c] disabled:opacity-70";

export function adminErrorMessage(
  code: string | undefined,
  copy: AdminCopy,
  remaining?: string,
) {
  if (code === "photo") return copy.photoError;
  if (code === "quantity") return fill(copy.quantityError, { count: remaining ?? 0 });
  if (code === "dates") return copy.datesError;
  if (code === "span") return copy.spanError;
  if (code === "lines") return copy.linesError;
  if (code === "allotment-lines") return copy.allotmentLinesError;
  if (code === "agency") return copy.agencyError;
  if (code === "cancel") return copy.cancelError;
  if (code === "purchased") return copy.purchasedError;
  if (code === "allotted") return copy.allottedError;
  if (code === "missing-room") return copy.missingRoomError;
  if (code) return copy.invalidError;
  return "";
}

export function AdminShell({
  title,
  crumbs,
  actions,
  note,
  searchPlaceholder,
  children,
}: {
  title: string;
  crumbs?: Array<{ href: string; label: string }>;
  actions?: React.ReactNode;
  note?: React.ReactNode;
  searchPlaceholder?: string;
  children: React.ReactNode;
}) {
  const copy = useAdminCopy();

  return (
    <div className="min-h-screen bg-[#fbf9f5] text-[#081c36] lg:ps-[260px]">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[260px] flex-col bg-[#081c36] text-white lg:flex">
        <Link href="/admin" className="flex items-center gap-3 px-5 pt-6 pb-5">
          <Image
            src="/falco-logo.png"
            alt=""
            width={36}
            height={36}
            className="size-9 rounded bg-white object-cover"
          />
          <span className="flex items-baseline gap-2.5">
            <strong className="font-news text-[21px] font-medium tracking-tight">
              {copy.brand}
            </strong>
            <small className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              {copy.desk}
            </small>
          </span>
        </Link>
        <AdminNav className="mt-1 grid gap-1 px-3" />
        <div className="mt-auto grid gap-0.5 border-t border-white/10 px-3 py-4">
          <LanguageSwitch />
          <Link
            href="/en"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-white/50 hover:text-white"
          >
            <i aria-hidden="true" className="ti ti-external-link text-[16px]" />
            {copy.publicSite}
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-[13px] font-medium text-white/50 hover:text-white"
            >
              <i aria-hidden="true" className="ti ti-logout text-[16px]" />
              {copy.logOut}
            </button>
          </form>
        </div>
      </aside>

      <div className="sticky top-0 z-20 flex items-center gap-2 overflow-x-auto border-b border-[#dfe5ec] bg-[#fbf9f5] px-3 py-2 lg:hidden">
        <strong className="font-news shrink-0 text-sm">{copy.brand}</strong>
        <LanguageSwitch tone="light" />
        <AdminNav className="flex gap-1" compact />
      </div>

      <div>
        <header className="sticky top-0 z-20 border-b border-[#dfe5ec] bg-[#fbf9f5]/90 backdrop-blur lg:top-0">
          <div className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-3 md:px-8">
            <div className="min-w-0">
              {crumbs && crumbs.length > 0 && (
                <p className="mb-0.5 text-xs text-[#5c6470]">
                  {crumbs.map((crumb, index) => (
                    <span key={crumb.href}>
                      {index > 0 && <span className="px-1">/</span>}
                      <Link href={crumb.href} className="hover:text-[#0e4d8c]">
                        {crumb.label}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
              <h1 className="font-news text-[23px] font-medium tracking-tight">{title}</h1>
            </div>
            {note}
            <div className="ms-auto flex flex-wrap items-center gap-3">
              <AdminSearch placeholder={searchPlaceholder ?? copy.search} />
              {actions}
            </div>
          </div>
        </header>
        <div id="admin-page" className="px-4 py-6 md:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}

function AdminSearch({ placeholder }: { placeholder: string }) {
  const copy = useAdminCopy();
  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState("");

  useEffect(() => {
    const root = document.getElementById("admin-page");
    if (!root) return;

    const apply = () => {
      const needle = query.trim().toLowerCase();
      const items = root.querySelectorAll<HTMLElement>("[data-search-item]");
      let visible = 0;
      items.forEach((item) => {
        const match =
          needle.length === 0 ||
          (item.textContent ?? "").toLowerCase().includes(needle);
        if (item.hidden !== !match) item.hidden = !match;
        if (match) visible += 1;
      });
      const nextSummary =
        needle.length === 0
          ? ""
          : visible === 0
            ? fill(copy.noMatches, { query: query.trim(), count: items.length })
            : fill(copy.showing, { visible, total: items.length });
      setSummary((current) => (current === nextSummary ? current : nextSummary));
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [query, copy]);

  return (
    <div className="w-full sm:w-64">
      <label className="flex h-9 items-center gap-2 rounded-lg border border-[#dfe5ec] bg-white px-3 focus-within:border-[#0e4d8c]">
        <i aria-hidden="true" className="ti ti-search text-[16px] text-[#5c6470]" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-[#8b93a1]"
        />
      </label>
      {summary && (
        <p className="mt-1 text-xs text-[#5c6470]">
          {summary}{" "}
          <button
            type="button"
            onClick={() => setQuery("")}
            className="font-semibold text-[#0e4d8c]"
          >
            {copy.clearSearch}
          </button>
        </p>
      )}
    </div>
  );
}

function AdminNav({
  className,
  compact = false,
}: {
  className: string;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const copy = useAdminCopy();
  const [fresh, setFresh] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetch("/api/admin/nav")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { newRequests?: number } | null) => {
        if (!ignore && body) setFresh(body.newRequests ?? 0);
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [pathname]);

  return (
    <nav className={className}>
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
              compact
                ? active
                  ? "bg-[#081c36] text-[#ffdf98]"
                  : "text-[#5c6470]"
                : active
                  ? "bg-white/[0.08] text-[#ffdf98]"
                  : "text-white/60 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <i aria-hidden="true" className={`ti ${link.icon} text-[18px]`} />
            {copy[link.label]}
            {link.href === "/admin/forms" && fresh > 0 && (
              <span className="ms-auto rounded-full bg-[#c59b27]/25 px-2 py-0.5 text-xs font-semibold text-[#ffdf98]">
                {fill(copy.newCount, { count: fresh })}
              </span>
            )}
            {active && !compact && (
              <span className="absolute end-0 top-2.5 bottom-2.5 w-[3px] rounded-s-full bg-[#c59b27]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminPanel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-[#dfe5ec] bg-white ${className}`}>
      {title && (
        <header className="border-b border-[#eef0f3] px-4 py-2.5 text-sm font-semibold">
          {title}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function AdminError({
  code,
  remaining,
}: {
  code?: string;
  remaining?: string;
}) {
  const copy = useAdminCopy();
  const message = adminErrorMessage(code, copy, remaining);
  const [open, setOpen] = useState(Boolean(message));

  useEffect(() => {
    setOpen(Boolean(message));
  }, [message]);

  if (!message || !open) return null;
  return (
    <div
      role="status"
      className="fixed end-5 bottom-5 z-50 w-[min(100%-2rem,24rem)] rounded-xl border border-[#f3c7c7] bg-white px-4 py-3 text-sm text-[#9b1c1c] shadow-[0_16px_40px_-20px_rgba(8,28,54,0.45)]"
    >
      <p>{message}</p>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-2 text-xs font-semibold text-[#081c36]"
      >
        {copy.dismiss}
      </button>
    </div>
  );
}

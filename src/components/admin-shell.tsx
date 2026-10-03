"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ComponentType } from "react";
import {
  AlertCircle,
  BedDouble,
  Users,
  DoorOpen,
  CalendarCheck2,
  ExternalLink,
  Hotel,
  Inbox,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  ReceiptText,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import {
  LanguageSwitch,
  useAdminCopy,
  useAdminLocale,
} from "@/components/admin-locale";
import {
  AdminPanel,
  adminButtonClass,
  adminButtonDangerClass,
  adminButtonGhostClass,
  adminButtonSecondaryClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { fill, type AdminCopy } from "@/lib/admin-copy";

type NavItem = {
  href: string;
  label: keyof AdminCopy;
  icon: ComponentType<{
    size?: number;
    className?: string;
    "aria-hidden"?: boolean;
  }>;
  exact?: boolean;
};

const overviewLink: NavItem = {
  href: "/admin",
  label: "overview",
  icon: LayoutDashboard,
  exact: true,
};
const hotelLink: NavItem = {
  href: "/admin/hotels",
  label: "hotels",
  icon: Hotel,
};
const requestLink: NavItem = {
  href: "/admin/forms",
  label: "requests",
  icon: Inbox,
};
const allotmentLink: NavItem = {
  href: "/admin/allotments",
  label: "allotments",
  icon: BedDouble,
};
const navigationGroups: Array<{
  label: keyof AdminCopy;
  items: NavItem[];
}> = [
  {
    label: "deskGroup",
    items: [
      overviewLink,
      requestLink,
      {
        href: "/admin/bookings",
        label: "bookings",
        icon: CalendarCheck2,
      },
    ],
  },
  {
    label: "inventoryGroup",
    items: [
      hotelLink,
      {
        href: "/admin/rooms",
        label: "rooms",
        icon: DoorOpen,
      },
      {
        href: "/admin/purchases",
        label: "purchases",
        icon: ReceiptText,
      },
      allotmentLink,
    ],
  },
  {
    label: "partnersGroup",
    items: [
      {
        href: "/admin/agencies",
        label: "agencies",
        icon: Users,
      },
    ],
  },
];
const mobilePrimary = [
  overviewLink,
  hotelLink,
  requestLink,
  allotmentLink,
] as const;

export {
  AdminPanel,
  adminButtonClass,
  adminButtonDangerClass,
  adminButtonGhostClass,
  adminButtonSecondaryClass,
  adminFieldClass,
};

export function adminErrorMessage(
  code: string | undefined,
  copy: AdminCopy,
  remaining?: string,
) {
  if (code === "photo") return copy.photoError;
  if (code === "quantity")
    return fill(copy.quantityError, { count: remaining ?? 0 });
  if (code === "dates") return copy.datesError;
  if (code === "dates-sold") return copy.datesSoldError;
  if (code === "duplicate") return copy.duplicateRoomError;
  if (code === "span") return copy.spanError;
  if (code === "lines") return copy.linesError;
  if (code === "allotment-lines") return copy.allotmentLinesError;
  if (code === "agency") return copy.agencyError;
  if (code === "cancel") return copy.cancelError;
  if (code === "purchased") return copy.purchasedError;
  if (code === "allotted") return copy.allottedError;
  if (code === "booked") return copy.bookedError;
  if (code === "missing-room") return copy.missingRoomError;
  if (code === "purchase") return copy.purchaseError;
  if (code === "allotment") return copy.allotmentError;
  if (code) return copy.invalidError;
  return "";
}

export function AdminLoadingStatus() {
  const copy = useAdminCopy();
  return <span className="sr-only">{copy.loading}</span>;
}

export function AdminShell({
  title,
  crumbs,
  actions,
  note,
  children,
}: {
  title: string;
  crumbs?: Array<{ href: string; label: string }>;
  actions?: React.ReactNode;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  const copy = useAdminCopy();
  const locale = useAdminLocale();

  return (
    <div className="admin-desk min-h-screen lg:ps-[var(--desk-sidebar-width)]">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[var(--desk-sidebar-width)] flex-col bg-[var(--desk-ink)] text-white lg:flex">
        <Link
          href="/admin"
          className="desk-focus mx-3 mt-3 flex items-center gap-3 rounded-xl px-3 py-3"
        >
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
        <AdminNav />
        <div className="mt-auto grid gap-0.5 border-t border-white/10 px-3 py-4">
          <LanguageSwitch />
          <Link
            href={`/${locale}`}
            className="desk-focus flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-white/55 hover:bg-white/[0.06] hover:text-white"
          >
            <ExternalLink aria-hidden="true" size={17} />
            {copy.publicSite}
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="desk-focus flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-[13px] font-medium text-white/55 hover:bg-white/[0.06] hover:text-white"
            >
              <LogOut aria-hidden="true" size={17} />
              {copy.logOut}
            </button>
          </form>
        </div>
      </aside>

      <div className="min-h-screen pb-24 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-[var(--desk-line)] bg-[color:rgb(247_245_240_/_0.94)] backdrop-blur-md">
          <div className="mx-auto flex min-h-[4.5rem] max-w-[1180px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <Link
              href="/admin"
              className="desk-focus me-1 flex items-center gap-2 rounded-lg lg:hidden"
              aria-label={copy.overview}
            >
              <Image
                src="/falco-logo.png"
                alt=""
                width={30}
                height={30}
                className="size-[30px] rounded-md bg-white object-cover"
              />
            </Link>
            <div className="min-w-0 flex-1">
              {crumbs && crumbs.length > 0 && (
                <p className="mb-0.5 truncate text-xs text-[var(--desk-muted)]">
                  {crumbs.map((crumb, index) => (
                    <span key={crumb.href}>
                      {index > 0 && <span className="px-1">/</span>}
                      <Link
                        href={crumb.href}
                        className="desk-focus rounded-sm hover:text-[var(--desk-primary)]"
                      >
                        {crumb.label}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-news truncate text-[23px] font-medium tracking-tight sm:text-[25px]">
                  {title}
                </h1>
                {note}
              </div>
            </div>
            {actions && (
              <div className="flex w-full max-w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
                {actions}
              </div>
            )}
          </div>
        </header>
        <main
          id="admin-page"
          className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
        >
          {children}
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  if (
    item.href === "/admin/allotments" &&
    pathname.startsWith("/admin/assignments")
  ) {
    return true;
  }
  return pathname.startsWith(item.href);
}

function useFreshRequests() {
  const pathname = usePathname();
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
  return fresh;
}

function AdminNav() {
  const pathname = usePathname();
  const copy = useAdminCopy();
  const fresh = useFreshRequests();

  return (
    <nav aria-label={copy.mainNavigation} className="mt-2 grid gap-5 px-3">
      {navigationGroups.map((group) => (
        <section key={group.label}>
          <h2 className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            {copy[group.label]}
          </h2>
          <div className="mt-1 grid gap-1">
            {group.items.map((item) => (
              <DesktopNavLink
                key={item.href}
                item={item}
                active={isActive(pathname, item)}
                fresh={fresh}
              />
            ))}
          </div>
        </section>
      ))}
    </nav>
  );
}

function DesktopNavLink({
  item,
  active,
  fresh,
}: {
  item: NavItem;
  active: boolean;
  fresh: number;
}) {
  const copy = useAdminCopy();
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`desk-focus relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-white/[0.09] text-[var(--desk-gold-soft)]"
          : "text-white/60 hover:bg-white/[0.06] hover:text-white"
      }`}
    >
      <Icon aria-hidden={true} size={18} />
      <span>{copy[item.label]}</span>
      {item.href === "/admin/forms" && fresh > 0 && (
        <span className="ms-auto rounded-full bg-[var(--desk-gold)]/25 px-2 py-0.5 text-[11px] font-semibold text-[var(--desk-gold-soft)]">
          {fill(copy.newCount, { count: fresh })}
        </span>
      )}
      {active && (
        <span className="absolute end-0 top-2.5 bottom-2.5 w-[3px] rounded-s-full bg-[var(--desk-gold)]" />
      )}
    </Link>
  );
}

function MobileNavigation() {
  const pathname = usePathname();
  const copy = useAdminCopy();
  const locale = useAdminLocale();
  const fresh = useFreshRequests();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogId = useId();
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const moreItems = navigationGroups
    .flatMap((group) => group.items)
    .filter(
      (item) => !mobilePrimary.some((primary) => primary.href === item.href),
    );

  return (
    <>
      <nav
        aria-label={copy.mobileNavigation}
        className="desk-mobile-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--desk-line)] bg-white/95 px-2 pt-1.5 shadow-[0_-14px_30px_-24px_rgba(8,28,54,0.45)] backdrop-blur lg:hidden"
      >
        {mobilePrimary.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`desk-focus relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold ${
                active
                  ? "bg-[var(--desk-surface-muted)] text-[var(--desk-ink)]"
                  : "text-[var(--desk-muted)]"
              }`}
            >
              <Icon aria-hidden={true} size={19} />
              <span className="max-w-full truncate">{copy[item.label]}</span>
              {item.href === "/admin/forms" && fresh > 0 && (
                <span className="absolute end-[20%] top-1.5 size-2 rounded-full bg-[var(--desk-gold)]" />
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={dialogId}
          className="desk-focus flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold text-[var(--desk-muted)]"
        >
          <MoreHorizontal aria-hidden="true" size={19} />
          {copy.more}
        </button>
      </nav>

      <dialog
        id={dialogId}
        ref={dialogRef}
        aria-labelledby={titleId}
        className="desk-dialog mt-auto mb-0 w-full max-w-none rounded-t-2xl rounded-b-none lg:hidden"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div className="desk-mobile-safe p-4">
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="font-news text-xl font-medium">
              {copy.more}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="desk-focus grid size-10 place-items-center rounded-lg text-[var(--desk-muted)]"
              aria-label={copy.closeMenu}
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>
          <nav className="mt-3 grid gap-1">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`desk-focus flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${
                    active
                      ? "bg-[var(--desk-surface-muted)] text-[var(--desk-ink)]"
                      : "text-[var(--desk-muted)]"
                  }`}
                >
                  <Icon aria-hidden={true} size={19} />
                  {copy[item.label]}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-[var(--desk-line)] pt-4">
            <LanguageSwitch tone="light" />
            <Link
              href={`/${locale}`}
              className="desk-focus mt-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[var(--desk-muted)]"
            >
              <ExternalLink aria-hidden="true" size={18} />
              {copy.publicSite}
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="desk-focus flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-start text-sm font-semibold text-[var(--desk-danger)]"
              >
                <LogOut aria-hidden="true" size={18} />
                {copy.logOut}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
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
  const [dismissed, setDismissed] = useState<string | null>(null);

  if (!message || dismissed === message) return null;
  return (
    <div
      role="alert"
      className="desk-toast fixed end-4 bottom-24 z-50 w-[min(100%-2rem,24rem)] rounded-2xl border border-[var(--desk-danger-line)] bg-white px-4 py-3 text-sm text-[var(--desk-danger)] shadow-[0_18px_48px_-22px_rgba(8,28,54,0.55)] lg:bottom-5"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle
          aria-hidden="true"
          size={17}
          className="mt-0.5 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p>{message}</p>
          <button
            type="button"
            onClick={() => setDismissed(message)}
            className="desk-focus mt-2 rounded text-xs font-semibold text-[var(--desk-ink)]"
          >
            {copy.dismiss}
          </button>
        </div>
      </div>
    </div>
  );
}

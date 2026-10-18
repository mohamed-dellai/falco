"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  AlertCircle,
  BedDouble,
  Bell,
  ChartNoAxesCombined,
  ConciergeBell,
  Users,
  Settings,
  ExternalLink,
  Hotel,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Landmark,
  ReceiptText,
  Search,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { accountInitials, useAdminAccount } from "@/components/admin-account";
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

type NavChild = {
  href: string;
  label: keyof AdminCopy;
  kind: "prefix" | "records" | "requests";
};

type NavItem = {
  href: string;
  label: keyof AdminCopy;
  icon: ComponentType<{
    size?: number;
    className?: string;
    "aria-hidden"?: boolean;
  }>;
  exact?: boolean;
  children?: NavChild[];
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
const allotmentLink: NavItem = {
  href: "/admin/allotments",
  label: "allotments",
  icon: BedDouble,
  children: [
    { href: "/admin/allotments", label: "allotments", kind: "records" },
    { href: "/admin/allotments?channel=b2b", label: "requests", kind: "requests" },
    { href: "/admin/allotments/actions", label: "reservationNavActions", kind: "prefix" },
    { href: "/admin/allotments/follow-up", label: "reservationNavFollow", kind: "prefix" },
    { href: "/admin/allotments/charts", label: "reservationNavCharts", kind: "prefix" },
    { href: "/admin/allotments/mailing", label: "reservationNavMail", kind: "prefix" },
  ],
};
const reportsLink: NavItem = {
  href: "/admin/reports",
  label: "reports",
  icon: ChartNoAxesCombined,
};
const servicesLink: NavItem = {
  href: "/admin/services",
  label: "services",
  icon: ConciergeBell,
};

const clientsLink: NavItem = {
  href: "/admin/agencies",
  label: "directory",
  icon: Users,
  children: [
    { href: "/admin/agencies", label: "agencies", kind: "records" },
    { href: "/admin/commercials", label: "commercials", kind: "prefix" },
    { href: "/admin/client-groups", label: "clientGroups", kind: "prefix" },
  ],
};

const accountingLink: NavItem = {
  href: "/admin/accounting",
  label: "accounting",
  icon: Landmark,
  children: [
    { href: "/admin/accounting/invoices", label: "invoicePhase1", kind: "prefix" },
    { href: "/admin/accounting/phase-2", label: "invoicePhase2", kind: "prefix" },
    { href: "/admin/accounting/payments", label: "allPayments", kind: "prefix" },
  ],
};
const navigationGroups: Array<{
  label: keyof AdminCopy;
  items: NavItem[];
}> = [
  {
    label: "deskGroup",
      items: [overviewLink, allotmentLink, servicesLink, accountingLink, reportsLink],
  },
  {
    label: "inventoryGroup",
    items: [
      hotelLink,
      {
        href: "/admin/purchases",
        label: "purchases",
        icon: ReceiptText,
      },
    ],
  },
  {
    label: "partnersGroup",
    items: [clientsLink],
  },
  {
    label: "settings",
    items: [
      {
        href: "/admin/settings",
        label: "settings",
        icon: Settings,
      },
    ],
  },
];
const mobilePrimary = [
  overviewLink,
  hotelLink,
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
  if (code === "request") return copy.contractRequestError;
  if (code === "hotel") return copy.hotelError;
  if (code === "delivery") return copy.mailDeliveryError;
  if (code === "dates") return copy.datesError;
  if (code === "window") return copy.saleWindowError;
  if (code === "dates-sold") return copy.datesSoldError;
  if (code === "duplicate") return copy.duplicateRoomError;
  if (code === "span") return copy.spanError;
  if (code === "lines") return copy.linesError;
  if (code === "empty") return copy.emptyOffersError;
  if (code === "publish") return copy.publishNeedsOffers;
  if (code === "allotment-lines") return copy.allotmentLinesError;
  if (code === "terms") return copy.termsAcceptanceError;
  if (code === "agency") return copy.agencyError;
  if (code === "client") return copy.clientBlocked;
  if (code === "vat") return copy.vatRequired;
  if (code === "mail") return copy.revealMail;
  if (code === "mail-auth") return copy.mailAuthError;
  if (code === "mail-connect") return copy.mailConnectError;
  if (code === "mail-tls") return copy.mailTlsError;
  if (code === "mail-missing") return copy.mailMissing;
  if (code === "mail-failed") return copy.mailFailed;
  if (code === "mail-template-last") return copy.mailTemplateLast;
  if (code === "code") return copy.codeWrong;
  if (code === "group") return copy.groupInUse;
  if (code === "cancel") return copy.cancelError;
  if (code === "sold") return copy.contractSoldError;
  if (code === "purchased") return copy.purchasedError;
  if (code === "allotted") return copy.allottedError;
  if (code === "booked") return copy.bookedError;
  if (code === "missing-room") return copy.missingRoomError;
  if (code === "purchase") return copy.purchaseError;
  if (code === "allotment") return copy.allotmentError;
  if (code === "room-type") return copy.roomTypeInUse;
  if (code === "duplicate") return copy.catalogDuplicate;
  if (code === "catalog") return copy.catalogInUse;
  if (code === "email") return copy.emailTaken;
  if (code === "password") return copy.passwordShort;
  if (code === "mismatch") return copy.passwordMismatch;
  if (code === "last") return copy.lastAccount;
  if (code === "self") return copy.cannotDeleteSelf;
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
  const fresh = useFreshRequests();

  return (
    <div className="admin-desk min-h-screen lg:ps-16">
      <aside className="group/rail fixed inset-y-0 start-0 z-40 hidden w-16 flex-col justify-between border-e border-[var(--desk-line)] bg-white px-3 py-4 transition-[width] duration-300 ease-out hover:w-64 focus-within:w-64 motion-reduce:transition-none lg:flex">
        <div className="flex w-full flex-col gap-5">
          <Link
            href="/admin"
            title={copy.brand}
            className="desk-focus flex h-10 items-center rounded-lg"
          >
            <span className="relative grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--desk-ink)] text-base font-bold text-white">
              F
              <span className="absolute -top-0.5 -end-0.5 size-2 rounded-full bg-[var(--desk-gold)] ring-2 ring-white" />
            </span>
            <RailLabel>{copy.brand}</RailLabel>
          </Link>
          <AdminNav fresh={fresh} />
        </div>
        <div className="flex flex-col items-start gap-3 overflow-hidden">
          <div className="max-h-0 w-full opacity-0 transition-all duration-300 ease-out group-hover/rail:max-h-10 group-hover/rail:opacity-100 motion-reduce:transition-none">
            <LanguageSwitch tone="light" compact />
          </div>
          <AccountMenu side />
        </div>
      </aside>

      <div className="min-h-screen pb-24 lg:pb-0">
        <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-[var(--desk-line)] bg-white px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/admin"
              className="desk-focus grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--desk-ink)] text-sm font-bold text-white lg:hidden"
              aria-label={copy.overview}
            >
              F
            </Link>
            <h1 className="truncate text-sm font-bold tracking-tight text-[var(--desk-ink)]">
              {title}
            </h1>
            {crumbs && crumbs.length > 0 && (
              <p className="hidden min-w-0 truncate text-xs text-[var(--desk-muted)] sm:block">
                <span className="px-1 text-[var(--desk-line-strong)]">/</span>
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
            {note}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DeskSearch />
            <p className="hidden items-center rounded border border-[var(--desk-line)] bg-[var(--desk-canvas)] px-2 py-1 text-xs text-[var(--desk-muted)] md:flex">
              <span className="me-1 font-bold text-[var(--desk-gold)]">
                {copy.peg}
              </span>
              <span className="font-plex text-[var(--desk-ink)]">
                {copy.pegRate}
              </span>
            </p>
            <Link
              href="/admin/allotments?channel=website&status=draft"
              title={copy.allotments}
              className="desk-focus relative grid size-8 place-items-center rounded text-[var(--desk-muted)] hover:bg-[var(--desk-surface-muted)]"
            >
              <Bell aria-hidden="true" size={18} />
              {fresh > 0 && (
                <span className="absolute top-1.5 end-1.5 size-1.5 rounded-full bg-[var(--desk-warning)]" />
              )}
            </Link>
            <AccountMenu />
            {actions}
          </div>
        </header>
        <main
          id="admin-page"
          className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6"
        >
          {children}
        </main>
      </div>
      <MobileNavigation fresh={fresh} />
    </div>
  );
}

function searchAction(pathname: string) {
  if (pathname.startsWith("/admin/rooms")) return "/admin/rooms";
  if (pathname.startsWith("/admin/purchases")) return "/admin/purchases";
  if (
    pathname.startsWith("/admin/allotments") ||
    pathname.startsWith("/admin/assignments")
  ) {
    return "/admin/allotments";
  }
  if (pathname.startsWith("/admin/agencies")) return "/admin/agencies";
  return "/admin/hotels";
}

function DeskSearch() {
  const pathname = usePathname();
  const copy = useAdminCopy();
  return (
    <form
      action={searchAction(pathname)}
      method="get"
      role="search"
      className="relative hidden sm:block"
    >
      <label>
        <span className="sr-only">{copy.searchDesk}</span>
        <Search
          aria-hidden="true"
          size={16}
          className="pointer-events-none absolute start-2.5 top-2 text-[var(--desk-muted)]"
        />
        <input
          type="search"
          name="q"
          placeholder={copy.searchDesk}
          className="h-8 w-56 rounded border border-[var(--desk-line)] bg-[var(--desk-canvas)] ps-8 pe-3 text-xs text-[var(--desk-ink)] outline-none placeholder:text-[var(--desk-muted-soft)] focus:border-[var(--desk-primary)] xl:w-64"
        />
      </label>
    </form>
  );
}

function AccountMenu({ side = false }: { side?: boolean }) {
  const copy = useAdminCopy();
  const locale = useAdminLocale();
  const account = useAdminAccount();
  const initials = accountInitials(account?.name ?? "");
  return (
    <details className="group relative">
      <summary
        className={`desk-focus cursor-pointer list-none [&::-webkit-details-marker]:hidden ${
          side
            ? "grid size-10 place-items-center"
            : "grid size-7 place-items-center rounded-full bg-[var(--desk-ink)] text-[11px] font-semibold text-white"
        }`}
      >
        <span
          className={
            side
              ? "grid size-7 place-items-center rounded-full bg-[var(--desk-ink)] text-[11px] font-semibold text-white"
              : "contents"
          }
        >
          {initials}
        </span>
      </summary>
      <div
        className={`absolute z-50 w-56 rounded-lg border border-[var(--desk-line)] bg-white p-1 shadow-sm ${
          side ? "start-full top-0 ms-2" : "end-0 mt-2"
        }`}
      >
        <Link
          href="/admin/settings"
          className="desk-focus flex min-h-9 items-center gap-2 rounded-md px-2 text-xs font-semibold text-[var(--desk-text)] hover:bg-[var(--desk-surface-muted)]"
        >
          <Settings aria-hidden="true" size={14} />
          {copy.settings}
        </Link>
        {account && (
          <Link
            href={`/admin/accounts/${account.id}`}
            className="desk-focus block rounded-md px-2 py-1.5 hover:bg-[var(--desk-surface-muted)]"
          >
            <span className="block truncate text-xs font-semibold text-[var(--desk-ink)]">
              {account.name}
            </span>
            <span className="block truncate text-[11px] text-[var(--desk-muted)]">
              {account.email}
            </span>
          </Link>
        )}
        <Link
          href={`/${locale}`}
          className="desk-focus flex min-h-9 items-center gap-2 rounded-md px-2 text-xs font-semibold text-[var(--desk-text)] hover:bg-[var(--desk-surface-muted)]"
        >
          <ExternalLink aria-hidden="true" size={14} />
          {copy.publicSite}
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="desk-focus flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-start text-xs font-semibold text-[var(--desk-danger)] hover:bg-[var(--desk-danger-soft)]"
          >
            <LogOut aria-hidden="true" size={14} />
            {copy.logOut}
          </button>
        </form>
      </div>
    </details>
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
  if (pathname.startsWith(item.href)) return true;
  return (
    item.children?.some(
      (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
    ) ?? false
  );
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

function childActive(pathname: string, search: string, child: NavChild) {
  const channel = new URLSearchParams(search).get("channel");
  if (child.kind === "requests") {
    return pathname === "/admin/allotments" && channel === "b2b";
  }
  if (child.kind === "prefix") {
    return pathname === child.href || pathname.startsWith(`${child.href}/`);
  }
  if (pathname === child.href) return channel !== "b2b";
  if (pathname === `${child.href}/new`) return true;
  if (!pathname.startsWith(`${child.href}/`)) return false;
  const section = pathname.slice(child.href.length + 1).split("/")[0];
  return !["actions", "follow-up", "charts", "mailing"].includes(section);
}

function AdminNav({ fresh }: { fresh: number }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const copy = useAdminCopy();
  const items = navigationGroups.flatMap((group) => group.items);

  return (
    <nav aria-label={copy.mainNavigation} className="flex w-full flex-col gap-1.5">
      {items.map((item) => (
        <div key={item.href} className="group/item">
          <DesktopNavLink
            item={item}
            active={isActive(pathname, item)}
            fresh={fresh}
          />
          {item.children ? (
            <ul className="grid max-h-0 gap-0.5 overflow-hidden opacity-0 transition-all duration-300 group-hover/item:max-h-96 group-hover/item:pb-2 group-hover/item:opacity-100 group-focus-within/item:max-h-96 group-focus-within/item:pb-2 group-focus-within/item:opacity-100 motion-reduce:transition-none">
              {item.children.map((child) => {
                const active = childActive(pathname, search, child);
                return (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      aria-current={active ? "page" : undefined}
                      className={`desk-focus block truncate rounded-md py-1.5 ps-12 pe-2 text-xs font-bold text-black ${
                        active
                          ? "bg-[var(--desk-primary-soft)]"
                          : "hover:bg-[var(--desk-surface-muted)]"
                      }`}
                    >
                      {copy[child.label]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
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
      title={copy[item.label]}
      aria-current={active ? "page" : undefined}
      className={`desk-focus flex h-10 w-full items-center overflow-hidden rounded-lg text-black transition-colors ${
        active
          ? "bg-[var(--desk-primary-soft)]"
          : "hover:bg-[var(--desk-surface-muted)]"
      }`}
    >
      <span className="relative grid size-10 shrink-0 place-items-center">
        <Icon aria-hidden={true} size={20} />
        {item.href === "/admin/allotments" && fresh > 0 && (
          <span className="absolute top-1.5 end-1.5 size-1.5 rounded-full bg-[var(--desk-warning)]" />
        )}
      </span>
      <RailLabel>{copy[item.label]}</RailLabel>
    </Link>
  );
}

function RailLabel({ children }: { children: ReactNode }) {
  return (
    <span className="ms-0 max-w-0 overflow-hidden text-sm font-semibold whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover/rail:ms-3 group-hover/rail:max-w-48 group-hover/rail:opacity-100 group-focus-within/rail:ms-3 group-focus-within/rail:max-w-48 group-focus-within/rail:opacity-100 motion-reduce:transition-none">
      {children}
    </span>
  );
}

function MobileNavigation({ fresh }: { fresh: number }) {
  const pathname = usePathname();
  const copy = useAdminCopy();
  const locale = useAdminLocale();
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

  const moreItems = navigationGroups.flatMap((group) =>
    group.items.flatMap((item) => {
      const primary = mobilePrimary.some((entry) => entry.href === item.href);
      const children = (item.children ?? []).map((child) => ({
        href: child.href,
        label: child.label,
        icon: item.icon,
        kind: child.kind,
      }));
      if (primary) return children;
      if (children.some((child) => child.href === item.href)) return children;
      return [
        {
          href: item.href,
          label: item.label,
          icon: item.icon,
          kind: "prefix" as const,
        },
        ...children,
      ];
    }),
  );
  const search = useSearchParams().toString();

  return (
    <>
      <nav
        aria-label={copy.mobileNavigation}
        className="desk-mobile-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--desk-line)] bg-white px-2 pt-1.5 shadow-sm lg:hidden"
      >
        {mobilePrimary.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`desk-focus relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold text-black ${
                active ? "bg-[var(--desk-primary-soft)]" : ""
              }`}
            >
              <Icon aria-hidden={true} size={19} />
              <span className="max-w-full truncate">{copy[item.label]}</span>
              {item.href === "/admin/allotments" && fresh > 0 && (
                <span className="absolute end-[20%] top-1.5 size-2 rounded-full bg-[var(--desk-warning)]" />
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
          className="desk-focus flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold text-black"
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
            {moreItems.map((item, index) => {
              const Icon = item.icon;
              const active =
                "kind" in item
                  ? childActive(pathname, search, item)
                  : isActive(pathname, item);
              return (
                <Link
                  key={`${index}:${item.label}:${item.href}`}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`desk-focus flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-black ${
                    active ? "bg-[var(--desk-surface-muted)]" : ""
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
              className="desk-focus mt-2 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-black"
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

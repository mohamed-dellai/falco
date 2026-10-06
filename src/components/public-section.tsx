"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export type PublicSection = "agent" | "guest" | "gate";

const cookieName = "falco_public_audience";

export function sectionFromPath(pathname: string): PublicSection | "shared" {
  const path = pathname.split(/[?#]/)[0] || "/";
  if (path === "/agent" || path.startsWith("/hotels")) return "agent";
  if (path === "/quest" || path.startsWith("/book")) return "guest";
  if (path === "/") return "gate";
  return "shared";
}

function readAudienceCookie() {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${cookieName}=(agent|guest)`),
  );
  return match?.[1] === "guest" ? "guest" : match?.[1] === "agent" ? "agent" : "gate";
}

export function usePublicSection() {
  const pathname = usePathname();
  const fromPath = sectionFromPath(pathname);
  const [shared, setShared] = useState<PublicSection>("gate");

  useEffect(() => {
    if (fromPath === "agent" || fromPath === "guest") {
      document.cookie = `${cookieName}=${fromPath}; Path=/; Max-Age=31536000; SameSite=Lax`;
      return;
    }
    if (fromPath === "shared") setShared(readAudienceCookie());
  }, [fromPath]);

  if (fromPath === "shared") return shared;
  return fromPath;
}

export function HideOnGate({ children }: { children: ReactNode }) {
  const section = usePublicSection();
  if (section === "gate") return null;
  return children;
}

export function sectionHome(section: PublicSection) {
  if (section === "agent") return "/agent" as const;
  if (section === "guest") return "/quest" as const;
  return "/" as const;
}

const agentLinks = [
  { href: "/hotels" as const, label: "hotels" as const },
  { href: "/about" as const, label: "about" as const },
  { href: "/contact" as const, label: "contact" as const },
] as const;

const quietLinks = [
  { href: "/about" as const, label: "about" as const },
  { href: "/contact" as const, label: "contact" as const },
] as const;

export function sectionLinks(section: PublicSection) {
  return section === "agent" ? agentLinks : quietLinks;
}

export function SiteExplore() {
  const t = useTranslations("Footer");
  const nav = useTranslations("Nav");
  const section = usePublicSection();
  const home = sectionHome(section);

  return (
    <nav className="grid content-start gap-3 text-sm text-blue-100/80">
      <strong className="text-white">{t("explore")}</strong>
      {section !== "gate" && (
        <Link href={home} className="hover:text-gold">
          {nav("home")}
        </Link>
      )}
      {sectionLinks(section).map((item) => (
        <Link key={item.href} href={item.href} className="hover:text-gold">
          {nav(item.label)}
        </Link>
      ))}
    </nav>
  );
}

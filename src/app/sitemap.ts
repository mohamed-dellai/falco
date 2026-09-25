import type { MetadataRoute } from "next";
import { packages } from "@/content/site";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "",
    "/packages",
    "/services",
    "/agencies",
    "/about",
    "/contact",
  ];
  const packagePages = packages.map((item) => `/packages/${item.slug}`);

  return routing.locales.flatMap((locale) =>
    [...pages, ...packagePages].map((path) => ({
      url: `${siteConfig.url}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: path.startsWith("/packages") ? "weekly" : "monthly",
      priority: path === "" ? 1 : path === "/packages" ? 0.9 : 0.7,
      alternates: {
        languages: {
          en: `${siteConfig.url}/en${path}`,
          ar: `${siteConfig.url}/ar${path}`,
        },
      },
    })),
  );
}

import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { listHotels } from "@/lib/inventory";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const hotels = await listHotels().catch(() => []);
  const pages = ["", "/hotels", "/about", "/contact"];
  const hotelPages = hotels.map((hotel) => `/hotels/${hotel.id}`);

  return routing.locales.flatMap((locale) =>
    [...pages, ...hotelPages].map((path) => ({
      url: `${siteConfig.url}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: path.startsWith("/hotels/") ? "daily" : "weekly",
      priority: path === "" ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((alternateLocale) => [
            alternateLocale,
            `${siteConfig.url}/${alternateLocale}${path}`,
          ]),
        ),
      },
    })),
  );
}

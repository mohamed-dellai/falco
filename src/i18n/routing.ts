import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ar", "fr", "it"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

export function localeAlternates(path = "") {
  return Object.fromEntries(
    routing.locales.map((locale) => [locale, `/${locale}${path}`]),
  );
}

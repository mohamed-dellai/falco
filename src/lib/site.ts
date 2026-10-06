function resolveSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) return configuredUrl;

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return vercelHost ? `https://${vercelHost}` : "http://localhost:3000";
}

export const siteConfig = {
  name: "Falco Services",
  url: resolveSiteUrl(),
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "966564896683",
  phoneDisplay: "00966 56 489 6683",
  email:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "Falco.services2026@gmail.com",
  company: {
    address: {
      en: "Al Mursalat District, Al Masjid Al Haram Road, Makkah, Saudi Arabia",
      ar: "مكة المكرمة، حي المرسلات، طريق المسجد الحرام، المملكة العربية السعودية",
      fr: "Quartier Al Mursalat, route Al Masjid Al Haram, La Mecque, Arabie saoudite",
      it: "Quartiere Al Mursalat, strada Al Masjid Al Haram, La Mecca, Arabia Saudita",
    },
  },
};

export function whatsappUrl(whatsapp: string, message?: string) {
  const number = whatsapp.replace(/\D/g, "");
  const base = number ? `https://wa.me/${number}` : "https://wa.me/";
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

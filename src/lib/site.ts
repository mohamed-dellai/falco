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
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "966569740101",
  phoneDisplay: "+966 56 974 0101",
  email:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "Falco.services2026@gmail.com",
  company: {
    nationalNumber: "7054472027",
    registrationDate: "2026-06-03",
    capital: "50,000 SAR",
    address: {
      en: "Al Mursalat District, Al Masjid Al Haram Road, Makkah, Saudi Arabia",
      ar: "مكة المكرمة، حي المرسلات، طريق المسجد الحرام، المملكة العربية السعودية",
    },
  },
};

export function getWhatsAppUrl(message?: string) {
  const number = siteConfig.whatsapp.replace(/[^\d]/g, "");
  const base = number ? `https://wa.me/${number}` : "https://wa.me/";
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

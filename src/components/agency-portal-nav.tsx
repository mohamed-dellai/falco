import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

function labels(locale: Locale) {
  if (locale === "fr")
    return {
      hotels: "Hôtels",
      basket: "Panier",
      reservations: "Réservations",
      profile: "Profil agence",
    };
  if (locale === "ar")
    return {
      hotels: "الفنادق",
      basket: "السلة",
      reservations: "الحجوزات",
      profile: "ملف الوكالة",
    };
  if (locale === "it")
    return {
      hotels: "Hotel",
      basket: "Carrello",
      reservations: "Prenotazioni",
      profile: "Profilo agenzia",
    };
  return {
    hotels: "Hotels",
    basket: "Basket",
    reservations: "Reservations",
    profile: "Agency profile",
  };
}

export function AgencyPortalNav({
  locale,
  active,
}: {
  locale: Locale;
  active: "hotels" | "basket" | "reservations" | "profile";
}) {
  const copy = labels(locale);
  const items = [
    { id: "hotels" as const, href: "/hotels" as const },
    { id: "basket" as const, href: "/hotels/basket" as const },
    { id: "reservations" as const, href: "/hotels/reservations" as const },
    { id: "profile" as const, href: "/hotels/profile" as const },
  ];
  return (
    <nav
      aria-label="Agency"
      className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-primary/10 bg-white p-1 shadow-sm"
    >
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={active === item.id ? "page" : undefined}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
            active === item.id
              ? "bg-primary text-white"
              : "text-primary hover:bg-primary/5"
          }`}
        >
          {copy[item.id]}
        </Link>
      ))}
    </nav>
  );
}

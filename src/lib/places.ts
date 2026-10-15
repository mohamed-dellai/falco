export const cities = ["makkah", "madinah", "jeddah"] as const;
export type City = (typeof cities)[number];

export const places = [
  { id: "ajyad", city: "makkah", en: "Ajyad", ar: "أجياد", fr: "Ajyad" },
  { id: "aziziyah", city: "makkah", en: "Al Aziziyah", ar: "العزيزية", fr: "Al Aziziyah" },
  { id: "aziziyah-south", city: "makkah", en: "Al Aziziyah South", ar: "العزيزية الجنوبية", fr: "Al Aziziyah sud" },
  { id: "misfalah", city: "makkah", en: "Al Misfalah", ar: "المسفلة", fr: "Al Misfalah" },
  { id: "street-60", city: "makkah", en: "60th Street", ar: "شارع 60", fr: "Rue 60" },
  { id: "mashair", city: "makkah", en: "Al Mashair", ar: "المشاعر", fr: "Al Mashair" },
  { id: "makkah-centre", city: "makkah", en: "Makkah city centre", ar: "وسط مكة", fr: "Centre de La Mecque" },
  { id: "madinah-centre", city: "madinah", en: "Central area", ar: "المنطقة المركزية", fr: "Zone centrale" },
  { id: "jeddah-centre", city: "jeddah", en: "City centre", ar: "وسط جدة", fr: "Centre-ville" },
  { id: "corniche", city: "jeddah", en: "Corniche", ar: "الكورنيش", fr: "Corniche" },
] as const;

export type PlaceId = (typeof places)[number]["id"];

export function placesIn(city: City) {
  return places.filter((place) => place.city === city);
}

export function placeById(id: string) {
  return places.find((place) => place.id === id) ?? null;
}

export function placeName(id: string, locale: string) {
  const place = placeById(id);
  if (!place) return "";
  if (locale === "ar") return place.ar;
  if (locale === "fr") return place.fr;
  return place.en;
}

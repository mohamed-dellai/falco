import type { City } from "@/lib/places";

export const cityCenters: Record<City, { latitude: number; longitude: number }> = {
  makkah: { latitude: 21.4225, longitude: 39.8262 },
  madinah: { latitude: 24.4672, longitude: 39.6111 },
  jeddah: { latitude: 21.5433, longitude: 39.1728 },
};

export function roundCoordinate(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function coordinatePair(
  latitude: number | null,
  longitude: number | null,
) {
  if (latitude == null && longitude == null) {
    return { latitude: null, longitude: null };
  }
  if (
    latitude == null ||
    longitude == null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return {
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
  };
}

export function mapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

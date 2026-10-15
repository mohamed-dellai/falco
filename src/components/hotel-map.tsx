"use client";

import "leaflet/dist/leaflet.css";
import { cityCenters, mapsUrl, roundCoordinate } from "@/lib/geo";
import { cities, type City } from "@/lib/places";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

type LeafletApi = typeof import("leaflet");

const pinHtml =
  '<span style="display:block;width:16px;height:16px;background:#0e4d8c;border:2px solid #fff;border-radius:999px;box-shadow:0 1px 4px rgba(10,29,55,.45)"></span>';

function formatCoordinate(value: number) {
  return String(roundCoordinate(value));
}

function parsedPair(latitude: string, longitude: string) {
  if (!latitude.trim() || !longitude.trim()) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}

function HotelMapCanvas({
  latitude,
  longitude,
  city,
  readOnly,
  onPick,
}: {
  latitude: number | null;
  longitude: number | null;
  city: City;
  readOnly: boolean;
  onPick?: (latitude: number, longitude: number) => void;
}) {
  const node = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<LeafletApi | null>(null);
  const pointRef = useRef({ latitude, longitude });
  const onPickRef = useRef(onPick);

  useEffect(() => {
    let disposed = false;
    let map: LeafletMap | null = null;
    let citySelect: HTMLSelectElement | null = null;

    function paint(lat: number | null, lng: number | null) {
      const L = leafletRef.current;
      if (!L || !map) return;
      if (lat == null || lng == null) {
        markerRef.current?.remove();
        markerRef.current = null;
        return;
      }
      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng], {
          draggable: !readOnly,
          icon: L.divIcon({
            className: "",
            html: pinHtml,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        }).addTo(map);
        if (!readOnly) {
          markerRef.current.on("dragend", () => {
            const point = markerRef.current?.getLatLng();
            if (point) onPickRef.current?.(point.lat, point.lng);
          });
        }
        return;
      }
      markerRef.current.setLatLng([lat, lng]);
    }

    function recenterOnCity() {
      if (!map || pointRef.current.latitude != null) return;
      const selected = citySelect?.value;
      const next = cities.includes(selected as City) ? (selected as City) : city;
      const center = cityCenters[next];
      map.setView([center.latitude, center.longitude], 12);
    }

    const onCityChange = () => recenterOnCity();

    void (async () => {
      try {
        const loaded = await import("leaflet");
        const L = (loaded.default ?? loaded) as LeafletApi;
        if (typeof L.map !== "function") {
          throw new Error("Leaflet map export is missing");
        }
        if (disposed || !node.current) return;
        leafletRef.current = L;
        const current = pointRef.current;
        const selected = node.current
          .closest("form")
          ?.querySelector<HTMLSelectElement>('select[name="city"]');
        citySelect = selected ?? null;
        const selectedCity = cities.includes(selected?.value as City)
          ? (selected?.value as City)
          : city;
        const center = cityCenters[selectedCity];
        const start =
          current.latitude != null && current.longitude != null
            ? { latitude: current.latitude, longitude: current.longitude, zoom: 16 }
            : { ...center, zoom: 12 };
        map = L.map(node.current, {
          scrollWheelZoom: false,
          attributionControl: true,
        }).setView([start.latitude, start.longitude], start.zoom);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        mapRef.current = map;
        if (!readOnly) {
          map.on("click", (event) => {
            onPickRef.current?.(event.latlng.lat, event.latlng.lng);
          });
          citySelect?.addEventListener("change", onCityChange);
        }
        paint(pointRef.current.latitude, pointRef.current.longitude);
      } catch (error) {
        console.error("hotel map failed", error);
      }
    })();

    return () => {
      disposed = true;
      citySelect?.removeEventListener("change", onCityChange);
      markerRef.current = null;
      mapRef.current = null;
      leafletRef.current = null;
      map?.remove();
    };
    // The map is created once. Coordinate changes update the marker below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    pointRef.current = { latitude, longitude };
    onPickRef.current = onPick;
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (latitude == null || longitude == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.marker([latitude, longitude], {
        draggable: !readOnly,
        icon: L.divIcon({
          className: "",
          html: pinHtml,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      }).addTo(map);
      if (!readOnly) {
        markerRef.current.on("dragend", () => {
          const point = markerRef.current?.getLatLng();
          if (point) onPickRef.current?.(point.lat, point.lng);
        });
      }
      return;
    }
    markerRef.current.setLatLng([latitude, longitude]);
  }, [latitude, longitude, onPick, readOnly]);

  return (
    <div
      ref={node}
      className={
        readOnly
          ? "isolate z-0 w-full overflow-hidden rounded-2xl border border-line bg-white"
          : "isolate z-0 w-full overflow-hidden rounded-xl border border-[var(--desk-line)] bg-[var(--desk-canvas)]"
      }
      style={{ height: "18rem" }}
    />
  );
}

export function HotelMapField({
  latitude,
  longitude,
  city,
  labels,
}: {
  latitude: number | null;
  longitude: number | null;
  city: City;
  labels: {
    title: string;
    hint: string;
    latitude: string;
    longitude: string;
    clear: string;
  };
}) {
  const [latText, setLatText] = useState(
    latitude == null ? "" : formatCoordinate(latitude),
  );
  const [lngText, setLngText] = useState(
    longitude == null ? "" : formatCoordinate(longitude),
  );
  const point = parsedPair(latText, lngText);

  function pick(lat: number, lng: number) {
    setLatText(formatCoordinate(lat));
    setLngText(formatCoordinate(lng));
  }

  return (
    <div className="grid gap-2">
      <div>
        <p className="text-xs font-semibold text-[var(--desk-text)]">{labels.title}</p>
        <p className="mt-1 text-xs text-[var(--desk-muted)]">{labels.hint}</p>
      </div>
      <HotelMapCanvas
        latitude={point?.latitude ?? null}
        longitude={point?.longitude ?? null}
        city={city}
        readOnly={false}
        onPick={pick}
      />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-1.5 text-xs font-semibold text-[var(--desk-text)]">
          {labels.latitude}
          <input
            name="latitude"
            inputMode="decimal"
            value={latText}
            onChange={(event) => setLatText(event.target.value)}
            className="desk-field"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-[var(--desk-text)]">
          {labels.longitude}
          <input
            name="longitude"
            inputMode="decimal"
            value={lngText}
            onChange={(event) => setLngText(event.target.value)}
            className="desk-field"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setLatText("");
            setLngText("");
          }}
          className="h-11 rounded-xl border border-[var(--desk-line)] px-3 text-xs font-semibold"
        >
          {labels.clear}
        </button>
      </div>
    </div>
  );
}

export function HotelLocationMap({
  latitude,
  longitude,
  city,
  name,
  openLabel,
}: {
  latitude: number;
  longitude: number;
  city: City;
  name: string;
  openLabel: string;
}) {
  return (
    <div className="mt-5">
      <HotelMapCanvas
        latitude={latitude}
        longitude={longitude}
        city={city}
        readOnly
      />
      <a
        href={mapsUrl(latitude, longitude)}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block text-sm font-bold text-primary underline"
      >
        {openLabel}
        <span className="sr-only"> {name}</span>
      </a>
    </div>
  );
}

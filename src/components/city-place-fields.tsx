"use client";

import { useState } from "react";
import { AdminField, adminFieldClass } from "@/components/admin-ui";
import type { City } from "@/lib/places";

export function CityPlaceFields({
  cities,
  places,
  city,
  placeId,
  labels,
}: {
  cities: Array<{ id: City; label: string }>;
  places: Array<{ id: string; city: City; label: string }>;
  city: City;
  placeId: string;
  labels: { city: string; place: string; noPlace: string };
}) {
  const [selectedCity, setSelectedCity] = useState(city);
  const [selectedPlace, setSelectedPlace] = useState(placeId);
  const options = places.filter((place) => place.city === selectedCity);

  return (
    <>
      <AdminField label={labels.city}>
        <select
          name="city"
          value={selectedCity}
          onChange={(event) => {
            const next = event.target.value as City;
            setSelectedCity(next);
            if (!places.some((place) => place.city === next && place.id === selectedPlace)) {
              setSelectedPlace("");
            }
          }}
          className={adminFieldClass}
        >
          {cities.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </AdminField>
      <AdminField label={labels.place}>
        <select
          name="placeId"
          value={options.some((place) => place.id === selectedPlace) ? selectedPlace : ""}
          onChange={(event) => setSelectedPlace(event.target.value)}
          className={adminFieldClass}
        >
          <option value="">{labels.noPlace}</option>
          {options.map((place) => (
            <option key={place.id} value={place.id}>
              {place.label}
            </option>
          ))}
        </select>
      </AdminField>
    </>
  );
}

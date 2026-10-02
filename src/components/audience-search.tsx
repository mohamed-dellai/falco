"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { StaySearch } from "@/components/stay-search";

export function AudienceSearch({
  minDate,
  checkIn,
  checkOut,
}: {
  minDate: string;
  checkIn?: string;
  checkOut?: string;
}) {
  const t = useTranslations("Home");
  const [audience, setAudience] = useState<"agency" | "traveller">("agency");
  const traveller = audience === "traveller";

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("audienceLabel")}
        className="mt-6 flex flex-wrap gap-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!traveller}
          onClick={() => setAudience("agency")}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            traveller
              ? "bg-white/10 text-white hover:bg-white/15"
              : "bg-gold text-ink"
          }`}
        >
          {t("agencyChoice")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={traveller}
          onClick={() => setAudience("traveller")}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            traveller
              ? "bg-gold text-ink"
              : "bg-white/10 text-white hover:bg-white/15"
          }`}
        >
          {t("travellerChoice")}
        </button>
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm font-bold text-white">
        <span className="size-2 rounded-full bg-gold" />
        {traveller ? t("travellerAudience") : t("audience")}
      </p>
      <StaySearch
        key={`${audience}:${checkIn ?? ""}:${checkOut ?? ""}`}
        pathname={traveller ? "/stay" : "/"}
        minDate={minDate}
        checkIn={checkIn}
        checkOut={checkOut}
        variant="bar"
      />
    </div>
  );
}

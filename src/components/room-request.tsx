"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function RoomRequest({
  hotelId,
  roomId,
  max,
  checkIn,
  checkOut,
}: {
  hotelId: string;
  roomId: string;
  max: number;
  checkIn: string;
  checkOut: string;
}) {
  const t = useTranslations("Search");
  const [count, setCount] = useState(1);
  const rooms = Math.min(max, Math.max(1, count || 1));
  const href = `/contact?hotel=${hotelId}&room=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}&rooms=${rooms}`;

  return (
    <div className="mt-5 flex flex-wrap items-end gap-3">
      <label className="grid gap-1 text-xs font-bold text-primary">
        {t("rooms")}
        <input
          type="number"
          min={1}
          max={max}
          value={rooms}
          onChange={(event) => setCount(Number(event.target.value))}
          className="h-12 w-28 rounded-lg border border-line bg-surface px-3 text-sm text-ink"
        />
      </label>
      <Link
        href={href}
        className="inline-flex h-12 items-center rounded-lg bg-primary px-4 text-sm font-bold text-white"
      >
        {t("requestRooms", { count: rooms })}
      </Link>
    </div>
  );
}

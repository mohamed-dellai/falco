"use client";

import { useEffect, useState } from "react";
import { fill } from "@/lib/admin-copy";

function remaining(until: string) {
  const ms = new Date(until).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "0 h 0 m";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours} h ${minutes} m`;
}

export function ReservationHoldClock({
  until,
  template,
}: {
  until: string;
  template: string;
}) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setTime(remaining(until));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [until]);

  return (
    <span className="font-plex tabular-nums">
      {time ? fill(template, { time }) : "—"}
    </span>
  );
}

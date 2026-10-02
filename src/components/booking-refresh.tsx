"use client";

import { useEffect } from "react";

export function BookingRefresh({ pending }: { pending: boolean }) {
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => window.location.reload(), 3000);
    return () => window.clearInterval(timer);
  }, [pending]);

  return null;
}

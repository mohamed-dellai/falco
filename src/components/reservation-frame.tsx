import type { ReactNode } from "react";

export function ReservationFrame({
  nav,
  children,
}: {
  nav: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      {nav}
      <div className="mt-4">{children}</div>
    </div>
  );
}

"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white"
    >
      {label}
    </button>
  );
}

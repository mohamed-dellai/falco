import { AdminLoadingStatus, AdminShell } from "@/components/admin-shell";

export default function AdminLoading() {
  return (
    <AdminShell title="…">
      <div
        className="grid gap-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <AdminLoadingStatus />
        <div className="h-36 animate-pulse rounded-2xl border border-[var(--desk-line)] bg-white" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-2xl border border-[var(--desk-line)] bg-white" />
          <div className="h-28 animate-pulse rounded-2xl border border-[var(--desk-line)] bg-white" />
        </div>
        <div className="h-64 animate-pulse rounded-2xl border border-[var(--desk-line)] bg-white" />
      </div>
    </AdminShell>
  );
}

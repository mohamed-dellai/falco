import { AdminLoadingStatus, AdminShell } from "@/components/admin-shell";

function Ghost({ className }: { className: string }) {
  return (
    <span
      className={`block animate-pulse rounded-full bg-[var(--desk-neutral-soft)] ${className}`}
    />
  );
}

export default function AdminLoading() {
  return (
    <AdminShell title="…">
      <div
        className="grid gap-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <AdminLoadingStatus />
        {/* Capacity panel ghost */}
        <section className="overflow-hidden rounded-2xl border border-[var(--desk-line)] bg-white p-5 sm:p-6">
          <Ghost className="h-5 w-40" />
          <Ghost className="mt-3 h-3 w-64" />
          <Ghost className="mt-6 h-4 w-full" />
          <div className="mt-6 grid gap-3">
            <Ghost className="h-3 w-full" />
            <Ghost className="h-3 w-5/6" />
            <Ghost className="h-3 w-2/3" />
          </div>
        </section>
        {/* Attention queue ghost */}
        <section className="overflow-hidden rounded-2xl border border-[var(--desk-line)] bg-white">
          <div className="flex items-center gap-4 border-b border-[var(--desk-line-soft)] px-5 py-4 last:border-b-0">
            <div className="min-w-0 flex-1">
              <Ghost className="h-3.5 w-32" />
              <Ghost className="mt-2 h-2.5 w-20" />
            </div>
            <Ghost className="h-6 w-8" />
            <Ghost className="h-3.5 w-16" />
          </div>
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <Ghost className="h-3.5 w-28" />
              <Ghost className="mt-2 h-2.5 w-24" />
            </div>
            <Ghost className="h-6 w-8" />
            <Ghost className="h-3.5 w-16" />
          </div>
        </section>
        {/* Stat strip ghost */}
        <section className="grid gap-px overflow-hidden rounded-2xl border border-[var(--desk-line)] bg-[var(--desk-line)] sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="bg-white px-4 py-3.5">
              <Ghost className="h-2.5 w-16" />
              <Ghost className="mt-2.5 h-6 w-10" />
            </div>
          ))}
        </section>
        {/* Table ghost */}
        <section className="overflow-hidden rounded-2xl border border-[var(--desk-line)] bg-white">
          <div className="flex gap-6 border-b border-[var(--desk-line)] bg-[var(--desk-canvas)] px-4 py-3">
            <Ghost className="h-2.5 w-12" />
            <Ghost className="h-2.5 w-16" />
            <Ghost className="h-2.5 w-24" />
            <Ghost className="ms-auto h-2.5 w-14" />
          </div>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="flex items-center gap-6 border-b border-[var(--desk-line-soft)] px-4 py-3.5 last:border-b-0"
            >
              <Ghost className="h-4 w-16" />
              <Ghost className="h-3 w-28" />
              <Ghost className="h-3 w-40" />
              <Ghost className="ms-auto h-3 w-20" />
            </div>
          ))}
        </section>
      </div>
    </AdminShell>
  );
}

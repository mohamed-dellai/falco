import Link from "next/link";
import { bulkReservationAction } from "@/app/admin/actions";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { AllotmentStatusPill } from "@/components/allotment-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listAllotments } from "@/lib/inventory";
import { formatDateRange } from "@/lib/money";

const chip =
  "desk-focus desk-press inline-flex h-8 items-center rounded-lg border px-2.5 text-[13px] font-bold";
const bulkTone = {
  success: `${chip} border-[var(--desk-success)] bg-[var(--desk-success-soft)] text-[var(--desk-success)] hover:bg-[var(--desk-success)] hover:text-white`,
  danger: `${chip} border-[var(--desk-danger)] bg-[var(--desk-danger-soft)] text-[var(--desk-danger)] hover:bg-[var(--desk-danger)] hover:text-white`,
  warning: `${chip} border-[var(--desk-warning)] bg-[var(--desk-warning-soft)] text-[var(--desk-warning)] hover:bg-[var(--desk-warning)] hover:text-white`,
  gold: `${chip} border-[var(--desk-gold)] bg-[var(--desk-gold-soft)] text-[var(--desk-warning)] hover:bg-[var(--desk-warning)] hover:text-white`,
  ink: `${chip} border-[var(--desk-ink)] bg-white text-[var(--desk-ink)] hover:bg-[var(--desk-ink)] hover:text-white`,
};

export const dynamic = "force-dynamic";

const openStatuses = new Set(["request", "provisional", "confirmed"]);

export default async function ReservationActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const rows = (await listAllotments()).filter(
    (row) => row.channel !== "b2c" && openStatuses.has(row.status),
  );

  return (
    <AdminShell
      title={copy.reservationNavActions}
      crumbs={[{ href: "/admin/allotments", label: copy.allotments }]}
    >
      {query.error === "empty" ? (
        <p className="mb-4 rounded-lg border border-[var(--desk-warning-line)] bg-[var(--desk-warning-soft)] px-3 py-2 text-sm font-semibold text-[var(--desk-warning)]">
          {copy.reservationBulkPick}
        </p>
      ) : (
        <AdminError code={query.error} />
      )}
      <section className="overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
        <header className="border-b border-[var(--desk-line)] px-5 py-4">
          <h2 className="text-base font-bold text-[var(--desk-ink)]">{copy.reservationNavActions}</h2>
          <p className="mt-1 text-sm text-[var(--desk-text)]">{copy.reservationBulkHint}</p>
        </header>
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--desk-muted)]">{copy.reservationBulkEmpty}</p>
        ) : (
          <form action={bulkReservationAction}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-start">
                <thead className="bg-[var(--desk-canvas)]">
                  <tr>
                    <th className="w-10 px-3 py-2" scope="col">
                      <span className="sr-only">{copy.reservationRoomLines}</span>
                    </th>
                    <th className="px-3 py-2 text-[13px] font-bold text-[var(--desk-ink)]" scope="col">
                      {copy.number}
                    </th>
                    <th className="px-3 py-2 text-[13px] font-bold text-[var(--desk-ink)]" scope="col">
                      {copy.client}
                    </th>
                    <th className="px-3 py-2 text-[13px] font-bold text-[var(--desk-ink)]" scope="col">
                      {copy.hotel}
                    </th>
                    <th className="px-3 py-2 text-[13px] font-bold text-[var(--desk-ink)]" scope="col">
                      {copy.status}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-[var(--desk-line)]">
                      <td className="px-3 py-2.5">
                        <input type="checkbox" name="ids" value={row.id} aria-label={row.number} className="size-4" />
                      </td>
                      <td className="px-3 py-2.5 text-sm font-bold text-[var(--desk-ink)]">
                        <Link href={`/admin/allotments/${row.id}/details`} className="hover:text-[var(--desk-primary)]">
                          {row.number}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-sm text-[var(--desk-text)]">{row.agencyName || "—"}</td>
                      <td className="px-3 py-2.5 text-sm text-[var(--desk-text)]">
                        <span className="block">{row.hotelName || "—"}</span>
                        <span className="font-plex text-xs text-[var(--desk-muted)] tabular-nums">
                          {formatDateRange(row.checkIn, row.checkOut, locale)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <AllotmentStatusPill status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--desk-line)] px-4 py-3">
              <label className="me-auto flex items-center gap-2 text-sm font-bold text-[var(--desk-ink)]">
                <input type="checkbox" name="useOverbook" />
                {copy.useOverbook}
              </label>
              <button type="submit" name="verb" value="confirm" className={bulkTone.success}>
                {copy.confirmed}
              </button>
              <button type="submit" name="verb" value="confirm-all" className={bulkTone.success}>
                {copy.confirmAll}
              </button>
              <button type="submit" name="verb" value="cancel" className={bulkTone.danger}>
                {copy.cancelled}
              </button>
              <button type="submit" name="verb" value="cancel-all" className={bulkTone.danger}>
                {copy.cancelAll}
              </button>
              <button type="submit" name="verb" value="no-show" className={bulkTone.warning}>
                {copy.statusNoShow}
              </button>
              <button type="submit" name="verb" value="unavailable" className={bulkTone.gold}>
                {copy.statusUnavailable}
              </button>
              <button type="submit" name="verb" value="regret" className={bulkTone.ink}>
                {copy.statusRegret}
              </button>
            </div>
          </form>
        )}
      </section>
    </AdminShell>
  );
}

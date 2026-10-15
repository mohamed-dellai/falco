import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, type AdminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listAllotments, type LineSupplierStatus } from "@/lib/inventory";
import { formatDateRange } from "@/lib/money";

export const dynamic = "force-dynamic";

const waiting = new Set<LineSupplierStatus>(["new", "waiting", "provisional", "amended"]);

function lineLabel(status: LineSupplierStatus, copy: AdminCopy) {
  const labels: Record<LineSupplierStatus, string> = {
    new: copy.supplierNew,
    waiting: copy.supplierWaiting,
    provisional: copy.supplierLineProvisional,
    confirmed: copy.supplierLineConfirmed,
    amended: copy.supplierAmended,
    cancelled: copy.supplierLineCancelled,
    no_show: copy.supplierNoShow,
  };
  return labels[status];
}

export default async function RoomFollowUpPage() {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const rows = (await listAllotments()).flatMap((allotment) =>
    allotment.lines
      .filter((line) => waiting.has(line.supplierStatus))
      .map((line) => ({ allotment, line })),
  );

  return (
    <AdminShell
      title={copy.reservationNavFollow}
      crumbs={[{ href: "/admin/allotments", label: copy.allotments }]}
    >
      <section className="overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
        <header className="border-b border-[var(--desk-line)] px-5 py-4">
          <h2 className="text-base font-bold text-[var(--desk-ink)]">{copy.reservationNavFollow}</h2>
          <p className="mt-1 text-sm text-[var(--desk-text)]">{copy.supplierWaiting}</p>
        </header>
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--desk-muted)]">{copy.reservationFollowEmpty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] border-collapse text-start">
              <thead className="bg-[var(--desk-canvas)]">
                <tr>
                  <th className="px-3 py-2 text-[13px] font-bold text-[var(--desk-ink)]" scope="col">{copy.number}</th>
                  <th className="px-3 py-2 text-[13px] font-bold text-[var(--desk-ink)]" scope="col">{copy.hotel}</th>
                  <th className="px-3 py-2 text-[13px] font-bold text-[var(--desk-ink)]" scope="col">{copy.roomType}</th>
                  <th className="px-3 py-2 text-end text-[13px] font-bold text-[var(--desk-ink)]" scope="col">{copy.roomQuantity}</th>
                  <th className="px-3 py-2 text-[13px] font-bold text-[var(--desk-ink)]" scope="col">{copy.status}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ allotment, line }) => (
                  <tr key={line.id} className="border-t border-[var(--desk-line)]">
                    <td className="px-3 py-2.5 text-sm font-bold text-[var(--desk-ink)]">
                      <Link href={`/admin/allotments/${allotment.id}/rooms`} className="hover:text-[var(--desk-primary)]">
                        {allotment.number}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-sm text-[var(--desk-text)]">
                      <span className="block">{allotment.hotelName || "—"}</span>
                      <span className="font-plex text-xs text-[var(--desk-muted)] tabular-nums">
                        {formatDateRange(allotment.checkIn, allotment.checkOut, locale)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-sm font-bold text-[var(--desk-ink)]">{line.roomName}</td>
                    <td className="font-plex px-3 py-2.5 text-end text-sm font-bold tabular-nums">{line.quantity}</td>
                    <td className="px-3 py-2.5 text-sm font-bold text-[var(--desk-warning)]">
                      {lineLabel(line.supplierStatus, copy)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

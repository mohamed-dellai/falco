import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminError, AdminShell } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminStatusPill,
  AdminTableFrame,
  adminButtonClass,
} from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, countText } from "@/lib/admin-copy";
import { listCommercials } from "@/lib/client-crm";
import { getAdminLocale } from "@/lib/admin-locale";

export const dynamic = "force-dynamic";

export default async function CommercialsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const query = await searchParams;
  const reps = await listCommercials();

  return (
    <AdminShell
      title={copy.commercials}
      note={
        <span className="text-sm text-[var(--desk-muted)]">
          {countText(reps.length, copy.commercialCount, copy.commercialCount)}
        </span>
      }
      actions={
        <Link href="/admin/commercials/new" className={adminButtonClass}>
          <Plus aria-hidden="true" size={16} />
          {copy.newCommercial}
        </Link>
      }
    >
      <AdminError code={query.error} />
      {reps.length ? (
        <AdminTableFrame>
          <table className="desk-table w-full border-collapse text-start text-sm">
            <thead className="bg-[var(--desk-canvas)]">
              <tr>
                <th className="px-4 py-3 text-start">{copy.commercial}</th>
                <th className="px-4 py-3 text-start">{copy.email}</th>
                <th className="px-4 py-3 text-start">{copy.country}</th>
                <th className="px-4 py-3 text-start">{copy.commissionPercent}</th>
                <th className="px-4 py-3 text-start">{copy.status}</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((rep) => (
                <tr key={rep.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/commercials/${rep.id}`}
                      className="font-semibold text-[var(--desk-primary)] hover:underline"
                    >
                      {rep.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{rep.email}</td>
                  <td className="px-4 py-3">{rep.country || "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{rep.percent}%</td>
                  <td className="px-4 py-3">
                    {rep.disabled ? (
                      <AdminStatusPill tone="danger">{copy.commercialDisabled}</AdminStatusPill>
                    ) : (
                      <AdminStatusPill tone="success">{copy.confirmed}</AdminStatusPill>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableFrame>
      ) : (
        <AdminEmptyState
          title={copy.noCommercials}
          action={
            <Link href="/admin/commercials/new" className={adminButtonClass}>
              {copy.newCommercial}
            </Link>
          }
        />
      )}
    </AdminShell>
  );
}

import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminError, AdminShell } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminSearchForm,
  AdminTableFrame,
  adminButtonClass,
} from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, countText, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listRoomTypes } from "@/lib/inventory";
import { roomTypeLabel } from "@/lib/room-types";

export const dynamic = "force-dynamic";

export default async function RoomTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const types = await listRoomTypes();
  const search = query.q?.trim().toLocaleLowerCase(locale) ?? "";
  const rows = types.filter((type) => {
    if (!search) return true;
    const label = roomTypeLabel(type.name, (code) => copy[code]);
    return [label, type.name, String(type.guests), type.description]
      .join(" ")
      .toLocaleLowerCase(locale)
      .includes(search);
  });

  return (
    <AdminShell
      title={copy.roomTypes}
      note={
        <span aria-live="polite" className="text-sm text-[var(--desk-muted)]">
          {countText(rows.length, copy.roomTypeCountOne, copy.roomTypeCount)}
        </span>
      }
      actions={
        <Link href="/admin/room-types/new" className={adminButtonClass}>
          <Plus aria-hidden="true" size={16} />
          {copy.newRoomType}
        </Link>
      }
    >
      <AdminError code={query.error} />
      <div className="mb-5">
        <AdminSearchForm
          action="/admin/room-types"
          label={copy.searchRoomTypes}
          placeholder={copy.searchRoomTypes}
          value={query.q}
        />
      </div>
      {rows.length ? (
        <>
          <div className="grid gap-3 lg:hidden">
            {rows.map((type) => (
              <Link
                key={type.id}
                href={`/admin/room-types/${type.id}`}
                className="desk-focus rounded-2xl border border-[var(--desk-line)] bg-white p-4"
              >
                <h2 className="font-semibold">
                  {roomTypeLabel(type.name, (code) => copy[code])}
                </h2>
                <p className="mt-1 text-sm text-[var(--desk-muted)]">
                  {copy.guests} · {type.guests}
                </p>
              </Link>
            ))}
          </div>
          <div className="hidden lg:block">
            <AdminTableFrame>
              <table className="desk-table w-full border-collapse text-start text-sm">
                <thead className="bg-[var(--desk-canvas)]">
                  <tr>
                    <th className="px-4 py-3 text-start">{copy.roomType}</th>
                    <th className="px-4 py-3 text-start">{copy.guests}</th>
                    <th className="px-4 py-3 text-start">{copy.description}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((type) => (
                    <tr key={type.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/room-types/${type.id}`}
                          className="font-semibold text-[var(--desk-primary)] hover:underline"
                        >
                          {roomTypeLabel(type.name, (code) => copy[code])}
                        </Link>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{type.guests}</td>
                      <td className="px-4 py-3 text-[var(--desk-muted)]">
                        {type.description.trim() || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableFrame>
          </div>
        </>
      ) : (
        <AdminEmptyState
          title={
            search
              ? fill(copy.noMatches, {
                  query: query.q ?? "",
                  count: types.length,
                })
              : copy.noRoomTypes
          }
          action={
            !search ? (
              <Link href="/admin/room-types/new" className={adminButtonClass}>
                {copy.newRoomType}
              </Link>
            ) : undefined
          }
        />
      )}
    </AdminShell>
  );
}

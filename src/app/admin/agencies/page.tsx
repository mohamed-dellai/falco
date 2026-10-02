import { createAgencyAction } from "@/app/admin/actions";
import { AdminError, AdminShell } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminField,
  AdminPanel,
  AdminSearchForm,
  AdminTableFrame,
  adminButtonClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listAgencies } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function AgenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const allAgencies = await listAgencies();
  const search = query.q?.trim().toLocaleLowerCase(locale) ?? "";
  const agencies = search
    ? allAgencies.filter((agency) =>
        [
          agency.name,
          agency.country,
          agency.contactName,
          agency.email,
          agency.phone,
        ]
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(search),
      )
    : allAgencies;

  return (
    <AdminShell
      title={copy.agencies}
      note={
        <span aria-live="polite" className="text-sm text-[var(--desk-muted)]">
          {fill(copy.agencyCount, { count: agencies.length })}
        </span>
      }
    >
      <AdminError code={query.error} />
      <div className="mb-5">
        <AdminSearchForm
          action="/admin/agencies"
          label={copy.searchAgencies}
          placeholder={copy.searchAgencies}
          value={query.q}
        />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[18rem_1fr]">
        <AdminPanel title={copy.newAgency}>
          <form action={createAgencyAction} className="grid gap-3">
            <AdminField label={copy.agencyName}>
              <input name="name" required className={adminFieldClass} />
            </AdminField>
            <AdminField label={copy.country}>
              <input name="country" className={adminFieldClass} />
            </AdminField>
            <AdminField label={copy.contact}>
              <input name="contactName" className={adminFieldClass} />
            </AdminField>
            <AdminField label={copy.email}>
              <input name="email" type="email" className={adminFieldClass} />
            </AdminField>
            <AdminField label={copy.phone}>
              <input name="phone" className={adminFieldClass} />
            </AdminField>
            <AdminSubmitButton
              pendingLabel={copy.saving}
              className={adminButtonClass}
            >
              {copy.saveAgency}
            </AdminSubmitButton>
          </form>
        </AdminPanel>
        {agencies.length ? (
          <>
            <div className="grid gap-3 lg:hidden">
              {agencies.map((agency) => (
                <article
                  key={agency.id}
                  className="rounded-2xl border border-[var(--desk-line)] bg-white p-4"
                >
                  <h2 className="font-semibold">{agency.name}</h2>
                  <p className="mt-1 text-sm text-[var(--desk-muted)]">
                    {agency.country || "—"}
                  </p>
                  <dl className="mt-3 grid gap-2 border-t border-[var(--desk-line)] pt-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--desk-muted)]">
                        {copy.contact}
                      </dt>
                      <dd className="text-end font-medium">
                        {agency.contactName || "—"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[var(--desk-muted)]">{copy.email}</dt>
                      <dd className="truncate text-end font-medium">
                        {agency.email || "—"}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
            <div className="hidden lg:block">
              <AdminTableFrame>
                <table className="desk-table w-full border-collapse text-start text-sm">
                  <thead className="bg-[var(--desk-canvas)]">
                    <tr>
                      <th className="px-4 py-3 text-start">{copy.agency}</th>
                      <th className="px-4 py-3 text-start">{copy.country}</th>
                      <th className="px-4 py-3 text-start">{copy.contact}</th>
                      <th className="px-4 py-3 text-start">{copy.email}</th>
                      <th className="px-4 py-3 text-start">{copy.phone}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agencies.map((agency) => (
                      <tr key={agency.id}>
                        <td className="px-4 py-3 font-medium">{agency.name}</td>
                        <td className="px-4 py-3">{agency.country || "—"}</td>
                        <td className="px-4 py-3">
                          {agency.contactName || "—"}
                        </td>
                        <td className="px-4 py-3">{agency.email || "—"}</td>
                        <td className="px-4 py-3 font-plex text-xs">
                          {agency.phone || "—"}
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
                    count: allAgencies.length,
                  })
                : copy.noAgencies
            }
          />
        )}
      </div>
    </AdminShell>
  );
}

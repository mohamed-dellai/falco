import { createAgencyAction } from "@/app/admin/actions";
import {
  AdminError,
  AdminPanel,
  AdminShell,
  adminButtonClass,
  adminFieldClass,
} from "@/components/admin-shell";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listAgencies } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function AgenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const query = await searchParams;
  const agencies = await listAgencies();

  return (
    <AdminShell title={copy.agencies} searchPlaceholder={copy.searchAgencies}>
      <AdminError code={query.error} />
      <div className="grid items-start gap-4 xl:grid-cols-[16rem_1fr]">
        <AdminPanel title={copy.newAgency}>
          <form action={createAgencyAction} className="grid gap-3">
            <Field label={copy.agencyName}>
              <input name="name" required className={adminFieldClass} />
            </Field>
            <Field label={copy.country}>
              <input name="country" className={adminFieldClass} />
            </Field>
            <Field label={copy.contact}>
              <input name="contactName" className={adminFieldClass} />
            </Field>
            <Field label={copy.email}>
              <input name="email" type="email" className={adminFieldClass} />
            </Field>
            <Field label={copy.phone}>
              <input name="phone" className={adminFieldClass} />
            </Field>
            <button type="submit" className={adminButtonClass}>
              {copy.saveAgency}
            </button>
          </form>
        </AdminPanel>
        {agencies.length ? (
          <div className="overflow-x-auto rounded border border-[#d5dbe3] bg-white">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-[#f4f7fa] text-[11px] font-semibold uppercase tracking-wide text-[#5c6776]">
                <tr>
                  <th className="px-3 py-2">{copy.agency}</th>
                  <th className="px-3 py-2">{copy.country}</th>
                  <th className="px-3 py-2">{copy.contact}</th>
                  <th className="px-3 py-2">{copy.email}</th>
                  <th className="px-3 py-2">{copy.phone}</th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((agency) => (
                  <tr key={agency.id} data-search-item className="border-t border-[#e6ebf0]">
                    <td className="px-3 py-2 font-medium">{agency.name}</td>
                    <td className="px-3 py-2">{agency.country}</td>
                    <td className="px-3 py-2">{agency.contactName}</td>
                    <td className="px-3 py-2">{agency.email}</td>
                    <td className="px-3 py-2">{agency.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded border border-dashed border-[#c5ced8] bg-white px-4 py-6 text-sm text-[#5c6776]">
            {copy.noAgencies}
          </p>
        )}
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-xs font-semibold text-[#334155]">
      {label}
      {children}
    </label>
  );
}

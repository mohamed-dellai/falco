import { notFound } from "next/navigation";
import { saveCommercialAction } from "@/app/admin/actions";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { AdminNotice, AdminPanel, adminButtonClass, adminFieldClass } from "@/components/admin-ui";
import { AdminField } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getCommercial } from "@/lib/client-crm";
import { getAdminLocale } from "@/lib/admin-locale";

export const dynamic = "force-dynamic";

export default async function CommercialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const { id } = await params;
  const query = await searchParams;
  const rep = await getCommercial(id);
  if (!rep) notFound();

  return (
    <AdminShell
      title={rep.name}
      crumbs={[{ href: "/admin/commercials", label: copy.commercials }]}
    >
      <AdminError code={query.error} />
      {query.saved && <AdminNotice tone="success">{copy.commercialSaved}</AdminNotice>}
      <AdminPanel title={copy.commercial} className="max-w-3xl">
        <form action={saveCommercialAction} className="grid gap-3">
          <input type="hidden" name="id" value={rep.id} />
          <AdminField label={copy.commercial}>
            <input name="name" required minLength={2} maxLength={140} defaultValue={rep.name} className={adminFieldClass} />
          </AdminField>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label={copy.email}>
              <input name="email" type="email" required maxLength={160} defaultValue={rep.email} className={adminFieldClass} />
            </AdminField>
            <AdminField label={copy.phone}>
              <input name="phone" maxLength={40} defaultValue={rep.phone} className={adminFieldClass} />
            </AdminField>
            <AdminField label={copy.country}>
              <input name="country" maxLength={80} defaultValue={rep.country} className={adminFieldClass} />
            </AdminField>
            <AdminField label={copy.commissionPercent} hint={copy.commissionPercentHint}>
              <input name="percent" type="number" min={0} max={100} required defaultValue={rep.percent} className={adminFieldClass} />
            </AdminField>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="disabled" value="1" defaultChecked={rep.disabled} />
            {copy.commercialDisabled}
          </label>
          <AdminSubmitButton pendingLabel={copy.saving} className={`${adminButtonClass} w-fit`}>
            {copy.saveCommercial}
          </AdminSubmitButton>
        </form>
      </AdminPanel>
    </AdminShell>
  );
}

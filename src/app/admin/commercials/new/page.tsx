import { saveCommercialAction } from "@/app/admin/actions";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { AdminPanel, adminButtonClass, adminFieldClass } from "@/components/admin-ui";
import { AdminField } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";

export const dynamic = "force-dynamic";

export default async function NewCommercialPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const query = await searchParams;

  return (
    <AdminShell
      title={copy.newCommercial}
      crumbs={[{ href: "/admin/commercials", label: copy.commercials }]}
    >
      <AdminError code={query.error} />
      <AdminPanel title={copy.commercial} className="max-w-3xl">
        <form action={saveCommercialAction} className="grid gap-3">
          <AdminField label={copy.commercial}>
            <input name="name" required minLength={2} maxLength={140} className={adminFieldClass} />
          </AdminField>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label={copy.email}>
              <input name="email" type="email" required maxLength={160} className={adminFieldClass} />
            </AdminField>
            <AdminField label={copy.phone}>
              <input name="phone" maxLength={40} className={adminFieldClass} />
            </AdminField>
            <AdminField label={copy.country}>
              <input name="country" maxLength={80} className={adminFieldClass} />
            </AdminField>
            <AdminField label={copy.commissionPercent} hint={copy.commissionPercentHint}>
              <input name="percent" type="number" min={0} max={100} required defaultValue={0} className={adminFieldClass} />
            </AdminField>
          </div>
          <AdminSubmitButton pendingLabel={copy.saving} className={`${adminButtonClass} w-fit`}>
            {copy.saveCommercial}
          </AdminSubmitButton>
        </form>
      </AdminPanel>
    </AdminShell>
  );
}

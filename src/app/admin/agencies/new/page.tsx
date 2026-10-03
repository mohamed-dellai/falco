import { createAgencyAction } from "@/app/admin/actions";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { AdminPanel, adminButtonClass } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { ClientFields } from "@/components/client-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";

export const dynamic = "force-dynamic";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const copy = adminCopy(await getAdminLocale());

  return (
    <AdminShell
      title={copy.newAgency}
      crumbs={[{ href: "/admin/agencies", label: copy.agencies }]}
    >
      <AdminError code={query.error} />
      <AdminPanel title={copy.clientRecord} className="max-w-3xl">
        <form action={createAgencyAction} className="grid gap-3">
          <ClientFields />
          <AdminSubmitButton
            pendingLabel={copy.saving}
            className={`${adminButtonClass} w-fit`}
          >
            {copy.saveAgency}
          </AdminSubmitButton>
        </form>
      </AdminPanel>
    </AdminShell>
  );
}

import { notFound } from "next/navigation";
import { updateAgencyAction } from "@/app/admin/actions";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { AdminPanel, adminButtonClass } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { ClientFields } from "@/components/client-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAgency } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const { id } = await params;
  const query = await searchParams;
  const client = await getAgency(id);
  if (!client) notFound();

  return (
    <AdminShell
      title={client.name}
      crumbs={[{ href: "/admin/agencies", label: copy.agencies }]}
    >
      <AdminError code={query.error} />
      <AdminPanel title={copy.clientRecord} className="max-w-3xl">
        <form action={updateAgencyAction} className="grid gap-3">
          <input type="hidden" name="id" value={client.id} />
          <ClientFields client={client} />
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

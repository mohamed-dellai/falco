import { updateAgencyAction } from "@/app/admin/actions";
import { AdminError } from "@/components/admin-shell";
import { AdminNotice, AdminPanel, adminButtonClass } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { ClientFields } from "@/components/client-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { listClientGroups } from "@/lib/client-crm";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAgency } from "@/lib/inventory";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClientDetailsPage({
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
  const [client, groups] = await Promise.all([getAgency(id), listClientGroups()]);
  if (!client) notFound();

  return (
    <>
      <AdminError code={query.error} />
      {query.saved === "details" && <AdminNotice tone="success">{copy.detailsSaved}</AdminNotice>}
      <AdminPanel title={copy.clientSectionDetails} className="mt-4 max-w-3xl">
        <form action={updateAgencyAction} className="grid gap-3">
          <input type="hidden" name="id" value={client.id} />
          <ClientFields client={client} groups={groups} />
          <AdminSubmitButton
            pendingLabel={copy.saving}
            className={`${adminButtonClass} w-fit`}
          >
            {copy.saveAgency}
          </AdminSubmitButton>
        </form>
      </AdminPanel>
    </>
  );
}

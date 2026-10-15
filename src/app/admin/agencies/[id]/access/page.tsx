import { notFound } from "next/navigation";
import { updateAgencyAccessAction } from "@/app/admin/actions";
import { AdminError } from "@/components/admin-shell";
import { AdminNotice, AdminPanel, adminButtonClass } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { PortalFields } from "@/components/client-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { agencyLoginEmail } from "@/lib/agency-auth";
import { getAgency } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function ClientAccessPage({
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
  const client = await getAgency(id);
  if (!client) notFound();
  if (client.kind !== "agency") {
    return <p className="text-sm text-[var(--desk-muted)]">{copy.accessCompaniesOnly}</p>;
  }
  const portalEmail = await agencyLoginEmail(client.id);

  return (
    <>
      <AdminError code={query.error} />
      {query.saved === "access" && <AdminNotice tone="success">{copy.accessSaved}</AdminNotice>}
      <AdminPanel title={copy.clientSectionAccess} className="mt-4 max-w-3xl">
        {client.disabled ? (
          <p className="text-sm text-[var(--desk-muted)]">{copy.clientDisabledHint}</p>
        ) : (
          <form action={updateAgencyAccessAction} className="grid gap-3">
            <input type="hidden" name="id" value={client.id} />
            <PortalFields portalEmail={portalEmail ?? undefined} />
            <AdminSubmitButton
              pendingLabel={copy.saving}
              className={`${adminButtonClass} w-fit`}
            >
              {copy.saveAgency}
            </AdminSubmitButton>
          </form>
        )}
      </AdminPanel>
    </>
  );
}

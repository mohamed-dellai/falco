import { notFound } from "next/navigation";
import { saveIdentityAction } from "@/app/admin/actions";
import { AdminError } from "@/components/admin-shell";
import { AdminNotice, AdminPanel, adminButtonClass, adminFieldClass } from "@/components/admin-ui";
import { AdminField } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { currentAdmin, requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { contactRevealed } from "@/lib/contact-reveal";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAgency } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function ClientIdentityPage({
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
  if (client.kind !== "individual") {
    return <p className="text-sm text-[var(--desk-muted)]">{copy.identityPeopleOnly}</p>;
  }
  const admin = await currentAdmin();
  const revealed = admin ? await contactRevealed(admin.id) : false;

  return (
    <>
      <AdminError code={query.error} />
      {query.saved === "identity" && (
        <AdminNotice tone="success">{copy.identitySaved}</AdminNotice>
      )}
      <AdminPanel title={copy.clientSectionIdentity} className="mt-4 max-w-3xl">
        <form action={saveIdentityAction} className="grid gap-3">
          <input type="hidden" name="id" value={client.id} />
          <AdminField label={copy.nationalId}>
            <input
              name="nationalId"
              maxLength={40}
              defaultValue={client.nationalId}
              className={adminFieldClass}
            />
          </AdminField>
          <AdminField label={copy.identityCopy} hint={copy.identityHint}>
            <input name="identity" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className={adminFieldClass} />
          </AdminField>
          {client.hasIdentityFile && revealed && (
            <a
              href={`/admin/agencies/${client.id}/identity/file`}
              className="text-sm font-semibold text-[var(--desk-primary)]"
            >
              {copy.identityCopy}
            </a>
          )}
          {client.hasIdentityFile && !revealed && (
            <p className="text-sm text-[var(--desk-muted)]">{copy.contactHidden}</p>
          )}
          <AdminSubmitButton pendingLabel={copy.saving} className={`${adminButtonClass} w-fit`}>
            {copy.saveIdentity}
          </AdminSubmitButton>
        </form>
      </AdminPanel>
    </>
  );
}

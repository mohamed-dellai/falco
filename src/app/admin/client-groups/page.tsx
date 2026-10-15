import {
  createClientGroupAction,
  deleteClientGroupAction,
  renameClientGroupAction,
} from "@/app/admin/actions";
import { AdminError, AdminShell } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminPanel,
  adminButtonClass,
  adminButtonDangerClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { AdminField } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { listClientGroups } from "@/lib/client-crm";
import { getAdminLocale } from "@/lib/admin-locale";

export const dynamic = "force-dynamic";

export default async function ClientGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const query = await searchParams;
  const groups = await listClientGroups();

  return (
    <AdminShell
      title={copy.clientGroups}
      crumbs={[{ href: "/admin/agencies", label: copy.agencies }]}
    >
      <AdminError code={query.error} />
      {query.saved && <p className="mb-4 text-sm font-semibold text-[var(--desk-ink)]">{copy.groupSaved}</p>}
      <AdminPanel title={copy.newClientGroup} className="mb-4 max-w-xl">
        <form action={createClientGroupAction} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <AdminField label={copy.groupName}>
            <input name="name" required minLength={2} maxLength={80} className={adminFieldClass} />
          </AdminField>
          <AdminSubmitButton pendingLabel={copy.saving} className={adminButtonClass}>
            {copy.newClientGroup}
          </AdminSubmitButton>
        </form>
      </AdminPanel>
      {groups.length ? (
        <div className="grid max-w-xl gap-3">
          {groups.map((group) => (
            <AdminPanel key={group.id} title={group.name}>
              <form action={renameClientGroupAction} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <input type="hidden" name="id" value={group.id} />
                <AdminField label={copy.groupName}>
                  <input name="name" required minLength={2} maxLength={80} defaultValue={group.name} className={adminFieldClass} />
                </AdminField>
                <AdminSubmitButton pendingLabel={copy.saving} className={adminButtonClass}>
                  {copy.saveParameter}
                </AdminSubmitButton>
              </form>
              <form action={deleteClientGroupAction} className="mt-3">
                <input type="hidden" name="id" value={group.id} />
                <button type="submit" className={adminButtonDangerClass}>
                  {copy.deleteParameter}
                </button>
              </form>
            </AdminPanel>
          ))}
        </div>
      ) : (
        <AdminEmptyState title={copy.noGroups} />
      )}
    </AdminShell>
  );
}

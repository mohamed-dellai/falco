import {
  addServiceTypeAction,
  deleteServiceTypeAction,
} from "@/app/admin/services/actions";
import { AdminError } from "@/components/admin-shell";
import {
  AdminField,
  AdminNotice,
  AdminTableFrame,
  adminButtonSecondaryClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { NamedConfirm } from "@/components/named-confirm";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listServiceTypes } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function ServiceTypesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const query = await searchParams;
  const types = await listServiceTypes();

  return (
    <>
      <p className="mb-4 max-w-3xl text-sm text-[var(--desk-muted)]">{copy.serviceTypesHint}</p>
      <AdminError code={query.error} />
      {query.saved ? (
        <div className="mb-4">
          <AdminNotice tone="success">{copy.serviceSaved}</AdminNotice>
        </div>
      ) : null}
      <form action={addServiceTypeAction} className="mb-4 grid gap-3 rounded-lg border border-[var(--desk-line)] bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end">
        <AdminField label={copy.serviceTypeName}>
          <input name="name" required minLength={2} maxLength={80} className={adminFieldClass} />
        </AdminField>
        <AdminSubmitButton pendingLabel={copy.serviceAddType} className={adminButtonSecondaryClass}>
          {copy.serviceAddType}
        </AdminSubmitButton>
      </form>
      {types.length ? (
        <AdminTableFrame>
          <table className="desk-table w-full border-collapse text-start text-sm">
            <thead>
              <tr>
                <th>{copy.serviceTypeName}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {types.map((type) => (
                <tr key={type.id}>
                  <td className="font-semibold text-[var(--desk-ink)]">{type.name}</td>
                  <td className="text-end">
                    <NamedConfirm
                      title={copy.serviceTypeDeleteTitle}
                      body={fill(copy.serviceTypeDeleteBody, { name: type.name })}
                      confirm={copy.serviceDelete}
                      pendingLabel={copy.serviceDelete}
                      action={deleteServiceTypeAction}
                      fields={{ id: type.id }}
                      trigger={copy.serviceDelete}
                      cancelLabel={copy.cancelAction}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableFrame>
      ) : null}
    </>
  );
}

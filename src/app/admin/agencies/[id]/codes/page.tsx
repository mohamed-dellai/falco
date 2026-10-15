import { notFound } from "next/navigation";
import {
  addSupplierCodeAction,
  deleteSupplierCodeAction,
  updateAgencySupplierAction,
} from "@/app/admin/actions";
import { AdminError } from "@/components/admin-shell";
import {
  AdminNotice,
  AdminPanel,
  adminButtonClass,
  adminButtonDangerClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { AdminField } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { listSupplierCodes } from "@/lib/client-crm";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAgency } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function ClientCodesPage({
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
    return <p className="text-sm text-[var(--desk-muted)]">{copy.codesCompaniesOnly}</p>;
  }
  const codes = await listSupplierCodes(client.id);

  return (
    <>
      <AdminError code={query.error} />
      {query.saved === "codes" && <AdminNotice tone="success">{copy.codesSaved}</AdminNotice>}
      <AdminPanel title={copy.supplierCodes} className="mt-4 max-w-3xl">
        <form action={updateAgencySupplierAction} className="grid gap-3">
          <input type="hidden" name="id" value={client.id} />
          <label className="flex items-start gap-3 rounded-xl border border-[var(--desk-line)] px-4 py-3">
            <input
              type="checkbox"
              name="isSupplier"
              value="1"
              defaultChecked={client.isSupplier}
              className="mt-1 size-4"
            />
            <span>
              <span className="block text-sm font-semibold">{copy.isSupplier}</span>
              <span className="mt-1 block text-sm text-[var(--desk-muted)]">
                {copy.isSupplierHint}
              </span>
            </span>
          </label>
          <AdminSubmitButton pendingLabel={copy.saving} className={`${adminButtonClass} w-fit`}>
            {copy.saveAgency}
          </AdminSubmitButton>
        </form>
        {client.isSupplier && (
          <div className="mt-6 grid gap-3 border-t border-[var(--desk-line)] pt-4">
            {codes.length ? (
              <ul className="grid gap-2">
                {codes.map((code) => (
                  <li
                    key={code.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--desk-line)] px-3 py-2 text-sm"
                  >
                    <span>
                      <strong>{code.provider}</strong>
                      <span className="text-[var(--desk-muted)]"> · {code.externalCode}</span>
                    </span>
                    <form action={deleteSupplierCodeAction}>
                      <input type="hidden" name="id" value={client.id} />
                      <input type="hidden" name="codeId" value={code.id} />
                      <button type="submit" className={adminButtonDangerClass}>
                        {copy.deleteParameter}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : null}
            <form action={addSupplierCodeAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={client.id} />
              <AdminField label={copy.providerName}>
                <input name="provider" required minLength={2} maxLength={80} className={adminFieldClass} />
              </AdminField>
              <AdminField label={copy.externalCode}>
                <input name="externalCode" required maxLength={80} className={adminFieldClass} />
              </AdminField>
              <AdminSubmitButton pendingLabel={copy.saving} className={`${adminButtonClass} w-fit`}>
                {copy.addCode}
              </AdminSubmitButton>
            </form>
          </div>
        )}
      </AdminPanel>
    </>
  );
}

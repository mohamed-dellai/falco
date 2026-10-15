import { notFound } from "next/navigation";
import { updateAgencySellingAction } from "@/app/admin/actions";
import { AdminError } from "@/components/admin-shell";
import { AdminNotice, AdminPanel, adminButtonClass } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAgency } from "@/lib/inventory";

export const dynamic = "force-dynamic";

function Switch({
  name,
  label,
  hint,
  checked,
}: {
  name: string;
  label: string;
  hint: string;
  checked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-[var(--desk-line)] px-4 py-3">
      <input
        type="checkbox"
        name={name}
        value="1"
        defaultChecked={checked}
        className="mt-1 size-4"
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-sm text-[var(--desk-muted)]">{hint}</span>
      </span>
    </label>
  );
}

export default async function ClientSellingPage({
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

  return (
    <>
      <AdminError code={query.error} />
      {query.saved === "selling" && (
        <AdminNotice tone="success">{copy.sellingSaved}</AdminNotice>
      )}
      <AdminPanel title={copy.clientSectionSelling} className="mt-4 max-w-3xl">
        <form action={updateAgencySellingAction} className="grid gap-3">
          <input type="hidden" name="id" value={client.id} />
          <Switch
            name="stopSale"
            label={copy.stopSaleClient}
            hint={copy.stopSaleClientHint}
            checked={client.stopSale}
          />
          <Switch
            name="disabled"
            label={copy.clientDisabled}
            hint={copy.clientDisabledHint}
            checked={client.disabled}
          />
          <AdminSubmitButton
            pendingLabel={copy.saving}
            className={`${adminButtonClass} w-fit`}
          >
            {copy.saveSelling}
          </AdminSubmitButton>
        </form>
      </AdminPanel>
    </>
  );
}

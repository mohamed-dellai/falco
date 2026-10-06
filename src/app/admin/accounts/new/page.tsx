import { AdminError, AdminShell } from "@/components/admin-shell";
import { AccountForm } from "@/components/account-form";
import { SettingsNav } from "@/components/settings-nav";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";

export const dynamic = "force-dynamic";

export default async function NewAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const copy = adminCopy(await getAdminLocale());

  return (
    <AdminShell
      title={copy.newAccount}
      crumbs={[{ href: "/admin/settings?section=accounts", label: copy.settings }]}
    >
      <div className="max-w-5xl">
        <AdminError code={query.error} />
        <SettingsNav active="accounts" copy={copy} />
        <AccountForm copy={copy} />
      </div>
    </AdminShell>
  );
}

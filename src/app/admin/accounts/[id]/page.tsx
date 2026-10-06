import { notFound } from "next/navigation";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { AccountForm } from "@/components/account-form";
import { SettingsNav } from "@/components/settings-nav";
import { currentAdmin, requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { countAdminUsers, getAdminUser } from "@/lib/admin-users";

export const dynamic = "force-dynamic";

export default async function AccountPage({
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
  const [account, actor, total] = await Promise.all([
    getAdminUser(id),
    currentAdmin(),
    countAdminUsers(),
  ]);
  if (!account) notFound();

  return (
    <AdminShell
      title={account.name}
      crumbs={[{ href: "/admin/settings?section=accounts", label: copy.settings }]}
    >
      <div className="max-w-5xl">
        <AdminError code={query.error} />
        <SettingsNav active="accounts" copy={copy} />
        <AccountForm
          copy={copy}
          account={account}
          canDelete={account.id !== actor?.id && total > 1}
        />
      </div>
    </AdminShell>
  );
}

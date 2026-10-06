import { AdminError, AdminShell } from "@/components/admin-shell";
import { AccountList, matchingAccounts } from "@/components/account-list";
import { CompanyForm } from "@/components/company-form";
import { SettingsNav, settingsSection } from "@/components/settings-nav";
import { AdminNotice } from "@/components/admin-ui";
import { currentAdmin, requireAdmin } from "@/lib/admin-auth";
import { adminCopy, countText } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listAdminUsers } from "@/lib/admin-users";
import { getCompanyProfile } from "@/lib/company";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; saved?: string; section?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const section = settingsSection(query.section);
  const [company, accounts, actor] = await Promise.all([
    getCompanyProfile(),
    listAdminUsers(),
    currentAdmin(),
  ]);

  return (
    <AdminShell
      title={copy.settings}
      note={
        section === "accounts" ? (
          <span aria-live="polite" className="text-sm text-[var(--desk-muted)]">
            {countText(
              matchingAccounts(accounts, query.q ?? "", locale).length,
              copy.accountCountOne,
              copy.accountCount,
            )}
          </span>
        ) : (
          <span className="text-sm text-[var(--desk-muted)]">{copy.companyPublicHint}</span>
        )
      }
    >
      <div className="max-w-5xl">
        <AdminError code={query.error} />
        {section === "company" && query.saved === "company" && (
          <div className="mb-4">
            <AdminNotice tone="success">{copy.companySaved}</AdminNotice>
          </div>
        )}
        <SettingsNav active={section} copy={copy} />
        {section === "accounts" ? (
          <AccountList
            copy={copy}
            accounts={accounts}
            actorId={actor?.id ?? null}
            query={query.q ?? ""}
            locale={locale}
          />
        ) : (
          <CompanyForm copy={copy} company={company} />
        )}
      </div>
    </AdminShell>
  );
}

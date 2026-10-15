import { AdminError, AdminShell } from "@/components/admin-shell";
import { AccountList, matchingAccounts } from "@/components/account-list";
import { CompanyForm } from "@/components/company-form";
import { HotelParametersPanel } from "@/components/hotel-parameters-panel";
import { MailSettingsForm } from "@/components/mail-settings-form";
import { PolicyDesk } from "@/components/policy-desk";
import { SettingsNav, settingsSection } from "@/components/settings-nav";
import { AdminNotice } from "@/components/admin-ui";
import { currentAdmin, requireAdmin } from "@/lib/admin-auth";
import { adminCopy, countText } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listAdminUsers } from "@/lib/admin-users";
import { getCompanyProfile } from "@/lib/company";
import { listMealTypes, listViewTypes } from "@/lib/hotel-parameters";
import { getMailSettings } from "@/lib/mail";
import { listPolicyTemplates } from "@/lib/policies";
import { listRoomTypes } from "@/lib/inventory";

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
  const [company, accounts, actor, roomTypes, meals, views, mail, policies] = await Promise.all([
    getCompanyProfile(),
    listAdminUsers(),
    currentAdmin(),
    section === "hotel" ? listRoomTypes() : Promise.resolve([]),
    section === "hotel" ? listMealTypes() : Promise.resolve([]),
    section === "hotel" ? listViewTypes() : Promise.resolve([]),
    section === "mail" ? getMailSettings() : Promise.resolve(null),
    section === "policies" ? listPolicyTemplates() : Promise.resolve([]),
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
          <span className="text-sm text-[var(--desk-muted)]">
            {section === "hotel"
              ? copy.hotelParametersHint
              : section === "mail"
                ? copy.mailHint
                : section === "policies"
                  ? copy.policiesHint
                  : copy.companyPublicHint}
          </span>
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
        {section === "hotel" && query.saved === "hotel" && (
          <div className="mb-4">
            <AdminNotice tone="success">{copy.catalogSaved}</AdminNotice>
          </div>
        )}
        {section === "mail" && query.saved === "mail" && (
          <div className="mb-4">
            <AdminNotice tone="success">{copy.mailSaved}</AdminNotice>
          </div>
        )}
        {section === "mail" && query.saved === "mail-test" && (
          <div className="mb-4">
            <AdminNotice tone="success">{copy.mailTestSent}</AdminNotice>
          </div>
        )}
        {section === "policies" && query.saved === "policy" && (
          <div className="mb-4">
            <AdminNotice tone="success">{copy.policySaved}</AdminNotice>
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
        ) : section === "hotel" ? (
          <HotelParametersPanel
            copy={copy}
            roomTypes={roomTypes}
            meals={meals}
            views={views}
          />
        ) : section === "mail" && mail ? (
          <MailSettingsForm copy={copy} mail={mail} />
        ) : section === "policies" ? (
          <PolicyDesk items={policies} copy={copy} empty={copy.policyTemplatesEmpty} />
        ) : (
          <CompanyForm copy={copy} company={company} />
        )}
      </div>
    </AdminShell>
  );
}

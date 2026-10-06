import { saveCompanyAction } from "@/app/admin/actions";
import { AdminPanel, adminButtonClass, adminFieldClass } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import type { AdminCopy } from "@/lib/admin-copy";
import type { CompanyProfile } from "@/lib/company";
import type { ReactNode } from "react";

const addressFields = [
  ["addressEn", "en", "English"],
  ["addressFr", "fr", "Français"],
  ["addressAr", "ar", "العربية"],
  ["addressIt", "it", "Italiano"],
] as const;

function FieldGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3 border-t border-[var(--desk-line)] pt-5 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
          {title}
        </h3>
        {hint && (
          <p className="mt-1 text-sm text-[var(--desk-muted)]">{hint}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      {label}
      {children}
    </label>
  );
}

export function CompanyForm({
  copy,
  company,
}: {
  copy: AdminCopy;
  company: CompanyProfile;
}) {
  return (
    <AdminPanel>
      <form id="company" action={saveCompanyAction} className="grid gap-5">
        <FieldGroup title={copy.settingsIdentity}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.companyName}>
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={company.name}
                className={adminFieldClass}
              />
            </Field>
            <Field label={copy.legalName}>
              <input
                name="legalName"
                maxLength={160}
                defaultValue={company.legalName}
                className={adminFieldClass}
              />
            </Field>
          </div>
        </FieldGroup>
        <FieldGroup title={copy.settingsContact} hint={copy.companyPublicHint}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.email}>
              <input
                name="email"
                type="email"
                required
                maxLength={160}
                defaultValue={company.email}
                className={adminFieldClass}
              />
            </Field>
            <Field label={copy.phone}>
              <input
                name="phone"
                required
                minLength={6}
                maxLength={40}
                defaultValue={company.phoneDisplay}
                className={adminFieldClass}
              />
            </Field>
            <Field label={copy.whatsappNumber}>
              <input
                name="whatsapp"
                required
                inputMode="tel"
                defaultValue={company.whatsapp}
                className={adminFieldClass}
              />
            </Field>
          </div>
        </FieldGroup>
        <FieldGroup title={copy.settingsRegistration}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.commercialRegistration}>
              <input
                name="commercialRegistration"
                maxLength={40}
                defaultValue={company.commercialRegistration}
                className={adminFieldClass}
              />
            </Field>
            <Field label={copy.vatNumber}>
              <input
                name="vatNumber"
                maxLength={40}
                defaultValue={company.vatNumber}
                className={adminFieldClass}
              />
            </Field>
          </div>
        </FieldGroup>
        <FieldGroup title={copy.settingsAddresses}>
          <div className="grid gap-4 sm:grid-cols-2">
            {addressFields.map(([name, locale, label]) => (
              <Field key={name} label={`${copy.address} · ${label}`}>
                <textarea
                  name={name}
                  rows={3}
                  maxLength={400}
                  defaultValue={company.address[locale]}
                  className={adminFieldClass}
                />
              </Field>
            ))}
          </div>
        </FieldGroup>
        <div className="flex justify-end border-t border-[var(--desk-line)] pt-4">
          <AdminSubmitButton
            pendingLabel={copy.saving}
            className={`${adminButtonClass} w-fit`}
          >
            {copy.saveSettings}
          </AdminSubmitButton>
        </div>
      </form>
    </AdminPanel>
  );
}

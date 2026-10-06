import { query, execute } from "@/lib/db";
import { siteConfig } from "@/lib/site";
import type { Locale } from "@/i18n/routing";

export type CompanyProfile = {
  name: string;
  legalName: string;
  email: string;
  phoneDisplay: string;
  whatsapp: string;
  commercialRegistration: string;
  vatNumber: string;
  address: Record<Locale, string>;
};

type CompanyRow = {
  name: string;
  legal_name: string;
  email: string;
  phone_display: string;
  whatsapp: string;
  commercial_registration: string;
  vat_number: string;
  address_en: string;
  address_ar: string;
  address_fr: string;
  address_it: string;
};

export function companyDefaults(): CompanyProfile {
  return {
    name: siteConfig.name,
    legalName: "",
    email: siteConfig.email,
    phoneDisplay: siteConfig.phoneDisplay,
    whatsapp: siteConfig.whatsapp.replace(/\D/g, ""),
    commercialRegistration: "",
    vatNumber: "",
    address: { ...siteConfig.company.address },
  };
}

function mapCompany(row: CompanyRow): CompanyProfile {
  return {
    name: row.name,
    legalName: row.legal_name,
    email: row.email,
    phoneDisplay: row.phone_display,
    whatsapp: row.whatsapp.replace(/\D/g, ""),
    commercialRegistration: row.commercial_registration,
    vatNumber: row.vat_number,
    address: {
      en: row.address_en,
      ar: row.address_ar,
      fr: row.address_fr,
      it: row.address_it,
    },
  };
}

export async function getCompanyProfile() {
  const rows = await query<CompanyRow>(
    `SELECT name, legal_name, email, phone_display, whatsapp, commercial_registration, vat_number,
            address_en, address_ar, address_fr, address_it
     FROM company_profile WHERE id = 'default'`,
  );
  return rows[0] ? mapCompany(rows[0]) : companyDefaults();
}

function validEmail(email: string) {
  return email.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function companyDraft(input: CompanyProfile) {
  const name = input.name.trim();
  const email = input.email.trim();
  const phoneDisplay = input.phoneDisplay.trim();
  const whatsapp = input.whatsapp.replace(/\D/g, "");
  const address = {
    en: input.address.en.trim(),
    ar: input.address.ar.trim(),
    fr: input.address.fr.trim(),
    it: input.address.it.trim(),
  };
  if (
    name.length < 2 ||
    name.length > 120 ||
    !validEmail(email) ||
    phoneDisplay.length < 6 ||
    phoneDisplay.length > 40 ||
    whatsapp.length < 8 ||
    whatsapp.length > 15 ||
    Object.values(address).some((line) => line.length > 400)
  ) {
    return null;
  }
  return {
    name,
    legalName: input.legalName.trim().slice(0, 160),
    email,
    phoneDisplay,
    whatsapp,
    commercialRegistration: input.commercialRegistration.trim().slice(0, 40),
    vatNumber: input.vatNumber.trim().slice(0, 40),
    address,
  } satisfies CompanyProfile;
}

export async function saveCompanyProfile(input: CompanyProfile) {
  const draft = companyDraft(input);
  if (!draft) return false;
  await execute(
    `INSERT INTO company_profile
      (id, name, legal_name, email, phone_display, whatsapp, commercial_registration, vat_number,
       address_en, address_ar, address_fr, address_it)
     VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       legal_name = EXCLUDED.legal_name,
       email = EXCLUDED.email,
       phone_display = EXCLUDED.phone_display,
       whatsapp = EXCLUDED.whatsapp,
       commercial_registration = EXCLUDED.commercial_registration,
       vat_number = EXCLUDED.vat_number,
       address_en = EXCLUDED.address_en,
       address_ar = EXCLUDED.address_ar,
       address_fr = EXCLUDED.address_fr,
       address_it = EXCLUDED.address_it`,
    [
      draft.name,
      draft.legalName,
      draft.email,
      draft.phoneDisplay,
      draft.whatsapp,
      draft.commercialRegistration,
      draft.vatNumber,
      draft.address.en,
      draft.address.ar,
      draft.address.fr,
      draft.address.it,
    ],
  );
  return true;
}

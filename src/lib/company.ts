import { query, execute } from "@/lib/db";
import { readLogo } from "@/lib/logo-image";
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
  hasLogo: boolean;
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
  has_logo: boolean;
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
    hasLogo: false,
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
    hasLogo: row.has_logo,
  };
}

export async function getCompanyProfile() {
  const rows = await query<CompanyRow>(
    `SELECT name, legal_name, email, phone_display, whatsapp, commercial_registration, vat_number,
            address_en, address_ar, address_fr, address_it,
            (COALESCE(logo_type, '') <> '') AS has_logo
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
    hasLogo: false,
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

function logoBytes(value: unknown) {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") {
    const hex = value.startsWith("\\x") ? value.slice(2) : value;
    return Buffer.from(hex, "hex");
  }
  return null;
}

export async function getCompanyLogo() {
  const rows = await query<{ logo: unknown; logo_type: string }>(
    `SELECT logo, logo_type FROM company_profile WHERE id = 'default' AND COALESCE(logo_type, '') <> ''`,
  );
  const bytes = logoBytes(rows[0]?.logo);
  const type = rows[0]?.logo_type;
  if (!bytes?.length || (type !== "image/png" && type !== "image/jpeg")) return null;
  return { bytes, type };
}

export async function saveCompanyLogo(file: File | null, remove: boolean) {
  if (file && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const raster = readLogo(bytes);
    if (!raster) return false;
    const type = raster.filter === "DCTDecode" ? "image/jpeg" : "image/png";
    await execute(`UPDATE company_profile SET logo = ?, logo_type = ? WHERE id = 'default'`, [bytes, type]);
    return true;
  }
  if (remove) {
    await execute(`UPDATE company_profile SET logo = NULL, logo_type = '' WHERE id = 'default'`);
  }
  return true;
}

export async function documentLogo() {
  const stored = await getCompanyLogo();
  return stored ? readLogo(stored.bytes) : null;
}

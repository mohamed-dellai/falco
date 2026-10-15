import { redirect } from "next/navigation";
import { updateAgencyProfileAction } from "@/app/[locale]/hotels/agency-actions";
import { AgencyPortalNav } from "@/components/agency-portal-nav";
import type { Locale } from "@/i18n/routing";
import { agencyPortalName, currentAgency, getAgencyProfile } from "@/lib/agency-auth";

export const dynamic = "force-dynamic";

function labels(locale: Locale) {
  if (locale === "fr")
    return {
      eyebrow: "Compte agence",
      title: "Profil agence",
      description:
        "Coordonnées utilisées par Falco pour les réservations et le suivi opérationnel.",
      company: "Société",
      registration: "Registre commercial",
      vat: "Numéro de TVA",
      login: "E-mail de connexion",
      loginHint: "Contactez Falco pour changer l’identifiant de connexion.",
      contact: "Contact opérationnel",
      contactName: "Nom du contact",
      email: "E-mail de réservation",
      phone: "Téléphone / WhatsApp",
      country: "Pays",
      save: "Enregistrer les coordonnées",
      saved: "Profil enregistré.",
      error: "Vérifiez les coordonnées saisies.",
    };
  if (locale === "ar")
    return {
      eyebrow: "حساب الوكالة",
      title: "ملف الوكالة",
      description: "بيانات الاتصال المستخدمة للحجوزات والمتابعة التشغيلية.",
      company: "الشركة",
      registration: "السجل التجاري",
      vat: "الرقم الضريبي",
      login: "بريد تسجيل الدخول",
      loginHint: "تواصل مع فالكو لتغيير بريد تسجيل الدخول.",
      contact: "جهة الاتصال التشغيلية",
      contactName: "اسم جهة الاتصال",
      email: "بريد الحجوزات",
      phone: "الهاتف / واتساب",
      country: "الدولة",
      save: "حفظ بيانات الاتصال",
      saved: "تم حفظ الملف.",
      error: "تحقق من البيانات المدخلة.",
    };
  if (locale === "it")
    return {
      eyebrow: "Account agenzia",
      title: "Profilo agenzia",
      description:
        "Contatti usati da Falco per prenotazioni e attività operative.",
      company: "Società",
      registration: "Registro imprese",
      vat: "Partita IVA",
      login: "E-mail di accesso",
      loginHint: "Contatta Falco per cambiare l’e-mail di accesso.",
      contact: "Contatto operativo",
      contactName: "Nome contatto",
      email: "E-mail prenotazioni",
      phone: "Telefono / WhatsApp",
      country: "Paese",
      save: "Salva contatti",
      saved: "Profilo salvato.",
      error: "Controlla i dati inseriti.",
    };
  return {
    eyebrow: "Agency account",
    title: "Agency profile",
    description:
      "Contact details Falco uses for reservations and operational follow-up.",
    company: "Company",
    registration: "Commercial registration",
    vat: "VAT number",
    login: "Portal sign-in email",
    loginHint: "Contact Falco to change the portal sign-in.",
    contact: "Operational contact",
    contactName: "Contact name",
    email: "Reservations email",
    phone: "Phone / WhatsApp",
    country: "Country",
    save: "Save contact details",
    saved: "Profile saved.",
    error: "Check the contact details and try again.",
  };
}

export default async function AgencyProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const copy = labels(locale);
  const agency = await currentAgency();
  if (!agency) redirect(`/${locale}/hotels/login`);
  const profile = await getAgencyProfile(agency.id);
  if (!profile) redirect(`/${locale}/hotels/login`);

  return (
    <section className="min-h-screen bg-[#f5f2eb] py-10 md:py-16">
      <div className="site-shell">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 className="font-display mt-2 text-4xl font-bold text-primary md:text-6xl">
              {copy.title}
            </h1>
          </div>
          <AgencyPortalNav locale={locale} active="profile" />
        </div>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          {copy.description}
        </p>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <form
            action={updateAgencyProfileAction}
            className="rounded-3xl border border-primary/10 bg-white p-6 shadow-sm md:p-8"
          >
            <input type="hidden" name="locale" value={locale} />
            <h2 className="font-display text-2xl font-bold text-primary">
              {copy.contact}
            </h2>
            {query.saved && (
              <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800">
                {copy.saved}
              </p>
            )}
            {query.error && (
              <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-800">
                {copy.error}
              </p>
            )}
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {[
                {
                  name: "contactName",
                  label: copy.contactName,
                  value: profile.contactName,
                  type: "text",
                },
                {
                  name: "email",
                  label: copy.email,
                  value: profile.email,
                  type: "email",
                },
                {
                  name: "phone",
                  label: copy.phone,
                  value: profile.phone,
                  type: "tel",
                },
                {
                  name: "country",
                  label: copy.country,
                  value: profile.country,
                  type: "text",
                },
              ].map((field) => (
                <label
                  key={field.name}
                  className="grid gap-1.5 text-xs font-bold text-primary"
                >
                  {field.label}
                  <input
                    name={field.name}
                    type={field.type}
                    defaultValue={field.value}
                    maxLength={field.name === "phone" ? 80 : 140}
                    className="h-11 rounded-xl border border-line px-3 text-sm font-normal"
                  />
                </label>
              ))}
            </div>
            <button
              type="submit"
              className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white"
            >
              {copy.save}
            </button>
          </form>

          <aside className="overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-sm">
            <div className="bg-primary p-6 text-white">
              <p className="text-[10px] font-bold tracking-wider text-gold uppercase">
                {copy.company}
              </p>
              <h2 className="font-display mt-2 text-2xl font-bold">
                {agencyPortalName(profile, locale)}
              </h2>
            </div>
            <dl className="grid gap-4 p-6 text-sm">
              <div>
                <dt className="text-xs font-bold text-muted">{copy.registration}</dt>
                <dd className="mt-1 font-plex font-semibold text-primary">
                  {profile.commercialRegistration || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-muted">{copy.vat}</dt>
                <dd className="mt-1 font-plex font-semibold text-primary">
                  {profile.vatNumber || "—"}
                </dd>
              </div>
              <div className="border-t border-primary/10 pt-4">
                <dt className="text-xs font-bold text-muted">{copy.login}</dt>
                <dd className="mt-1 break-all font-semibold text-primary">
                  {profile.loginEmail}
                </dd>
                <p className="mt-2 text-xs leading-5 text-muted">
                  {copy.loginHint}
                </p>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </section>
  );
}

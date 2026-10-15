import { AdminError, AdminShell } from "@/components/admin-shell";
import { AdminNotice } from "@/components/admin-ui";
import { MailTemplateDesk } from "@/components/mail-template-desk";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listMailTemplates, mailTemplateKind, mailTemplateKinds } from "@/lib/mail-templates";

export const dynamic = "force-dynamic";

export default async function ReservationMailingPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; error?: string; saved?: string; template?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const query = await searchParams;
  const kind = mailTemplateKind(query.kind);
  const templates = await listMailTemplates(kind);

  return (
    <AdminShell
      title={copy.reservationNavMail}
      crumbs={[{ href: "/admin/allotments", label: copy.allotments }]}
      note={<span className="text-sm text-[var(--desk-muted)]">{copy.reservationMailHint}</span>}
    >
      <AdminError code={query.error} />
      {query.saved === "template" && (
        <div className="mb-4">
          <AdminNotice tone="success">{copy.mailTemplateSaved}</AdminNotice>
        </div>
      )}
      <section className="rounded-lg border border-[var(--desk-line)] bg-white px-4 py-4 shadow-sm sm:px-5">
        <MailTemplateDesk
          kinds={mailTemplateKinds.map((item) => ({
            kind: item.kind,
            audience: item.audience,
            label: copy[item.label],
          }))}
          templates={templates}
          active={kind}
          focusId={query.template}
          saveLabel={copy.mailTemplateSave}
          copy={{
            hotel: copy.hotel,
            client: copy.client,
            subject: copy.docSubject,
            body: copy.docBody,
            name: copy.mailTemplateName,
            english: copy.mailTemplateEnglish,
            arabic: copy.mailTemplateArabic,
            tokens: copy.mailTemplateTokens,
            add: copy.mailTemplateAdd,
            defaultLabel: copy.mailTemplateDefault,
            setDefault: copy.mailTemplateSetDefault,
            delete: copy.mailTemplateDelete,
            deleteTitle: copy.mailTemplateDeleteTitle,
            deleteBody: copy.mailTemplateDeleteBody,
            dismiss: copy.dismiss,
            saving: copy.saving,
          }}
        />
      </section>
    </AdminShell>
  );
}

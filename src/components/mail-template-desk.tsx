"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  addMailTemplateAction,
  deleteMailTemplateAction,
  saveMailTemplateAction,
  setDefaultMailTemplateAction,
} from "@/app/admin/allotments/mailing/actions";
import { NamedConfirm } from "@/components/named-confirm";
import { adminButtonClass, adminFieldClass } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import type { MailTemplate, MailTemplateAudience } from "@/lib/mail-templates";

type KindLink = {
  kind: string;
  audience: MailTemplateAudience;
  label: string;
};

type DeskCopy = {
  hotel: string;
  client: string;
  subject: string;
  body: string;
  name: string;
  english: string;
  arabic: string;
  tokens: string;
  add: string;
  defaultLabel: string;
  setDefault: string;
  delete: string;
  deleteTitle: string;
  deleteBody: string;
  dismiss: string;
  saving: string;
};

function LanguageFields({
  lang,
  template,
  copy,
}: {
  lang: "en" | "ar";
  template: MailTemplate;
  copy: DeskCopy;
}) {
  const arabic = lang === "ar";
  return (
    <div className={arabic ? "grid gap-3 [font-family:var(--font-arabic),sans-serif]" : "grid gap-3"} dir={arabic ? "rtl" : "ltr"} lang={lang}>
      <label className="grid gap-1.5 text-sm font-semibold">
        {copy.subject}
        <input
          name={arabic ? "subjectAr" : "subjectEn"}
          maxLength={180}
          defaultValue={arabic ? template.subjectAr : template.subjectEn}
          className={adminFieldClass}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        {copy.body}
        <textarea
          name={arabic ? "bodyAr" : "bodyEn"}
          rows={8}
          maxLength={4000}
          defaultValue={arabic ? template.bodyAr : template.bodyEn}
          className={`${adminFieldClass} min-h-40 leading-6`}
        />
      </label>
    </div>
  );
}

function TemplateForm({
  template,
  copy,
  saveLabel,
  canDelete,
  focused,
  divided,
}: {
  template: MailTemplate;
  copy: DeskCopy;
  saveLabel: string;
  canDelete: boolean;
  focused: boolean;
  divided: boolean;
}) {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const formId = `letter-${template.id}`;

  return (
    <article
      id={`template-${template.id}`}
      className={`relative ${divided ? "border-t border-[var(--desk-line)] py-5" : "pb-5"} ${focused ? "scroll-mt-20" : ""}`}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-semibold">
          {copy.name}
          <input
            form={formId}
            name="name"
            required
            maxLength={80}
            defaultValue={template.name}
            className={adminFieldClass}
          />
        </label>
        {template.isDefault ? (
          <span className="pb-2 text-sm font-bold text-[var(--desk-primary)]">{copy.defaultLabel}</span>
        ) : (
          <form action={setDefaultMailTemplateAction} className="pb-2">
            <input type="hidden" name="id" value={template.id} />
            <input type="hidden" name="kind" value={template.kind} />
            <button
              type="submit"
              className="desk-focus text-sm font-semibold text-[var(--desk-muted)] hover:text-[var(--desk-ink)]"
            >
              {copy.setDefault}
            </button>
          </form>
        )}
      </div>
      <form id={formId} action={saveMailTemplateAction} className="grid gap-3">
        <input type="hidden" name="id" value={template.id} />
        <input type="hidden" name="kind" value={template.kind} />
        <div className="flex gap-4 border-b border-[var(--desk-line)]" role="tablist">
          {(["en", "ar"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={lang === value}
              onClick={() => setLang(value)}
              className={`desk-focus -mb-px border-b-2 px-0.5 py-1.5 text-sm font-bold ${
                lang === value
                  ? "border-[var(--desk-primary)] text-[var(--desk-primary)]"
                  : "border-transparent text-[var(--desk-muted)]"
              } ${value === "ar" ? "[font-family:var(--font-arabic),sans-serif]" : ""}`}
            >
              {value === "en" ? copy.english : copy.arabic}
            </button>
          ))}
        </div>
        <div className={lang === "en" ? undefined : "hidden"}>
          <LanguageFields lang="en" template={template} copy={copy} />
        </div>
        <div className={lang === "ar" ? undefined : "hidden"}>
          <LanguageFields lang="ar" template={template} copy={copy} />
        </div>
        <div className="flex justify-end">
          <AdminSubmitButton pendingLabel={copy.saving} className={`${adminButtonClass} w-fit`}>
            {saveLabel}
          </AdminSubmitButton>
        </div>
      </form>
      {canDelete ? (
        <div className="absolute bottom-5 start-0">
          <NamedConfirm
            title={copy.deleteTitle}
            body={copy.deleteBody}
            confirm={copy.delete}
            pendingLabel={copy.saving}
            action={deleteMailTemplateAction}
            fields={{ id: template.id, kind: template.kind }}
            trigger={copy.delete}
            cancelLabel={copy.dismiss}
            triggerClassName="desk-focus text-sm font-semibold text-[var(--desk-danger)]"
          />
        </div>
      ) : null}
    </article>
  );
}

export function MailTemplateDesk({
  kinds,
  templates,
  active,
  focusId,
  copy,
  saveLabel,
}: {
  kinds: KindLink[];
  templates: MailTemplate[];
  active: string;
  focusId?: string;
  copy: DeskCopy;
  saveLabel: string;
}) {
  useEffect(() => {
    if (!focusId) return;
    document.getElementById(`template-${focusId}`)?.scrollIntoView({ block: "nearest" });
  }, [focusId]);

  const groups: MailTemplateAudience[] = ["hotel", "client"];

  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
      <nav aria-label={copy.name} className="flex gap-4 overflow-x-auto lg:flex-col lg:overflow-visible">
        {groups.map((audience) => (
          <div key={audience} className="flex shrink-0 gap-3 lg:grid lg:gap-1">
            <p className="self-center text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase lg:mb-1">
              {audience === "hotel" ? copy.hotel : copy.client}
            </p>
            {kinds
              .filter((item) => item.audience === audience)
              .map((item) => {
                const selected = item.kind === active;
                return (
                  <Link
                    key={item.kind}
                    href={`/admin/allotments/mailing?kind=${item.kind}`}
                    aria-current={selected ? "page" : undefined}
                    className={`desk-focus shrink-0 py-1 text-sm whitespace-nowrap lg:whitespace-normal ${
                      selected
                        ? "font-bold text-[var(--desk-primary)]"
                        : "font-semibold text-[var(--desk-muted)] hover:text-[var(--desk-ink)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>
      <div className="min-w-0">
        <p className="font-plex mb-4 text-xs tracking-wide text-[var(--desk-muted)]">{copy.tokens}</p>
        {templates.map((template, index) => (
          <TemplateForm
            key={template.id}
            template={template}
            copy={copy}
            saveLabel={saveLabel}
            canDelete={templates.length > 1}
            focused={template.id === focusId}
            divided={index > 0}
          />
        ))}
        <form action={addMailTemplateAction} className="border-t border-[var(--desk-line)] pt-4">
          <input type="hidden" name="kind" value={active} />
          <AdminSubmitButton
            pendingLabel={copy.saving}
            className="desk-focus text-sm font-bold text-[var(--desk-primary)]"
          >
            + {copy.add}
          </AdminSubmitButton>
        </form>
      </div>
    </div>
  );
}

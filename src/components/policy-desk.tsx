"use client";

import {
  addPolicyTemplateAction,
  addReservationPolicyAction,
  addReservationPolicyFromTemplateAction,
  deletePolicyTemplateAction,
  deleteReservationPolicyAction,
  savePolicyTemplateAction,
  saveReservationPolicyAction,
} from "@/app/admin/policies/actions";
import { adminButtonSecondaryClass, adminFieldClass } from "@/components/admin-ui";
import { NamedConfirm } from "@/components/named-confirm";
import type { AdminCopy } from "@/lib/admin-copy";
import type { PolicyText } from "@/lib/policies";

export function PolicyDesk({
  items,
  templates = [],
  allotmentId,
  copy,
  empty,
}: {
  items: PolicyText[];
  templates?: PolicyText[];
  allotmentId?: string;
  copy: AdminCopy;
  empty: string;
}) {
  const save = allotmentId ? saveReservationPolicyAction : savePolicyTemplateAction;
  const remove = allotmentId ? deleteReservationPolicyAction : deletePolicyTemplateAction;

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
      {items.length ? (
        <ul className="divide-y divide-[var(--desk-line)]">
          {items.map((item) => {
            const formId = `policy-${item.id}`;
            return (
              <li key={item.id} className="grid gap-3 px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <input
                    form={formId}
                    name="name"
                    required
                    maxLength={80}
                    defaultValue={item.name}
                    aria-label={copy.policyName}
                    className={adminFieldClass}
                  />
                  <NamedConfirm
                    title={copy.policyDeleteTitle}
                    body={copy.policyDeleteBody}
                    confirm={copy.policyDelete}
                    pendingLabel={copy.policyDelete}
                    cancelLabel={copy.mailNotifyBack}
                    trigger={copy.policyDelete}
                    action={remove}
                    fields={allotmentId ? { id: item.id, allotmentId } : { id: item.id }}
                    triggerClassName="desk-focus shrink-0 text-sm font-semibold text-[var(--desk-danger)]"
                  />
                </div>
                <form id={formId} action={save} className="grid gap-3">
                  <input type="hidden" name="id" value={item.id} />
                  {allotmentId ? <input type="hidden" name="allotmentId" value={allotmentId} /> : null}
                  <label className="grid gap-1.5 text-sm">
                    <span className="text-[13px] font-medium text-[var(--desk-muted)]">{copy.mailTemplateEnglish}</span>
                    <textarea
                      name="content"
                      rows={6}
                      maxLength={4000}
                      defaultValue={item.content}
                      className={adminFieldClass}
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm">
                    <span className="text-[13px] font-medium text-[var(--desk-muted)]">{copy.mailTemplateArabic}</span>
                    <textarea
                      name="contentAr"
                      dir="rtl"
                      rows={6}
                      maxLength={4000}
                      defaultValue={item.contentAr}
                      className={`${adminFieldClass} [font-family:var(--font-arabic),sans-serif]`}
                    />
                  </label>
                  <div className="flex justify-end">
                    <button type="submit" className={adminButtonSecondaryClass}>
                      {copy.policySave}
                    </button>
                  </div>
                </form>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-4 py-4 text-sm text-[var(--desk-muted)] sm:px-5">{empty}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--desk-line)] px-4 py-3 sm:px-5">
        <form action={allotmentId ? addReservationPolicyAction : addPolicyTemplateAction}>
          {allotmentId ? <input type="hidden" name="allotmentId" value={allotmentId} /> : null}
          <button type="submit" className={adminButtonSecondaryClass}>
            {allotmentId ? copy.policyWrite : copy.policyAdd}
          </button>
        </form>
        {allotmentId && templates.length ? (
          <form action={addReservationPolicyFromTemplateAction} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <input type="hidden" name="allotmentId" value={allotmentId} />
            <select name="templateId" required defaultValue="" className={`${adminFieldClass} min-w-48 flex-1`}>
              <option value="" disabled>
                {copy.policyFromTemplate}
              </option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <button type="submit" className={adminButtonSecondaryClass}>
              {copy.policyAdd}
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

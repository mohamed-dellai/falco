"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { adminButtonClass, adminButtonSecondaryClass } from "@/components/admin-ui";
import type { AdminCopy } from "@/lib/admin-copy";
import type { NoticePreview } from "@/lib/reservation-mail";

function emailListOk(value: string) {
  const parts = value.split(/[,;\s]+/).map((part) => part.trim()).filter(Boolean);
  return parts.every((part) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part));
}

export function MailNotifyDialog({
  action,
  allotmentId,
  policies,
  overbook = false,
  copy,
  onClose,
  load,
  refreshKey = "",
  extra,
  missingNote,
}: {
  action: (formData: FormData) => void | Promise<void>;
  allotmentId: string;
  policies: { id: string; name: string }[];
  overbook?: boolean;
  copy: AdminCopy;
  onClose: () => void;
  load: (policyIds: string[]) => Promise<{ ok: true; preview: NoticePreview } | { ok: false }>;
  refreshKey?: string;
  extra?: ReactNode;
  missingNote?: string;
}) {
  const titleId = useId();
  const seeded = useRef(false);
  const loadRef = useRef(load);
  loadRef.current = load;
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<NoticePreview | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const chosen = selected.join("\n");

  useEffect(() => {
    let stopped = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      loadRef
        .current(chosen ? chosen.split("\n") : [])
        .then((result) => {
          if (stopped) return;
          setLoading(false);
          if (!result.ok) {
            setPreview(null);
            setFailed(true);
            return;
          }
          setFailed(false);
          setPreview(result.preview);
          if (!seeded.current) {
            seeded.current = true;
            setTo(result.preview.to);
            setSubject(result.preview.subject);
            setBody([result.preview.english, result.preview.arabic].filter(Boolean).join("\n\n"));
          }
        })
        .catch(() => {
          if (stopped) return;
          setLoading(false);
          setFailed(true);
        });
    }, 120);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [allotmentId, refreshKey, chosen]);

  useEffect(() => {
    if (!preview?.pdfBase64) {
      setPdfUrl("");
      return;
    }
    const binary = atob(preview.pdfBase64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [preview?.pdfBase64]);

  function togglePolicy(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  const addressesOk = emailListOk(to) && emailListOk(cc) && to.trim().length > 0;
  const canSend = addressesOk && subject.trim().length > 0 && !loading && !failed && !pending;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-[rgb(8_28_54/58%)] p-4"
      role="presentation"
      onClick={(event) => {
        if (!pending && event.target === event.currentTarget) onClose();
      }}
    >
      <form
        action={action}
        onSubmit={() => setPending(true)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--desk-line)] bg-white shadow-sm"
      >
        <input type="hidden" name="id" value={allotmentId} />
        {overbook ? <input type="hidden" name="useOverbook" value="on" /> : null}
        {selected.map((id) => (
          <input key={id} type="hidden" name="policyId" value={id} />
        ))}
        <div className="border-b border-[var(--desk-line)] px-5 py-4 sm:px-6">
          <h2 id={titleId} className="text-lg font-bold text-[var(--desk-ink)]">
            {copy.mailNotifyTitle}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--desk-text)]">{copy.mailNotifyBody}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-[var(--desk-text)]">
              {copy.mailNotifyTo}
              <input
                name="mailTo"
                type="text"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                disabled={pending || !preview}
                autoComplete="off"
                className="desk-field mt-1"
              />
            </label>
            <label className="block text-xs font-bold text-[var(--desk-text)]">
              {copy.mailNotifyCc}
              <input
                name="mailCc"
                type="text"
                value={cc}
                onChange={(event) => setCc(event.target.value)}
                disabled={pending || !preview}
                autoComplete="off"
                className="desk-field mt-1"
              />
              <span className="mt-1 block font-medium">{copy.mailNotifyCcHint}</span>
            </label>
          </div>
          {!preview || addressesOk ? null : (
            <p className="mt-2 text-sm text-[var(--desk-warning)]">
              {to.trim() ? copy.mailNotifyBadAddress : (missingNote ?? copy.mailNotifyNoAddress)}
            </p>
          )}
          <label className="mt-3 block text-xs font-bold text-[var(--desk-text)]">
            {copy.mailNotifySubject}
            <input
              name="mailSubject"
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={pending || !preview}
              className="desk-field mt-1"
            />
          </label>
          {extra ? <div className="mt-4 grid gap-3">{extra}</div> : null}
          <fieldset className="mt-4">
            <legend className="text-sm font-bold text-[var(--desk-ink)]">{copy.mailNotifyPolicies}</legend>
            <p className="mt-1 text-sm leading-6 text-[var(--desk-text)]">{copy.mailNotifyPoliciesHint}</p>
            {policies.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--desk-text)]">{copy.policyEmpty}</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {policies.map((policy) => (
                  <label key={policy.id} className="flex items-center gap-2 text-sm font-bold text-[var(--desk-ink)]">
                    <input
                      type="checkbox"
                      checked={selected.includes(policy.id)}
                      onChange={() => togglePolicy(policy.id)}
                    />
                    {policy.name}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-[var(--desk-line)] bg-[var(--desk-canvas)] p-4">
              <label className="block text-sm font-bold text-[var(--desk-ink)]">
                {copy.mailNotifyLetter}
                {failed ? (
                  <p className="mt-3 text-sm font-medium text-[var(--desk-danger)]">{copy.mailNotifyPreviewError}</p>
                ) : !preview ? (
                  <p className="mt-3 text-sm font-medium text-[var(--desk-text)]">{copy.loading}</p>
                ) : (
                  <textarea
                    name="mailBody"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    disabled={pending}
                    dir="auto"
                    className="desk-field mt-3 min-h-48 resize-y leading-6 [font-family:var(--font-arabic),sans-serif]"
                  />
                )}
              </label>
              {preview?.policies.map((policy) => (
                <div key={policy.id} className="mt-4 border-t border-[var(--desk-line)] pt-3">
                  <p className="text-sm font-bold text-[var(--desk-ink)]">{policy.name}</p>
                  {policy.content ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--desk-text)]">{policy.content}</p>
                  ) : null}
                  {policy.contentAr ? (
                    <p
                      dir="rtl"
                      className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--desk-text)] [font-family:var(--font-arabic),sans-serif]"
                    >
                      {policy.contentAr}
                    </p>
                  ) : null}
                </div>
              ))}
            </section>
            <section className={`rounded-xl border border-[var(--desk-line)] bg-white p-4 ${loading && preview ? "opacity-60" : ""}`}>
              <h3 className="text-sm font-bold text-[var(--desk-ink)]">{copy.mailNotifyReport}</h3>
              {pdfUrl ? (
                <object
                  data={pdfUrl}
                  type="application/pdf"
                  aria-label={preview?.filename || copy.mailNotifyReport}
                  className="mt-3 h-80 w-full rounded-lg border border-[var(--desk-line)] lg:h-[28rem]"
                >
                  <a href={pdfUrl} download={preview?.filename}>
                    {preview?.filename}
                  </a>
                </object>
              ) : (
                <p className="mt-3 text-sm text-[var(--desk-text)]">{copy.loading}</p>
              )}
            </section>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-[var(--desk-line)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" onClick={onClose} disabled={pending} className={adminButtonSecondaryClass}>
            {copy.mailNotifyBack}
          </button>
          <button type="submit" name="notify" value="0" disabled={pending} className={adminButtonSecondaryClass}>
            {copy.mailNotifySkip}
          </button>
          <button type="submit" name="notify" value="1" disabled={!canSend} className={adminButtonClass}>
            {copy.mailNotifySend}
          </button>
        </div>
      </form>
    </div>
  );
}

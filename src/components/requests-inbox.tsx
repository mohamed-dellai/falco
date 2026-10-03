"use client";

import Link from "next/link";
import { useState } from "react";
import { BedDouble, Building2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  deleteSubmissionAction,
  setSubmissionStatusAction,
} from "@/app/admin/actions";
import { useAdminCopy, useAdminLocale } from "@/components/admin-locale";
import { NamedConfirm } from "@/components/named-confirm";
import {
  AdminEmptyState,
  adminButtonClass,
  adminButtonDangerClass,
  adminButtonSecondaryClass,
} from "@/components/admin-ui";
import { fill } from "@/lib/admin-copy";
import { formatDate, formatDateRange, formatDateTime } from "@/lib/money";
import type {
  Submission,
  SubmissionKind,
  SubmissionStatus,
} from "@/lib/submissions";

export function RequestsInbox({
  submissions,
  selectedId: selectedFromUrl,
  filterState,
  emptyTitle,
}: {
  submissions: Submission[];
  selectedId?: string;
  emptyTitle: string;
  filterState: {
    q?: string;
    status?: SubmissionStatus;
    kind?: SubmissionKind;
  };
}) {
  const router = useRouter();
  const copy = useAdminCopy();
  const locale = useAdminLocale();
  const steps: Array<{ id: SubmissionStatus; label: string }> = [
    { id: "new", label: copy.stepNew },
    { id: "quoted", label: copy.stepQuoted },
    { id: "confirmed", label: copy.stepConfirmed },
    { id: "declined", label: copy.stepDeclined },
  ];
  const [selectedId, setSelectedId] = useState(
    selectedFromUrl ?? submissions[0]?.id ?? "",
  );
  const [statuses, setStatuses] = useState<Record<string, SubmissionStatus>>(
    {},
  );
  const [toast, setToast] = useState("");
  const [undo, setUndo] = useState<{
    id: string;
    status: SubmissionStatus;
  } | null>(null);
  const [pending, setPending] = useState("");

  const selected =
    submissions.find((submission) => submission.id === selectedId) ??
    submissions[0];
  const status = selected ? (statuses[selected.id] ?? selected.status) : "new";

  async function change(id: string, next: SubmissionStatus, label: string) {
    if (pending) return;
    const currentStatus =
      statuses[id] ??
      submissions.find((item) => item.id === id)?.status ??
      "new";
    setPending(next);
    setStatuses((current) => ({ ...current, [id]: next }));
    try {
      await setSubmissionStatusAction(id, next);
      setToast(label);
      setUndo({ id, status: currentStatus });
      router.refresh();
    } catch {
      setStatuses((current) => ({ ...current, [id]: currentStatus }));
    } finally {
      setPending("");
    }
  }

  function select(id: string) {
    setSelectedId(id);
    const params = new URLSearchParams();
    if (filterState.q) params.set("q", filterState.q);
    if (filterState.status) params.set("status", filterState.status);
    if (filterState.kind) params.set("kind", filterState.kind);
    params.set("selected", id);
    router.replace(`/admin/forms?${params}`);
  }

  return (
    <div className="grid gap-4">
      {submissions.length === 0 ? (
        <AdminEmptyState title={emptyTitle} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[22rem_1fr]">
          <section className="overflow-hidden rounded-xl border border-[var(--desk-line)] bg-white">
            <ul>
              {submissions.map((submission) => {
                const active = submission.id === selected?.id;
                const rowStatus = statuses[submission.id] ?? submission.status;
                return (
                  <li key={submission.id}>
                    <button
                      type="button"
                      onClick={() => select(submission.id)}
                      className={`desk-focus flex w-full items-start gap-3 border-b border-[var(--desk-line)] px-4 py-3 text-start ${
                        active
                          ? "bg-[var(--desk-surface-muted)]"
                          : "hover:bg-[var(--desk-canvas)]"
                      }`}
                    >
                      {submission.kind === "quote" ? (
                        <BedDouble
                          aria-hidden="true"
                          size={18}
                          className="mt-0.5 shrink-0 text-[var(--desk-primary)]"
                        />
                      ) : (
                        <Building2
                          aria-hidden="true"
                          size={18}
                          className="mt-0.5 shrink-0 text-[var(--desk-primary)]"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {submission.agencyName || submission.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-[var(--desk-muted)]">
                          {submission.kind === "quote"
                            ? `${copy.allotment} · ${formatDateRange(
                                submission.arrival,
                                submission.departure,
                                locale,
                              )} · ${submission.roomCount ?? "—"} ${copy.rooms.toLowerCase()}`
                            : `${copy.agencyApplication} · ${submission.country || "—"}`}
                        </span>
                      </span>
                      <span className="font-plex text-[10px] text-[var(--desk-muted-soft)]">
                        {formatDate(submission.createdAt, locale)}
                        {rowStatus === "new" && (
                          <span className="ms-2 inline-block size-2 rounded-full bg-[var(--desk-gold)]" />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {selected && (
            <article className="rounded-2xl border border-[var(--desk-line)] bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--desk-muted)]">
                <span className="rounded-full bg-[var(--desk-surface-muted)] px-2.5 py-1 font-semibold text-[var(--desk-ink)]">
                  {selected.kind === "quote"
                    ? copy.allotmentRequest
                    : copy.agencyApplication}
                </span>
                <span className="font-plex">{selected.reference}</span>
                <span>{formatDateTime(selected.createdAt, locale)}</span>
              </div>
              <h2 className="font-news mt-3 text-[28px] font-medium tracking-tight">
                {selected.agencyName || selected.name}
              </h2>
              <div className="mt-4 rounded-xl border border-[var(--desk-line)] bg-[var(--desk-canvas)] p-3">
                <p className="text-xs font-semibold text-[var(--desk-ink)]">
                  {copy.requestStatus}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-[var(--desk-muted)]">
                  {copy.requestStatusDescription}
                </p>
                <ol className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  {steps.map((step, index) => (
                    <li key={step.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => change(selected.id, step.id, step.label)}
                        aria-current={status === step.id ? "step" : undefined}
                        disabled={pending !== ""}
                        className={`rounded-full px-2.5 py-1 ${
                          status === step.id
                            ? "bg-[var(--desk-ink)] text-[var(--desk-gold-soft)]"
                            : "bg-white text-[var(--desk-muted)]"
                        }`}
                      >
                        {step.label}
                      </button>
                      {index < steps.length - 1 && (
                        <span className="text-[var(--desk-line-strong)]">
                          →
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending !== ""}
                  onClick={() =>
                    change(
                      selected.id,
                      "quoted",
                      fill(copy.markedQuoted, { email: selected.email }),
                    )
                  }
                  className={`${adminButtonClass} min-w-36`}
                >
                  {pending === "quoted" ? copy.confirming : copy.markQuoted}
                </button>
                <button
                  type="button"
                  disabled={pending !== ""}
                  onClick={() =>
                    change(selected.id, "declined", copy.declinedToast)
                  }
                  className={adminButtonDangerClass}
                >
                  {pending === "declined" ? copy.declining : copy.decline}
                </button>
                {selected.email && (
                  <a
                    href={`mailto:${selected.email}`}
                    className={adminButtonSecondaryClass}
                  >
                    <Mail aria-hidden="true" size={16} />
                    {fill(copy.emailTo, {
                      name: selected.agencyName || selected.name,
                    })}
                  </a>
                )}
                <NamedConfirm
                  title={copy.deleteRequestTitle}
                  body={fill(copy.deleteRequestBody, {
                    number: selected.reference,
                  })}
                  confirm={copy.deleteAction}
                  pendingLabel={copy.deleting}
                  cancelLabel={copy.keepCancelled}
                  action={deleteSubmissionAction}
                  fields={{ id: selected.id }}
                  trigger={copy.deleteAction}
                />
                {selected.kind === "quote" && (
                  <Link
                    href={`/admin/allotments/new?${new URLSearchParams(
                      Object.entries({
                        agency: selected.agencyId ?? "",
                        checkIn: selected.arrival,
                        checkOut: selected.departure,
                      }).filter((entry): entry is [string, string] =>
                        Boolean(entry[1]),
                      ),
                    )}`}
                    className={adminButtonSecondaryClass}
                  >
                    <BedDouble aria-hidden="true" size={16} />
                    {copy.createAllotment}
                  </Link>
                )}
              </div>
              <p className="mt-3 text-xs text-[var(--desk-muted)]">
                {copy.statusSaved}
              </p>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {selected.kind === "quote" && (
                  <section>
                    <h3 className="text-sm font-semibold">{copy.trip}</h3>
                    <dl className="mt-2 grid gap-2 text-sm">
                      <Row
                        label={copy.arrival}
                        value={formatDate(selected.arrival, locale)}
                      />
                      <Row
                        label={copy.checkOut}
                        value={formatDate(selected.departure, locale)}
                      />
                      <Row
                        label={copy.travellers}
                        value={
                          selected.travellers === null
                            ? ""
                            : String(selected.travellers)
                        }
                      />
                      <Row
                        label={copy.rooms}
                        value={
                          selected.roomCount === null
                            ? ""
                            : String(selected.roomCount)
                        }
                      />
                      <Row
                        label={copy.requestedRoom}
                        value={selected.packageSlug}
                      />
                    </dl>
                  </section>
                )}
                <section>
                  <h3 className="text-sm font-semibold">{copy.contact}</h3>
                  <dl className="mt-2 grid gap-2 text-sm">
                    <Row label={copy.contact} value={selected.name} />
                    <Row label={copy.email} value={selected.email} />
                    <Row label={copy.phone} value={selected.phone} />
                    <Row label={copy.country} value={selected.country} />
                    {selected.kind === "agency" && (
                      <>
                        <Row label={copy.role} value={selected.role} />
                        <Row
                          label={copy.website}
                          value={selected.agencyWebsite}
                        />
                        <Row label={copy.markets} value={selected.markets} />
                      </>
                    )}
                  </dl>
                </section>
              </div>
              {selected.requirements && (
                <section className="mt-5">
                  <h3 className="text-sm font-semibold">{copy.requirements}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--desk-text-soft)]">
                    {selected.requirements}
                  </p>
                </section>
              )}
            </article>
          )}
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed end-4 bottom-24 z-50 w-[min(100%-2rem,24rem)] rounded-2xl border border-[var(--desk-line)] bg-white px-4 py-3 text-sm shadow-[0_16px_40px_-20px_rgba(8,28,54,0.45)] lg:bottom-5"
        >
          <p>{toast}</p>
          <div className="mt-2 flex gap-3">
            {undo && (
              <button
                type="button"
                className="desk-focus rounded text-xs font-semibold text-[var(--desk-primary)]"
                onClick={() => {
                  const snapshot = undo;
                  setUndo(null);
                  setToast("");
                  void change(snapshot.id, snapshot.status, copy.undone);
                }}
              >
                {copy.undo}
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast("")}
              className="desk-focus rounded text-xs font-semibold text-[var(--desk-ink)]"
            >
              {copy.dismiss}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--desk-line)] py-1.5">
      <dt className="text-[var(--desk-muted)]">{label}</dt>
      <dd className="text-end font-medium">{value || "—"}</dd>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setSubmissionStatusAction } from "@/app/admin/actions";
import { useAdminCopy } from "@/components/admin-locale";
import { fill } from "@/lib/admin-copy";
import type { Submission, SubmissionKind, SubmissionStatus } from "@/lib/submissions";

function relativeTime(value: string) {
  const then = Date.parse(value);
  if (!Number.isFinite(then)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yest." : `${days}d`;
}

export function RequestsInbox({
  submissions,
}: {
  submissions: Submission[];
}) {
  const router = useRouter();
  const copy = useAdminCopy();
  const steps: Array<{ id: SubmissionStatus; label: string }> = [
    { id: "new", label: copy.stepNew },
    { id: "quoted", label: copy.stepQuoted },
    { id: "confirmed", label: copy.stepConfirmed },
    { id: "declined", label: copy.stepDeclined },
  ];
  const [kind, setKind] = useState<"" | SubmissionKind>("");
  const [selectedId, setSelectedId] = useState(submissions[0]?.id ?? "");
  const [statuses, setStatuses] = useState<Record<string, SubmissionStatus>>({});
  const [toast, setToast] = useState("");
  const [undo, setUndo] = useState<{ id: string; status: SubmissionStatus } | null>(
    null,
  );
  const [pending, setPending] = useState("");

  const rows = useMemo(
    () =>
      submissions.filter((submission) => !kind || submission.kind === kind),
    [kind, submissions],
  );

  const selected =
    submissions.find((submission) => submission.id === selectedId) ?? rows[0];
  const status = selected
    ? (statuses[selected.id] ?? selected.status)
    : "new";

  async function change(id: string, next: SubmissionStatus, label: string) {
    if (pending) return;
    const currentStatus =
      statuses[id] ?? submissions.find((item) => item.id === id)?.status ?? "new";
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

  const counts = {
    all: submissions.length,
    quote: submissions.filter((item) => item.kind === "quote").length,
    agency: submissions.filter((item) => item.kind === "agency").length,
  };
  const freshToday = submissions.filter((item) => {
    const created = Date.parse(item.createdAt);
    return Number.isFinite(created) && Date.now() - created < 86_400_000 && item.status === "new";
  }).length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p data-search-count data-search-total={String(counts.all)} data-search-idle={`${fill(copy.requestsOpen, { count: counts.all })}${freshToday > 0 ? ` · ${fill(copy.newToday, { count: freshToday })}` : ""}`} className="text-sm text-[#5c6470]">
          <span className="font-plex text-[#081c36]">{counts.all}</span> {copy.openLabel}
          {freshToday > 0 ? ` · ${fill(copy.newToday, { count: freshToday })}` : ""}
        </p>
      </div>

      {submissions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#c5ced8] bg-white px-4 py-8 text-sm text-[#5c6470]">
          {copy.noRequests}
        </p>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[22rem_1fr]">
          <section className="overflow-hidden rounded-xl border border-[#dfe5ec] bg-white">
            <div className="flex gap-1 border-b border-[#eef0f3] p-2 text-sm">
              {(
                [
                  ["", copy.all, counts.all],
                  ["quote", copy.allotment, counts.quote],
                  ["agency", copy.agency, counts.agency],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setKind(value)}
                  className={`rounded-lg px-2.5 py-1.5 font-semibold ${
                    kind === value ? "bg-[#081c36] text-white" : "text-[#334155]"
                  }`}
                >
                  {label}{" "}
                  <span className="font-plex text-xs opacity-80">{count}</span>
                </button>
              ))}
            </div>
            <ul>
                {rows.map((submission) => {
                  const active = submission.id === selected?.id;
                  const rowStatus = statuses[submission.id] ?? submission.status;
                  return (
                    <li key={submission.id}>
                      <button
                        type="button"
                        data-search-item
                        onClick={() => setSelectedId(submission.id)}
                        className={`flex w-full items-start gap-3 border-b border-[#eef0f3] px-4 py-3 text-start ${
                          active ? "bg-[#fbf9f5]" : "hover:bg-[#fbf9f5]"
                        }`}
                      >
                        <i
                          aria-hidden="true"
                          className={`ti mt-0.5 text-[18px] text-[#0e4d8c] ${
                            submission.kind === "quote" ? "ti-bed" : "ti-building-store"
                          }`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {submission.agencyName || submission.name}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[#5c6470]">
                            {submission.kind === "quote"
                              ? `${copy.allotment} · ${submission.arrival || "—"} → ${submission.departure || "—"} · ${submission.roomCount ?? "—"} ${copy.rooms.toLowerCase()}`
                              : `${copy.agencyApplication} · ${submission.country || "—"}`}
                          </span>
                        </span>
                        <span className="text-xs text-[#8b93a1]">
                          {relativeTime(submission.createdAt)}
                          {rowStatus === "new" && (
                            <span className="ms-2 inline-block size-2 rounded-full bg-[#c59b27]" />
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
          </section>

          {selected && (
            <article className="rounded-xl border border-[#dfe5ec] bg-white p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#5c6470]">
                <span className="rounded-full bg-[#f4efea] px-2 py-1 font-semibold text-[#081c36]">
                  {selected.kind === "quote" ? copy.allotmentRequest : copy.agencyApplication}
                </span>
                <span className="font-plex">{selected.reference}</span>
                <span>{selected.createdAt.slice(0, 16).replace("T", " ")}</span>
              </div>
              <h2 className="font-news mt-3 text-[28px] font-medium tracking-tight">
                {selected.agencyName || selected.name}
              </h2>
              <ol className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                {steps.map((step, index) => (
                  <li key={step.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => change(selected.id, step.id, step.label)}
                      className={`rounded-full px-2.5 py-1 ${
                        status === step.id
                          ? "bg-[#081c36] text-[#ffdf98]"
                          : "bg-[#f4efea] text-[#5c6470]"
                      }`}
                    >
                      {step.label}
                    </button>
                    {index < steps.length - 1 && (
                      <span className="text-[#c5ced8]">→</span>
                    )}
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending !== ""}
                  onClick={() =>
                    change(selected.id, "quoted", fill(copy.markedQuoted, { email: selected.email }))
                  }
                  className="inline-flex h-9 min-w-36 items-center justify-center rounded-lg bg-[#0e4d8c] px-3 text-sm font-semibold text-white disabled:opacity-70"
                >
                  {pending === "quoted" ? copy.confirming : copy.markQuoted}
                </button>
                <button
                  type="button"
                  disabled={pending !== ""}
                  onClick={() => change(selected.id, "declined", copy.declinedToast)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e7b4b4] px-3 text-sm font-semibold text-[#9b1c1c]"
                >
                  {pending === "declined" ? copy.declining : copy.decline}
                </button>
                {selected.email && (
                  <a
                    href={`mailto:${selected.email}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#c5ced8] px-3 text-sm font-semibold"
                  >
                    <i aria-hidden="true" className="ti ti-mail text-[16px]" />
                    {fill(copy.emailTo, { name: selected.agencyName || selected.name })}
                  </a>
                )}
              </div>
              <p className="mt-3 text-xs text-[#5c6470]">
                {copy.statusSaved}
              </p>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {selected.kind === "quote" && (
                  <section>
                    <h3 className="text-sm font-semibold">{copy.trip}</h3>
                    <dl className="mt-2 grid gap-2 text-sm">
                      <Row label={copy.arrival} value={selected.arrival} />
                      <Row label={copy.checkOut} value={selected.departure} />
                      <Row
                        label={copy.travellers}
                        value={selected.travellers === null ? "" : String(selected.travellers)}
                      />
                      <Row
                        label={copy.rooms}
                        value={selected.roomCount === null ? "" : String(selected.roomCount)}
                      />
                      <Row label={copy.requestedRoom} value={selected.packageSlug} />
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
                        <Row label={copy.website} value={selected.agencyWebsite} />
                        <Row label={copy.markets} value={selected.markets} />
                      </>
                    )}
                  </dl>
                </section>
              </div>
              {selected.requirements && (
                <section className="mt-5">
                  <h3 className="text-sm font-semibold">{copy.requirements}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#334155]">
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
          className="fixed end-5 bottom-5 z-50 w-[min(100%-2rem,24rem)] rounded-xl border border-[#dfe5ec] bg-white px-4 py-3 text-sm shadow-[0_16px_40px_-20px_rgba(8,28,54,0.45)]"
        >
          <p>{toast}</p>
          <div className="mt-2 flex gap-3">
            {undo && (
              <button
                type="button"
                className="text-xs font-semibold text-[#0e4d8c]"
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
              className="text-xs font-semibold text-[#081c36]"
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
    <div className="flex justify-between gap-4 border-b border-[#eef0f3] py-1.5">
      <dt className="text-[#5c6470]">{label}</dt>
      <dd className="text-end font-medium">{value || "—"}</dd>
    </div>
  );
}

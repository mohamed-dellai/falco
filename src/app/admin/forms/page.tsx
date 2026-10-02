import { AdminShell } from "@/components/admin-shell";
import { AdminFilterBar, AdminSearchForm } from "@/components/admin-ui";
import { RequestsInbox } from "@/components/requests-inbox";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  listSubmissions,
  submissionStatuses,
  type SubmissionKind,
  type SubmissionStatus,
} from "@/lib/submissions";

export const dynamic = "force-dynamic";

function statusValue(value: string | undefined) {
  return submissionStatuses.includes(value as SubmissionStatus)
    ? (value as SubmissionStatus)
    : undefined;
}

function kindValue(value: string | undefined) {
  return value === "quote" || value === "agency"
    ? (value as SubmissionKind)
    : undefined;
}

function hrefFor(
  values: {
    q?: string;
    status?: string;
    kind?: string;
  },
  patch: { q?: string; status?: string; kind?: string },
) {
  const params = new URLSearchParams();
  const next = { ...values, ...patch };
  if (next.q) params.set("q", next.q);
  if (next.status) params.set("status", next.status);
  if (next.kind) params.set("kind", next.kind);
  const suffix = params.toString();
  return `/admin/forms${suffix ? `?${suffix}` : ""}`;
}

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    kind?: string;
    selected?: string;
  }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const status = statusValue(query.status);
  const kind = kindValue(query.kind);
  const search = query.q?.trim().toLocaleLowerCase(locale) ?? "";
  const all = await listSubmissions();
  const submissions = all.filter((submission) => {
    if (status && submission.status !== status) return false;
    if (kind && submission.kind !== kind) return false;
    if (!search) return true;
    return [
      submission.reference,
      submission.agencyName,
      submission.name,
      submission.email,
      submission.phone,
      submission.country,
      submission.arrival,
      submission.departure,
      submission.requirements,
    ]
      .join(" ")
      .toLocaleLowerCase(locale)
      .includes(search);
  });
  const baseValues = {
    q: query.q,
    status,
    kind,
  };

  return (
    <AdminShell
      title={copy.requests}
      note={
        <span aria-live="polite" className="text-sm text-[var(--desk-muted)]">
          {fill(copy.requestCount, { count: submissions.length })}
        </span>
      }
    >
      <div className="mb-5 grid min-w-0 gap-3">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <AdminSearchForm
            action="/admin/forms"
            label={copy.searchRequests}
            placeholder={copy.searchRequests}
            value={query.q}
            hidden={{ status, kind }}
          />
          <AdminFilterBar
            label={copy.requestStatus}
            items={[
              {
                href: hrefFor(baseValues, { status: "" }),
                label: copy.all,
                active: !status,
                count: all.length,
              },
              ...submissionStatuses.map((value) => ({
                href: hrefFor(baseValues, { status: value }),
                label:
                  value === "new"
                    ? copy.stepNew
                    : value === "quoted"
                      ? copy.stepQuoted
                      : value === "confirmed"
                        ? copy.stepConfirmed
                        : copy.stepDeclined,
                active: status === value,
                count: all.filter((item) => item.status === value).length,
              })),
            ]}
          />
        </div>
        <AdminFilterBar
          label={copy.requests}
          items={[
            {
              href: hrefFor(baseValues, { kind: "" }),
              label: copy.all,
              active: !kind,
              count: all.length,
            },
            {
              href: hrefFor(baseValues, { kind: "quote" }),
              label: copy.allotment,
              active: kind === "quote",
              count: all.filter((item) => item.kind === "quote").length,
            },
            {
              href: hrefFor(baseValues, { kind: "agency" }),
              label: copy.agency,
              active: kind === "agency",
              count: all.filter((item) => item.kind === "agency").length,
            },
          ]}
        />
      </div>
      <RequestsInbox
        key={`${query.q ?? ""}:${status ?? ""}:${kind ?? ""}:${query.selected ?? ""}`}
        submissions={submissions}
        selectedId={query.selected}
        filterState={{ q: query.q, status, kind }}
        emptyTitle={
          search
            ? fill(copy.noMatches, {
                query: query.q ?? "",
                count: all.length,
              })
            : status || kind
              ? copy.noFilteredRequests
              : copy.noRequests
        }
      />
    </AdminShell>
  );
}

import Link from "next/link";
import type { Submission } from "@/lib/submissions";

function fieldsFor(submission: Submission) {
  if (submission.kind === "agency") {
    return [
      ["Agency", submission.agencyName],
      ["Contact", submission.name],
      ["Role", submission.role],
      ["Email", submission.email],
      ["Phone", submission.phone],
      ["Country", submission.country],
      ["Website", submission.agencyWebsite],
      [
        "Annual pilgrims",
        submission.annualPilgrims === null ? "" : String(submission.annualPilgrims),
      ],
      ["Markets", submission.markets],
    ];
  }

  return [
    ["Agency", submission.agencyName],
    ["Contact", submission.name],
    ["Email", submission.email],
    ["Phone", submission.phone],
    ["Country", submission.country],
    ["Arrival", submission.arrival],
    ["Check-out", submission.departure],
    ["Travellers", submission.travellers === null ? "" : String(submission.travellers)],
    ["Rooms", submission.roomCount === null ? "" : String(submission.roomCount)],
    ["Requested room", submission.packageSlug],
  ];
}

export function SubmissionSheet({ submission }: { submission: Submission }) {
  const received = submission.createdAt.slice(0, 16).replace("T", " ");

  return (
    <article data-search-item className="overflow-hidden rounded border border-[#d5dbe3] bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6ebf0] px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5c6776]">
            {submission.kind === "agency" ? "Agency form" : "Allotment request"}
            <span className="px-2 font-normal normal-case tracking-normal">
              {received}
            </span>
          </p>
          <h2 className="text-base font-semibold">{submission.reference}</h2>
        </div>
        {submission.agencyId && (
          <Link
            href="/admin/agencies"
            className="text-sm font-semibold text-[#0e4d8c] hover:underline"
          >
            Open in Agencies
          </Link>
        )}
      </header>
      <dl className="grid sm:grid-cols-2 lg:grid-cols-4">
        {fieldsFor(submission).map(([label, value]) => (
          <div key={label} className="border-b border-[#e6ebf0] px-4 py-3 lg:border-e">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#5c6776]">
              {label}
            </dt>
            <dd className="mt-1 text-sm">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5c6776]">
          Requirements
        </p>
        <p className="mt-1 text-sm whitespace-pre-wrap">
          {submission.requirements || "—"}
        </p>
      </div>
    </article>
  );
}

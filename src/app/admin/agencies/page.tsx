import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminError, AdminShell } from "@/components/admin-shell";
import {
  AdminEmptyState,
  AdminFilterBar,
  AdminSearchForm,
  AdminStatusPill,
  AdminTableFrame,
  adminButtonClass,
} from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, countText, fill } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listAgencies, type ClientKind } from "@/lib/inventory";

export const dynamic = "force-dynamic";

const clientFilters = ["", "agency", "individual"] as const;

function asClientFilter(value: string | undefined) {
  return clientFilters.includes(value as (typeof clientFilters)[number])
    ? (value as (typeof clientFilters)[number])
    : "";
}

function filterHref(kind: string, query: string) {
  const params = new URLSearchParams();
  if (kind) params.set("kind", kind);
  if (query) params.set("q", query);
  const suffix = params.toString();
  return `/admin/agencies${suffix ? `?${suffix}` : ""}`;
}

function kindLabel(kind: ClientKind, copy: ReturnType<typeof adminCopy>) {
  return kind === "individual" ? copy.individual : copy.agency;
}

export default async function AgenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; kind?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const kind = asClientFilter(query.kind);
  const allClients = await listAgencies();
  const search = query.q?.trim().toLocaleLowerCase(locale) ?? "";
  const inFilter = kind
    ? allClients.filter((client) => client.kind === kind)
    : allClients;
  const clients = search
    ? inFilter.filter((client) =>
        [
          client.name,
          kindLabel(client.kind, copy),
          client.country,
          client.contactName,
          client.email,
          client.phone,
          client.commercialRegistration,
          client.vatNumber,
        ]
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(search),
      )
    : inFilter;

  return (
    <AdminShell
      title={copy.agencies}
      note={
        <span aria-live="polite" className="text-sm text-[var(--desk-muted)]">
          {countText(clients.length, copy.agencyCountOne, copy.agencyCount)}
        </span>
      }
      actions={
        <Link href="/admin/agencies/new" className={adminButtonClass}>
          <Plus aria-hidden="true" size={16} />
          {copy.newAgency}
        </Link>
      }
    >
      <AdminError code={query.error} />
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <AdminSearchForm
          action="/admin/agencies"
          label={copy.searchAgencies}
          placeholder={copy.searchAgencies}
          value={query.q}
          hidden={{ kind }}
        />
        <AdminFilterBar
          label={copy.filterClients}
          items={[
            ["", copy.all, allClients.length],
            [
              "agency",
              copy.agency,
              allClients.filter((client) => client.kind === "agency").length,
            ],
            [
              "individual",
              copy.individual,
              allClients.filter((client) => client.kind === "individual")
                .length,
            ],
          ].map(([value, label, count]) => ({
            href: filterHref(String(value), query.q ?? ""),
            label: String(label),
            active: kind === value,
            count: Number(count),
          }))}
        />
      </div>
      {clients.length ? (
        <>
          <div className="grid gap-3 lg:hidden">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/admin/agencies/${client.id}`}
                className="desk-focus rounded-2xl border border-[var(--desk-line)] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold">{client.name}</h2>
                  <AdminStatusPill
                    tone={client.kind === "individual" ? "neutral" : "info"}
                  >
                    {kindLabel(client.kind, copy)}
                  </AdminStatusPill>
                </div>
                <p className="mt-1 text-sm text-[var(--desk-muted)]">
                  {client.country || "—"}
                </p>
                <dl className="mt-3 grid gap-2 border-t border-[var(--desk-line)] pt-3 text-sm">
                  {client.kind === "agency" && (
                    <>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--desk-muted)]">
                          {copy.contact}
                        </dt>
                        <dd className="text-end font-medium">
                          {client.contactName || "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--desk-muted)]">
                          {copy.commercialRegistration}
                        </dt>
                        <dd className="text-end font-medium">
                          {client.commercialRegistration || "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-[var(--desk-muted)]">
                          {copy.vatNumber}
                        </dt>
                        <dd className="text-end font-medium">
                          {client.vatNumber || "—"}
                        </dd>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--desk-muted)]">{copy.email}</dt>
                    <dd className="truncate text-end font-medium">
                      {client.email || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--desk-muted)]">{copy.phone}</dt>
                    <dd className="text-end font-medium font-plex text-xs">
                      {client.phone || "—"}
                    </dd>
                  </div>
                </dl>
              </Link>
            ))}
          </div>
          <div className="hidden lg:block">
            <AdminTableFrame>
              <table className="desk-table w-full border-collapse text-start text-sm">
                <thead className="bg-[var(--desk-canvas)]">
                  <tr>
                    <th className="px-4 py-3 text-start">{copy.clientName}</th>
                    <th className="px-4 py-3 text-start">{copy.clientKind}</th>
                    <th className="px-4 py-3 text-start">{copy.country}</th>
                    <th className="px-4 py-3 text-start">{copy.contact}</th>
                    <th className="px-4 py-3 text-start">
                      {copy.commercialRegistration}
                    </th>
                    <th className="px-4 py-3 text-start">{copy.vatNumber}</th>
                    <th className="px-4 py-3 text-start">{copy.email}</th>
                    <th className="px-4 py-3 text-start">{copy.phone}</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/agencies/${client.id}`}
                          className="desk-focus rounded-sm font-semibold text-[var(--desk-primary)] hover:underline"
                        >
                          {client.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <AdminStatusPill
                          tone={client.kind === "individual" ? "neutral" : "info"}
                        >
                          {kindLabel(client.kind, copy)}
                        </AdminStatusPill>
                      </td>
                      <td className="px-4 py-3">{client.country || "—"}</td>
                      <td className="px-4 py-3">
                        {client.kind === "individual"
                          ? "—"
                          : client.contactName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {client.kind === "individual"
                          ? "—"
                          : client.commercialRegistration || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {client.kind === "individual"
                          ? "—"
                          : client.vatNumber || "—"}
                      </td>
                      <td className="px-4 py-3">{client.email || "—"}</td>
                      <td className="px-4 py-3 font-plex text-xs">
                        {client.phone || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableFrame>
          </div>
        </>
      ) : (
        <AdminEmptyState
          title={
            search
              ? fill(copy.noMatches, {
                  query: query.q ?? "",
                  count: allClients.length,
                })
              : kind
                ? copy.noFilteredClients
                : copy.noAgencies
          }
          action={
            !search && !kind ? (
              <Link href="/admin/agencies/new" className={adminButtonClass}>
                {copy.newAgency}
              </Link>
            ) : undefined
          }
        />
      )}
    </AdminShell>
  );
}

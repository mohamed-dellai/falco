import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import {
  AdminEmptyState,
  AdminPanel,
  AdminSearchForm,
  AdminStatusPill,
  adminButtonClass,
} from "@/components/admin-ui";
import { fill, type AdminCopy } from "@/lib/admin-copy";
import type { AdminUser } from "@/lib/admin-users";

export function matchingAccounts(accounts: AdminUser[], query: string, locale: string) {
  const search = query.trim().toLocaleLowerCase(locale);
  if (!search) return accounts;
  return accounts.filter((account) =>
    `${account.name} ${account.email}`.toLocaleLowerCase(locale).includes(search),
  );
}

export function AccountList({
  copy,
  accounts,
  actorId,
  query,
  locale,
}: {
  copy: AdminCopy;
  accounts: AdminUser[];
  actorId: string | null;
  query: string;
  locale: string;
}) {
  const search = query.trim();
  const rows = matchingAccounts(accounts, query, locale);

  return (
    <AdminPanel>
      <div id="accounts" className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <AdminSearchForm
            action="/admin/settings"
            label={copy.searchAccounts}
            placeholder={copy.searchAccounts}
            value={query}
            hidden={{ section: "accounts" }}
          />
          <Link href="/admin/accounts/new" className={`${adminButtonClass} w-fit`}>
            <Plus aria-hidden="true" size={16} />
            {copy.newAccount}
          </Link>
        </div>
        {rows.length ? (
          <ul className="overflow-hidden rounded-lg border border-[var(--desk-line)]">
            {rows.map((account) => (
              <li key={account.id} className="border-b border-[var(--desk-line)] last:border-b-0">
                <Link
                  href={`/admin/accounts/${account.id}`}
                  className="desk-focus flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--desk-canvas)]"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{account.name}</span>
                      {account.id === actorId && (
                        <AdminStatusPill tone="info">{copy.accountYou}</AdminStatusPill>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-[var(--desk-muted)]">
                      {account.email}
                    </span>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    size={16}
                    className="shrink-0 text-[var(--desk-muted)]"
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmptyState
            title={
              search
                ? fill(copy.noMatches, { query, count: accounts.length })
                : copy.accounts
            }
            compact
          />
        )}
      </div>
    </AdminPanel>
  );
}

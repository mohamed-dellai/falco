import {
  createAdminUserAction,
  deleteAdminUserAction,
  updateAdminUserAction,
} from "@/app/admin/actions";
import { NamedConfirm } from "@/components/named-confirm";
import {
  AdminPanel,
  adminButtonClass,
  adminButtonDangerClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { fill, type AdminCopy } from "@/lib/admin-copy";
import type { AdminUser } from "@/lib/admin-users";

export function AccountForm({
  copy,
  account,
  canDelete,
}: {
  copy: AdminCopy;
  account?: AdminUser;
  canDelete?: boolean;
}) {
  return (
    <AdminPanel>
      <form
        action={account ? updateAdminUserAction : createAdminUserAction}
        className="grid gap-4"
      >
        {account && <input type="hidden" name="id" value={account.id} />}
        <label className="grid gap-1.5 text-sm font-semibold">
          {copy.accountName}
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={account?.name ?? ""}
            autoComplete="name"
            className={adminFieldClass}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          {copy.email}
          <input
            name="email"
            type="email"
            required
            maxLength={160}
            defaultValue={account?.email ?? ""}
            autoComplete="off"
            className={adminFieldClass}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          {account ? copy.newPassword : copy.password}
          <input
            name="password"
            type="password"
            required={!account}
            minLength={account ? undefined : 8}
            maxLength={200}
            autoComplete="new-password"
            className={adminFieldClass}
          />
          {account && (
            <span className="text-xs font-normal text-[var(--desk-muted)]">
              {copy.newPasswordHint}
            </span>
          )}
        </label>
        {!account && (
          <label className="grid gap-1.5 text-sm font-semibold">
            {copy.passwordAgain}
            <input
              name="passwordAgain"
              type="password"
              required
              minLength={8}
              maxLength={200}
              autoComplete="new-password"
              className={adminFieldClass}
            />
          </label>
        )}
        <AdminSubmitButton
          pendingLabel={copy.saving}
          className={`${adminButtonClass} w-fit`}
        >
          {copy.saveAccount}
        </AdminSubmitButton>
      </form>
      {account && canDelete && (
        <div className="mt-3">
          <NamedConfirm
            title={copy.deleteAccountTitle}
            body={fill(copy.deleteAccountBody, { name: account.name })}
            confirm={copy.deleteAccount}
            pendingLabel={copy.saving}
            action={deleteAdminUserAction}
            fields={{ id: account.id }}
            trigger={copy.deleteAccount}
            cancelLabel={copy.cancelAction}
            triggerClassName={adminButtonDangerClass}
          />
        </div>
      )}
    </AdminPanel>
  );
}

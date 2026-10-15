import { saveMailSettingsAction, sendMailTestAction } from "@/app/admin/actions";
import { AdminPanel, adminButtonClass, adminButtonSecondaryClass, adminFieldClass } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import type { AdminCopy } from "@/lib/admin-copy";
import type { MailSettings } from "@/lib/mail";

export function MailSettingsForm({
  copy,
  mail,
}: {
  copy: AdminCopy;
  mail: MailSettings;
}) {
  return (
    <div className="grid gap-4">
      <AdminPanel>
        <form action={saveMailSettingsAction} className="grid gap-4">
          <label className="flex items-center gap-2 text-sm font-bold text-[var(--desk-ink)]">
            <input
              type="checkbox"
              name="enabled"
              value="on"
              defaultChecked={mail.enabled}
              className="size-4"
            />
            {copy.mailEnabled}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold">
              {copy.mailHost}
              <input
                name="host"
                required
                maxLength={253}
                defaultValue={mail.host}
                placeholder="mail.example.com"
                autoComplete="off"
                className={adminFieldClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              {copy.mailPort}
              <input
                name="port"
                required
                type="number"
                min={1}
                max={65535}
                defaultValue={mail.port}
                className={adminFieldClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              {copy.mailSecurity}
              <select name="security" defaultValue={mail.security} className={adminFieldClass}>
                <option value="starttls">{copy.mailStarttls}</option>
                <option value="ssl">{copy.mailSsl}</option>
                <option value="none">{copy.mailNone}</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              {copy.mailUsername}
              <input
                name="username"
                maxLength={160}
                defaultValue={mail.username}
                autoComplete="off"
                className={adminFieldClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
              {copy.mailPassword}
              <input
                name="password"
                type="password"
                maxLength={200}
                autoComplete="new-password"
                placeholder={mail.passwordSet ? copy.mailPasswordKeep : ""}
                className={adminFieldClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              {copy.mailFromName}
              <input
                name="fromName"
                maxLength={80}
                defaultValue={mail.fromName}
                className={adminFieldClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              {copy.mailFromEmail}
              <input
                name="fromEmail"
                type="email"
                required
                maxLength={160}
                defaultValue={mail.fromEmail}
                className={adminFieldClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
              {copy.mailReplyTo}
              <input
                name="replyTo"
                type="email"
                maxLength={160}
                defaultValue={mail.replyTo}
                className={adminFieldClass}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-[var(--desk-text)]">
            <input
              type="checkbox"
              name="allowPrivateCert"
              value="on"
              defaultChecked={mail.allowPrivateCert}
              className="size-4"
            />
            {copy.mailPrivateCert}
          </label>
          <div className="flex justify-end border-t border-[var(--desk-line)] pt-4">
            <AdminSubmitButton pendingLabel={copy.saving} className={`${adminButtonClass} w-fit`}>
              {copy.saveSettings}
            </AdminSubmitButton>
          </div>
        </form>
      </AdminPanel>
      <AdminPanel title={copy.mailTest} description={copy.mailHint}>
        <form action={sendMailTestAction} className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-64 flex-1 gap-1.5 text-sm font-semibold">
            {copy.mailTestTo}
            <input
              name="to"
              type="email"
              required
              maxLength={160}
              className={adminFieldClass}
            />
          </label>
          <AdminSubmitButton
            pendingLabel={copy.mailSending}
            className={`${adminButtonSecondaryClass} w-fit`}
          >
            {copy.mailTest}
          </AdminSubmitButton>
        </form>
      </AdminPanel>
    </div>
  );
}

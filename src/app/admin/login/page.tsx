import { loginAction } from "@/app/admin/actions";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { LanguageSwitch } from "@/components/admin-locale";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { adminButtonClass, adminFieldClass } from "@/components/admin-ui";
import { adminPasswordConfigured } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const copy = adminCopy(await getAdminLocale());
  const configured = adminPasswordConfigured();

  return (
    <main className="admin-desk grid min-h-screen bg-[var(--desk-canvas)] lg:grid-cols-[minmax(20rem,0.78fr)_1.22fr]">
      <section className="relative hidden overflow-hidden bg-[var(--desk-ink)] p-10 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <Image
            src="/falco-logo.png"
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-lg bg-white object-cover"
          />
          <div>
            <p className="font-news text-xl font-medium">{copy.brand}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-white/45">
              {copy.desk}
            </p>
          </div>
        </div>
        <div className="mt-8">
          <LanguageSwitch />
        </div>
        <div className="mt-auto max-w-sm">
          <p className="font-news text-3xl font-medium leading-tight">
            {copy.signInCopy}
          </p>
          <div className="mt-7">
            <div className="flex items-center justify-between text-xs font-semibold text-white/65">
              <span>{copy.held}</span>
              <span>{copy.open}</span>
            </div>
            <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-[var(--desk-gold-soft)]">
              <span className="w-[68%] bg-[var(--desk-primary)]" />
              <span className="flex-1 border border-[var(--desk-gold)]" />
            </div>
          </div>
        </div>
      </section>
      <section className="grid place-items-center px-4 py-10 sm:px-8">
        <form
          action={loginAction}
          className="w-full max-w-sm rounded-2xl border border-[var(--desk-line)] bg-white p-6 shadow-[0_24px_64px_-44px_rgba(8,28,54,0.55)] sm:p-8"
        >
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <div className="flex items-center gap-2">
              <Image
                src="/falco-logo.png"
                alt=""
                width={34}
                height={34}
                className="size-[34px] rounded-lg object-cover"
              />
              <strong className="font-news text-lg font-medium">
                {copy.brand}
              </strong>
            </div>
            <LanguageSwitch tone="light" />
          </div>
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--desk-surface-muted)] text-[var(--desk-primary)]">
            <ShieldCheck aria-hidden="true" size={20} />
          </span>
          <h1 className="font-news mt-4 text-3xl font-medium">{copy.signIn}</h1>
          <p className="mt-1 text-sm leading-6 text-[var(--desk-muted)]">
            {copy.signInCopy}
          </p>
          {query.error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-[var(--desk-danger-line)] bg-[var(--desk-danger-soft)] px-3 py-2 text-sm text-[var(--desk-danger)]"
            >
              {copy.passwordRejected}
            </p>
          )}
          {!configured && (
            <p className="mt-4 rounded-xl border border-[var(--desk-warning-line)] bg-[var(--desk-warning-soft)] px-3 py-2 text-sm text-[var(--desk-warning)]">
              {copy.passwordMissing}
            </p>
          )}
          <label className="mt-5 grid gap-1.5 text-xs font-semibold text-[var(--desk-text)]">
            {copy.password}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={adminFieldClass}
            />
          </label>
          <AdminSubmitButton
            pendingLabel={copy.signingIn}
            className={`${adminButtonClass} mt-4 w-full`}
          >
            {copy.signIn}
          </AdminSubmitButton>
        </form>
      </section>
    </main>
  );
}

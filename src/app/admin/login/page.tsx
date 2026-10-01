import { loginAction } from "@/app/admin/actions";
import { LanguageSwitch } from "@/components/admin-locale";
import { adminButtonClass, adminFieldClass } from "@/components/admin-shell";
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
    <main className="grid min-h-screen lg:grid-cols-[18rem_1fr]">
      <section className="hidden bg-[#0b1f33] p-8 text-white lg:block">
        <p className="text-sm font-semibold">{copy.brand}</p>
        <p className="mt-2 text-sm text-white/65">{copy.desk}</p>
        <div className="mt-6">
          <LanguageSwitch />
        </div>
      </section>
      <section className="grid place-items-center bg-[#e7ebf0] px-4">
        <form
          action={loginAction}
          className="w-full max-w-sm rounded border border-[#d5dbe3] bg-white p-6"
        >
          <div className="mb-4 lg:hidden">
            <LanguageSwitch tone="light" />
          </div>
          <h1 className="text-xl font-semibold">{copy.signIn}</h1>
          <p className="mt-1 text-sm text-[#5c6776]">{copy.signInCopy}</p>
          {query.error && (
            <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {copy.passwordRejected}
            </p>
          )}
          {!configured && (
            <p className="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {copy.passwordMissing}
            </p>
          )}
          <label className="mt-5 grid gap-1 text-xs font-semibold text-[#334155]">
            {copy.password}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={adminFieldClass}
            />
          </label>
          <button type="submit" className={`${adminButtonClass} mt-4 w-full`}>
            {copy.signIn}
          </button>
        </form>
      </section>
    </main>
  );
}

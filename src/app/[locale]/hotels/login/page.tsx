import { getTranslations, setRequestLocale } from "next-intl/server";
import { agencySignInAction } from "@/app/[locale]/hotels/agency-actions";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export default async function AgencyLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Hotels");

  return (
    <section className="section-space">
      <div className="site-shell max-w-md">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="font-display mt-3 text-4xl font-bold text-primary">
          {t("loginTitle")}
        </h1>
        {query.error ? (
          <p className="mt-4 text-sm text-red-700">{t("loginFailed")}</p>
        ) : null}
        <form action={agencySignInAction} className="mt-8 grid gap-4">
          <input type="hidden" name="locale" value={locale} />
          <label className="grid gap-2 text-sm font-semibold text-primary">
            {t("loginEmail")}
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              className="rounded-xl border border-line px-3 py-2 font-normal"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-primary">
            {t("loginPassword")}
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-xl border border-line px-3 py-2 font-normal"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white"
          >
            {t("signIn")}
          </button>
        </form>
        <p className="mt-6 text-sm">
          <Link href="/hotels" className="text-primary underline">
            {t("title")}
          </Link>
        </p>
      </div>
    </section>
  );
}

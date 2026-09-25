import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const nav = await getTranslations("Nav");
  const common = await getTranslations("Common");

  return (
    <section className="section-space">
      <div className="site-shell text-center">
        <p className="font-display text-7xl font-bold text-gold">404</p>
        <h1 className="font-display mt-4 text-3xl font-bold text-primary">
          {common("brand")}
        </h1>
        <Link
          href="/"
          className="mt-7 inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white"
        >
          {nav("home")}
        </Link>
      </div>
    </section>
  );
}

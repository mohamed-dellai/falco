"use client";

import Image from "next/image";
import { Check, SlidersHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { localize, packages, type PackageCategory } from "@/content/site";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type CategoryFilter = "all" | PackageCategory;

export function PackageExplorer() {
  const t = useTranslations("Packages");
  const common = useTranslations("Common");
  const locale = useLocale() as Locale;
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filtered = useMemo(
    () =>
      packages.filter(
        (item) => category === "all" || item.category === category,
      ),
    [category],
  );

  function resetFilters() {
    setCategory("all");
  }

  return (
    <div className="mt-10">
      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-primary">
          <SlidersHorizontal size={18} />
          {t("showing", { count: filtered.length })}
        </div>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <fieldset>
            <legend className="mb-2 text-xs font-bold text-muted">
              {t("travellerType")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {(["all", "individual", "family", "group"] as const).map(
                (value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setCategory(value)}
                    className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                      category === value
                        ? "bg-primary text-white"
                        : "bg-surface-low text-muted"
                    }`}
                  >
                    {t(value)}
                  </button>
                ),
              )}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-primary px-4 py-3 text-xs font-bold text-primary"
          >
            {t("reset")}
          </button>
        </div>
      </div>

      {filtered.length ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.slug}
              className="card-lift overflow-hidden rounded-2xl border border-line bg-white"
            >
              <div className="relative h-52">
                <Image
                  src={item.image}
                  alt={localize(item.title, locale)}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="p-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-primary">
                    {localize(item.title, locale)}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {localize(item.summary, locale)}
                  </p>
                </div>
                <ul className="mt-4 grid gap-2 text-xs text-muted">
                  {item.features.slice(0, 3).map((feature) => (
                    <li key={feature.en} className="flex items-center gap-2">
                      <Check size={14} className="text-gold" />
                      {localize(feature, locale)}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/packages/${item.slug}`}
                  className="mt-6 inline-flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white"
                >
                  {common("viewDetails")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-line p-12 text-center">
          <p className="text-muted">{t("noResults")}</p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 text-sm font-bold text-primary"
          >
            {t("reset")}
          </button>
        </div>
      )}
    </div>
  );
}

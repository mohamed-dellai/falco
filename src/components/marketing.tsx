import Image from "next/image";
import {
  Bus,
  Check,
  Headphones,
  Hotel,
  Map,
  PlaneLanding,
  Utensils,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { localize, type UmrahPackage, services } from "@/content/site";

const serviceIcons = {
  hotel: Hotel,
  bus: Bus,
  plane: PlaneLanding,
  map: Map,
  utensils: Utensils,
  headphones: Headphones,
};

export function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-primary md:text-5xl">
        {title}
      </h2>
      {copy && <p className="mt-4 text-base leading-8 text-muted">{copy}</p>}
    </div>
  );
}

export function ServicesGrid({ locale }: { locale: Locale }) {
  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => {
        const Icon =
          serviceIcons[service.icon as keyof typeof serviceIcons] ?? Check;
        return (
          <article
            key={service.icon}
            className="card-lift rounded-2xl border border-line bg-card p-6"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-surface-low text-primary">
              <Icon size={21} />
            </span>
            <h3 className="font-display mt-5 text-xl font-bold text-primary">
              {localize(service.title, locale)}
            </h3>
            <p className="mt-2 text-sm leading-7 text-muted">
              {localize(service.copy, locale)}
            </p>
          </article>
        );
      })}
    </div>
  );
}

export async function PackageCard({
  item,
  locale,
}: {
  item: UmrahPackage;
  locale: Locale;
}) {
  const common = await getTranslations("Common");

  return (
    <article className="card-lift overflow-hidden rounded-2xl border border-line bg-card">
      <div className="relative h-52 overflow-hidden bg-primary-dark">
        <Image
          src={item.image}
          alt={localize(item.title, locale)}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition duration-700 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/80 to-transparent" />
        <div className="absolute inset-x-4 bottom-4 text-xs font-bold text-white">
          {common("tailored")}
        </div>
      </div>
      <div className="p-5">
        <div>
          <h3 className="font-display text-xl font-bold text-primary">
            {localize(item.title, locale)}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {localize(item.summary, locale)}
          </p>
        </div>
        <ul className="mt-5 grid gap-2 text-xs text-muted">
          {item.features.slice(0, 3).map((feature) => (
            <li key={feature.en} className="flex items-center gap-2">
              <Check size={15} className="shrink-0 text-gold" />
              {localize(feature, locale)}
            </li>
          ))}
        </ul>
        <Link
          href={`/packages/${item.slug}`}
          className="mt-6 inline-flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-dark"
        >
          {common("viewDetails")}
        </Link>
      </div>
    </article>
  );
}

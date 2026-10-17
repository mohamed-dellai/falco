import { notFound } from "next/navigation";
import { ServiceForm } from "@/app/admin/services/service-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listAgencies, listHotels } from "@/lib/inventory";
import { getDeskService, listServiceTypes } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function ServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const { id } = await params;
  const query = await searchParams;
  const [service, types, agencies, hotels] = await Promise.all([
    getDeskService(id),
    listServiceTypes(),
    listAgencies(),
    listHotels(),
  ]);
  if (!service) notFound();

  return (
    <ServiceForm
      copy={copy}
      locale={locale}
      types={types}
      agencies={agencies}
      hotels={hotels}
      service={service}
      closeHref="/admin/services"
      error={query.error}
      saved={query.saved}
    />
  );
}

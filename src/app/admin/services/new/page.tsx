import { ServiceForm } from "@/app/admin/services/service-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listAgencies, listHotels } from "@/lib/inventory";
import { listServiceTypes } from "@/lib/services";

export const dynamic = "force-dynamic";

export default async function NewServicePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const [types, agencies, hotels] = await Promise.all([listServiceTypes(), listAgencies(), listHotels()]);

  return (
    <ServiceForm
      copy={copy}
      locale={locale}
      types={types}
      agencies={agencies}
      hotels={hotels}
      service={null}
      closeHref="/admin/services"
      error={query.error}
    />
  );
}

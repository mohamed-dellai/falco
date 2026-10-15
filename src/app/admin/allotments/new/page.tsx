import Link from "next/link";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { ReservationHeaderForm } from "@/components/reservation-header-form";
import { AdminEmptyState, adminButtonClass } from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listCommercials } from "@/lib/client-crm";
import { clientIsOpen } from "@/lib/client-sale";
import { listAgencies, listHotels } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export default async function NewAllotmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; remaining?: string; agency?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const query = await searchParams;
  const [agencies, hotels, commercials] = await Promise.all([
    listAgencies(),
    listHotels(),
    listCommercials(),
  ]);
  const openAgencies = agencies.filter(clientIsOpen);

  return (
    <AdminShell
      title={copy.newAllotment}
      crumbs={[{ href: "/admin/allotments", label: copy.allotments }]}
    >
      <AdminError code={query.error} remaining={query.remaining} />
      {!openAgencies.length ? (
        <AdminEmptyState
          title={copy.noAgencies}
          description={copy.agencyBeforeAllotment}
          action={
            <Link href="/admin/agencies/new" className={adminButtonClass}>
              {copy.newAgency}
            </Link>
          }
        />
      ) : !hotels.length ? (
        <AdminEmptyState
          title={copy.noRoomsToAllot}
          description={copy.purchaseBeforeAllotment}
          action={
            <Link href="/admin/hotels/new" className={adminButtonClass}>
              {copy.newHotel}
            </Link>
          }
        />
      ) : (
        <ReservationHeaderForm
          allotment={null}
          agencies={openAgencies}
          hotels={hotels}
          commercials={commercials.filter((rep) => !rep.disabled)}
          copy={copy}
          locale={locale}
          defaultAgencyId={query.agency}
        />
      )}
    </AdminShell>
  );
}

import { notFound } from "next/navigation";
import { AdminError } from "@/components/admin-shell";
import { AdminNotice } from "@/components/admin-ui";
import { PolicyDesk } from "@/components/policy-desk";
import { ReservationActions } from "@/components/reservation-actions";
import { ReservationHeaderForm } from "@/components/reservation-header-form";
import { ReservationStay } from "@/components/reservation-stay";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listCommercials } from "@/lib/client-crm";
import { clientIsOpen } from "@/lib/client-sale";
import { allotmentValue, getAllotment, listAgencies, listHotels } from "@/lib/inventory";
import { listReservationPayments, paymentTotals } from "@/lib/reservation-payments";
import { listPolicyTemplates, listReservationPolicies } from "@/lib/policies";

export const dynamic = "force-dynamic";

export default async function ReservationDetailsPage({
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
  const [allotment, agencies, hotels, commercials, payments, policies, templates] = await Promise.all([
    getAllotment(id),
    listAgencies(),
    listHotels(),
    listCommercials(),
    listReservationPayments(id),
    listReservationPolicies(id),
    listPolicyTemplates(),
  ]);
  if (!allotment) notFound();
  const stay = allotmentValue(allotment);
  const totals = paymentTotals(allotment, payments);
  const unposted = payments
    .filter((payment) => payment.kind === "payment" && !payment.posted)
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <>
      <AdminError code={query.error} />
      {query.saved === "policy" ? (
        <div className="mb-4">
          <AdminNotice tone="success">{copy.policySaved}</AdminNotice>
        </div>
      ) : null}
      {allotment.channel === "b2c" ? null : (
        <div className="mb-4">
          <ReservationActions
            allotment={allotment}
            copy={copy}
            policies={policies.map((policy) => ({ id: policy.id, name: policy.name }))}
          />
        </div>
      )}
      <section className="overflow-hidden rounded-lg border border-[var(--desk-line)] bg-white shadow-sm">
        <ReservationStay
          allotment={allotment}
          nights={stay.nights}
          rooms={stay.rooms}
          sell={stay.revenue}
          paid={totals.paid}
          unposted={unposted}
          due={totals.due}
          refundDue={totals.refundDue}
          copy={copy}
          locale={locale}
        />
        <ReservationHeaderForm
          allotment={allotment}
          agencies={agencies.filter(
            (agency) => clientIsOpen(agency) || agency.id === allotment.agencyId,
          )}
          hotels={hotels}
          commercials={commercials.filter(
            (rep) => !rep.disabled || rep.id === allotment.commercialId,
          )}
          copy={copy}
          locale={locale}
          plain
        />
      </section>
      <section className="mt-4">
        <h2 className="mb-3 text-sm font-bold text-[var(--desk-ink)]">{copy.reservationPolicies}</h2>
        <PolicyDesk
          items={policies}
          templates={templates}
          allotmentId={allotment.id}
          copy={copy}
          empty={copy.policyEmpty}
        />
      </section>
    </>
  );
}

import { notFound } from "next/navigation";
import { AdminError } from "@/components/admin-shell";
import { ContractPeriodsPanel } from "@/components/contract-periods-panel";
import { getAdminLocale } from "@/lib/admin-locale";
import { loadPurchasePage } from "./load";

export async function PurchaseSelling({
  id,
  error,
  part,
}: {
  id: string;
  error?: string;
  part: "periods" | "rates" | "policies" | "photos";
}) {
  const locale = await getAdminLocale();
  const desk = await loadPurchasePage(id);
  if (desk.purchase.status === "draft") notFound();

  return (
    <>
      <AdminError code={error} />
      <ContractPeriodsPanel
        part={part}
        purchaseId={desk.purchase.id}
        lines={desk.purchase.lines}
        periods={desk.periods}
        policies={desk.policies}
        rates={desk.periodRates}
        groupRates={desk.groupRates}
        groups={desk.groups}
        photos={desk.offerPhotos}
        agencies={desk.agencies}
        locale={locale}
      />
    </>
  );
}

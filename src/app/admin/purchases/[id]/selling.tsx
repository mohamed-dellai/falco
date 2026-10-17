import { notFound } from "next/navigation";
import { AdminError } from "@/components/admin-shell";
import { AdminNotice } from "@/components/admin-ui";
import { ContractPeriodsPanel } from "@/components/contract-periods-panel";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listPolicyTemplates } from "@/lib/policies";
import { loadPurchasePage } from "./load";

export async function PurchaseSelling({
  id,
  error,
  saved,
  part,
}: {
  id: string;
  error?: string;
  saved?: string;
  part: "periods" | "rates" | "policies" | "photos";
}) {
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const desk = await loadPurchasePage(id);
  if (desk.purchase.status === "draft") notFound();
  const templates = part === "policies" ? await listPolicyTemplates() : [];

  return (
    <>
      <AdminError code={error} />
      {saved === "policy" ? (
        <div className="mb-4">
          <AdminNotice tone="success">{copy.policySaved}</AdminNotice>
        </div>
      ) : null}
      <ContractPeriodsPanel
        part={part}
        purchaseId={desk.purchase.id}
        lines={desk.purchase.lines}
        periods={desk.periods}
        policies={desk.policies}
        templates={templates}
        copy={copy}
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

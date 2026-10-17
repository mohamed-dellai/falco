import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";

export const dynamic = "force-dynamic";

export default async function PhaseTwoPage() {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  return (
    <section className="rounded-lg border border-[var(--desk-line)] bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold text-[var(--desk-text)]">{copy.invoicePhase2Empty}</p>
    </section>
  );
}

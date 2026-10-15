import { notFound } from "next/navigation";
import { AdminError } from "@/components/admin-shell";
import { adminButtonClass, adminFieldClass } from "@/components/admin-ui";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy, type AdminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getAllotment } from "@/lib/inventory";
import { isSupplierDocument, type SupplierDocumentKind } from "@/lib/reservation-documents";

const titles: Record<SupplierDocumentKind, keyof AdminCopy> = {
  request: "supplierRequest",
  request_block: "supplierRequestBlock",
  amendment: "supplierAmendmentMail",
  voucher: "supplierVoucherSend",
  cancel: "supplierCancelSend",
};

export const dynamic = "force-dynamic";

export default async function SupplierDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string; lines?: string; error?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const { id } = await params;
  const query = await searchParams;
  if (!query.kind || !isSupplierDocument(query.kind)) notFound();
  const allotment = await getAllotment(id);
  if (!allotment) notFound();
  const lineIds = (query.lines ?? "").split(",").filter(Boolean);
  const lines = allotment.lines.filter((line) => lineIds.includes(line.id));
  if (!lines.length) notFound();
  const title = copy[titles[query.kind]];
  const rooming = query.kind === "request" || query.kind === "request_block" || query.kind === "amendment";

  return (
    <>
      <AdminError code={query.error} />
      <form
        method="get"
        action={`/admin/allotments/${allotment.id}/supplier/pdf`}
        className="grid gap-3 rounded border border-[var(--desk-line)] bg-white p-4"
      >
        <input type="hidden" name="kind" value={query.kind} />
        <input type="hidden" name="lines" value={lines.map((line) => line.id).join(",")} />
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-[var(--desk-muted)]">{copy.docDownloadNote}</p>
        <ul className="text-sm text-[var(--desk-muted)]">
          {lines.map((line) => (
            <li key={line.id}>
              {line.quantity} × {line.roomName} · {line.boardSnapshot}
            </li>
          ))}
        </ul>
        {query.kind === "amendment" ? (
          <label className="grid gap-1 text-sm">
            {copy.docAmendmentDetails}
            <input name="amendmentDetails" className={adminFieldClass} />
          </label>
        ) : null}
        {rooming ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="roomingList" />
            {copy.docAttachRooming}
          </label>
        ) : null}
        <button type="submit" className={`${adminButtonClass} w-fit`}>
          {copy.docSend}
        </button>
      </form>
    </>
  );
}

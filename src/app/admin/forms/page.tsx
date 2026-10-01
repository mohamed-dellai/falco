import { AdminShell } from "@/components/admin-shell";
import { RequestsInbox } from "@/components/requests-inbox";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { listSubmissions } from "@/lib/submissions";

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const submissions = await listSubmissions();

  return (
    <AdminShell title={copy.requests} searchPlaceholder={copy.searchRequests}>
      <RequestsInbox submissions={submissions} />
    </AdminShell>
  );
}

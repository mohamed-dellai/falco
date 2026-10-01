import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { SubmissionSheet } from "@/components/submission-sheet";
import { requireAdmin } from "@/lib/admin-auth";
import { getSubmission } from "@/lib/submissions";

export const dynamic = "force-dynamic";

export default async function FormPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const submission = await getSubmission(id);
  if (!submission) notFound();

  return (
    <AdminShell
      title={submission.reference}
      crumbs={[{ href: "/admin/forms", label: "Requests" }]}
    >
      <SubmissionSheet submission={submission} />
    </AdminShell>
  );
}

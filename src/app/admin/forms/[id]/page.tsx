import { notFound, redirect } from "next/navigation";
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

  redirect(`/admin/forms?selected=${encodeURIComponent(submission.id)}`);
}

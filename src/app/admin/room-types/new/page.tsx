import { AdminError, AdminShell } from "@/components/admin-shell";
import { RoomTypeForm } from "@/components/room-type-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";

export const dynamic = "force-dynamic";

export default async function NewRoomTypePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const query = await searchParams;
  const copy = adminCopy(await getAdminLocale());

  return (
    <AdminShell
      title={copy.newRoomType}
      crumbs={[{ href: "/admin/room-types", label: copy.roomTypes }]}
    >
      <AdminError code={query.error} />
      <RoomTypeForm copy={copy} />
    </AdminShell>
  );
}

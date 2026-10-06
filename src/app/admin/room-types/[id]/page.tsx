import { notFound } from "next/navigation";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { RoomTypeForm } from "@/components/room-type-form";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import { getRoomType } from "@/lib/inventory";
import { roomTypeLabel } from "@/lib/room-types";

export const dynamic = "force-dynamic";

export default async function RoomTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const copy = adminCopy(await getAdminLocale());
  const { id } = await params;
  const query = await searchParams;
  const roomType = await getRoomType(id);
  if (!roomType) notFound();

  return (
    <AdminShell
      title={roomTypeLabel(roomType.name, (code) => copy[code])}
      crumbs={[{ href: "/admin/room-types", label: copy.roomTypes }]}
    >
      <AdminError code={query.error} />
      <RoomTypeForm copy={copy} roomType={roomType} />
    </AdminShell>
  );
}

import { notFound } from "next/navigation";
import { AdminError, AdminShell } from "@/components/admin-shell";
import { RoomSheet } from "@/components/room-sheet";
import { requireAdmin } from "@/lib/admin-auth";
import { adminCopy } from "@/lib/admin-copy";
import { getAdminLocale } from "@/lib/admin-locale";
import {
  getHotel,
  getRoom,
  heldOn,
  heldQuantity,
  listAssignments,
  listRoomPhotos,
  listRoomPurchases,
  listRoomTypes,
  openForStay,
  openQuantity,
  roomHasPurchaseLines,
} from "@/lib/inventory";
import { formatDateRange } from "@/lib/money";
import { roomTypeCode } from "@/lib/room-types";

export const dynamic = "force-dynamic";

export default async function RoomAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; remaining?: string }>;
}) {
  await requireAdmin();
  const locale = await getAdminLocale();
  const copy = adminCopy(locale);
  const { id } = await params;
  const query = await searchParams;
  const room = await getRoom(id);
  if (!room) notFound();
  const hotel = await getHotel(room.hotelId);
  if (!hotel) notFound();

  const [photos, assignments, purchased, purchases, types] = await Promise.all([
    listRoomPhotos(id),
    listAssignments(),
    roomHasPurchaseLines(id),
    listRoomPurchases(id),
    listRoomTypes(),
  ]);
  const roomAssignments = assignments.filter((assignment) => assignment.roomId === room.id);
  const stayIn = room.checkIn;
  const stayOut = room.checkOut;
  const [stock, open] =
    stayIn && stayOut
      ? await Promise.all([
          heldQuantity(room, stayIn, stayOut),
          openForStay(room, stayIn, stayOut),
        ])
      : await Promise.all([heldOn(room), openQuantity(room)]);
  const unavailable = Math.max(0, stock - open);
  const sold = Math.min(
    roomAssignments.reduce((sum, assignment) => sum + assignment.quantity, 0),
    unavailable,
  );
  const held = unavailable - sold;
  const typeCode = roomTypeCode(room.name);
  const typeName = typeCode ? copy[typeCode] : room.name;

  return (
    <AdminShell
      title={typeName}
      note={
        room.checkIn && room.checkOut ? (
          <span className="font-plex text-sm text-[var(--desk-muted)]">
            {formatDateRange(room.checkIn, room.checkOut, locale)}
          </span>
        ) : undefined
      }
      crumbs={[
        { href: "/admin/rooms", label: copy.rooms },
        { href: `/admin/hotels/${hotel.id}`, label: hotel.name },
      ]}
    >
      <AdminError code={query.error} remaining={query.remaining} />
      <RoomSheet
        room={room}
        hotel={hotel}
        purchased={purchased}
        held={held}
        open={open}
        sold={sold}
        photos={photos}
        purchases={purchases}
        assignments={roomAssignments}
        types={types}
      />
    </AdminShell>
  );
}

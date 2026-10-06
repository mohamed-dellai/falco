import { deleteRoomTypeAction, saveRoomTypeAction } from "@/app/admin/actions";
import { NamedConfirm } from "@/components/named-confirm";
import {
  AdminPanel,
  adminButtonClass,
  adminButtonDangerClass,
  adminFieldClass,
} from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { fill, type AdminCopy } from "@/lib/admin-copy";
import type { CatalogRoomType } from "@/lib/inventory";
import { roomTypeLabel } from "@/lib/room-types";

export function RoomTypeForm({
  copy,
  roomType,
}: {
  copy: AdminCopy;
  roomType?: CatalogRoomType;
}) {
  const name = roomType
    ? roomTypeLabel(roomType.name, (code) => copy[code])
    : "";

  return (
    <AdminPanel className="max-w-3xl">
      <form action={saveRoomTypeAction} className="grid gap-4">
        {roomType && <input type="hidden" name="id" value={roomType.id} />}
        <label className="grid gap-1.5 text-sm font-semibold">
          {copy.roomType}
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={roomType?.name ?? ""}
            className={adminFieldClass}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          {copy.guests}
          <input
            name="guests"
            type="number"
            min={1}
            max={20}
            required
            defaultValue={roomType?.guests ?? 2}
            className={adminFieldClass}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-semibold">
          {copy.description}
          <textarea
            name="description"
            rows={4}
            maxLength={2000}
            defaultValue={roomType?.description ?? ""}
            className={adminFieldClass}
          />
        </label>
        <AdminSubmitButton
          pendingLabel={copy.saving}
          className={`${adminButtonClass} w-fit`}
        >
          {copy.saveRoomType}
        </AdminSubmitButton>
      </form>
      {roomType && (
        <div className="mt-3">
          <NamedConfirm
            title={copy.deleteRoomTypeTitle}
            body={fill(copy.deleteRoomTypeBody, { name })}
            confirm={copy.deleteRoomType}
            pendingLabel={copy.saving}
            action={deleteRoomTypeAction}
            fields={{ id: roomType.id }}
            trigger={copy.deleteRoomType}
            cancelLabel={copy.cancelAction}
            triggerClassName={adminButtonDangerClass}
          />
        </div>
      )}
    </AdminPanel>
  );
}

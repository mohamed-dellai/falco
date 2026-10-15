import {
  createMealTypeAction,
  createViewTypeAction,
  deleteMealTypeAction,
  deleteRoomTypeAction,
  deleteViewTypeAction,
  renameMealTypeAction,
  renameViewTypeAction,
  saveRoomTypeAction,
} from "@/app/admin/actions";
import { AdminPanel, adminButtonClass, adminButtonDangerClass, adminButtonSecondaryClass, adminFieldClass } from "@/components/admin-ui";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { NamedConfirm } from "@/components/named-confirm";
import { fill, type AdminCopy } from "@/lib/admin-copy";
import { mealLabel, type MealType, type ViewType } from "@/lib/hotel-parameters";
import type { CatalogRoomType } from "@/lib/inventory";
import { roomTypeLabel, type MealPlan } from "@/lib/room-types";
import Link from "next/link";
import type { ReactNode } from "react";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <AdminPanel>
      <h2 className="text-[11px] font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
        {title}
      </h2>
      <p className="mt-1 text-sm text-[var(--desk-muted)]">{hint}</p>
      <div className="mt-4">{children}</div>
    </AdminPanel>
  );
}

function DeleteItem({
  copy,
  name,
  action,
  id,
}: {
  copy: AdminCopy;
  name: string;
  action: (formData: FormData) => void | Promise<void>;
  id: string;
}) {
  return (
    <NamedConfirm
      title={copy.deleteParameterTitle}
      body={fill(copy.deleteParameterBody, { name })}
      confirm={copy.deleteParameter}
      pendingLabel={copy.saving}
      action={action}
      fields={{ id }}
      trigger={copy.deleteParameter}
      cancelLabel={copy.cancelAction}
      triggerClassName={adminButtonDangerClass}
    />
  );
}

export function HotelParametersPanel({
  copy,
  roomTypes,
  meals,
  views,
}: {
  copy: AdminCopy;
  roomTypes: CatalogRoomType[];
  meals: MealType[];
  views: ViewType[];
}) {
  const builtinLabels: Partial<Record<MealPlan, string>> = {
    room_only: copy.roomOnly,
    breakfast: copy.breakfastBoard,
    half_board: copy.halfBoard,
    full_board: copy.fullBoard,
  };

  return (
    <div className="grid gap-4">
      <Section title={copy.roomTypes} hint={copy.roomTypesHint}>
        <form action={saveRoomTypeAction} className="grid gap-3 sm:grid-cols-[1fr_7rem_1fr_auto] sm:items-end">
          <input type="hidden" name="returnTo" value="settings" />
          <label className="grid gap-1.5 text-sm font-semibold">
            {copy.roomType}
            <input name="name" required minLength={2} maxLength={80} className={adminFieldClass} />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {copy.guests}
            <input
              name="guests"
              type="number"
              min={1}
              max={20}
              required
              defaultValue={2}
              className={adminFieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {copy.description}
            <input name="description" maxLength={2000} className={adminFieldClass} />
          </label>
          <AdminSubmitButton pendingLabel={copy.saving} className={adminButtonClass}>
            {copy.addRoomType}
          </AdminSubmitButton>
          <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
            <input name="childrenAllowed" type="checkbox" className="size-4" />
            {copy.childrenAllowed}
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            {copy.maxChildAge}
            <input
              name="maxChildAge"
              type="number"
              min={0}
              max={17}
              className={adminFieldClass}
            />
          </label>
        </form>
        <p className="mt-2 text-sm text-[var(--desk-muted)]">{copy.maxChildAgeHint}</p>
        <ul className="mt-4 divide-y divide-[var(--desk-line)] border-t border-[var(--desk-line)]">
          {roomTypes.map((type) => {
            const label = roomTypeLabel(type.name, (code) => copy[code]);
            return (
              <li key={type.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <Link
                    href={`/admin/room-types/${type.id}`}
                    className="font-semibold text-[var(--desk-primary)] hover:underline"
                  >
                    {label}
                  </Link>
                  <p className="text-sm text-[var(--desk-muted)]">
                    {copy.guests} · {type.guests}
                    {" · "}
                    {type.childrenAllowed
                      ? fill(copy.childrenUpTo, { age: type.maxChildAge ?? 0 })
                      : copy.childrenNotAllowed}
                  </p>
                </div>
                <NamedConfirm
                  title={copy.deleteRoomTypeTitle}
                  body={fill(copy.deleteRoomTypeBody, { name: label })}
                  confirm={copy.deleteRoomType}
                  pendingLabel={copy.saving}
                  action={deleteRoomTypeAction}
                  fields={{ id: type.id, returnTo: "settings" }}
                  trigger={copy.deleteRoomType}
                  cancelLabel={copy.cancelAction}
                  triggerClassName={adminButtonDangerClass}
                />
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={copy.mealTypes} hint={copy.mealTypesHint}>
        <form action={createMealTypeAction} className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-[16rem] flex-1 gap-1.5 text-sm font-semibold">
            {copy.mealName}
            <input name="name" required minLength={2} maxLength={80} className={adminFieldClass} />
          </label>
          <AdminSubmitButton pendingLabel={copy.saving} className={adminButtonClass}>
            {copy.addMeal}
          </AdminSubmitButton>
        </form>
        <ul className="mt-4 divide-y divide-[var(--desk-line)] border-t border-[var(--desk-line)]">
          {meals.map((meal) => {
            const label = mealLabel(meal, builtinLabels);
            return (
              <li key={meal.id} className="flex flex-wrap items-center gap-3 py-3">
                {meal.builtin ? (
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{label}</p>
                    <p className="text-xs font-semibold tracking-wide text-[var(--desk-muted)] uppercase">
                      {copy.standardParameter}
                    </p>
                  </div>
                ) : (
                  <form action={renameMealTypeAction} className="flex min-w-[16rem] flex-1 flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={meal.id} />
                    <label className="sr-only" htmlFor={`meal-${meal.id}`}>
                      {copy.mealName}
                    </label>
                    <input
                      id={`meal-${meal.id}`}
                      name="name"
                      required
                      minLength={2}
                      maxLength={80}
                      defaultValue={meal.name}
                      className={`${adminFieldClass} min-w-0 flex-1`}
                    />
                    <AdminSubmitButton pendingLabel={copy.saving} className={adminButtonSecondaryClass}>
                      {copy.saveParameter}
                    </AdminSubmitButton>
                  </form>
                )}
                {!meal.builtin && (
                  <DeleteItem copy={copy} name={label} action={deleteMealTypeAction} id={meal.id} />
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={copy.viewTypes} hint={copy.viewTypesHint}>
        <form action={createViewTypeAction} className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-[16rem] flex-1 gap-1.5 text-sm font-semibold">
            {copy.viewName}
            <input name="name" required minLength={2} maxLength={80} className={adminFieldClass} />
          </label>
          <AdminSubmitButton pendingLabel={copy.saving} className={adminButtonClass}>
            {copy.addView}
          </AdminSubmitButton>
        </form>
        {views.length ? (
          <ul className="mt-4 divide-y divide-[var(--desk-line)] border-t border-[var(--desk-line)]">
            {views.map((view) => (
              <li key={view.id} className="flex flex-wrap items-center gap-3 py-3">
                <form action={renameViewTypeAction} className="flex min-w-[16rem] flex-1 flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={view.id} />
                  <label className="sr-only" htmlFor={`view-${view.id}`}>
                    {copy.viewName}
                  </label>
                  <input
                    id={`view-${view.id}`}
                    name="name"
                    required
                    minLength={2}
                    maxLength={80}
                    defaultValue={view.name}
                    className={`${adminFieldClass} min-w-0 flex-1`}
                  />
                  <AdminSubmitButton pendingLabel={copy.saving} className={adminButtonSecondaryClass}>
                    {copy.saveParameter}
                  </AdminSubmitButton>
                </form>
                <DeleteItem copy={copy} name={view.name} action={deleteViewTypeAction} id={view.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 border-t border-[var(--desk-line)] pt-4 text-sm text-[var(--desk-muted)]">
            {copy.noViews}
          </p>
        )}
      </Section>
    </div>
  );
}

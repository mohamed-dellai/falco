"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  cancelPurchaseAction,
  deletePurchaseAction,
  unarchivePurchaseAction,
  savePurchaseAction,
} from "@/app/admin/actions";
import {
  AdminField,
  AdminStatusPill,
  adminButtonClass,
  adminButtonDangerClass,
  adminFieldClass,
} from "@/components/admin-ui";
import {
  CalendarSwitch,
  DateField,
  DualDate,
} from "@/components/calendar-date-field";
import { NamedConfirm } from "@/components/named-confirm";
import { useAdminCopy, useAdminLocale } from "@/components/admin-locale";
import { fill, type AdminCopy } from "@/lib/admin-copy";
import type {
  ContractType,
  MealRate,
  Purchase,
  PurchaseStatus,
  SupplierType,
} from "@/lib/inventory";
import {
  mealPlanLabel,
  mealPlans,
  roomTypeLabel,
  type MealPlan,
} from "@/lib/room-types";
import {
  formatDate,
  formatMoney,
  moneyInput,
  nightsBetween,
} from "@/lib/money";

type CatalogOption = {
  id: string;
  name: string;
  guests: number;
};

type MoneyDraft = {
  weekdayCost: string;
  weekendCost: string;
  weekdayPrice: string;
  weekendPrice: string;
};

type RateDraft = MoneyDraft & {
  name: string;
  nameAr: string;
  quantity: string;
};

function emptyMoney(): MoneyDraft {
  return {
    weekdayCost: "0",
    weekendCost: "0",
    weekdayPrice: "",
    weekendPrice: "",
  };
}

function moneyDraft(rate?: MealRate): MoneyDraft {
  if (!rate) return emptyMoney();
  return {
    weekdayCost: moneyInput(rate.weekdayCost),
    weekendCost: moneyInput(rate.weekendCost),
    weekdayPrice: rate.weekdayPrice == null ? "" : moneyInput(rate.weekdayPrice),
    weekendPrice: rate.weekendPrice == null ? "" : moneyInput(rate.weekendPrice),
  };
}

function boardLabels(copy: AdminCopy): Record<MealPlan, string> {
  return {
    room_only: copy.roomOnly,
    breakfast: copy.breakfastBoard,
    half_board: copy.halfBoard,
    full_board: copy.fullBoard,
  };
}

function emptyRate(): RateDraft {
  return {
    name: "",
    nameAr: "",
    quantity: "1",
    weekdayCost: "0",
    weekendCost: "0",
    weekdayPrice: "",
    weekendPrice: "",
  };
}

function lineHalalas(price: string) {
  const normalized = price.replaceAll(",", "").trim();
  if (!normalized) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

function parsedQuantity(value: string) {
  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5000) return null;
  return quantity;
}

export function PurchaseStatusPill({
  status,
  active = true,
}: {
  status: PurchaseStatus;
  active?: boolean;
}) {
  const copy = useAdminCopy();
  const archived = status === "cancelled";
  const disabled = status === "confirmed" && !active;
  const label = archived
    ? copy.archived
    : status === "draft"
      ? copy.draft
      : disabled
        ? copy.contractDisabled
        : copy.onSale;
  return (
    <AdminStatusPill tone={archived ? "neutral" : disabled || status === "draft" ? "warning" : "success"}>
      {label}
    </AdminStatusPill>
  );
}

function MoneyBox({
  label,
  name,
  value,
  onChange,
  locked,
  locale,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  locked: boolean;
  locale: string;
  placeholder: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-[var(--desk-text)]">
      <span>{label}</span>
      {locked ? (
        <span className="text-sm font-medium text-[var(--desk-ink)]">
          {value.trim() ? formatMoney(lineHalalas(value) ?? 0, locale) : "—"}
        </span>
      ) : (
        <span className="relative block">
          <input
            name={name}
            inputMode="decimal"
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            className={`${adminFieldClass} pe-12 text-end`}
          />
          <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[var(--desk-muted)]">
            SAR
          </span>
        </span>
      )}
    </label>
  );
}

export function PurchaseForm({
  hotels,
  purchase,
  hotelId,
  roomTypes,
  meals,
  views,
  hotelRooms,
  hotelMeals,
  hotelViews,
  suppliers = [],
  part = "all",
}: {
  hotels: Array<{ id: string; name: string; city: string }>;
  suppliers?: Array<{ id: string; name: string }>;
  purchase?: Purchase;
  hotelId?: string;
  roomTypes: CatalogOption[];
  meals: Array<{ code: string; name: string }>;
  views: string[];
  hotelRooms: Array<{ hotelId: string; roomTypeId: string }>;
  hotelMeals: Array<{ hotelId: string; code: string }>;
  hotelViews: Array<{ hotelId: string; name: string }>;
  part?: "all" | "header" | "rooms" | "board";
}) {
  const copy = useAdminCopy();
  const locale = useAdminLocale();
  const locked = purchase?.status === "cancelled";
  const primaryLine =
    purchase?.lines.find((line) => line.primary) ?? purchase?.lines[0];
  function mealText(code: string) {
    const builtin = mealPlans.includes(code as MealPlan)
      ? boardLabels(copy)[code as MealPlan]
      : "";
    return (
      builtin ||
      mealChoices.find((meal) => meal.code === code)?.name ||
      mealPlanLabel(code, boardLabels(copy))
    );
  }
  const [hotel, setHotel] = useState(purchase?.hotelId ?? hotelId ?? "");
  const [contractName, setContractName] = useState(purchase?.contractName ?? "");
  const [contractType, setContractType] = useState<ContractType>(
    purchase?.contractType ?? "block",
  );
  const [contractCost, setContractCost] = useState(
    purchase?.contractCost == null ? "" : moneyInput(purchase.contractCost),
  );
  const [priority, setPriority] = useState(String(purchase?.priority ?? 1));
  const [supplierType, setSupplierType] = useState<SupplierType>(
    purchase?.supplierType ?? "hotel_direct",
  );
  const [supplierAgencyId, setSupplierAgencyId] = useState(
    purchase?.supplierAgencyId ?? "",
  );
  const [contactHotel, setContactHotel] = useState(purchase?.contactHotel ?? false);
  const [active, setActive] = useState(purchase?.active ?? true);
  const [checkIn, setCheckIn] = useState(
    purchase?.checkIn ?? primaryLine?.checkIn ?? "",
  );
  const [checkOut, setCheckOut] = useState(
    purchase?.checkOut ?? primaryLine?.checkOut ?? "",
  );
  const [mainMeal, setMainMeal] = useState<string>(primaryLine?.board ?? "room_only");
  const [selectedMeals, setSelectedMeals] = useState<string[]>(
    purchase?.mealCodes.length
      ? purchase.mealCodes
      : primaryLine
        ? [primaryLine.board]
        : ["room_only"],
  );
  const [mealRates, setMealRates] = useState<Record<string, MoneyDraft>>(() => {
    const saved: Record<string, MoneyDraft> = {};
    for (const [code, rate] of Object.entries(purchase?.mealRates ?? {})) {
      saved[code] = moneyDraft(rate);
    }
    return saved;
  });
  const [viewRates, setViewRates] = useState<Record<string, MoneyDraft>>(() => {
    const saved: Record<string, MoneyDraft> = {};
    for (const [name, rate] of Object.entries(purchase?.viewRates ?? {})) {
      saved[name] = moneyDraft(rate);
    }
    return saved;
  });
  const [selectedViews, setSelectedViews] = useState<string[]>(
    purchase?.viewNames.length
      ? purchase.viewNames
      : [...new Set((purchase?.lines ?? []).map((line) => line.view).filter(Boolean))],
  );
  const [primaryType, setPrimaryType] = useState(primaryLine?.roomTypeId ?? "");
  const [primary, setPrimary] = useState<RateDraft>(
    primaryLine
      ? {
          name: primaryLine.roomName,
          nameAr: primaryLine.nameAr,
          quantity: String(primaryLine.quantity),
          weekdayCost: moneyInput(primaryLine.costPerNight),
          weekendCost: moneyInput(primaryLine.weekendCost),
          weekdayPrice:
            primaryLine.publicPricePerNight == null
              ? ""
              : moneyInput(primaryLine.publicPricePerNight),
          weekendPrice:
            primaryLine.weekendPrice == null
              ? ""
              : moneyInput(primaryLine.weekendPrice),
        }
      : emptyRate(),
  );
  const [checked, setChecked] = useState<string[]>(
    (purchase?.lines ?? [])
      .filter((line) => line !== primaryLine && line.roomTypeId)
      .map((line) => line.roomTypeId as string),
  );
  const [variables, setVariables] = useState<Record<string, RateDraft>>(() => {
    const saved: Record<string, RateDraft> = {};
    for (const line of purchase?.lines ?? []) {
      if (!line.roomTypeId || line === primaryLine) continue;
      saved[line.roomTypeId] = {
        name: line.roomName,
        nameAr: line.nameAr,
        quantity: String(line.quantity),
        weekdayCost: moneyInput(line.costPerNight),
        weekendCost: moneyInput(line.weekendCost),
        weekdayPrice:
          line.publicPricePerNight == null
            ? ""
            : moneyInput(line.publicPricePerNight),
        weekendPrice:
          line.weekendPrice == null ? "" : moneyInput(line.weekendPrice),
      };
    }
    return saved;
  });
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState("");

  const assignedRoomIds = useMemo(
    () =>
      new Set(
        hotelRooms
          .filter((link) => link.hotelId === hotel)
          .map((link) => link.roomTypeId),
      ),
    [hotel, hotelRooms],
  );
  const assignedMealCodes = useMemo(
    () =>
      hotelMeals
        .filter((link) => link.hotelId === hotel)
        .map((link) => link.code),
    [hotel, hotelMeals],
  );
  const assignedViewNames = useMemo(
    () =>
      new Set(
        hotelViews
          .filter((link) => link.hotelId === hotel)
          .map((link) => link.name),
      ),
    [hotel, hotelViews],
  );

  useEffect(() => {
    if (locked) return;
    setPrimaryType((current) => (assignedRoomIds.has(current) ? current : ""));
    setChecked((current) => {
      const next = current.filter((id) => assignedRoomIds.has(id));
      return next.length === current.length ? current : next;
    });
    setSelectedMeals((current) => {
      const next = current.filter((code) => assignedMealCodes.includes(code));
      return next.length === current.length ? current : next;
    });
    setMainMeal((current) =>
      assignedMealCodes.includes(current) ? current : assignedMealCodes[0] ?? "",
    );
    setSelectedViews((current) => {
      const next = current.filter((name) => assignedViewNames.has(name));
      return next.length === current.length ? current : next;
    });
  }, [assignedMealCodes, assignedRoomIds, assignedViewNames, locked]);

  const viewChoices = useMemo(() => {
    if (!hotel) return [];
    const pool = views.filter((view) => assignedViewNames.has(view));
    if (!locked) return pool;
    return [...new Set([...pool, ...selectedViews])];
  }, [assignedViewNames, hotel, locked, selectedViews, views]);

  const mealChoices = useMemo(() => {
    if (!hotel) return [];
    const pool = meals.filter((meal) => assignedMealCodes.includes(meal.code));
    if (!locked) return pool;
    const known = new Set(pool.map((meal) => meal.code));
    const extras = meals.filter(
      (meal) =>
        !known.has(meal.code) &&
        (selectedMeals.includes(meal.code) || meal.code === mainMeal),
    );
    return [...pool, ...extras];
  }, [assignedMealCodes, hotel, locked, mainMeal, meals, selectedMeals]);

  const catalog = useMemo(() => {
    if (!hotel) return [];
    return roomTypes.filter((type) => {
      if (assignedRoomIds.has(type.id)) return true;
      return locked && (type.id === primaryType || checked.includes(type.id));
    });
  }, [assignedRoomIds, checked, hotel, locked, primaryType, roomTypes]);

  function toggle(list: string[], value: string, on: boolean) {
    return on ? [...new Set([...list, value])] : list.filter((item) => item !== value);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const intent =
      submitter instanceof HTMLButtonElement ? submitter.value : "draft";
    if ((part === "all" || part === "header") && !hotel) {
      event.preventDefault();
      setFormError(copy.selectHotel);
      return;
    }
    const nights = nightsBetween(checkIn, checkOut);
    if (
      (part === "all" || part === "header") &&
      (intent === "confirm" || intent === "save" || primaryType || checked.length) &&
      (nights < 1 || nights > 1095)
    ) {
      event.preventDefault();
      setFormError(nights > 1095 ? copy.spanError : copy.datesError);
      return;
    }
    if ((intent === "confirm" || intent === "save") && !primaryType && checked.length === 0) {
      event.preventDefault();
      setFormError(copy.linesError);
      return;
    }
    const roomRows = [
      ...(primaryType ? [primary] : []),
      ...checked.map((id) => variables[id] ?? emptyRate()),
    ];
    const pricedRows = [
      ...selectedMeals.map((code) => mealRates[code] ?? emptyMoney()),
      ...selectedViews.map((name) => viewRates[name] ?? emptyMoney()),
    ];
    const brokenMoney = (row: MoneyDraft) => {
      const weekdayPrice = row.weekdayPrice.trim();
      const weekendPrice = row.weekendPrice.trim();
      return (
        lineHalalas(row.weekdayCost) === null ||
        lineHalalas(row.weekendCost) === null ||
        (weekdayPrice !== "" && (lineHalalas(weekdayPrice) ?? 0) < 1) ||
        (weekendPrice !== "" && (lineHalalas(weekendPrice) ?? 0) < 1)
      );
    };
    const broken =
      ((part === "all" || part === "rooms") &&
        roomRows.some((row) => parsedQuantity(row.quantity) === null || brokenMoney(row))) ||
      ((part === "all" || part === "board") && pricedRows.some(brokenMoney));
    if (broken) {
      event.preventDefault();
      setFormError(copy.roomLineError);
      return;
    }
    setFormError("");
    setPending(intent);
  }

  function rateFields(prefix: string, rate: MoneyDraft, onChange: (patch: Partial<MoneyDraft>) => void) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MoneyBox
          label={copy.weekdayCost}
          name={`${prefix}WeekdayCost`}
          value={rate.weekdayCost}
          locked={locked}
          locale={locale}
          placeholder={copy.moneyExample}
          onChange={(weekdayCost) => onChange({ weekdayCost })}
        />
        <MoneyBox
          label={copy.weekendCost}
          name={`${prefix}WeekendCost`}
          value={rate.weekendCost}
          locked={locked}
          locale={locale}
          placeholder={copy.moneyExample}
          onChange={(weekendCost) => onChange({ weekendCost })}
        />
        <MoneyBox
          label={copy.weekdayPrice}
          name={`${prefix}WeekdayPrice`}
          value={rate.weekdayPrice}
          locked={locked}
          locale={locale}
          placeholder={copy.moneyExample}
          onChange={(weekdayPrice) => onChange({ weekdayPrice })}
        />
        <MoneyBox
          label={copy.weekendPrice}
          name={`${prefix}WeekendPrice`}
          value={rate.weekendPrice}
          locked={locked}
          locale={locale}
          placeholder={copy.moneyExample}
          onChange={(weekendPrice) => onChange({ weekendPrice })}
        />
      </div>
    );
  }

  return (
    <div className="overflow-visible rounded-2xl border border-[var(--desk-line)] bg-white">
      <div className="sticky top-[4.5rem] z-10 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-[var(--desk-line)] bg-white/95 px-4 py-3 backdrop-blur lg:static">
        <div className="flex flex-wrap gap-2">
          {purchase?.status === "confirmed" && (
            <button
              type="submit"
              form="purchase-form"
              name="intent"
              value="revise"
              disabled={pending !== ""}
              className={`${adminButtonClass} min-w-32`}
            >
              {pending === "revise" ? copy.saving : copy.saveContract}
            </button>
          )}
          {!locked && purchase?.status !== "confirmed" && (
            <button
              type="submit"
              form="purchase-form"
              name="intent"
              value="save"
              disabled={pending !== ""}
              className={`${adminButtonClass} min-w-32`}
            >
              {pending === "save" ? copy.saving : copy.saveContract}
            </button>
          )}
          {(part === "all" || part === "header") && purchase?.status === "confirmed" && (
            <NamedConfirm
              title={copy.archivePurchaseTitle}
              body={fill(copy.archivePurchaseBody, { number: purchase.number })}
              confirm={copy.archiveContract}
              pendingLabel={copy.archiving}
              cancelLabel={copy.keepPurchase}
              action={cancelPurchaseAction}
              fields={{ id: purchase.id }}
              trigger={copy.archiveContract}
              triggerClassName={adminButtonDangerClass}
            />
          )}
          {(part === "all" || part === "header") && purchase?.status === "draft" && (
            <NamedConfirm
              title={copy.deleteDraftTitle}
              body={fill(copy.deleteDraftBody, { number: purchase.number })}
              confirm={copy.deleteAction}
              pendingLabel={copy.deleting}
              cancelLabel={copy.keepDraft}
              action={deletePurchaseAction}
              fields={{ id: purchase.id }}
              trigger={copy.deleteAction}
              triggerClassName={adminButtonDangerClass}
            />
          )}
          {(part === "all" || part === "header") && purchase?.status === "cancelled" && (
            <>
              <form action={unarchivePurchaseAction}>
                <input type="hidden" name="id" value={purchase.id} />
                <button type="submit" className={`${adminButtonClass} min-w-32`}>
                  {copy.unarchiveContract}
                </button>
              </form>
              <DeleteCancelledPurchase id={purchase.id} number={purchase.number} />
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {(part === "all" || part === "header") && (
          <span className="font-plex text-xs tabular-nums text-[var(--desk-muted)]">
            {copy.contractCost} · {formatMoney(lineHalalas(contractCost) ?? 0, locale)}
          </span>
          )}
          {purchase && (
            <PurchaseStatusPill status={purchase.status} active={purchase.active} />
          )}
        </div>
      </div>

      <form
        id="purchase-form"
        action={savePurchaseAction}
        onSubmit={onSubmit}
        className="grid gap-6 p-4 sm:p-5"
      >
        {purchase && <input type="hidden" name="id" value={purchase.id} />}
        {part !== "all" && <input type="hidden" name="section" value={part} />}
        {part !== "all" && part !== "header" && purchase && (
          <input type="hidden" name="hotelId" value={purchase.hotelId} />
        )}
        {formError && (
          <p role="alert" className="rounded-xl border border-[var(--desk-danger-line)] bg-[var(--desk-danger-soft)] px-3 py-2 text-sm text-[var(--desk-danger)]">
            {formError}
          </p>
        )}
        {part === "all" && (
        <p className="text-xs leading-5 text-[var(--desk-muted)]">
          {purchase
            ? `${purchase.number} · ${fill(copy.orderedOn, { date: formatDate(purchase.createdAt, locale) })}. `
            : `${copy.numberAssigned} `}
          {copy.purchaseLineHelp}
        </p>
        )}
        {(part === "all" || part === "header") && !locked && (
          <CalendarSwitch
            label={copy.calendar}
            normal={copy.normalCalendar}
            arabic={copy.arabicCalendar}
          />
        )}

        {(part === "all" || part === "header") && (
        <section className="grid gap-3 rounded-xl border border-[var(--desk-line)] p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminField label={copy.contractName}>
              {locked ? (
                <span className="text-sm">{contractName || "—"}</span>
              ) : (
                <input name="contractName" value={contractName} placeholder={copy.contractNameExample} onChange={(event) => setContractName(event.target.value)} className={adminFieldClass} />
              )}
            </AdminField>
            <AdminField label={copy.contractType}>
              {locked ? (
                <span className="text-sm">{contractType === "request" ? copy.contractRequest : copy.contractBlock}</span>
              ) : (
                <select name="contractType" value={contractType} onChange={(event) => setContractType(event.target.value as ContractType)} className={adminFieldClass}>
                  <option value="block">{copy.contractBlock}</option>
                  <option value="request">{copy.contractRequest}</option>
                </select>
              )}
            </AdminField>
            <AdminField label={copy.contractCost}>
              {locked ? (
                <span className="text-sm">{contractCost.trim() ? formatMoney(lineHalalas(contractCost) ?? 0, locale) : "—"}</span>
              ) : (
                <input name="contractCost" inputMode="decimal" value={contractCost} placeholder={copy.moneyExample} onChange={(event) => setContractCost(event.target.value)} className={adminFieldClass} />
              )}
            </AdminField>
            <AdminField label={copy.contractPriority}>
              {locked ? (
                <span className="text-sm">{priority}</span>
              ) : (
                <input name="priority" type="number" min={1} max={99} value={priority} onChange={(event) => setPriority(event.target.value)} className={adminFieldClass} />
              )}
            </AdminField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminField label={copy.hotel}>
              {locked ? (
                <span className="text-sm">{purchase?.hotelName}</span>
              ) : (
                <select name="hotelId" required value={hotel} onChange={(event) => setHotel(event.target.value)} className={adminFieldClass}>
                  <option value="">{copy.selectHotel}</option>
                  {hotels.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              )}
            </AdminField>
            <AdminField label={copy.supplierType}>
              {locked ? (
                <span className="text-sm">{supplierType === "wholesaler" ? copy.supplierWholesaler : copy.supplierHotelDirect}</span>
              ) : (
                <select name="supplierType" value={supplierType} onChange={(event) => setSupplierType(event.target.value as SupplierType)} className={adminFieldClass}>
                  <option value="hotel_direct">{copy.supplierHotelDirect}</option>
                  <option value="wholesaler">{copy.supplierWholesaler}</option>
                </select>
              )}
            </AdminField>
            {supplierType === "wholesaler" && (
              <AdminField label={copy.supplierCompany}>
                {locked ? (
                  <span className="text-sm">
                    {suppliers.find((supplier) => supplier.id === purchase?.supplierAgencyId)?.name ||
                      copy.noSupplierCompany}
                  </span>
                ) : (
                  <select
                    name="supplierAgencyId"
                    value={supplierAgencyId}
                    onChange={(event) => setSupplierAgencyId(event.target.value)}
                    className={adminFieldClass}
                  >
                    <option value="">{copy.noSupplierCompany}</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                )}
              </AdminField>
            )}
            <AdminField label={copy.checkIn}>
              {locked ? <DualDate iso={checkIn} locale={locale} /> : (
                <DateField name="checkIn" label={copy.checkIn} locale={locale} value={checkIn} onChange={setCheckIn} />
              )}
            </AdminField>
            <AdminField label={copy.checkOut}>
              {locked ? <DualDate iso={checkOut} locale={locale} /> : (
                <DateField name="checkOut" label={copy.checkOut} locale={locale} value={checkOut} onChange={setCheckOut} />
              )}
            </AdminField>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-semibold">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="active" value="on" checked={active} disabled={locked} onChange={(event) => setActive(event.target.checked)} />
              {copy.contractActive}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="contactHotel" value="on" checked={contactHotel} disabled={locked} onChange={(event) => setContactHotel(event.target.checked)} />
              {copy.contactHotel}
            </label>
          </div>
        </section>
        )}

        {(part === "all" || part === "rooms") && (
        <>
        <section className="grid gap-3 rounded-xl border border-[var(--desk-line)] p-4">
          <h2 className="text-sm font-semibold">{copy.mainRoom}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminField label={copy.roomType}>
              {locked ? (
                <span className="text-sm">{roomTypeLabel(primary.name, (code) => copy[code])}</span>
              ) : (
                <select
                  name="primaryRoomType"
                  value={primaryType}
                  onChange={(event) => {
                    const picked = catalog.find((type) => type.id === event.target.value);
                    setPrimaryType(event.target.value);
                    if (picked && !primary.name.trim()) {
                      setPrimary((current) => ({ ...current, name: picked.name }));
                    }
                  }}
                  className={adminFieldClass}
                >
                  <option value="">{copy.selectRoom}</option>
                  {catalog.map((type) => (
                    <option key={type.id} value={type.id}>
                      {roomTypeLabel(type.name, (code) => copy[code])} · {type.guests}
                    </option>
                  ))}
                </select>
              )}
            </AdminField>
            <AdminField label={copy.englishName}>
              {locked ? <span className="text-sm">{primary.name || "—"}</span> : (
                <input name="primaryName" value={primary.name} placeholder={copy.roomNameExample} onChange={(event) => setPrimary({ ...primary, name: event.target.value })} className={adminFieldClass} />
              )}
            </AdminField>
            <AdminField label={copy.arabicName}>
              {locked ? <span className="text-sm">{primary.nameAr || "—"}</span> : (
                <input name="primaryNameAr" dir="auto" value={primary.nameAr} placeholder={copy.arabicNameExample} onChange={(event) => setPrimary({ ...primary, nameAr: event.target.value })} className={adminFieldClass} />
              )}
            </AdminField>
            <AdminField label={copy.stockRooms}>
              {locked ? <span className="text-sm">{primary.quantity}</span> : (
                <input name="primaryQuantity" type="number" min={1} max={5000} value={primary.quantity} onChange={(event) => setPrimary({ ...primary, quantity: event.target.value })} className={adminFieldClass} />
              )}
            </AdminField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminField label={copy.mainMeal}>
              {locked ? <span className="text-sm">{mealText(mainMeal)}</span> : mealChoices.length ? (
                <select name="mainMeal" value={mainMeal} onChange={(event) => setMainMeal(event.target.value)} className={adminFieldClass}>
                  {mealChoices.map((meal) => (
                    <option key={meal.code} value={meal.code}>{mealText(meal.code)}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-normal text-[var(--desk-muted)]">
                  {hotel ? copy.noAssignedMeals : copy.selectHotel}
                </p>
              )}
            </AdminField>
          </div>
          <div className="grid gap-2">
            <div>
              <h3 className="text-sm font-semibold">{copy.nightlyRates}</h3>
              <p className="mt-1 text-xs text-[var(--desk-muted)]">{copy.nightlyRatesHint}</p>
            </div>
            {rateFields("primary", primary, (patch) => setPrimary({ ...primary, ...patch }))}
          </div>
        </section>

        <section className="grid gap-3 rounded-xl border border-[var(--desk-line)] p-4">
          <div>
            <h2 className="text-sm font-semibold">{copy.roomVariables}</h2>
            <p className="mt-1 text-xs text-[var(--desk-muted)]">{copy.roomVariablesHint}</p>
          </div>
          {!catalog.length ? (
            <p className="text-sm text-[var(--desk-muted)]">
              {hotel ? copy.noAssignedRooms : copy.selectHotel}
            </p>
          ) : (
          <div className="flex flex-wrap gap-3">
            {catalog.filter((type) => type.id !== primaryType).map((type) => {
              const on = checked.includes(type.id);
              return (
                <label key={type.id} className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    name="variableRoomType"
                    value={type.id}
                    checked={on}
                    disabled={locked}
                    onChange={(event) => {
                      setChecked((current) => toggle(current, type.id, event.target.checked));
                      if (event.target.checked && !variables[type.id]) {
                        setVariables((current) => ({
                          ...current,
                          [type.id]: { ...emptyRate(), name: type.name },
                        }));
                      }
                    }}
                  />
                  {roomTypeLabel(type.name, (code) => copy[code])}
                </label>
              );
            })}
          </div>
          )}
          {checked.filter((id) => id !== primaryType).map((id) => {
            const type = catalog.find((item) => item.id === id);
            const rate = variables[id] ?? emptyRate();
            return (
              <div key={id} className="grid gap-3 rounded-lg bg-[var(--desk-canvas)] p-3">
                <p className="text-sm font-semibold">
                  {type ? roomTypeLabel(type.name, (code) => copy[code]) : id}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <AdminField label={copy.englishName}>
                    {locked ? <span className="text-sm">{rate.name}</span> : (
                      <input name={`variable_${id}_Name`} value={rate.name} placeholder={copy.roomNameExample} onChange={(event) => setVariables({ ...variables, [id]: { ...rate, name: event.target.value } })} className={adminFieldClass} />
                    )}
                  </AdminField>
                  <AdminField label={copy.arabicName}>
                    {locked ? <span className="text-sm">{rate.nameAr || "—"}</span> : (
                      <input name={`variable_${id}_NameAr`} dir="auto" value={rate.nameAr} placeholder={copy.arabicNameExample} onChange={(event) => setVariables({ ...variables, [id]: { ...rate, nameAr: event.target.value } })} className={adminFieldClass} />
                    )}
                  </AdminField>
                  <AdminField label={copy.stockRooms}>
                    {locked ? <span className="text-sm">{rate.quantity}</span> : (
                      <input name={`variable_${id}_Quantity`} type="number" min={1} max={5000} value={rate.quantity} onChange={(event) => setVariables({ ...variables, [id]: { ...rate, quantity: event.target.value } })} className={adminFieldClass} />
                    )}
                  </AdminField>
                </div>
                {rateFields(`variable_${id}_`, rate, (patch) =>
                  setVariables({ ...variables, [id]: { ...rate, ...patch } }),
                )}
              </div>
            );
          })}
        </section>
        </>
        )}

        {(part === "all" || part === "board") && (
        <section className="grid gap-4 rounded-xl border border-[var(--desk-line)] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold">{copy.contractMeals}</h2>
              <p className="mt-1 text-xs text-[var(--desk-muted)]">{copy.mealRatesHint}</p>
              {mealChoices.length ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  {mealChoices.map((meal) => (
                    <label key={meal.code} className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        name="mealCode"
                        value={meal.code}
                        checked={selectedMeals.includes(meal.code)}
                        disabled={locked}
                        onChange={(event) => {
                          const on = event.target.checked;
                          setSelectedMeals((current) => toggle(current, meal.code, on));
                          if (on) {
                            setMealRates((current) =>
                              current[meal.code]
                                ? current
                                : { ...current, [meal.code]: emptyMoney() },
                            );
                          }
                        }}
                      />
                      {mealText(meal.code)}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--desk-muted)]">
                  {hotel ? copy.noAssignedMeals : copy.selectHotel}
                </p>
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold">{copy.contractViews}</h2>
              <p className="mt-1 text-xs text-[var(--desk-muted)]">{copy.viewRatesHint}</p>
              {viewChoices.length ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  {viewChoices.map((view) => (
                    <label key={view} className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        name="viewName"
                        value={view}
                        checked={selectedViews.includes(view)}
                        disabled={locked}
                        onChange={(event) => {
                          const on = event.target.checked;
                          setSelectedViews((current) => toggle(current, view, on));
                          if (on) {
                            setViewRates((current) =>
                              current[view] ? current : { ...current, [view]: emptyMoney() },
                            );
                          }
                        }}
                      />
                      {view}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--desk-muted)]">
                  {hotel ? copy.noAssignedViews : copy.selectHotel}
                </p>
              )}
            </div>
          </div>
          <div className="grid gap-3">
            {selectedMeals
              .filter((code) => mealChoices.some((meal) => meal.code === code))
              .map((code) => {
                const rate = mealRates[code] ?? emptyMoney();
                return (
                  <div key={code} className="grid gap-2 rounded-lg bg-[var(--desk-canvas)] p-3">
                    <p className="text-sm font-semibold">{mealText(code)}</p>
                    {rateFields(`mealRate.${code}.`, rate, (patch) =>
                      setMealRates((current) => ({
                        ...current,
                        [code]: { ...rate, ...patch },
                      })),
                    )}
                  </div>
                );
              })}
            {selectedViews
              .filter((name) => viewChoices.includes(name))
              .map((name) => {
                const rate = viewRates[name] ?? emptyMoney();
                return (
                  <div key={name} className="grid gap-2 rounded-lg bg-[var(--desk-canvas)] p-3">
                    <p className="text-sm font-semibold">{name}</p>
                    {rateFields(`viewRate.${name}.`, rate, (patch) =>
                      setViewRates((current) => ({
                        ...current,
                        [name]: { ...rate, ...patch },
                      })),
                    )}
                  </div>
                );
              })}
          </div>
        </section>
        )}

        {(part === "all" || part === "header") && (
        <AdminField label={copy.notes}>
          {locked ? (
            <p className="text-sm font-normal">{purchase?.notes || "—"}</p>
          ) : (
            <textarea name="notes" defaultValue={purchase?.notes ?? ""} placeholder={copy.notesExample} className={`${adminFieldClass} !h-auto min-h-20 py-2`} />
          )}
        </AdminField>
        )}
      </form>
    </div>
  );
}

export function DeleteCancelledPurchase({
  id,
  number,
  compact = false,
}: {
  id: string;
  number: string;
  compact?: boolean;
}) {
  const copy = useAdminCopy();
  return (
    <NamedConfirm
      title={copy.deleteCancelledTitle}
      body={fill(copy.deleteCancelledBody, { number })}
      confirm={copy.deleteAction}
      pendingLabel={copy.deleting}
      cancelLabel={copy.keepCancelled}
      action={deletePurchaseAction}
      fields={{ id }}
      trigger={copy.deleteAction}
      triggerClassName={compact ? undefined : adminButtonDangerClass}
    />
  );
}

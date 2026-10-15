import crypto from "crypto";
import { query, transaction } from "@/lib/db";
import { mealPlans, type MealPlan } from "@/lib/room-types";

export type MealType = {
  id: string;
  code: string;
  name: string;
  builtin: boolean;
  sortOrder: number;
};

export type ViewType = {
  id: string;
  name: string;
};

type CatalogResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "duplicate" | "catalog" | "empty" };

const builtinMeals = new Set<string>(mealPlans);

function cleanName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80 || /[\u0000-\u001f,]/.test(name)) {
    return "";
  }
  return name;
}

function uniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export function mealLabel(
  meal: Pick<MealType, "code" | "name">,
  builtinLabels: Partial<Record<MealPlan, string>>,
) {
  if (builtinMeals.has(meal.code)) return builtinLabels[meal.code as MealPlan] ?? meal.name;
  return meal.name;
}

export async function listMealTypes() {
  const rows = await query<{
    id: string;
    code: string;
    name: string;
    sort_order: number;
  }>(
    `SELECT id, code, name, sort_order
     FROM meal_types
     ORDER BY sort_order, lower(name), id`,
  );
  return rows.map(
    (row): MealType => ({
      id: row.id,
      code: row.code,
      name: row.name,
      builtin: builtinMeals.has(row.code),
      sortOrder: Number(row.sort_order),
    }),
  );
}

export async function listViewTypes() {
  const rows = await query<{ id: string; name: string }>(
    `SELECT id, name FROM view_types ORDER BY lower(name), id`,
  );
  return rows.map((row): ViewType => ({ id: row.id, name: row.name }));
}

export async function allowedViewNames() {
  const [catalog, legacy] = await Promise.all([
    listViewTypes(),
    query<{ view: string }>(
      `SELECT DISTINCT view FROM (
         SELECT view FROM offers
         UNION
         SELECT view FROM purchase_lines
       ) AS known
       WHERE btrim(view) <> ''`,
    ),
  ]);
  return new Set([
    ...catalog.map((view) => view.name),
    ...legacy.map((row) => row.view),
  ]);
}

async function mealInUse(code: string) {
  const rows = await query<{ count: number }>(
    `SELECT (
       (SELECT COUNT(*) FROM offers WHERE board = ?)
       + (SELECT COUNT(*) FROM purchase_lines WHERE board = ?)
       + (SELECT COUNT(*) FROM room_types WHERE board = ?)
       + (
         SELECT COUNT(*)
         FROM hotel_meals AS assignment
         JOIN meal_types AS meal ON meal.id = assignment.meal_type_id
         WHERE meal.code = ?
       )
     )::int AS count`,
    [code, code, code, code],
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

async function viewInUse(name: string) {
  const rows = await query<{ count: number }>(
    `SELECT (
       (SELECT COUNT(*) FROM offers WHERE view = ?)
       + (SELECT COUNT(*) FROM purchase_lines WHERE view = ?)
       + (
         SELECT COUNT(*)
         FROM hotel_views AS assignment
         JOIN view_types AS view ON view.id = assignment.view_type_id
         WHERE view.name = ?
       )
     )::int AS count`,
    [name, name, name],
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

export async function createMealType(name: string): Promise<CatalogResult> {
  const label = cleanName(name);
  if (!label || builtinMeals.has(label.toLowerCase())) {
    return { ok: false, error: label ? "duplicate" : "invalid" };
  }
  try {
    const sort = await query<{ next: number }>(
      "SELECT (COALESCE(MAX(sort_order), 0) + 1)::int AS next FROM meal_types",
    );
    await query(
      `INSERT INTO meal_types (id, code, name, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        label,
        label,
        Number(sort[0]?.next ?? 4),
        new Date().toISOString(),
      ],
    );
    return { ok: true };
  } catch (error) {
    if (uniqueViolation(error)) return { ok: false, error: "duplicate" };
    throw error;
  }
}

export async function renameMealType(
  id: string,
  name: string,
): Promise<CatalogResult> {
  const label = cleanName(name);
  if (!label) return { ok: false, error: "invalid" };
  if (builtinMeals.has(label.toLowerCase())) {
    return { ok: false, error: "duplicate" };
  }
  try {
    return await transaction(async (sql) => {
      const rows = await sql.query<{ code: string }>(
        "SELECT code FROM meal_types WHERE id = ? FOR UPDATE",
        [id],
      );
      const current = rows[0];
      if (!current || builtinMeals.has(current.code)) {
        return { ok: false as const, error: "invalid" as const };
      }
      if (current.code === label) return { ok: true as const };
      await sql.execute("UPDATE offers SET board = ? WHERE board = ?", [
        label,
        current.code,
      ]);
      await sql.execute(
        "UPDATE purchase_lines SET board = ? WHERE board = ?",
        [label, current.code],
      );
      await sql.execute(
        "UPDATE meal_types SET code = ?, name = ? WHERE id = ?",
        [label, label, id],
      );
      return { ok: true as const };
    });
  } catch (error) {
    if (uniqueViolation(error)) return { ok: false, error: "duplicate" };
    throw error;
  }
}

export async function deleteMealType(id: string): Promise<CatalogResult> {
  const rows = await query<{ code: string }>(
    "SELECT code FROM meal_types WHERE id = ?",
    [id],
  );
  const meal = rows[0];
  if (!meal || meal.code === "room_only") return { ok: false, error: "catalog" };
  if (await mealInUse(meal.code)) return { ok: false, error: "catalog" };
  await query("DELETE FROM meal_types WHERE id = ?", [id]);
  return { ok: true };
}

export async function createViewType(name: string): Promise<CatalogResult> {
  const label = cleanName(name);
  if (!label) return { ok: false, error: "invalid" };
  try {
    await query(
      `INSERT INTO view_types (id, name, created_at) VALUES (?, ?, ?)`,
      [crypto.randomUUID(), label, new Date().toISOString()],
    );
    return { ok: true };
  } catch (error) {
    if (uniqueViolation(error)) return { ok: false, error: "duplicate" };
    throw error;
  }
}

export async function renameViewType(
  id: string,
  name: string,
): Promise<CatalogResult> {
  const label = cleanName(name);
  if (!label) return { ok: false, error: "invalid" };
  try {
    return await transaction(async (sql) => {
      const rows = await sql.query<{ name: string }>(
        "SELECT name FROM view_types WHERE id = ? FOR UPDATE",
        [id],
      );
      const current = rows[0];
      if (!current) return { ok: false as const, error: "invalid" as const };
      if (current.name === label) return { ok: true as const };
      await sql.execute("UPDATE offers SET view = ? WHERE view = ?", [
        label,
        current.name,
      ]);
      await sql.execute(
        "UPDATE purchase_lines SET view = ? WHERE view = ?",
        [label, current.name],
      );
      await sql.execute("UPDATE view_types SET name = ? WHERE id = ?", [
        label,
        id,
      ]);
      return { ok: true as const };
    });
  } catch (error) {
    if (uniqueViolation(error)) return { ok: false, error: "duplicate" };
    throw error;
  }
}

export type HotelRoomOffering = {
  id: string;
  name: string;
  guests: number;
  description: string;
  childrenAllowed: boolean;
  maxChildAge: number | null;
};

export async function listHotelOfferings(hotelId: string) {
  const [roomTypes, meals, views] = await Promise.all([
    query<{
      id: string;
      name: string;
      guests: number;
      description: string;
      children_allowed: boolean;
      max_child_age: number | null;
    }>(
      `SELECT type.id, type.name, type.guests, type.description,
              type.children_allowed, type.max_child_age
       FROM hotel_room_types AS assignment
       JOIN room_types AS type ON type.id = assignment.room_type_id
       WHERE assignment.hotel_id = ?
       ORDER BY lower(type.name), type.guests, type.id`,
      [hotelId],
    ),
    query<{
      id: string;
      code: string;
      name: string;
      sort_order: number;
    }>(
      `SELECT meal.id, meal.code, meal.name, meal.sort_order
       FROM hotel_meals AS assignment
       JOIN meal_types AS meal ON meal.id = assignment.meal_type_id
       WHERE assignment.hotel_id = ?
       ORDER BY meal.sort_order, lower(meal.name), meal.id`,
      [hotelId],
    ),
    query<{ id: string; name: string }>(
      `SELECT view.id, view.name
       FROM hotel_views AS assignment
       JOIN view_types AS view ON view.id = assignment.view_type_id
       WHERE assignment.hotel_id = ?
       ORDER BY lower(view.name), view.id`,
      [hotelId],
    ),
  ]);
  return {
    roomTypes: roomTypes.map(
      (row): HotelRoomOffering => ({
        id: row.id,
        name: row.name,
        guests: Number(row.guests),
        description: row.description ?? "",
        childrenAllowed: Boolean(row.children_allowed),
        maxChildAge:
          row.max_child_age == null ? null : Number(row.max_child_age),
      }),
    ),
    meals: meals.map(
      (row): MealType => ({
        id: row.id,
        code: row.code,
        name: row.name,
        builtin: builtinMeals.has(row.code),
        sortOrder: Number(row.sort_order),
      }),
    ),
    views: views.map((row) => ({ id: row.id, name: row.name })),
  };
}

export async function listHotelRoomLinks() {
  const rows = await query<{ hotel_id: string; room_type_id: string }>(
    "SELECT hotel_id, room_type_id FROM hotel_room_types",
  );
  return rows.map((row) => ({
    hotelId: row.hotel_id,
    roomTypeId: row.room_type_id,
  }));
}

export async function listHotelMealLinks() {
  const rows = await query<{ hotel_id: string; code: string }>(
    `SELECT assignment.hotel_id, meal.code
     FROM hotel_meals AS assignment
     JOIN meal_types AS meal ON meal.id = assignment.meal_type_id`,
  );
  return rows.map((row) => ({
    hotelId: row.hotel_id,
    code: row.code,
  }));
}

export async function listHotelViewLinks() {
  const rows = await query<{ hotel_id: string; name: string }>(
    `SELECT assignment.hotel_id, view.name
     FROM hotel_views AS assignment
     JOIN view_types AS view ON view.id = assignment.view_type_id`,
  );
  return rows.map((row) => ({
    hotelId: row.hotel_id,
    name: row.name,
  }));
}

export async function saveHotelOfferings(input: {
  hotelId: string;
  roomTypeIds: string[];
  mealTypeIds: string[];
  viewTypeIds: string[];
}): Promise<CatalogResult> {
  const roomTypeIds = [...new Set(input.roomTypeIds.filter(Boolean))];
  const mealTypeIds = [...new Set(input.mealTypeIds.filter(Boolean))];
  const viewTypeIds = [...new Set(input.viewTypeIds.filter(Boolean))];
  const hotel = await query<{ id: string }>(
    "SELECT id FROM hotels WHERE id = ?",
    [input.hotelId],
  );
  if (!hotel[0]) return { ok: false, error: "invalid" };
  if (!roomTypeIds.length) return { ok: false, error: "empty" };
  if (roomTypeIds.length) {
    const found = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM room_types
       WHERE id IN (${roomTypeIds.map(() => "?").join(", ")})`,
      roomTypeIds,
    );
    if (Number(found[0]?.count ?? 0) !== roomTypeIds.length) {
      return { ok: false, error: "invalid" };
    }
  }
  if (mealTypeIds.length) {
    const found = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM meal_types
       WHERE id IN (${mealTypeIds.map(() => "?").join(", ")})`,
      mealTypeIds,
    );
    if (Number(found[0]?.count ?? 0) !== mealTypeIds.length) {
      return { ok: false, error: "invalid" };
    }
  }
  if (viewTypeIds.length) {
    const found = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM view_types
       WHERE id IN (${viewTypeIds.map(() => "?").join(", ")})`,
      viewTypeIds,
    );
    if (Number(found[0]?.count ?? 0) !== viewTypeIds.length) {
      return { ok: false, error: "invalid" };
    }
  }
  await transaction(async (sql) => {
    await sql.execute("DELETE FROM hotel_room_types WHERE hotel_id = ?", [
      input.hotelId,
    ]);
    await sql.execute("DELETE FROM hotel_meals WHERE hotel_id = ?", [
      input.hotelId,
    ]);
    await sql.execute("DELETE FROM hotel_views WHERE hotel_id = ?", [
      input.hotelId,
    ]);
    for (const roomTypeId of roomTypeIds) {
      await sql.execute(
        `INSERT INTO hotel_room_types (hotel_id, room_type_id)
         VALUES (?, ?)`,
        [input.hotelId, roomTypeId],
      );
    }
    for (const mealTypeId of mealTypeIds) {
      await sql.execute(
        `INSERT INTO hotel_meals (hotel_id, meal_type_id) VALUES (?, ?)`,
        [input.hotelId, mealTypeId],
      );
    }
    for (const viewTypeId of viewTypeIds) {
      await sql.execute(
        `INSERT INTO hotel_views (hotel_id, view_type_id) VALUES (?, ?)`,
        [input.hotelId, viewTypeId],
      );
    }
  });
  return { ok: true };
}

export async function deleteViewType(id: string): Promise<CatalogResult> {
  const rows = await query<{ name: string }>(
    "SELECT name FROM view_types WHERE id = ?",
    [id],
  );
  const view = rows[0];
  if (!view) return { ok: false, error: "invalid" };
  if (await viewInUse(view.name)) return { ok: false, error: "catalog" };
  await query("DELETE FROM view_types WHERE id = ?", [id]);
  return { ok: true };
}

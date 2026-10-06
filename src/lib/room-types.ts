export const roomTypes = ["solo", "double", "triple", "quad"] as const;

export type RoomType = (typeof roomTypes)[number];

export const mealPlans = [
  "room_only",
  "breakfast",
  "half_board",
  "full_board",
] as const;

export type MealPlan = (typeof mealPlans)[number];

export const saleModes = ["book", "request"] as const;

export type SaleMode = (typeof saleModes)[number];

export function saleModeCode(value: string): SaleMode | null {
  return saleModes.includes(value as SaleMode) ? (value as SaleMode) : null;
}

export function roomTypeCode(name: string): RoomType | null {
  const code = name.trim().toLowerCase();
  return roomTypes.includes(code as RoomType) ? (code as RoomType) : null;
}

export function roomTypeLabel(
  name: string,
  label: (type: RoomType) => string,
) {
  const code = roomTypeCode(name);
  return code ? label(code) : name;
}

export function mealPlanCode(value: string): MealPlan | null {
  return mealPlans.includes(value as MealPlan) ? (value as MealPlan) : null;
}

export function mealPlanMessageKey(board: string) {
  if (board === "breakfast") return "breakfastBoard" as const;
  if (board === "half_board") return "halfBoard" as const;
  if (board === "full_board") return "fullBoard" as const;
  return "roomOnly" as const;
}

export function mealPlanLabel(
  board: string,
  label: Record<MealPlan, string>,
) {
  const code = mealPlanCode(board);
  return code ? label[code] : board;
}

export function roomTypeOptionLabel(input: {
  name: string;
  guests: number;
  board: string;
  view: string;
  nameLabel: (type: RoomType) => string;
  boardLabel: Record<MealPlan, string>;
}) {
  const parts = [
    roomTypeLabel(input.name, input.nameLabel),
    String(input.guests),
    mealPlanLabel(input.board, input.boardLabel),
  ];
  if (input.view.trim()) parts.push(input.view.trim());
  return parts.join(" · ");
}

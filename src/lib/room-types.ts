export const roomTypes = ["solo", "double", "triple", "quad"] as const;

export type RoomType = (typeof roomTypes)[number];

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

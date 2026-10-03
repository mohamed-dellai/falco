export const roomTypes = ["solo", "double", "triple", "quad"] as const;

export type RoomType = (typeof roomTypes)[number];

export function roomTypeCode(name: string): RoomType | null {
  const code = name.trim().toLowerCase();
  return roomTypes.includes(code as RoomType) ? (code as RoomType) : null;
}

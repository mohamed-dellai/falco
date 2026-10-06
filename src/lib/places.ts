export const cities = ["makkah", "madinah", "jeddah"] as const;
export type City = (typeof cities)[number];

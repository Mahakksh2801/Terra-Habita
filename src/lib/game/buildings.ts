import { HABIT_COLORS } from "./config";

export const HABIT_CATEGORIES = ["body", "mind", "work", "social", "creative", "home", "other"] as const;
export type HabitCategory = (typeof HABIT_CATEGORIES)[number];

export const CATEGORY_BUILDING: Record<HabitCategory, string> = {
  body: "gym",
  mind: "library",
  work: "office",
  social: "plaza",
  creative: "studio",
  home: "house",
  other: "shop",
};

export const SPECIAL_BUILDINGS = ["park", "district_hall", "landmark"] as const;
export type SpecialBuilding = (typeof SPECIAL_BUILDINGS)[number];
export type BuildingType = (typeof CATEGORY_BUILDING)[HabitCategory] | SpecialBuilding;

export function buildingTypeFor(category: HabitCategory): string {
  return CATEGORY_BUILDING[category] ?? CATEGORY_BUILDING.other;
}

/**
 * Colour for a new habit: the first palette colour none of the user's other
 * habits use, so habits look different from each other. Once all are taken,
 * colours repeat in order.
 */
export function pickHabitColor(used: ReadonlyArray<string>): string {
  const taken = new Set(used.map((c) => c.toLowerCase()));
  const free = HABIT_COLORS.find((c) => !taken.has(c));
  return free ?? HABIT_COLORS[used.length % HABIT_COLORS.length];
}

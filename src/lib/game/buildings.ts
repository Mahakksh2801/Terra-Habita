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

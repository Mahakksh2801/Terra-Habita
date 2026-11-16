/**
 * Tunable game constants. Everything that shapes the core mechanics lives here
 * so it can be adjusted in one place (and covered by the same tests).
 */

export const CONDITION = {
  max: 100,
  /** Condition lost per missed scheduled day. */
  missPenalty: 25,
  /** At or above this a building is healthy. */
  healthyMin: 60,
  /** At or above this (and below healthyMin) a building is decaying; below it, ruined. */
  decayingMin: 20,
  /** Condition a ruined building gains from one completion (decaying ones go straight to max). */
  ruinedRepair: 40,
} as const;

/** Per-habit streak lengths (in scheduled days) that unlock special buildings. */
export const STREAK_MILESTONES = [
  { days: 7, type: "streak_7", building: "park" },
  { days: 30, type: "streak_30", building: "district_hall" },
  { days: 100, type: "streak_100", building: "landmark" },
] as const;

/** Building height tier unlocked by the user's lifetime completion count. */
export const HEIGHT_TIERS = [
  { minCompletions: 0, tier: 1 },
  { minCompletions: 25, tier: 2 },
  { minCompletions: 100, tier: 3 },
  { minCompletions: 250, tier: 4 },
  { minCompletions: 500, tier: 5 },
  { minCompletions: 1000, tier: 6 },
] as const;

export const LEVELS = ["city", "state", "country", "continent", "world"] as const;
export type Level = (typeof LEVELS)[number];

/**
 * When a settlement counts as full.
 * city: number of buildings. Higher levels: number of child settlements.
 * The world never fills up.
 */
export const PROMOTION_THRESHOLD: Record<Level, number> = {
  city: 500,
  state: 5,
  country: 5,
  continent: 5,
  world: Number.POSITIVE_INFINITY,
};

/** Side length of a city's square grid. 24 x 24 = 576 cells, room for 500 buildings. */
export const CITY_GRID_SIZE = 24;

/** How far back a completion may be logged. 0 = today only. */
export const BACKFILL_DAYS = 0;

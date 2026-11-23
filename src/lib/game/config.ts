/**
 * Tunable game constants. Everything that shapes the core mechanics lives here
 * so it can be adjusted in one place (and covered by the same tests).
 */

export const CONDITION = {
  max: 100,
  /** Condition after the first damaging miss ("damaged by 50%"). */
  half: 50,
  /** At or above this a building is healthy. */
  healthyMin: 60,
  /** At or above this (and below healthyMin) a building is damaged; below it, ruined. */
  decayingMin: 20,
} as const;

/**
 * Damage cadence by how many days a week a habit is scheduled.
 * Counted in consecutive *scheduled* days missed.
 *  - 5 to 7 days a week: 2 misses → most recent building at 50%, 3 → ruined.
 *  - 1 to 4 days a week: 1 miss → 50%, 2 → ruined.
 * If the misses continue, the cycle repeats on the next most recent building.
 */
export const DAMAGE = {
  highFrequencyMinDays: 5,
  high: { halfAt: 2, ruinAt: 3 },
  low: { halfAt: 1, ruinAt: 2 },
} as const;

/**
 * Damaged buildings are repaired once every scheduled day in the 7 days after
 * the last missed day has been completed.
 */
export const CLEAN_STREAK_DAYS = 7;

/** Per-habit streak lengths (in scheduled days) that unlock special buildings. */
export const STREAK_MILESTONES = [
  { days: 7, type: "streak_7", building: "park" },
  { days: 30, type: "streak_30", building: "district_hall" },
  { days: 100, type: "streak_100", building: "landmark" },
] as const;

/**
 * Every habit building is the same 3-D block: one completed habit-day raises
 * exactly one building, and they all share this height, footprint and window
 * layout. Category only changes the colour.
 */
export const BUILDING = {
  /** Height in map pixels (a grid tile is 64 x 32). */
  height: 40,
  /** Footprint inset from the tile edge, as a fraction of the tile. */
  inset: 0.12,
  /** Windows on every visible wall: 2 across x 2 up = 4 per face. */
  windowCols: 2,
  windowRows: 2,
} as const;

/** Windows on each visible face of every building. */
export const WINDOWS_PER_FACE = BUILDING.windowCols * BUILDING.windowRows;

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

import { BACKFILL_DAYS, CLEAN_STREAK_DAYS, CONDITION } from "./config";
import { type LocalDate, addDays, daysBetween, eachDay } from "./dates";
import { statusFor, type BuildingStatus } from "./condition";
import { buildingTypeFor, heightTierFor, type HabitCategory } from "./buildings";
import { type Cell, nextFreeCells } from "./placement";
import { currentStreak, milestonesCrossed, type StreakMilestone } from "./streaks";
import { isScheduled } from "./schedule";

export interface CompletionInput {
  habit: { id: string; category: HabitCategory; mask: number; createdOn: LocalDate; archived: boolean };
  date: LocalDate;
  today: LocalDate;
  /** The habit's completed days before this completion. */
  completed: ReadonlySet<LocalDate>;
  /** Last missed scheduled day, from the nightly job. */
  lastMissedOn: LocalDate | null;
  /** The habit's existing buildings, across all settlements. */
  habitBuildings: ReadonlyArray<{ id: string; condition: number }>;
  /** User's lifetime completions before this one. */
  totalCompletions: number;
  /** Active city grid. */
  gridSize: number;
  occupied: ReadonlySet<string>;
}

export interface PlannedBuilding extends Cell {
  type: string;
  tier: number;
  milestone: StreakMilestone["type"] | null;
}

export interface CompletionPlan {
  buildings: PlannedBuilding[];
  repairs: { id: string; condition: number; status: BuildingStatus }[];
  milestones: { type: StreakMilestone["type"]; streakStartedOn: LocalDate }[];
  streak: number;
}

export type CompletionError = "archived" | "future" | "too_old" | "before_created" | "already_done" | "grid_full";

export class CompletionRejected extends Error {
  constructor(public readonly reason: CompletionError) {
    super(`completion rejected: ${reason}`);
  }
}

/**
 * Has every scheduled day in the 7 days after the last miss been completed?
 * That clean stretch is what repairs a habit's damaged buildings.
 */
export function cleanStreakDone(
  mask: number,
  lastMissedOn: LocalDate | null,
  completed: ReadonlySet<LocalDate>,
): boolean {
  if (!lastMissedOn) return true;
  const window = eachDay(addDays(lastMissedOn, 1), addDays(lastMissedOn, CLEAN_STREAK_DAYS + 1));
  return window.every((d) => !isScheduled(d, mask) || completed.has(d));
}

/**
 * Everything one completion does to the world, as a plan the caller persists
 * in a single transaction: one new building (plus any milestone buildings),
 * newly unlocked milestones, and, if this completion finishes a clean 7-day
 * stretch after the last miss, full repair of the habit's damaged buildings.
 */
export function planCompletion(input: CompletionInput): CompletionPlan {
  const { habit, date, today, completed } = input;
  if (habit.archived) throw new CompletionRejected("archived");
  const age = daysBetween(date, today);
  if (age < 0) throw new CompletionRejected("future");
  if (age > BACKFILL_DAYS) throw new CompletionRejected("too_old");
  if (date < habit.createdOn) throw new CompletionRejected("before_created");
  if (completed.has(date)) throw new CompletionRejected("already_done");

  const before = currentStreak({ completed, mask: habit.mask, createdOn: habit.createdOn, today });
  const withThis = new Set([...completed, date]);
  const after = currentStreak({
    completed: withThis,
    mask: habit.mask,
    createdOn: habit.createdOn,
    today,
  });
  // A completion on an unscheduled day still builds, but cannot unlock milestones.
  const crossed = isScheduled(date, habit.mask) ? milestonesCrossed(before.length, after.length) : [];

  const cells = nextFreeCells(input.gridSize, input.occupied, 1 + crossed.length);
  if (cells.length < 1 + crossed.length) throw new CompletionRejected("grid_full");

  const tier = heightTierFor(input.totalCompletions + 1);
  const buildings: PlannedBuilding[] = [
    { ...cells[0], type: buildingTypeFor(habit.category), tier, milestone: null },
    ...crossed.map((m, i) => ({ ...cells[i + 1], type: m.building, tier, milestone: m.type })),
  ];

  const repairs = cleanStreakDone(habit.mask, input.lastMissedOn, withThis)
    ? input.habitBuildings
        .filter((b) => b.condition < CONDITION.max)
        .map((b) => ({ id: b.id, condition: CONDITION.max, status: statusFor(CONDITION.max) }))
    : [];

  return {
    buildings,
    repairs,
    milestones: crossed.map((m) => ({ type: m.type, streakStartedOn: after.startedOn! })),
    streak: after.length,
  };
}

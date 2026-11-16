import { BACKFILL_DAYS } from "./config";
import { type LocalDate, daysBetween } from "./dates";
import { applyRepair, statusFor, type BuildingStatus } from "./condition";
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
 * Everything one completion does to the world, as a plan the caller persists
 * in a single transaction: one new building (plus any milestone buildings),
 * repairs to the habit's damaged buildings, and newly unlocked milestones.
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
  const after = currentStreak({
    completed: new Set([...completed, date]),
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

  const repairs = input.habitBuildings
    .filter((b) => b.condition < 100)
    .map((b) => {
      const condition = applyRepair(b.condition);
      return { id: b.id, condition, status: statusFor(condition) };
    });

  return {
    buildings,
    repairs,
    milestones: crossed.map((m) => ({ type: m.type, streakStartedOn: after.startedOn! })),
    streak: after.length,
  };
}

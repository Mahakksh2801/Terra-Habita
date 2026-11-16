import { type LocalDate, addDays, eachDay, localDateOf } from "./dates";
import { applyMisses, statusFor, type BuildingStatus } from "./condition";
import { isScheduled } from "./schedule";

export interface NightlyHabit {
  id: string;
  mask: number;
  createdOn: LocalDate;
  /** Local day the habit was archived; it stops decaying from that day on. */
  archivedOn: LocalDate | null;
  completed: ReadonlySet<LocalDate>;
}

export interface NightlyBuilding {
  id: string;
  habitId: string | null;
  builtOn: LocalDate;
  condition: number;
}

export interface NightlyInput {
  now: Date;
  timeZone: string;
  /** Last local day already processed for this user (inclusive). */
  lastProcessedOn: LocalDate;
  habits: readonly NightlyHabit[];
  buildings: readonly NightlyBuilding[];
}

export interface NightlyPlan {
  /** New value for the user's lastProcessedOn; unchanged when nothing is due. */
  processedThrough: LocalDate;
  /** Missed scheduled days per habit in the processed window. */
  missed: Record<string, LocalDate[]>;
  updates: { id: string; condition: number; status: BuildingStatus }[];
}

/** Days in the window that count as misses for a habit. */
export function missedDays(habit: NightlyHabit, from: LocalDate, through: LocalDate): LocalDate[] {
  return eachDay(from, addDays(through, 1)).filter(
    (d) =>
      d >= habit.createdOn &&
      (habit.archivedOn === null || d < habit.archivedOn) &&
      isScheduled(d, habit.mask) &&
      !habit.completed.has(d),
  );
}

/**
 * Decay pass for one user. Safe to run as often as you like (e.g. hourly
 * across all users): it only handles local days that have fully ended and
 * that it has not handled before, and catches up if runs were skipped.
 * A building only suffers for misses on days after it was built.
 */
export function planNightly(input: NightlyInput): NightlyPlan {
  const yesterday = addDays(localDateOf(input.now, input.timeZone), -1);
  const from = addDays(input.lastProcessedOn, 1);
  if (from > yesterday) return { processedThrough: input.lastProcessedOn, missed: {}, updates: [] };

  const missed: Record<string, LocalDate[]> = {};
  for (const h of input.habits) {
    const days = missedDays(h, from, yesterday);
    if (days.length) missed[h.id] = days;
  }

  const updates: NightlyPlan["updates"] = [];
  for (const b of input.buildings) {
    if (!b.habitId || !missed[b.habitId]) continue;
    const count = missed[b.habitId].filter((d) => d > b.builtOn).length;
    if (!count) continue;
    const condition = applyMisses(b.condition, count);
    if (condition !== b.condition) updates.push({ id: b.id, condition, status: statusFor(condition) });
  }
  return { processedThrough: yesterday, missed, updates };
}

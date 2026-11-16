import { STREAK_MILESTONES } from "./config";
import { type LocalDate, addDays } from "./dates";
import { isScheduled } from "./schedule";

export interface StreakInput {
  completed: ReadonlySet<LocalDate>;
  mask: number;
  /** First local day the habit existed. Days before it never count. */
  createdOn: LocalDate;
  today: LocalDate;
}

export interface Streak {
  length: number;
  /** First day of the run, or null when length is 0. */
  startedOn: LocalDate | null;
}

/**
 * Current streak, counted in scheduled days. Today only breaks the streak once
 * it is over: an unfinished today is skipped rather than counted as a miss.
 * Unscheduled days neither extend nor break a streak.
 */
export function currentStreak({ completed, mask, createdOn, today }: StreakInput): Streak {
  let day = today;
  if (!completed.has(today)) day = addDays(today, -1);
  let length = 0;
  let startedOn: LocalDate | null = null;
  for (; day >= createdOn; day = addDays(day, -1)) {
    if (!isScheduled(day, mask)) continue;
    if (!completed.has(day)) break;
    length++;
    startedOn = day;
  }
  return { length, startedOn };
}

/** Longest run of completed scheduled days between createdOn and today. */
export function longestStreak({ completed, mask, createdOn, today }: StreakInput): number {
  let best = 0;
  let run = 0;
  for (let day = createdOn; day <= today; day = addDays(day, 1)) {
    if (!isScheduled(day, mask)) continue;
    if (completed.has(day)) {
      run++;
      if (run > best) best = run;
    } else if (day !== today) {
      run = 0;
    }
  }
  return best;
}

export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

/** Milestones whose threshold the streak passed when going from `before` to `after`. */
export function milestonesCrossed(before: number, after: number): StreakMilestone[] {
  return STREAK_MILESTONES.filter((m) => before < m.days && after >= m.days);
}

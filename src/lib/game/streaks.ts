import { STREAK_MILESTONES } from "./config";
import { type LocalDate, addDays, eachDay, mondayOf } from "./dates";
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
 * Unscheduled days neither extend nor break a streak (and cannot be ticked).
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

export interface FlexibleStreakInput {
  completed: ReadonlySet<LocalDate>;
  /** Days wanted per Monday-to-Sunday week. */
  target: number;
  createdOn: LocalDate;
  today: LocalDate;
}

/**
 * Current streak for an "any N days a week" habit: every completion in the
 * current unbroken run of weeks. This week never breaks the run while it is
 * still going; a finished week that fell short of its target does. The first
 * week only needs as many days as the habit existed for.
 */
export function currentStreakFlexible({ completed, target, createdOn, today }: FlexibleStreakInput): Streak {
  const thisMonday = mondayOf(today);
  const doneIn = (from: LocalDate, to: LocalDate) =>
    eachDay(from < createdOn ? createdOn : from, addDays(to, 1)).filter((d) => completed.has(d));

  const run = doneIn(thisMonday, today);
  let length = run.length;
  let startedOn: LocalDate | null = run[0] ?? null;

  for (let monday = addDays(thisMonday, -7); addDays(monday, 6) >= createdOn; monday = addDays(monday, -7)) {
    const available = eachDay(monday < createdOn ? createdOn : monday, addDays(monday, 7)).length;
    const done = doneIn(monday, addDays(monday, 6));
    if (done.length < Math.min(target, available)) break;
    length += done.length;
    startedOn = done[0];
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

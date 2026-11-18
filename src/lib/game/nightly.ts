import { type LocalDate, addDays, eachDay, localDateOf, weekdayOf } from "./dates";
import { applyDamage, damageForMiss, frequencyTier, statusFor, type BuildingStatus } from "./condition";
import { isScheduled } from "./schedule";

export interface NightlyHabit {
  id: string;
  mask: number;
  /** "Any N days a week" target. When set, whole Monday-to-Sunday weeks are judged instead of single days. */
  weeklyTarget?: number | null;
  createdOn: LocalDate;
  /** Local day the habit was archived; it stops being checked from that day on. */
  archivedOn: LocalDate | null;
  completed: ReadonlySet<LocalDate>;
  /** Consecutive scheduled days missed up to lastProcessedOn. */
  consecutiveMisses: number;
  lastMissedOn: LocalDate | null;
}

export interface NightlyBuilding {
  id: string;
  habitId: string | null;
  builtOn: LocalDate;
  condition: number;
  /** Milestone buildings (park, district hall, landmark) are never damaged. */
  isMilestone: boolean;
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
  /** New per-habit miss state, for habits whose state changed. */
  habitState: Record<string, { consecutiveMisses: number; lastMissedOn: LocalDate | null }>;
  /** Missed scheduled days per habit in the processed window. */
  missed: Record<string, LocalDate[]>;
  updates: { id: string; condition: number; status: BuildingStatus }[];
}

function isActiveDay(h: NightlyHabit, d: LocalDate): boolean {
  return d >= h.createdOn && (h.archivedOn === null || d < h.archivedOn) && isScheduled(d, h.mask);
}

/**
 * Damage pass for one user. Safe to run as often as you like (e.g. hourly
 * across all users): it only handles local days that have fully ended and
 * that it has not handled before, and catches up day by day if runs were skipped.
 *
 * Each habit tracks its run of consecutive missed scheduled days. When the run
 * reaches the habit's "half" step, its most recent standing building drops to
 * 50%; at the "ruin" step, that building is ruined. Further misses repeat the
 * cycle on the next most recent building.
 *
 * "Any N days a week" habits are judged once per finished Monday-to-Sunday
 * week: each day short of N counts as one more miss in a row.
 * `completed` must hold all of a habit's completions, not just recent ones.
 */
export function planNightly(input: NightlyInput): NightlyPlan {
  const yesterday = addDays(localDateOf(input.now, input.timeZone), -1);
  const from = addDays(input.lastProcessedOn, 1);
  const plan: NightlyPlan = { processedThrough: input.lastProcessedOn, habitState: {}, missed: {}, updates: [] };
  if (from > yesterday) return plan;
  plan.processedThrough = yesterday;

  const condition = new Map(input.buildings.map((b) => [b.id, b.condition]));
  const days = eachDay(from, addDays(yesterday, 1));

  for (const h of input.habits) {
    const tier = frequencyTier(h.mask, h.weeklyTarget);
    // Newest first, so "most recent" is the first match.
    const own = input.buildings
      .filter((b) => b.habitId === h.id && !b.isMilestone)
      .sort((a, b) => (a.builtOn < b.builtOn ? 1 : a.builtOn > b.builtOn ? -1 : 0));
    let run = h.consecutiveMisses;
    let lastMissedOn = h.lastMissedOn;

    /** Damage the most recent standing building built before `cutoff`. */
    const strike = (damage: ReturnType<typeof damageForMiss>, cutoff: LocalDate) => {
      if (!damage) return;
      const target = own.find((b) => b.builtOn < cutoff && condition.get(b.id)! > 0);
      if (target) condition.set(target.id, applyDamage(condition.get(target.id)!, damage));
    };

    for (const d of days) {
      if (h.weeklyTarget) {
        // Weeks are judged on Sunday night, once the whole week is over.
        if (weekdayOf(d) !== 0) continue;
        if (d < h.createdOn || (h.archivedOn !== null && h.archivedOn <= d)) continue;
        const monday = addDays(d, -6);
        // A habit started mid-week only owes the days it existed for.
        const available = eachDay(monday < h.createdOn ? h.createdOn : monday, addDays(d, 1));
        const done = available.filter((x) => h.completed.has(x)).length;
        const shortfall = Math.max(0, Math.min(h.weeklyTarget, available.length) - done);
        if (shortfall === 0) {
          run = 0;
          continue;
        }
        (plan.missed[h.id] ??= []).push(d);
        lastMissedOn = d;
        // Each day short counts as one miss in a row.
        for (let i = 0; i < shortfall; i++) {
          run++;
          strike(damageForMiss(run, tier), addDays(d, 1));
        }
        continue;
      }

      if (!isActiveDay(h, d)) continue;
      if (h.completed.has(d)) {
        run = 0;
        continue;
      }
      run++;
      lastMissedOn = d;
      (plan.missed[h.id] ??= []).push(d);
      // Damage always lands on the most recent building still standing.
      strike(damageForMiss(run, tier), d);
    }
    if (run !== h.consecutiveMisses || lastMissedOn !== h.lastMissedOn) {
      plan.habitState[h.id] = { consecutiveMisses: run, lastMissedOn };
    }
  }

  for (const b of input.buildings) {
    const c = condition.get(b.id)!;
    if (c !== b.condition) plan.updates.push({ id: b.id, condition: c, status: statusFor(c) });
  }
  return plan;
}

import { type LocalDate, addDays, eachDay, localDateOf } from "./dates";
import { applyDamage, damageForMiss, frequencyTier, statusFor, type BuildingStatus } from "./condition";
import { isScheduled } from "./schedule";

export interface NightlyHabit {
  id: string;
  mask: number;
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
    const tier = frequencyTier(h.mask);
    // Newest first, so "most recent" is the first match.
    const own = input.buildings
      .filter((b) => b.habitId === h.id && !b.isMilestone)
      .sort((a, b) => (a.builtOn < b.builtOn ? 1 : a.builtOn > b.builtOn ? -1 : 0));
    let run = h.consecutiveMisses;
    let lastMissedOn = h.lastMissedOn;

    for (const d of days) {
      if (!isActiveDay(h, d)) continue;
      if (h.completed.has(d)) {
        run = 0;
        continue;
      }
      run++;
      lastMissedOn = d;
      (plan.missed[h.id] ??= []).push(d);
      const damage = damageForMiss(run, tier);
      if (!damage) continue;
      // Damage always lands on the most recent building still standing.
      const target = own.find((b) => b.builtOn < d && condition.get(b.id)! > 0);
      if (target) condition.set(target.id, applyDamage(condition.get(target.id)!, damage));
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

import type { Db } from "@/lib/db";
import { addDays, localDateOf, planNightly, type LocalDate } from "@/lib/game";
import { fromDbDate, toDbDate } from "@/lib/day";
import { refreshAggregates } from "./settlements";

export interface NightlyResult {
  userId: string;
  processedThrough: LocalDate | null;
  missedDays: number;
  damaged: number;
}

/**
 * Apply every finished local day's misses for one user, in one serializable
 * transaction. Idempotent: days already processed are skipped, so it is safe to
 * call from the daily cron and again whenever the user opens the app.
 */
export async function runNightly(db: Db, userId: string, now = new Date()): Promise<NightlyResult> {
  return db.$transaction(
    async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const habits = await tx.habit.findMany({
        where: { userId },
        include: { completions: { select: { completedOn: true } } },
      });
      const result: NightlyResult = { userId, processedThrough: null, missedDays: 0, damaged: 0 };
      if (!habits.length) return result;

      // First run: start the day before the oldest habit, so nothing earlier is charged.
      const oldest = habits.map((h) => fromDbDate(h.createdOn)).sort()[0];
      const lastProcessedOn = user.lastProcessedOn ? fromDbDate(user.lastProcessedOn) : addDays(oldest, -1);
      const yesterday = addDays(localDateOf(now, user.timezone), -1);
      if (lastProcessedOn >= yesterday) return { ...result, processedThrough: lastProcessedOn };

      const buildings = await tx.building.findMany({
        where: { settlement: { userId }, habitId: { not: null } },
        select: { id: true, habitId: true, builtOn: true, condition: true, settlementId: true, milestone: { select: { id: true } } },
      });

      const plan = planNightly({
        now,
        timeZone: user.timezone,
        lastProcessedOn,
        habits: habits.map((h) => ({
          id: h.id,
          mask: h.frequency,
          weeklyTarget: h.weeklyTarget,
          createdOn: fromDbDate(h.createdOn),
          archivedOn: h.archivedOn ? fromDbDate(h.archivedOn) : null,
          completed: new Set(h.completions.map((c) => fromDbDate(c.completedOn))),
          consecutiveMisses: h.consecutiveMisses,
          lastMissedOn: h.lastMissedOn ? fromDbDate(h.lastMissedOn) : null,
        })),
        buildings: buildings.map((b) => ({
          id: b.id,
          habitId: b.habitId,
          builtOn: fromDbDate(b.builtOn),
          condition: b.condition,
          isMilestone: b.milestone !== null,
        })),
      });

      for (const [id, s] of Object.entries(plan.habitState)) {
        await tx.habit.update({
          where: { id },
          data: { consecutiveMisses: s.consecutiveMisses, lastMissedOn: s.lastMissedOn ? toDbDate(s.lastMissedOn) : null },
        });
      }
      for (const u of plan.updates) {
        await tx.building.update({ where: { id: u.id }, data: { condition: u.condition, status: u.status } });
      }
      if (plan.updates.length) {
        const touched = new Set(plan.updates.map((u) => u.id));
        await refreshAggregates(tx, buildings.filter((b) => touched.has(b.id)).map((b) => b.settlementId));
      }
      await tx.user.update({ where: { id: userId }, data: { lastProcessedOn: toDbDate(plan.processedThrough) } });

      return {
        userId,
        processedThrough: plan.processedThrough,
        missedDays: Object.values(plan.missed).reduce((n, d) => n + d.length, 0),
        damaged: plan.updates.length,
      };
    },
    { isolationLevel: "Serializable" },
  );
}

/** Run the nightly pass for every user; one user's failure doesn't stop the rest. */
export async function runNightlyForAll(db: Db, now = new Date()) {
  const users = await db.user.findMany({ select: { id: true } });
  const results: (NightlyResult | { userId: string; error: string })[] = [];
  for (const { id } of users) {
    try {
      results.push(await runNightly(db, id, now));
    } catch (e) {
      results.push({ userId: id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}

/**
 * Bring a user's city up to date before showing it, in case the daily cron
 * hasn't run yet. Never blocks the page: a failure is logged and retried next time.
 */
export async function catchUp(db: Db, userId: string, now = new Date()) {
  try {
    await runNightly(db, userId, now);
  } catch (e) {
    console.error("nightly catch-up failed", e);
  }
}

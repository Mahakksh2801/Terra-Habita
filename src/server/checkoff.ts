import { Prisma } from "@prisma/client";
import type { Db } from "@/lib/db";
import {
  CompletionRejected, type CompletionError, type HabitCategory, cellKey, localDateOf, planCompletion,
} from "@/lib/game";
import { fromDbDate, toDbDate } from "@/lib/day";
import { NotFound } from "./habits";
import { ensureActiveCity, promoteIfFull, refreshAggregates } from "./settlements";

export type CheckoffResult =
  | {
      ok: true;
      built: { type: string; milestone: string | null }[];
      repaired: number;
      streak: number;
      settlement: string;
      foundedCity: string | null;
    }
  | { ok: false; reason: CompletionError };

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** Complete a habit for today: one transaction that builds, repairs, awards and promotes. */
export async function completeHabit(db: Db, userId: string, habitId: string, now = new Date()): Promise<CheckoffResult> {
  try {
    return await db.$transaction(
      async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        const habit = await tx.habit.findFirst({ where: { id: habitId, userId } });
        if (!habit) throw new NotFound("habit not found");
        const today = localDateOf(now, user.timezone);

        const city = await ensureActiveCity(tx, userId, today);
        const [completions, cells, damaged] = await Promise.all([
          tx.completion.findMany({ where: { habitId }, select: { completedOn: true } }),
          tx.building.findMany({ where: { settlementId: city.id }, select: { gridX: true, gridY: true } }),
          tx.building.findMany({
            where: { habitId, condition: { lt: 100 }, milestone: { is: null } },
            select: { id: true, condition: true, settlementId: true },
          }),
        ]);

        const plan = planCompletion({
          habit: {
            id: habit.id,
            category: habit.category as HabitCategory,
            mask: habit.frequency,
            weeklyTarget: habit.weeklyTarget,
            createdOn: fromDbDate(habit.createdOn),
            archived: habit.archivedAt !== null,
          },
          date: today,
          today,
          completed: new Set(completions.map((c) => fromDbDate(c.completedOn))),
          lastMissedOn: habit.lastMissedOn ? fromDbDate(habit.lastMissedOn) : null,
          habitBuildings: damaged,
          gridSize: city.gridSize,
          occupied: new Set(cells.map((c) => cellKey({ x: c.gridX, y: c.gridY }))),
        });

        const day = toDbDate(today);
        const completion = await tx.completion.create({ data: { habitId, completedOn: day } });
        for (const b of plan.buildings) {
          const building = await tx.building.create({
            data: {
              settlementId: city.id,
              habitId,
              completionId: b.milestone ? null : completion.id,
              gridX: b.x,
              gridY: b.y,
              type: b.type,
              color: b.milestone ? null : habit.color,
              builtOn: day,
              lastMaintainedOn: day,
            },
          });
          const m = b.milestone && plan.milestones.find((x) => x.type === b.milestone);
          if (m) {
            await tx.milestone.create({
              data: {
                userId,
                habitId,
                type: m.type,
                streakStartedOn: toDbDate(m.streakStartedOn),
                unlockedOn: day,
                buildingId: building.id,
              },
            });
          }
        }
        for (const r of plan.repairs) {
          await tx.building.update({
            where: { id: r.id },
            data: { condition: r.condition, status: r.status, lastMaintainedOn: day },
          });
        }
        await tx.user.update({ where: { id: userId }, data: { totalCompletions: { increment: 1 } } });

        const touched = new Set([city.id, ...damaged.filter((d) => plan.repairs.some((r) => r.id === d.id)).map((d) => d.settlementId)]);
        await refreshAggregates(tx, touched);
        const newCity = await promoteIfFull(tx, userId, city.id, today);

        return {
          ok: true as const,
          built: plan.buildings.map((b) => ({ type: b.type, milestone: b.milestone })),
          repaired: plan.repairs.length,
          streak: plan.streak,
          settlement: city.name,
          foundedCity: newCity?.name ?? null,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (e) {
    if (e instanceof CompletionRejected) return { ok: false, reason: e.reason };
    // A double click racing itself: the unique (habit, day) index decides.
    if (isUniqueViolation(e)) return { ok: false, reason: "already_done" };
    throw e;
  }
}

/**
 * Undo today's completion: removes the building it raised and any milestone
 * (and milestone building) it unlocked today. Repairs it triggered are kept.
 */
export async function uncompleteHabit(db: Db, userId: string, habitId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const habit = await tx.habit.findFirst({ where: { id: habitId, userId } });
    if (!habit) throw new NotFound("habit not found");
    const day = toDbDate(localDateOf(now, user.timezone));

    const completion = await tx.completion.findUnique({ where: { habitId_completedOn: { habitId, completedOn: day } } });
    if (!completion) return { ok: false as const };

    const milestones = await tx.milestone.findMany({ where: { habitId, unlockedOn: day } });
    const removed = await tx.building.findMany({
      where: {
        OR: [{ completionId: completion.id }, { id: { in: milestones.flatMap((m) => (m.buildingId ? [m.buildingId] : [])) } }],
      },
      select: { id: true, settlementId: true },
    });
    await tx.milestone.deleteMany({ where: { id: { in: milestones.map((m) => m.id) } } });
    await tx.building.deleteMany({ where: { id: { in: removed.map((b) => b.id) } } });
    await tx.completion.delete({ where: { id: completion.id } });
    await tx.user.update({ where: { id: userId }, data: { totalCompletions: { decrement: 1 } } });
    await refreshAggregates(tx, removed.map((b) => b.settlementId));
    return { ok: true as const };
  });
}

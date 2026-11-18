import { z } from "zod";
import type { Db, Tx } from "@/lib/db";
import { EVERY_DAY, HABIT_CATEGORIES, isValidMask, localDateOf } from "@/lib/game";
import { toDbDate } from "@/lib/day";

export const habitInput = z
  .object({
    name: z.string().trim().min(1, "Give the habit a name").max(80, "Keep the name under 80 characters"),
    category: z.enum(HABIT_CATEGORIES),
    /** Weekday mask for fixed-day habits. Ignored when weeklyTarget is set. */
    frequency: z.number().int(),
    /** "Any N days a week", 1 to 6. Leave out for fixed days. */
    weeklyTarget: z.number().int().min(1, "Pick 1 to 6 days a week").max(6, "Pick 1 to 6 days a week").nullish(),
  })
  .superRefine((v, ctx) => {
    if (!v.weeklyTarget && !isValidMask(v.frequency)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["frequency"], message: "Pick at least one day" });
    }
  })
  .transform((v) => ({ ...v, weeklyTarget: v.weeklyTarget ?? null, frequency: v.weeklyTarget ? EVERY_DAY : v.frequency }));
export type HabitInput = z.input<typeof habitInput>;

export class NotFound extends Error {}

async function ownedHabit(db: Db | Tx, userId: string, habitId: string) {
  const habit = await db.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) throw new NotFound("habit not found");
  return habit;
}

export async function listHabits(db: Db, userId: string, { archived = false } = {}) {
  return db.habit.findMany({
    where: { userId, archivedAt: archived ? { not: null } : null },
    orderBy: { createdAt: "asc" },
  });
}

export async function getHabit(db: Db, userId: string, habitId: string) {
  return ownedHabit(db, userId, habitId);
}

export async function createHabit(db: Db, userId: string, input: HabitInput, now = new Date()) {
  const data = habitInput.parse(input);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } });
  return db.habit.create({
    data: { ...data, userId, createdOn: toDbDate(localDateOf(now, user.timezone)) },
  });
}

/** Name, category and schedule can change; past completions and buildings are kept. */
export async function updateHabit(db: Db, userId: string, habitId: string, input: HabitInput) {
  const data = habitInput.parse(input);
  await ownedHabit(db, userId, habitId);
  return db.habit.update({ where: { id: habitId }, data });
}

/** Archived habits leave the checklist, stop being checked for misses, and keep their buildings. */
export async function setArchived(db: Db, userId: string, habitId: string, archived: boolean, now = new Date()) {
  const habit = await ownedHabit(db, userId, habitId);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } });
  if (archived === (habit.archivedAt !== null)) return habit;
  return db.habit.update({
    where: { id: habitId },
    data: archived
      ? { archivedAt: now, archivedOn: toDbDate(localDateOf(now, user.timezone)) }
      : // Coming back starts a fresh miss count, so the archived stretch is never charged.
        { archivedAt: null, archivedOn: null, consecutiveMisses: 0 },
  });
}

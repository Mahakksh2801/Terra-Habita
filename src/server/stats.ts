import type { Db } from "@/lib/db";
import {
  buildHeatmap, currentStreak, currentStreakFlexible, localDateOf, longestStreak, STREAK_MILESTONES, type LocalDate,
} from "@/lib/game";
import { fromDbDate } from "@/lib/day";

const MILESTONE_NAME: Record<string, string> = Object.fromEntries(
  STREAK_MILESTONES.map((m) => [m.type, `${m.days}-day streak · ${m.building.replace(/_/g, " ")}`]),
);

/** Everything the stats page shows, for the user's local today. */
export async function getStats(db: Db, userId: string, now = new Date()) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const today: LocalDate = localDateOf(now, user.timezone);
  const [habits, milestones, settlements] = await Promise.all([
    db.habit.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { completions: { select: { completedOn: true } } },
    }),
    db.milestone.findMany({ where: { userId }, orderBy: { unlockedOn: "desc" }, include: { habit: { select: { name: true } } } }),
    db.settlement.groupBy({ by: ["level"], where: { userId }, _count: { _all: true } }),
  ]);

  const perDay = new Map<LocalDate, number>();
  const rows = habits.map((h) => {
    const completed = new Set(h.completions.map((c) => fromDbDate(c.completedOn)));
    for (const d of completed) perDay.set(d, (perDay.get(d) ?? 0) + 1);
    const createdOn = fromDbDate(h.createdOn);
    const current = h.weeklyTarget
      ? currentStreakFlexible({ completed, target: h.weeklyTarget, createdOn, today }).length
      : currentStreak({ completed, mask: h.frequency, createdOn, today }).length;
    return {
      id: h.id,
      name: h.name,
      archived: h.archivedAt !== null,
      weeklyTarget: h.weeklyTarget,
      total: completed.size,
      current,
      // Longest run of scheduled days; flexible habits count their current run of weeks.
      longest: h.weeklyTarget ? current : longestStreak({ completed, mask: h.frequency, createdOn, today }),
    };
  });

  return {
    today,
    totalCompletions: user.totalCompletions,
    heatmap: buildHeatmap(perDay, today, 26),
    habits: rows,
    milestones: milestones.map((m) => ({
      id: m.id,
      label: MILESTONE_NAME[m.type] ?? m.type,
      habit: m.habit?.name ?? "Deleted habit",
      unlockedOn: fromDbDate(m.unlockedOn),
    })),
    settlements: Object.fromEntries(settlements.map((s) => [s.level, s._count._all])) as Partial<Record<string, number>>,
  };
}

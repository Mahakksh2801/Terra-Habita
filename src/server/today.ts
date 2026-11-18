import type { Db } from "@/lib/db";
import { currentStreak, currentStreakFlexible, isScheduled, localDateOf, mondayOf, type LocalDate } from "@/lib/game";
import { fromDbDate } from "@/lib/day";

export interface TodayHabit {
  id: string;
  name: string;
  category: string;
  frequency: number;
  /** "Any N days a week" target, or null for fixed days. */
  weeklyTarget: number | null;
  /** Days done so far in the current Monday-to-Sunday week. */
  weekDone: number;
  scheduledToday: boolean;
  doneToday: boolean;
  streak: number;
}

/** Everything the dashboard shows, computed for the user's local today. */
export async function getToday(db: Db, userId: string, now = new Date()) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const today: LocalDate = localDateOf(now, user.timezone);
  const [habits, city] = await Promise.all([
    db.habit.findMany({
      where: { userId, archivedAt: null },
      orderBy: { createdAt: "asc" },
      include: { completions: { select: { completedOn: true } } },
    }),
    db.settlement.findFirst({ where: { userId, isActive: true } }),
  ]);

  const items: TodayHabit[] = habits.map((h) => {
    const completed = new Set(h.completions.map((c) => fromDbDate(c.completedOn)));
    return {
      id: h.id,
      name: h.name,
      category: h.category,
      frequency: h.frequency,
      weeklyTarget: h.weeklyTarget,
      weekDone: [...completed].filter((d) => d >= mondayOf(today) && d <= today).length,
      scheduledToday: isScheduled(today, h.frequency),
      doneToday: completed.has(today),
      streak: (h.weeklyTarget
        ? currentStreakFlexible({ completed, target: h.weeklyTarget, createdOn: fromDbDate(h.createdOn), today })
        : currentStreak({ completed, mask: h.frequency, createdOn: fromDbDate(h.createdOn), today })
      ).length,
    };
  });

  return {
    today,
    timezone: user.timezone,
    timezoneConfirmed: user.timezoneConfirmed,
    totalCompletions: user.totalCompletions,
    habits: items,
    city: city && {
      name: city.name,
      buildingCount: city.buildingCount,
      healthyCount: city.healthyCount,
      decayingCount: city.decayingCount,
      ruinedCount: city.ruinedCount,
    },
  };
}

export async function setTimezone(db: Db, userId: string, timezone: string) {
  return db.user.update({ where: { id: userId }, data: { timezone, timezoneConfirmed: true } });
}

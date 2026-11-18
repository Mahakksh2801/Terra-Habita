import { describe, expect, it } from "vitest";
import { addDays, eachDay } from "../dates";
import { EVERY_DAY, WEEKDAYS, isScheduled, maskFromWeekdays } from "../schedule";
import { currentStreak, currentStreakFlexible, longestStreak, milestonesCrossed } from "../streaks";

const today = "2026-11-16"; // Monday
const run = (from: string, n: number) => new Set(eachDay(from, addDays(from, n)));

describe("schedule mask", () => {
  it("encodes weekdays", () => {
    expect(maskFromWeekdays([1, 2, 3, 4, 5])).toBe(WEEKDAYS);
    expect(isScheduled("2026-11-15", WEEKDAYS)).toBe(false); // Sunday
    expect(isScheduled("2026-11-16", WEEKDAYS)).toBe(true);
    expect(() => maskFromWeekdays([7])).toThrow();
  });
});

describe("currentStreak", () => {
  const base = { mask: EVERY_DAY, createdOn: "2026-01-01", today };
  it("counts today when done", () => {
    expect(currentStreak({ ...base, completed: run("2026-11-10", 7) })).toEqual({ length: 7, startedOn: "2026-11-10" });
  });
  it("does not break on an unfinished today", () => {
    expect(currentStreak({ ...base, completed: run("2026-11-10", 6) }).length).toBe(6);
  });
  it("breaks on a missed yesterday", () => {
    expect(currentStreak({ ...base, completed: run("2026-11-10", 5) }).length).toBe(0);
  });
  it("skips unscheduled days", () => {
    // Weekdays only: Mon 9th … Fri 13th, then Mon 16th. Weekend is not a miss.
    const done = new Set([...eachDay("2026-11-09", "2026-11-14"), today]);
    expect(currentStreak({ ...base, mask: WEEKDAYS, completed: done }).length).toBe(6);
  });
  it("does not count days before the habit existed", () => {
    expect(currentStreak({ ...base, createdOn: "2026-11-14", completed: run("2026-11-10", 7) }).length).toBe(3);
  });
  it("is zero with no completions", () => {
    expect(currentStreak({ ...base, completed: new Set() })).toEqual({ length: 0, startedOn: null });
  });
});

describe("longestStreak", () => {
  it("finds the best run", () => {
    const done = new Set([...run("2026-10-01", 12), ...run("2026-11-10", 7)]);
    expect(longestStreak({ completed: done, mask: EVERY_DAY, createdOn: "2026-10-01", today })).toBe(12);
  });
});

describe("milestonesCrossed", () => {
  it("unlocks 7, 30 and 100 exactly when reached", () => {
    expect(milestonesCrossed(6, 7).map((m) => m.building)).toEqual(["park"]);
    expect(milestonesCrossed(7, 8)).toEqual([]);
    expect(milestonesCrossed(29, 30).map((m) => m.building)).toEqual(["district_hall"]);
    expect(milestonesCrossed(99, 100).map((m) => m.building)).toEqual(["landmark"]);
  });
  it("can unlock several at once", () => {
    expect(milestonesCrossed(0, 30).map((m) => m.days)).toEqual([7, 30]);
  });
});

describe("currentStreakFlexible (any N days a week)", () => {
  const base = { target: 4, createdOn: "2026-10-01", today: "2026-11-18" }; // Wednesday
  const days = (...d: string[]) => new Set(d);

  it("counts every completion in the unbroken run of weeks", () => {
    const completed = days(
      "2026-11-16", "2026-11-17", // this week so far
      "2026-11-09", "2026-11-11", "2026-11-13", "2026-11-14", // last week hit 4
      "2026-11-03", "2026-11-05", "2026-11-06", // the week before fell short
    );
    expect(currentStreakFlexible({ ...base, completed })).toEqual({ length: 6, startedOn: "2026-11-09" });
  });

  it("a finished week that fell short breaks the run", () => {
    const completed = days("2026-11-16", "2026-11-09", "2026-11-11", "2026-11-13");
    expect(currentStreakFlexible({ ...base, completed })).toEqual({ length: 1, startedOn: "2026-11-16" });
  });

  it("the week in progress never breaks it", () => {
    const completed = days("2026-11-09", "2026-11-10", "2026-11-12", "2026-11-13");
    expect(currentStreakFlexible({ ...base, completed }).length).toBe(4);
  });

  it("is zero with nothing done", () => {
    expect(currentStreakFlexible({ ...base, completed: days() })).toEqual({ length: 0, startedOn: null });
  });

  it("a habit started mid-week only owes the days it existed for", () => {
    // Created Saturday the 14th: only 2 days in its first week, and it did both.
    const completed = days("2026-11-14", "2026-11-15", "2026-11-16");
    expect(currentStreakFlexible({ ...base, createdOn: "2026-11-14", completed }).length).toBe(3);
  });
});

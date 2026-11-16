import { describe, expect, it } from "vitest";
import { addDays, eachDay } from "../dates";
import { EVERY_DAY, WEEKDAYS, isScheduled, maskFromWeekdays } from "../schedule";
import { currentStreak, longestStreak, milestonesCrossed } from "../streaks";

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

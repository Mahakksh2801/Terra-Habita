import { describe, expect, it } from "vitest";
import { addDays, eachDay } from "../dates";
import { CompletionRejected, cleanStreakDone, offDayReason, planCompletion, type CompletionInput } from "../completion";
import { EVERY_DAY, maskFromWeekdays } from "../schedule";
import { cellKey, spiralOrder } from "../placement";

const today = "2026-11-16";
const input = (over: Partial<CompletionInput> = {}): CompletionInput => ({
  habit: { id: "h", category: "body", mask: EVERY_DAY, createdOn: "2026-01-01", archived: false },
  date: today,
  today,
  completed: new Set(),
  lastMissedOn: null,
  habitBuildings: [],
  gridSize: 24,
  occupied: new Set(),
  ...over,
});

describe("planCompletion", () => {
  it("places one building of the habit's type at the next free cell", () => {
    const plan = planCompletion(input());
    expect(plan.buildings).toEqual([{ ...spiralOrder(24)[0], type: "gym", milestone: null }]);
    expect(plan.repairs).toEqual([]);
    expect(plan.streak).toBe(1);
  });

  describe("repair after a clean 7 days", () => {
    const damaged = [{ id: "a", condition: 100 }, { id: "b", condition: 50 }, { id: "c", condition: 0 }];
    const lastMissedOn = addDays(today, -7);

    it("repairs everything on the 7th clean day after the last miss", () => {
      const completed = new Set(eachDay(addDays(today, -6), today));
      const plan = planCompletion(input({ completed, lastMissedOn, habitBuildings: damaged }));
      expect(plan.repairs).toEqual([
        { id: "b", condition: 100, status: "healthy" },
        { id: "c", condition: 100, status: "healthy" },
      ]);
      // Still builds today's building, and the 7-day streak earns a park too.
      expect(plan.buildings.map((b) => b.type)).toEqual(["gym", "park"]);
    });

    it("does not repair before the 7 days are up", () => {
      const completed = new Set(eachDay(addDays(today, -5), today));
      const plan = planCompletion(input({ completed, lastMissedOn: addDays(today, -6), habitBuildings: damaged }));
      expect(plan.repairs).toEqual([]);
    });

    it("for fewer-days habits, only scheduled days in the 7 need doing", () => {
      // Mon/Wed/Fri habit; last miss Mon 9th; window 10th–16th has Wed, Fri, Mon.
      const mask = maskFromWeekdays([1, 3, 5]);
      const plan = planCompletion(
        input({
          habit: { id: "h", category: "body", mask, createdOn: "2026-01-01", archived: false },
          completed: new Set(["2026-11-11", "2026-11-13"]),
          lastMissedOn: "2026-11-09",
          habitBuildings: damaged,
        }),
      );
      expect(plan.repairs.map((r) => r.id)).toEqual(["b", "c"]);
    });
  });

  it("cleanStreakDone needs every scheduled day in the window", () => {
    expect(cleanStreakDone(EVERY_DAY, "2026-11-09", new Set(eachDay("2026-11-10", "2026-11-16")))).toBe(false);
    expect(cleanStreakDone(EVERY_DAY, "2026-11-09", new Set(eachDay("2026-11-10", "2026-11-17")))).toBe(true);
  });

  it("unlocks a park on the 7th day, placed next to the new building", () => {
    const completed = new Set(eachDay(addDays(today, -6), today));
    const plan = planCompletion(input({ completed }));
    expect(plan.streak).toBe(7);
    expect(plan.milestones).toEqual([{ type: "streak_7", streakStartedOn: addDays(today, -6) }]);
    expect(plan.buildings.map((b) => b.type)).toEqual(["gym", "park"]);
    expect(cellKey(plan.buildings[1])).toBe(cellKey(spiralOrder(24)[1]));
  });

  it("does not re-award on day 8", () => {
    const completed = new Set(eachDay(addDays(today, -7), today));
    expect(planCompletion(input({ completed })).milestones).toEqual([]);
  });

  it("builds exactly one same-size building per completion, however many came before", () => {
    const early = planCompletion(input()).buildings[0];
    const late = planCompletion(input({ completed: new Set(eachDay("2026-01-01", today).filter((d) => d < "2026-11-09")) })).buildings[0];
    expect(Object.keys(early).sort()).toEqual(["milestone", "type", "x", "y"]);
    expect(Object.keys(late).sort()).toEqual(Object.keys(early).sort());
  });

  describe("off days build nothing", () => {
    // Mon/Tue/Thu/Fri habit. 2026-11-16 is a Monday, the 18th a Wednesday.
    const mask = maskFromWeekdays([1, 2, 4, 5]);
    const habit = { id: "h", category: "body" as const, mask, createdOn: "2026-01-01", archived: false };

    it("builds on a scheduled day", () => {
      expect(planCompletion(input({ habit })).buildings).toHaveLength(1);
    });

    it("rejects ticking an unscheduled day", () => {
      expect(() => planCompletion(input({ habit, today: "2026-11-18", date: "2026-11-18" }))).toThrow(
        expect.objectContaining({ reason: "off_day" }) as unknown as CompletionRejected,
      );
      expect(offDayReason(habit, "2026-11-22", new Set())).toBe("off_day"); // Sunday
      expect(offDayReason(habit, "2026-11-20", new Set())).toBeNull(); // Friday
    });

    it("so a 4-day habit raises at most 4 buildings a week", () => {
      const week = eachDay("2026-11-16", "2026-11-23");
      const built = week.filter((d) => offDayReason(habit, d, new Set()) === null);
      expect(built).toEqual(["2026-11-16", "2026-11-17", "2026-11-19", "2026-11-20"]);
    });
  });

  it.each([
    ["archived", { habit: { id: "h", category: "body", mask: EVERY_DAY, createdOn: "2026-01-01", archived: true } }],
    ["future", { date: addDays(today, 1) }],
    ["too_old", { date: addDays(today, -1) }],
    ["already_done", { completed: new Set([today]) }],
    ["grid_full", { gridSize: 1, occupied: new Set(["0,0"]) }],
  ] as const)("rejects %s", (reason, over) => {
    expect(() => planCompletion(input(over as Partial<CompletionInput>))).toThrow(
      expect.objectContaining({ reason }) as unknown as CompletionRejected,
    );
  });
});

describe("any N days a week habits", () => {
  const flexible = { id: "h", category: "body" as const, mask: EVERY_DAY, weeklyTarget: 4, createdOn: "2026-01-01", archived: false };
  const damaged = [{ id: "a", condition: 50 }];

  it("can be completed on any day and builds a building", () => {
    const plan = planCompletion(input({ habit: flexible }));
    expect(plan.buildings).toHaveLength(1);
    expect(plan.streak).toBe(1);
  });

  it("stops at N buildings a week: the 5th day of a 4-day habit is blocked", () => {
    // Week of Mon 16th: Mon, Tue, Wed, Thu done; Friday is the 5th.
    const completed = new Set(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"]);
    expect(() => planCompletion(input({ habit: flexible, completed, today: "2026-11-20", date: "2026-11-20" }))).toThrow(
      expect.objectContaining({ reason: "week_full" }) as unknown as CompletionRejected,
    );
    // Three done: the 4th still builds.
    completed.delete("2026-11-19");
    expect(planCompletion(input({ habit: flexible, completed, today: "2026-11-20", date: "2026-11-20" })).buildings).toHaveLength(1);
    // A new week starts fresh on Monday.
    expect(offDayReason(flexible, "2026-11-23", new Set([...completed, "2026-11-19", "2026-11-20"]))).toBeNull();
  });

  it("repairs when the week after the last miss reaches its target", () => {
    // Last miss Mon 9th; window Tue 10th to Mon 16th (today). 3 done + today = 4.
    const completed = new Set(["2026-11-10", "2026-11-12", "2026-11-14"]);
    const plan = planCompletion(input({ habit: flexible, completed, lastMissedOn: "2026-11-09", habitBuildings: damaged }));
    expect(plan.repairs).toEqual([{ id: "a", condition: 100, status: "healthy" }]);
  });

  it("does not repair a day early", () => {
    const completed = new Set(["2026-11-10", "2026-11-12"]);
    const plan = planCompletion(input({ habit: flexible, completed, lastMissedOn: "2026-11-09", habitBuildings: damaged }));
    expect(plan.repairs).toEqual([]);
  });

  it("cleanStreakDone only needs N days in the week", () => {
    const some = new Set(["2026-11-17", "2026-11-18", "2026-11-20", "2026-11-22"]);
    expect(cleanStreakDone(EVERY_DAY, "2026-11-15", some, 4)).toBe(true);
    expect(cleanStreakDone(EVERY_DAY, "2026-11-15", some, 5)).toBe(false);
    expect(cleanStreakDone(EVERY_DAY, "2026-11-15", some)).toBe(false); // an every-day habit needs all 7
  });

  it("earns the park after 7 completions in an unbroken run of weeks", () => {
    // Last week: Mon–Thu (4, hits target). This week: Mon–Sat done before today (Sunday... use Wed 18th).
    const completed = new Set(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-16", "2026-11-17"]);
    const plan = planCompletion(input({ habit: flexible, completed, today: "2026-11-18", date: "2026-11-18" }));
    expect(plan.streak).toBe(7);
    expect(plan.buildings.map((b) => b.type)).toEqual(["gym", "park"]);
  });
});

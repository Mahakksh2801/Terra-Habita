import { describe, expect, it } from "vitest";
import { planNightly, type NightlyBuilding, type NightlyHabit, type NightlyInput } from "../nightly";
import { EVERY_DAY, WEEKDAYS, maskFromWeekdays } from "../schedule";

// 2026-11-16 is a Monday; at 06:00Z it is the 16th in UTC.
const now = new Date("2026-11-16T06:00:00Z");
const habit: NightlyHabit = {
  id: "h", mask: EVERY_DAY, createdOn: "2026-11-01", archivedOn: null,
  completed: new Set(), consecutiveMisses: 0, lastMissedOn: null,
};
const b = (id: string, builtOn: string, condition = 100, isMilestone = false): NightlyBuilding =>
  ({ id, habitId: "h", builtOn, condition, isMilestone });
const older = b("old", "2026-11-05");
const newest = b("new", "2026-11-10");
const base: NightlyInput = { now, timeZone: "UTC", lastProcessedOn: "2026-11-14", habits: [habit], buildings: [older, newest] };
const cond = (plan: ReturnType<typeof planNightly>, id: string) => plan.updates.find((u) => u.id === id)?.condition;

describe("every-day habit (5+ days a week)", () => {
  it("one missed day does no damage but is remembered", () => {
    const plan = planNightly({ ...base, lastProcessedOn: "2026-11-14" , habits: [{ ...habit, completed: new Set(["2026-11-14"]) }] });
    expect(plan.updates).toEqual([]);
    expect(plan.habitState.h).toEqual({ consecutiveMisses: 1, lastMissedOn: "2026-11-15" });
  });

  it("two consecutive misses take the most recent building to 50%", () => {
    const plan = planNightly({ ...base, lastProcessedOn: "2026-11-13" });
    expect(plan.updates).toEqual([{ id: "new", condition: 50, status: "decaying" }]);
  });

  it("three consecutive misses ruin it, leaving older buildings alone", () => {
    const plan = planNightly({ ...base, lastProcessedOn: "2026-11-12" });
    expect(plan.updates).toEqual([{ id: "new", condition: 0, status: "ruined" }]);
  });

  it("works the same when the job runs once per day", () => {
    const day1 = planNightly({ ...base, now: new Date("2026-11-14T06:00:00Z"), lastProcessedOn: "2026-11-12" });
    expect(day1.updates).toEqual([]);
    const day2 = planNightly({
      ...base, now: new Date("2026-11-15T06:00:00Z"), lastProcessedOn: day1.processedThrough,
      habits: [{ ...habit, ...day1.habitState.h }],
    });
    expect(cond(day2, "new")).toBe(50);
    const day3 = planNightly({
      ...base, lastProcessedOn: day2.processedThrough,
      habits: [{ ...habit, ...day2.habitState.h }], buildings: [older, { ...newest, condition: 50 }],
    });
    expect(day3.updates).toEqual([{ id: "new", condition: 0, status: "ruined" }]);
  });

  it("a long absence moves on to the next most recent building", () => {
    const plan = planNightly({ ...base, lastProcessedOn: "2026-11-09", buildings: [older, b("new", "2026-11-08")] });
    // 6 misses (10th–15th): new → ruined, then old → ruined.
    expect(cond(plan, "new")).toBe(0);
    expect(cond(plan, "old")).toBe(0);
  });

  it("a completion in between resets the count", () => {
    const plan = planNightly({ ...base, lastProcessedOn: "2026-11-11", habits: [{ ...habit, completed: new Set(["2026-11-13"]) }] });
    // Misses: 12th (1), then done 13th, then 14th, 15th (2) → 50%.
    expect(plan.updates).toEqual([{ id: "new", condition: 50, status: "decaying" }]);
  });

  it("weekday habits: Friday and Monday misses are consecutive, weekends do not count", () => {
    const weekdays = { ...habit, mask: WEEKDAYS };
    const now2 = new Date("2026-11-17T06:00:00Z"); // Mon 16th has ended
    const plan = planNightly({ ...base, now: now2, lastProcessedOn: "2026-11-12", habits: [weekdays] });
    expect(plan.missed.h).toEqual(["2026-11-13", "2026-11-16"]);
    expect(cond(plan, "new")).toBe(50);
  });

  it("never damages milestone buildings", () => {
    const park = b("park", "2026-11-12", 100, true);
    const plan = planNightly({ ...base, lastProcessedOn: "2026-11-12", buildings: [older, newest, park] });
    expect(cond(plan, "park")).toBeUndefined();
    expect(cond(plan, "new")).toBe(0);
  });
});

describe("habit under 5 days a week", () => {
  const fourDays = { ...habit, mask: maskFromWeekdays([1, 3, 5, 6]) }; // Mon, Wed, Fri, Sat

  it("one miss takes the most recent building to 50%", () => {
    const plan = planNightly({ ...base, lastProcessedOn: "2026-11-13", habits: [{ ...fourDays, completed: new Set() }] });
    // Only Sat 14th is scheduled in the window.
    expect(plan.missed.h).toEqual(["2026-11-14"]);
    expect(plan.updates).toEqual([{ id: "new", condition: 50, status: "decaying" }]);
  });

  it("two consecutive scheduled misses ruin it", () => {
    const plan = planNightly({ ...base, lastProcessedOn: "2026-11-12", habits: [fourDays] });
    expect(plan.missed.h).toEqual(["2026-11-13", "2026-11-14"]);
    expect(cond(plan, "new")).toBe(0);
  });
});

describe("bookkeeping", () => {
  it("is idempotent within a day", () => {
    const plan = planNightly({ ...base, lastProcessedOn: "2026-11-15" });
    expect(plan).toEqual({ processedThrough: "2026-11-15", habitState: {}, missed: {}, updates: [] });
  });

  it("uses the user's timezone to decide which days are over", () => {
    // At 03:00Z it is still 22:00 on 15 Nov in New York, so only the 14th has ended.
    const late = new Date("2026-11-16T03:00:00Z");
    expect(planNightly({ ...base, now: late, timeZone: "America/New_York" }).processedThrough).toBe("2026-11-14");
    expect(planNightly({ ...base, now: late, timeZone: "Asia/Kolkata" }).processedThrough).toBe("2026-11-15");
  });

  it("ignores days before creation and after archiving", () => {
    const plan = planNightly({ ...base, lastProcessedOn: "2026-10-25", habits: [{ ...habit, archivedOn: "2026-11-03" }] });
    expect(plan.missed.h).toEqual(["2026-11-01", "2026-11-02"]);
  });

  it("does not damage buildings built after the miss", () => {
    const plan = planNightly({ ...base, lastProcessedOn: "2026-11-12", buildings: [older, b("new", "2026-11-15")] });
    expect(cond(plan, "new")).toBeUndefined();
    expect(cond(plan, "old")).toBe(0);
  });
});

describe("any N days a week habits", () => {
  // Week under test: Mon 2026-11-16 to Sun 2026-11-22. The job runs Monday morning.
  const monday = new Date("2026-11-23T06:00:00Z");
  const weekly = (target: number, doneDays: string[], over: Partial<NightlyHabit> = {}): NightlyHabit => ({
    ...habit, weeklyTarget: target, createdOn: "2026-11-01", completed: new Set(doneDays), ...over,
  });
  const run = (h: NightlyHabit, buildings = [older, newest]) =>
    planNightly({ now: monday, timeZone: "UTC", lastProcessedOn: "2026-11-15", habits: [h], buildings });
  const four = ["2026-11-16", "2026-11-17", "2026-11-19", "2026-11-21"];

  it("hitting the target on any days is not a miss", () => {
    const plan = run(weekly(4, four));
    expect(plan.updates).toEqual([]);
    expect(plan.missed).toEqual({});
    expect(plan.processedThrough).toBe("2026-11-22");
  });

  it("1 day short takes the newest building to 50% (under 5 days a week)", () => {
    const plan = run(weekly(4, four.slice(0, 3)));
    expect(plan.updates).toEqual([{ id: "new", condition: 50, status: "decaying" }]);
    expect(plan.habitState.h).toEqual({ consecutiveMisses: 1, lastMissedOn: "2026-11-22" });
  });

  it("2 days short ruins it", () => {
    expect(cond(run(weekly(4, four.slice(0, 2))), "new")).toBe(0);
  });

  it("a week with nothing done keeps going to the next building", () => {
    const plan = run(weekly(4, []));
    expect(cond(plan, "new")).toBe(0);
    expect(cond(plan, "old")).toBe(0);
  });

  it("5+ days a week: 1 day short is only a warning, 2 short is 50%", () => {
    const five = ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"];
    expect(run(weekly(5, five.slice(0, 4))).updates).toEqual([]);
    expect(cond(run(weekly(5, five.slice(0, 3))), "new")).toBe(50);
  });

  it("carries misses in a row across weeks", () => {
    // Last week was 1 short (run = 1); this week 1 short again makes 2 in a row → 50% at 5 a week.
    const h = weekly(5, ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"], {
      consecutiveMisses: 1, lastMissedOn: "2026-11-15",
    });
    expect(cond(run(h), "new")).toBe(50);
    expect(run(h).habitState.h).toEqual({ consecutiveMisses: 2, lastMissedOn: "2026-11-22" });
  });

  it("a week that hits the target resets the run", () => {
    const plan = run(weekly(4, four, { consecutiveMisses: 2, lastMissedOn: "2026-11-15" }));
    expect(plan.habitState.h).toEqual({ consecutiveMisses: 0, lastMissedOn: "2026-11-15" });
  });

  it("does not judge a week before its Sunday is over", () => {
    const saturday = new Date("2026-11-21T06:00:00Z");
    const plan = planNightly({ now: saturday, timeZone: "UTC", lastProcessedOn: "2026-11-15", habits: [weekly(4, [])], buildings: [older, newest] });
    expect(plan.updates).toEqual([]);
    expect(plan.processedThrough).toBe("2026-11-20");
  });

  it("judges the week in the user's timezone", () => {
    // 03:00Z Monday is still Sunday evening in Chicago, so the week is not over yet.
    const early = new Date("2026-11-23T03:00:00Z");
    const plan = planNightly({ now: early, timeZone: "America/Chicago", lastProcessedOn: "2026-11-15", habits: [weekly(4, [])], buildings: [older, newest] });
    expect(plan.updates).toEqual([]);
  });

  it("a habit started mid-week only owes the days it existed for", () => {
    // Created Saturday the 21st: 2 days in its first week, so a target of 4 needs only 2.
    const h = weekly(4, ["2026-11-21", "2026-11-22"], { createdOn: "2026-11-21" });
    expect(run(h, [b("new", "2026-11-21")]).updates).toEqual([]);
    expect(cond(run(weekly(4, ["2026-11-21"], { createdOn: "2026-11-21" }), [b("new", "2026-11-21")]), "new")).toBe(50);
  });

  it("skips weeks that end after the habit was archived", () => {
    expect(run(weekly(4, [], { archivedOn: "2026-11-20" })).updates).toEqual([]);
  });

  it("never damages milestone buildings", () => {
    const park = b("park", "2026-11-12", 100, true);
    expect(cond(run(weekly(4, []), [older, newest, park]), "park")).toBeUndefined();
  });
});

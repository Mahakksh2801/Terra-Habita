import { describe, expect, it } from "vitest";
import { planNightly, type NightlyInput } from "../nightly";
import { EVERY_DAY, WEEKDAYS } from "../schedule";

// 2026-11-16 is a Monday.
const now = new Date("2026-11-16T06:00:00Z");
const habit = { id: "h", mask: EVERY_DAY, createdOn: "2026-11-01", archivedOn: null, completed: new Set<string>() };
const building = { id: "b", habitId: "h", builtOn: "2026-11-10", condition: 100 };
const base: NightlyInput = { now, timeZone: "UTC", lastProcessedOn: "2026-11-14", habits: [habit], buildings: [building] };

describe("planNightly", () => {
  it("decays a building for a missed yesterday", () => {
    const plan = planNightly(base);
    expect(plan.processedThrough).toBe("2026-11-15");
    expect(plan.missed).toEqual({ h: ["2026-11-15"] });
    expect(plan.updates).toEqual([{ id: "b", condition: 75, status: "healthy" }]);
  });

  it("is idempotent: a second run the same day does nothing", () => {
    expect(planNightly({ ...base, lastProcessedOn: "2026-11-15" }).updates).toEqual([]);
  });

  it("catches up on skipped runs", () => {
    const plan = planNightly({ ...base, lastProcessedOn: "2026-11-12" });
    expect(plan.missed.h).toHaveLength(3);
    expect(plan.updates[0]).toEqual({ id: "b", condition: 25, status: "decaying" });
  });

  it("uses the user's timezone to decide which days are over", () => {
    // At 03:00Z it is still 22:00 on 15 Nov in New York, so only the 14th has ended.
    const late = new Date("2026-11-16T03:00:00Z");
    const ny = planNightly({ ...base, now: late, timeZone: "America/New_York", lastProcessedOn: "2026-11-13" });
    expect(ny.processedThrough).toBe("2026-11-14");
    expect(ny.missed.h).toEqual(["2026-11-14"]);
    // In Kolkata the 15th is already over.
    expect(planNightly({ ...base, now: late, timeZone: "Asia/Kolkata" }).processedThrough).toBe("2026-11-15");
  });

  it("ignores completed, unscheduled, pre-creation and post-archive days", () => {
    const window = { ...base, lastProcessedOn: "2026-10-25" };
    expect(planNightly({ ...window, habits: [{ ...habit, completed: new Set(["2026-11-15"]) }] }).missed.h).not.toContain("2026-11-15");
    expect(planNightly({ ...window, habits: [{ ...habit, mask: WEEKDAYS }] }).missed.h).not.toContain("2026-11-15"); // Sunday
    expect(planNightly(window).missed.h[0]).toBe("2026-11-01");
    expect(planNightly({ ...window, habits: [{ ...habit, archivedOn: "2026-11-03" }] }).missed.h).toEqual(["2026-11-01", "2026-11-02"]);
  });

  it("only charges a building for misses after it was built", () => {
    const plan = planNightly({ ...base, lastProcessedOn: "2026-11-01", buildings: [{ ...building, builtOn: "2026-11-13" }] });
    expect(plan.updates[0].condition).toBe(50); // 14th and 15th only
  });

  it("emits no update for a building already at 0", () => {
    expect(planNightly({ ...base, buildings: [{ ...building, condition: 0 }] }).updates).toEqual([]);
  });
});

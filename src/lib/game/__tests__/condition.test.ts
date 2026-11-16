import { describe, expect, it } from "vitest";
import { applyDamage, damageForMiss, frequencyTier, statusFor } from "../condition";
import { EVERY_DAY, WEEKDAYS, maskFromWeekdays, daysPerWeek } from "../schedule";

describe("statusFor", () => {
  it.each([
    [100, "healthy"], [60, "healthy"], [50, "decaying"], [20, "decaying"], [0, "ruined"],
  ] as const)("%i → %s", (c, s) => expect(statusFor(c)).toBe(s));
});

describe("frequencyTier", () => {
  it("5, 6 and 7 days a week are high; 4 or fewer are low", () => {
    expect(frequencyTier(EVERY_DAY)).toBe("high");
    expect(frequencyTier(maskFromWeekdays([1, 2, 3, 4, 5, 6]))).toBe("high");
    expect(frequencyTier(WEEKDAYS)).toBe("high");
    expect(frequencyTier(maskFromWeekdays([1, 2, 4, 5]))).toBe("low");
    expect(frequencyTier(maskFromWeekdays([0]))).toBe("low");
    expect(daysPerWeek(WEEKDAYS)).toBe(5);
  });
});

describe("damageForMiss", () => {
  it("5+ days a week: 1 miss nothing, 2 → 50%, 3 → ruined", () => {
    expect([1, 2, 3].map((n) => damageForMiss(n, "high"))).toEqual([null, "half", "ruin"]);
  });
  it("under 5 days a week: 1 miss → 50%, 2 → ruined", () => {
    expect([1, 2].map((n) => damageForMiss(n, "low"))).toEqual(["half", "ruin"]);
  });
  it("repeats the cycle on longer absences", () => {
    expect([4, 5, 6].map((n) => damageForMiss(n, "high"))).toEqual([null, "half", "ruin"]);
    expect([3, 4].map((n) => damageForMiss(n, "low"))).toEqual(["half", "ruin"]);
  });
  it("does nothing without a miss", () => expect(damageForMiss(0, "low")).toBeNull());
});

describe("applyDamage", () => {
  it("halves to 50 and ruins to 0", () => {
    expect(applyDamage(100, "half")).toBe(50);
    expect(applyDamage(50, "half")).toBe(50);
    expect(applyDamage(50, "ruin")).toBe(0);
    expect(applyDamage(100, null)).toBe(100);
  });
});

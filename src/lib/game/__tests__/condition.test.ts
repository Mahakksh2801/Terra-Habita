import { describe, expect, it } from "vitest";
import { applyMisses, applyRepair, statusFor } from "../condition";
import { CONDITION } from "../config";

describe("statusFor thresholds", () => {
  it.each([
    [100, "healthy"], [60, "healthy"], [59, "decaying"], [20, "decaying"], [19, "ruined"], [0, "ruined"],
  ] as const)("%i → %s", (c, s) => expect(statusFor(c)).toBe(s));
});

describe("decay", () => {
  it("one miss is a warning, two make it decay, four ruin it", () => {
    expect(statusFor(applyMisses(100, 1))).toBe("healthy");
    expect(statusFor(applyMisses(100, 2))).toBe("decaying");
    expect(statusFor(applyMisses(100, 3))).toBe("decaying");
    expect(statusFor(applyMisses(100, 4))).toBe("ruined");
  });
  it("never goes below 0", () => expect(applyMisses(10, 5)).toBe(0));
  it("is a no-op for zero misses", () => expect(applyMisses(70, 0)).toBe(70));
  it("is additive", () => expect(applyMisses(applyMisses(100, 1), 2)).toBe(applyMisses(100, 3)));
});

describe("repair", () => {
  it("fully restores worn and decaying buildings", () => {
    expect(applyRepair(75)).toBe(CONDITION.max);
    expect(applyRepair(25)).toBe(CONDITION.max);
  });
  it("partially restores a ruin, so it needs two completions", () => {
    const once = applyRepair(0);
    expect(statusFor(once)).toBe("decaying");
    expect(applyRepair(once)).toBe(CONDITION.max);
  });
});

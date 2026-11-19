import { describe, expect, it } from "vitest";
import { regionStatus, regionTier } from "../../../server/map";

describe("region summaries", () => {
  it("raises tiers with building count", () => {
    expect([0, 25, 100, 500, 1500, 5000].map(regionTier)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("marks a region by the share of damaged and ruined buildings", () => {
    expect(regionStatus(0, 0, 0)).toBe("healthy");
    expect(regionStatus(95, 5, 0)).toBe("healthy");
    expect(regionStatus(80, 20, 0)).toBe("decaying");
    expect(regionStatus(70, 5, 25)).toBe("ruined");
  });
});

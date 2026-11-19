import { describe, expect, it } from "vitest";
import { buildHeatmap } from "../stats";

describe("buildHeatmap", () => {
  const today = "2026-11-19"; // Thursday
  it("lays out Monday-first weeks ending with this week", () => {
    const cols = buildHeatmap(new Map(), today, 4);
    expect(cols).toHaveLength(4);
    expect(cols[3][0].day).toBe("2026-11-16");
    expect(cols[0][0].day).toBe("2026-10-26");
    expect(cols[3][3]).toMatchObject({ day: today, future: false });
    expect(cols[3][4].future).toBe(true);
  });
  it("scales levels to the busiest day and ignores the future", () => {
    const cols = buildHeatmap(new Map([["2026-11-16", 2], ["2026-11-17", 1], ["2026-11-20", 9]]), today, 1);
    expect(cols[0].map((c) => c.level)).toEqual([4, 2, 0, 0, 0, 0, 0]);
  });
});

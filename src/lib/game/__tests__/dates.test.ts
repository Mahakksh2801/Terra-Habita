import { describe, expect, it } from "vitest";
import {
  addDays, crossedLocalMidnight, daysBetween, eachDay, isLocalDate, isValidTimeZone,
  localDateOf, mondayOf, startOfLocalDay, weekdayOf,
} from "../dates";

describe("localDateOf", () => {
  const instant = new Date("2026-03-01T03:30:00Z");
  it("gives different calendar days for the same instant in different zones", () => {
    expect(localDateOf(instant, "UTC")).toBe("2026-03-01");
    expect(localDateOf(instant, "America/New_York")).toBe("2026-02-28");
    expect(localDateOf(instant, "Asia/Kolkata")).toBe("2026-03-01");
    expect(localDateOf(instant, "Pacific/Honolulu")).toBe("2026-02-28");
  });
  it("handles half-hour and +14 zones at the boundary", () => {
    // 18:29:59Z is 23:59:59 IST; one second later is the next day.
    expect(localDateOf(new Date("2026-06-10T18:29:59Z"), "Asia/Kolkata")).toBe("2026-06-10");
    expect(localDateOf(new Date("2026-06-10T18:30:00Z"), "Asia/Kolkata")).toBe("2026-06-11");
    expect(localDateOf(new Date("2026-06-10T10:00:00Z"), "Pacific/Kiritimati")).toBe("2026-06-11");
    expect(localDateOf(new Date("2026-06-10T11:14:59Z"), "Pacific/Chatham")).toBe("2026-06-10");
  });
});

describe("day arithmetic", () => {
  it("adds days across month, year and leap boundaries", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("is unaffected by DST transitions", () => {
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
    expect(daysBetween("2026-03-01", "2026-04-01")).toBe(31);
    expect(daysBetween("2026-04-01", "2026-03-01")).toBe(-31);
  });
  it("lists days in a half-open range and weekdays", () => {
    expect(eachDay("2026-11-14", "2026-11-17")).toEqual(["2026-11-14", "2026-11-15", "2026-11-16"]);
    expect(eachDay("2026-11-14", "2026-11-14")).toEqual([]);
    expect(weekdayOf("2026-11-16")).toBe(1); // Monday
  });
  it("validates dates and zones", () => {
    expect(isLocalDate("2026-02-29")).toBe(false);
    expect(isLocalDate("2028-02-29")).toBe(true);
    expect(isLocalDate("2026-1-1")).toBe(false);
    expect(isValidTimeZone("Europe/London")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });
});

describe("startOfLocalDay", () => {
  it("returns local midnight as a UTC instant", () => {
    expect(startOfLocalDay("2026-06-11", "Asia/Kolkata").toISOString()).toBe("2026-06-10T18:30:00.000Z");
    expect(startOfLocalDay("2026-06-11", "UTC").toISOString()).toBe("2026-06-11T00:00:00.000Z");
  });
  it("is correct on DST change days", () => {
    // US spring forward (2am) and fall back: midnight itself still exists.
    expect(startOfLocalDay("2026-03-08", "America/New_York").toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(startOfLocalDay("2026-03-09", "America/New_York").toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(startOfLocalDay("2026-11-01", "America/New_York").toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(startOfLocalDay("2026-11-02", "America/New_York").toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });
  it("handles zones where DST skips midnight", () => {
    // Chile springs forward at 24:00 on the first Saturday of September 2026: 00:00 → 01:00.
    const start = startOfLocalDay("2026-09-06", "America/Santiago");
    expect(localDateOf(start, "America/Santiago")).toBe("2026-09-06");
    expect(localDateOf(new Date(start.getTime() - 1), "America/Santiago")).toBe("2026-09-05");
  });
});

describe("crossedLocalMidnight", () => {
  it("depends on the user's zone, not UTC", () => {
    const a = new Date("2026-06-10T18:00:00Z");
    const b = new Date("2026-06-10T19:00:00Z");
    expect(crossedLocalMidnight(a, b, "Asia/Kolkata")).toBe(true);
    expect(crossedLocalMidnight(a, b, "UTC")).toBe(false);
  });
});

describe("mondayOf", () => {
  it("finds the Monday of a Monday-to-Sunday week", () => {
    expect(mondayOf("2026-11-16")).toBe("2026-11-16"); // Monday
    expect(mondayOf("2026-11-18")).toBe("2026-11-16"); // Wednesday
    expect(mondayOf("2026-11-22")).toBe("2026-11-16"); // Sunday belongs to the week before it
    expect(mondayOf("2026-11-23")).toBe("2026-11-23");
    expect(mondayOf("2027-01-01")).toBe("2026-12-28"); // across a year boundary
  });
});

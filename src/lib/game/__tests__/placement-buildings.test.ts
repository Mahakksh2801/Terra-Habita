import { describe, expect, it } from "vitest";
import { buildingTypeFor, pickHabitColor } from "../buildings";
import { HABIT_COLORS } from "../config";
import { CITY_GRID_SIZE, PROMOTION_THRESHOLD } from "../config";
import { cellKey, nextFreeCell, nextFreeCells, spiralOrder } from "../placement";

describe("spiralOrder", () => {
  it.each([1, 2, 3, 24, 25])("visits every cell of a %i grid once", (n) => {
    const cells = spiralOrder(n);
    expect(cells).toHaveLength(n * n);
    expect(new Set(cells.map(cellKey)).size).toBe(n * n);
    cells.forEach(({ x, y }) => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThan(n);
    });
  });
  it("starts at the centre and stays compact", () => {
    const cells = spiralOrder(5);
    expect(cells[0]).toEqual({ x: 2, y: 2 });
    // First 9 cells form the central 3x3 block.
    cells.slice(0, 9).forEach(({ x, y }) => {
      expect(Math.abs(x - 2)).toBeLessThanOrEqual(1);
      expect(Math.abs(y - 2)).toBeLessThanOrEqual(1);
    });
  });
  it("city grid has room for a full city", () => {
    expect(CITY_GRID_SIZE ** 2).toBeGreaterThanOrEqual(PROMOTION_THRESHOLD.city);
  });
});

describe("nextFreeCell", () => {
  it("fills gaps left by removed buildings first", () => {
    const occupied = new Set(spiralOrder(5).slice(0, 10).map(cellKey));
    const third = spiralOrder(5)[3];
    occupied.delete(cellKey(third));
    expect(nextFreeCell(5, occupied)).toEqual(third);
  });
  it("returns null when full", () => {
    expect(nextFreeCell(2, new Set(spiralOrder(2).map(cellKey)))).toBeNull();
  });
  it("returns several distinct cells", () => {
    const cells = nextFreeCells(3, new Set(), 3);
    expect(new Set(cells.map(cellKey)).size).toBe(3);
  });
});

describe("habit colours", () => {
  it("gives each new habit the first colour no other habit uses", () => {
    expect(pickHabitColor([])).toBe(HABIT_COLORS[0]);
    expect(pickHabitColor([HABIT_COLORS[0]])).toBe(HABIT_COLORS[1]);
    // A removed habit frees its colour for the next one.
    expect(pickHabitColor([HABIT_COLORS[1], HABIT_COLORS[2]])).toBe(HABIT_COLORS[0]);
  });
  it("keeps the palette distinct and repeats only once all are taken", () => {
    expect(new Set(HABIT_COLORS).size).toBe(HABIT_COLORS.length);
    expect(pickHabitColor([...HABIT_COLORS])).toBe(HABIT_COLORS[0]);
  });
});

describe("building type", () => {
  it("maps category to type", () => {
    expect(buildingTypeFor("body")).toBe("gym");
    expect(buildingTypeFor("mind")).toBe("library");
  });
});

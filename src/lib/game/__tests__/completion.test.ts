import { describe, expect, it } from "vitest";
import { addDays, eachDay } from "../dates";
import { CompletionRejected, planCompletion, type CompletionInput } from "../completion";
import { EVERY_DAY } from "../schedule";
import { cellKey, spiralOrder } from "../placement";

const today = "2026-11-16";
const input = (over: Partial<CompletionInput> = {}): CompletionInput => ({
  habit: { id: "h", category: "body", mask: EVERY_DAY, createdOn: "2026-01-01", archived: false },
  date: today,
  today,
  completed: new Set(),
  habitBuildings: [],
  totalCompletions: 0,
  gridSize: 24,
  occupied: new Set(),
  ...over,
});

describe("planCompletion", () => {
  it("places one building of the habit's type at the next free cell", () => {
    const plan = planCompletion(input());
    expect(plan.buildings).toEqual([{ ...spiralOrder(24)[0], type: "gym", tier: 1, milestone: null }]);
    expect(plan.repairs).toEqual([]);
    expect(plan.streak).toBe(1);
  });

  it("repairs the habit's damaged buildings and leaves healthy ones alone", () => {
    const plan = planCompletion(
      input({ habitBuildings: [{ id: "a", condition: 100 }, { id: "b", condition: 25 }, { id: "c", condition: 0 }] }),
    );
    expect(plan.repairs).toEqual([
      { id: "b", condition: 100, status: "healthy" },
      { id: "c", condition: 40, status: "decaying" },
    ]);
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

  it("uses the height tier reached by this completion", () => {
    expect(planCompletion(input({ totalCompletions: 24 })).buildings[0].tier).toBe(2);
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

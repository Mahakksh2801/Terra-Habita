import { describe, expect, it } from "vitest";
import { NO_PROMOTION, planPromotion } from "../promotion";

describe("planPromotion", () => {
  it("does nothing while the city has room", () => {
    expect(planPromotion([{ id: "c1", level: "city", size: 499 }])).toEqual(NO_PROMOTION);
  });

  it("first full city creates a state above it and a fresh city inside", () => {
    expect(planPromotion([{ id: "c1", level: "city", size: 500 }])).toEqual({
      newRoot: "state",
      newChain: ["city"],
      chainParentId: "newRoot",
    });
  });

  it("a later full city adds a sibling city to its state", () => {
    expect(
      planPromotion([
        { id: "c3", level: "city", size: 500 },
        { id: "s1", level: "state", size: 3 },
      ]),
    ).toEqual({ newRoot: null, newChain: ["city"], chainParentId: "s1" });
  });

  it("the city that fills a state promotes to a country", () => {
    expect(
      planPromotion([
        { id: "c5", level: "city", size: 500 },
        { id: "s1", level: "state", size: 5 },
      ]),
    ).toEqual({ newRoot: "country", newChain: ["state", "city"], chainParentId: "newRoot" });
  });

  it("cascades through several full levels into an existing parent", () => {
    expect(
      planPromotion([
        { id: "c", level: "city", size: 500 },
        { id: "s", level: "state", size: 5 },
        { id: "k", level: "country", size: 5 },
        { id: "n", level: "continent", size: 2 },
        { id: "w", level: "world", size: 1 },
      ]),
    ).toEqual({ newRoot: null, newChain: ["country", "state", "city"], chainParentId: "n" });
  });

  it("the world never fills, so a full continent gets a sibling", () => {
    expect(
      planPromotion([
        { id: "c", level: "city", size: 500 },
        { id: "s", level: "state", size: 5 },
        { id: "k", level: "country", size: 5 },
        { id: "n", level: "continent", size: 5 },
        { id: "w", level: "world", size: 1_000 },
      ]),
    ).toEqual({ newRoot: null, newChain: ["continent", "country", "state", "city"], chainParentId: "w" });
  });

  it("a full top continent creates the world", () => {
    const plan = planPromotion([
      { id: "c", level: "city", size: 500 },
      { id: "s", level: "state", size: 5 },
      { id: "k", level: "country", size: 5 },
      { id: "n", level: "continent", size: 5 },
    ]);
    expect(plan.newRoot).toBe("world");
  });

  it("rejects a malformed ancestry", () => {
    expect(() => planPromotion([{ id: "s", level: "state", size: 1 }])).toThrow();
    expect(() => planPromotion([])).toThrow();
  });
});

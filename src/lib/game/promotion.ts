import { LEVELS, PROMOTION_THRESHOLD, type Level } from "./config";

export interface SettlementNode {
  id: string;
  level: Level;
  /** city: building count. Higher levels: number of child settlements. */
  size: number;
}

export interface PromotionPlan {
  /** A new top-level settlement to create above the current top, if any. */
  newRoot: Level | null;
  /**
   * New settlements to create, from the highest level down to a fresh city.
   * The first is a child of `chainParentId` ("newRoot" means the settlement in
   * `newRoot`); each following one is a child of the one before.
   */
  newChain: Level[];
  chainParentId: string | "newRoot" | null;
}

export const NO_PROMOTION: PromotionPlan = { newRoot: null, newChain: [], chainParentId: null };

export function isFull(node: SettlementNode): boolean {
  return node.size >= PROMOTION_THRESHOLD[node.level];
}

export function nextLevel(level: Level): Level | null {
  const i = LEVELS.indexOf(level);
  return i >= 0 && i < LEVELS.length - 1 ? LEVELS[i + 1] : null;
}

/**
 * Decide what to create after a building is added to the active city.
 *
 * `ancestry` is the active city followed by its ancestors, bottom-up
 * ([city, state, country, …]). Sizes must already include the new building.
 * Every settlement except the newest child of each parent is full, so a parent
 * is full exactly when its child count reaches its threshold.
 */
export function planPromotion(ancestry: readonly SettlementNode[]): PromotionPlan {
  if (ancestry.length === 0) throw new Error("ancestry must start with the active city");
  ancestry.forEach((node, i) => {
    if (node.level !== LEVELS[i]) throw new Error(`ancestry[${i}] should be ${LEVELS[i]}, got ${node.level}`);
  });
  if (!isFull(ancestry[0])) return NO_PROMOTION;

  // Highest index k such that ancestry[0..k] are all full.
  let k = 0;
  while (k + 1 < ancestry.length && isFull(ancestry[k + 1])) k++;

  const newChain = LEVELS.slice(0, k + 1).reverse() as Level[];
  if (k + 1 < ancestry.length) {
    return { newRoot: null, newChain, chainParentId: ancestry[k + 1].id };
  }
  const root = nextLevel(ancestry[k].level);
  if (!root) throw new Error("the world cannot fill up");
  return { newRoot: root, newChain, chainParentId: "newRoot" };
}

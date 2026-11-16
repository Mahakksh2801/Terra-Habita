import { CONDITION } from "./config";

export type BuildingStatus = "healthy" | "decaying" | "ruined";

const clamp = (n: number) => Math.max(0, Math.min(CONDITION.max, n));

export function statusFor(condition: number): BuildingStatus {
  if (condition >= CONDITION.healthyMin) return "healthy";
  if (condition >= CONDITION.decayingMin) return "decaying";
  return "ruined";
}

/** Condition after `misses` missed scheduled days. */
export function applyMisses(condition: number, misses: number): number {
  if (misses <= 0) return clamp(condition);
  return clamp(condition - CONDITION.missPenalty * misses);
}

/**
 * Condition after one completion of the building's habit.
 * Healthy and decaying buildings are fully restored; ruined ones recover
 * partially, so bringing back a ruin takes more than one day.
 */
export function applyRepair(condition: number): number {
  if (statusFor(condition) === "ruined") return clamp(condition + CONDITION.ruinedRepair);
  return CONDITION.max;
}

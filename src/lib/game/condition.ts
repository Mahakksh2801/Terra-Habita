import { CONDITION, DAMAGE } from "./config";
import { daysPerWeek } from "./schedule";

export type BuildingStatus = "healthy" | "decaying" | "ruined";
export type FrequencyTier = "high" | "low";
export type MissDamage = "half" | "ruin" | null;

export function statusFor(condition: number): BuildingStatus {
  if (condition >= CONDITION.healthyMin) return "healthy";
  if (condition >= CONDITION.decayingMin) return "decaying";
  return "ruined";
}

/** 5+ scheduled days a week is "high", fewer is "low". */
export function frequencyTier(mask: number): FrequencyTier {
  return daysPerWeek(mask) >= DAMAGE.highFrequencyMinDays ? "high" : "low";
}

/**
 * What the n-th consecutive missed scheduled day (1-based) does.
 * The cadence repeats, so a long absence works through older buildings.
 */
export function damageForMiss(consecutiveMisses: number, tier: FrequencyTier): MissDamage {
  if (consecutiveMisses < 1) return null;
  const { halfAt, ruinAt } = DAMAGE[tier];
  const pos = ((consecutiveMisses - 1) % ruinAt) + 1;
  if (pos === halfAt) return "half";
  if (pos === ruinAt) return "ruin";
  return null;
}

export function applyDamage(condition: number, damage: MissDamage): number {
  if (damage === "ruin") return 0;
  if (damage === "half") return Math.min(condition, CONDITION.half);
  return condition;
}

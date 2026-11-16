import type { Level } from "./config";

const NAMES: Record<Level, readonly string[]> = {
  city: ["Aurelia", "Brightwater", "Cedarfall", "Dunmere", "Emberly", "Foxhollow", "Greystone", "Havenport", "Ivywick", "Juniper Bay"],
  state: ["Verdant Reach", "Stonevale", "Riverlands", "Highmoor", "Sunmarch"],
  country: ["Arcadia", "Borealis", "Calderon", "Dawnhold", "Eloria"],
  continent: ["Terra Prima", "Terra Secunda", "Terra Tertia", "Terra Quarta", "Terra Quinta"],
  world: ["Terra Habita"],
};

/** A settlement name for the n-th (0-based) settlement of a level a user founds. */
export function settlementName(level: Level, index: number): string {
  const list = NAMES[level];
  const base = list[index % list.length];
  const round = Math.floor(index / list.length);
  return round === 0 ? base : `${base} ${round + 1}`;
}

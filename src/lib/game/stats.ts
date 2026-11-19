import { type LocalDate, addDays, mondayOf } from "./dates";

export interface HeatCell {
  day: LocalDate;
  count: number;
  /** 0 (nothing) to 4 (busiest), relative to the busiest day shown. */
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
}

/**
 * A GitHub-style calendar: `weeks` columns of Monday-to-Sunday days, ending
 * with the week that contains `today`. Days after today are marked future.
 */
export function buildHeatmap(counts: ReadonlyMap<LocalDate, number>, today: LocalDate, weeks = 26): HeatCell[][] {
  const start = addDays(mondayOf(today), -7 * (weeks - 1));
  let max = 0;
  for (const [d, n] of counts) if (d >= start && d <= today) max = Math.max(max, n);
  const level = (n: number): HeatCell["level"] =>
    n <= 0 || max === 0 ? 0 : (Math.min(4, Math.max(1, Math.ceil((n / max) * 4))) as HeatCell["level"]);
  const cols: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, w * 7 + i);
      const count = day <= today ? counts.get(day) ?? 0 : 0;
      col.push({ day, count, level: level(count), future: day > today });
    }
    cols.push(col);
  }
  return cols;
}

import { type LocalDate, weekdayOf } from "./dates";

/**
 * A habit's frequency is a 7-bit weekday mask: bit 0 = Sunday … bit 6 = Saturday.
 * 127 means every day. Only scheduled days can be missed or extend a streak.
 */
export const EVERY_DAY = 0b1111111;
export const WEEKDAYS = 0b0111110;

export function maskFromWeekdays(days: number[]): number {
  return days.reduce((m, d) => {
    if (!Number.isInteger(d) || d < 0 || d > 6) throw new RangeError(`bad weekday ${d}`);
    return m | (1 << d);
  }, 0);
}

export function isValidMask(mask: number): boolean {
  return Number.isInteger(mask) && mask > 0 && mask <= EVERY_DAY;
}

export function isScheduled(date: LocalDate, mask: number): boolean {
  return (mask & (1 << weekdayOf(date))) !== 0;
}

/** How many days a week the habit is scheduled (1–7). */
export function daysPerWeek(mask: number): number {
  let n = 0;
  for (let d = 0; d < 7; d++) if (mask & (1 << d)) n++;
  return n;
}

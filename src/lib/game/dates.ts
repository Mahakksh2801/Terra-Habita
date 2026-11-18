/**
 * Calendar-day helpers. A LocalDate is a plain "YYYY-MM-DD" string that always
 * means a day in the *user's* timezone. Arithmetic on LocalDates is done in UTC
 * so it never shifts across DST changes.
 */
export type LocalDate = string;

const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

function parts(instant: Date, timeZone: string) {
  const p: Record<string, number> = {};
  for (const { type, value } of formatter(timeZone).formatToParts(instant)) {
    if (type !== "literal") p[type] = Number(value);
  }
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isLocalDate(value: string): value is LocalDate {
  if (!DATE_RE.test(value)) return false;
  return new Date(toUtcMs(value)).toISOString().slice(0, 10) === value;
}

/** The calendar day an instant falls on in the given timezone. */
export function localDateOf(instant: Date, timeZone: string): LocalDate {
  const p = parts(instant, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function toUtcMs(date: LocalDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: LocalDate, n: number): LocalDate {
  return new Date(toUtcMs(date) + n * DAY_MS).toISOString().slice(0, 10);
}

/** The Monday of the Monday-to-Sunday week a day falls in. */
export function mondayOf(date: LocalDate): LocalDate {
  return addDays(date, -((weekdayOf(date) + 6) % 7));
}

/** Whole days from a to b (positive when b is later). */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(date: LocalDate): number {
  return new Date(toUtcMs(date)).getUTCDay();
}

/** Days in [from, to), oldest first. */
export function eachDay(from: LocalDate, toExclusive: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  for (let d = from; d < toExclusive; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Offset of the timezone from UTC at an instant, in ms (e.g. +05:30 → 19_800_000). */
function offsetMs(instant: Date, timeZone: string): number {
  const p = parts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * The first instant of a local day. Usually local midnight; on days where a
 * DST jump skips midnight it is the first instant that exists on that day.
 */
export function startOfLocalDay(date: LocalDate, timeZone: string): Date {
  const midnightUtc = toUtcMs(date);
  let guess = midnightUtc - offsetMs(new Date(midnightUtc), timeZone);
  guess = midnightUtc - offsetMs(new Date(guess), timeZone);
  // If midnight does not exist the guess lands on the previous day; walk forward.
  while (localDateOf(new Date(guess), timeZone) < date) guess += 15 * 60_000;
  // Walk back while the previous minute is still on the same day (fall-back edge).
  while (localDateOf(new Date(guess - 60_000), timeZone) === date) guess -= 60_000;
  return new Date(guess);
}

/** Has the user's local day changed between two instants? */
export function crossedLocalMidnight(before: Date, after: Date, timeZone: string): boolean {
  return localDateOf(before, timeZone) !== localDateOf(after, timeZone);
}

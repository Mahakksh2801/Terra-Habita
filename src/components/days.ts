/** Monday-first display order; values are JS weekday numbers (0 = Sunday). */
export const DAYS = [
  { value: 1, short: "Mon", long: "Monday" },
  { value: 2, short: "Tue", long: "Tuesday" },
  { value: 3, short: "Wed", long: "Wednesday" },
  { value: 4, short: "Thu", long: "Thursday" },
  { value: 5, short: "Fri", long: "Friday" },
  { value: 6, short: "Sat", long: "Saturday" },
  { value: 0, short: "Sun", long: "Sunday" },
] as const;

export function describeFrequency(mask: number, weeklyTarget?: number | null): string {
  if (weeklyTarget) return `Any ${weeklyTarget} day${weeklyTarget === 1 ? "" : "s"} a week`;
  const on = DAYS.filter((d) => mask & (1 << d.value));
  if (on.length === 7) return "Every day";
  if (mask === 0b0111110) return "Weekdays";
  if (mask === 0b1000001) return "Weekends";
  return `${on.length} day${on.length === 1 ? "" : "s"} a week: ${on.map((d) => d.short).join(", ")}`;
}

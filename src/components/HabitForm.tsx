"use client";

import { useActionState, useState } from "react";
import { saveHabit, type HabitFormState } from "@/app/actions";
import { HABIT_CATEGORIES } from "@/lib/game/buildings";
import { DAYS } from "./days";

const CATEGORY_HINT: Record<string, string> = {
  body: "Body (builds gyms)", mind: "Mind (libraries)", work: "Work (offices)", social: "Social (plazas)",
  creative: "Creative (studios)", home: "Home (houses)", other: "Other (shops)",
};

const PRESETS = [
  { label: "Every day", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { label: "Clear", days: [] },
];

export function HabitForm({ habit }: { habit?: { id: string; name: string; category: string; frequency: number } }) {
  const [state, action, pending] = useActionState<HabitFormState, FormData>(saveHabit, {});
  const [days, setDays] = useState<number[]>(
    habit ? DAYS.filter((d) => habit.frequency & (1 << d.value)).map((d) => d.value) : [0, 1, 2, 3, 4, 5, 6],
  );
  const toggle = (v: number) => setDays((cur) => (cur.includes(v) ? cur.filter((d) => d !== v) : [...cur, v]));
  const err = state.fieldErrors;

  return (
    <form action={action} className="space-y-6">
      {habit && <input type="hidden" name="id" value={habit.id} />}
      <div className="space-y-1">
        <label htmlFor="name" className="block font-medium">Name</label>
        <input
          id="name" name="name" required maxLength={80} defaultValue={habit?.name}
          aria-invalid={!!err?.name} aria-describedby={err?.name ? "name-error" : undefined}
          className="w-full rounded-md border border-line bg-surface px-3 py-2"
        />
        {err?.name && <p id="name-error" className="text-sm text-ruined">{err.name[0]}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="category" className="block font-medium">Category</label>
        <select id="category" name="category" defaultValue={habit?.category ?? "body"} className="w-full rounded-md border border-line bg-surface px-3 py-2">
          {HABIT_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_HINT[c]}</option>)}
        </select>
      </div>

      <fieldset className="space-y-2" aria-describedby="days-help">
        <legend className="font-medium">Which days?</legend>
        <p id="days-help" className="text-sm text-muted">
          {days.length} day{days.length === 1 ? "" : "s"} a week.{" "}
          {days.length >= 5
            ? "Missing 2 scheduled days in a row damages your newest building; 3 ruins it."
            : "Missing 1 scheduled day damages your newest building; 2 in a row ruins it."}
        </p>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <label key={d.value} className="cursor-pointer">
              <input type="checkbox" name="days" aria-label={d.long} value={d.value} checked={days.includes(d.value)} onChange={() => toggle(d.value)} className="peer sr-only" />
              <span aria-hidden className="inline-block rounded-md border border-line bg-surface px-3 py-2 peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-ink peer-focus-visible:outline-3 peer-focus-visible:outline-accent">
                {d.short}
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-3 text-sm">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => setDays(p.days)} className="text-accent underline">{p.label}</button>
          ))}
        </div>
        {err?.frequency && <p className="text-sm text-ruined" role="alert">{err.frequency[0]}</p>}
      </fieldset>

      <button disabled={pending} className="rounded-md bg-accent px-4 py-2 font-medium text-accent-ink disabled:opacity-60">
        {pending ? "Saving…" : habit ? "Save changes" : "Create habit"}
      </button>
    </form>
  );
}

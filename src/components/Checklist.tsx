"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toggleHabit } from "@/app/actions";
import type { TodayHabit } from "@/server/today";

function Row({ habit, onToggle }: { habit: TodayHabit; onToggle: (h: TodayHabit, done: boolean) => void }) {
  const id = `habit-${habit.id}`;
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
      <input
        id={id}
        type="checkbox"
        checked={habit.doneToday}
        onChange={(e) => onToggle(habit, e.target.checked)}
        className="size-5 accent-[var(--accent)]"
      />
      <label htmlFor={id} className="flex-1 cursor-pointer">
        <span className={habit.doneToday ? "text-muted line-through" : ""}>{habit.name}</span>
        <span className="block text-sm text-muted">
          {habit.weeklyTarget ? `${habit.weekDone} of ${habit.weeklyTarget} days this week` : habit.category}
        </span>
      </label>
      <span className="text-sm text-muted" aria-label={`${habit.streak} day streak`}>
        {habit.streak > 0 ? `🔥 ${habit.streak}` : ""}
      </span>
    </li>
  );
}

export function Checklist({ habits }: { habits: TodayHabit[] }) {
  const [optimistic, setOptimistic] = useOptimistic(habits, (cur, { id, done }: { id: string; done: boolean }) =>
    cur.map((h) => (h.id === id ? { ...h, doneToday: done } : h)),
  );
  const [message, setMessage] = useState("");
  const [, startTransition] = useTransition();

  const onToggle = (h: TodayHabit, done: boolean) =>
    startTransition(async () => {
      setOptimistic({ id: h.id, done });
      const r = await toggleHabit(h.id, done);
      setMessage(r.message);
    });

  const scheduled = optimistic.filter((h) => h.scheduledToday);
  const rest = optimistic.filter((h) => !h.scheduledToday);

  return (
    <div className="space-y-6">
      <p aria-live="polite" role="status" className="min-h-6 font-medium text-healthy">{message}</p>
      <section aria-labelledby="due-today" className="space-y-2">
        <h2 id="due-today" className="text-lg font-semibold">
          Due today <span className="text-muted">({scheduled.filter((h) => h.doneToday).length}/{scheduled.length})</span>
        </h2>
        {scheduled.length ? (
          <ul className="space-y-2">{scheduled.map((h) => <Row key={h.id} habit={h} onToggle={onToggle} />)}</ul>
        ) : (
          <p className="text-muted">Nothing scheduled today.</p>
        )}
      </section>
      {rest.length > 0 && (
        <section aria-labelledby="rest-day" className="space-y-2">
          <h2 id="rest-day" className="text-lg font-semibold">Rest day</h2>
          <p className="text-sm text-muted">Not scheduled today. Doing them anyway still builds, and skipping them never counts as a miss.</p>
          <ul className="space-y-2">{rest.map((h) => <Row key={h.id} habit={h} onToggle={onToggle} />)}</ul>
        </section>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { saveTimezone } from "@/app/actions";

export function TimezoneForm({ current, zones }: { current: string; zones: string[] }) {
  const [value, setValue] = useState(current);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setStatus((await saveTimezone(value)).ok ? "Saved." : "That timezone isn't valid."));
      }}
    >
      <label htmlFor="tz" className="block font-medium">Timezone</label>
      <p id="tz-help" className="text-sm text-muted">Your day, streaks and misses all follow midnight in this timezone.</p>
      <select id="tz" aria-describedby="tz-help" value={value} onChange={(e) => setValue(e.target.value)} className="w-full rounded-md border border-line bg-surface px-3 py-2">
        {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
      </select>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-md bg-accent px-4 py-2 font-medium text-accent-ink disabled:opacity-60">Save</button>
        <button type="button" className="text-accent underline" onClick={() => setValue(Intl.DateTimeFormat().resolvedOptions().timeZone)}>
          Use this device&apos;s timezone
        </button>
      </div>
      <p role="status" className="text-sm text-healthy">{status}</p>
    </form>
  );
}

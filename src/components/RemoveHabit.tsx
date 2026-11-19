"use client";

import { useState, useTransition } from "react";
import { deleteHabit } from "@/app/actions";

/** Two-step remove: first tap asks, second tap deletes. Cancel backs out. */
export function RemoveHabit({ id, name }: { id: string; name: string }) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className="text-ruined underline" aria-label={`Remove ${name}`}>
        Remove
      </button>
    );
  }
  return (
    <span role="alertdialog" aria-label={`Confirm removing ${name}`} className="flex w-full flex-wrap items-center gap-3 rounded-md border border-ruined/50 bg-bg px-3 py-2 text-sm">
      <span className="flex-1">
        Remove <strong>{name}</strong> for good? Its history is deleted. Buildings it already raised stay in your city.
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { await deleteHabit(id); })}
        className="rounded-md bg-ruined px-3 py-1.5 font-medium text-white disabled:opacity-60"
        autoFocus
      >
        {pending ? "Removing…" : "Yes, remove"}
      </button>
      <button type="button" disabled={pending} onClick={() => setAsking(false)} className="underline">Cancel</button>
    </span>
  );
}

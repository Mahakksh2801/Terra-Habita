import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/server/session";
import { listHabits } from "@/server/habits";
import { archiveHabit } from "@/app/actions";
import { describeFrequency } from "@/components/days";

export const dynamic = "force-dynamic";

export default async function Habits() {
  const userId = await requireUserId();
  const [active, archived] = await Promise.all([listHabits(prisma, userId), listHabits(prisma, userId, { archived: true })]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Habits</h1>
        <Link href="/habits/new" className="rounded-md bg-accent px-4 py-2 font-medium text-accent-ink">New habit</Link>
      </div>

      {active.length ? (
        <ul className="space-y-2">
          {active.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
              <div className="flex-1">
                <p className="font-medium">{h.name}</p>
                <p className="text-sm text-muted">{h.category} · {describeFrequency(h.frequency)}</p>
              </div>
              <Link href={`/habits/${h.id}/edit`} className="text-accent underline" aria-label={`Edit ${h.name}`}>Edit</Link>
              <form action={archiveHabit.bind(null, h.id, true)}>
                <button className="text-muted underline" aria-label={`Archive ${h.name}`}>Archive</button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">No active habits.</p>
      )}

      {archived.length > 0 && (
        <section aria-labelledby="archived" className="space-y-2">
          <h2 id="archived" className="text-lg font-semibold">Archived</h2>
          <p className="text-sm text-muted">Archived habits keep their buildings, which stop being damaged.</p>
          <ul className="space-y-2">
            {archived.map((h) => (
              <li key={h.id} className="flex items-center gap-3 rounded-lg border border-line px-4 py-3">
                <p className="flex-1 text-muted">{h.name}</p>
                <form action={archiveHabit.bind(null, h.id, false)}>
                  <button className="text-accent underline" aria-label={`Restore ${h.name}`}>Restore</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

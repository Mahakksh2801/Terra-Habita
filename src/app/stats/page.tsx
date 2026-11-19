import { prisma } from "@/lib/db";
import { requireUserId } from "@/server/session";
import { catchUp } from "@/server/nightly";
import { getStats } from "@/server/stats";

export const dynamic = "force-dynamic";

const PLURAL = { city: "cities", state: "states", country: "countries", continent: "continents", world: "worlds" };
const LEVEL_BG = ["bg-line/40", "bg-accent/30", "bg-accent/55", "bg-accent/80", "bg-accent"];
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en", { ...o, timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

export default async function StatsPage() {
  const userId = await requireUserId();
  await catchUp(prisma, userId);
  const s = await getStats(prisma, userId);
  const levels = ["city", "state", "country", "continent", "world"] as const;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Stats</h1>

      <section aria-labelledby="totals" className="grid gap-4 sm:grid-cols-3">
        <h2 id="totals" className="sr-only">Totals</h2>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Completions all time</p>
          <p className="text-2xl font-semibold">{s.totalCompletions}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Milestones earned</p>
          <p className="text-2xl font-semibold">{s.milestones.length}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Your world so far</p>
          <p className="text-sm">
            {levels.filter((l) => s.settlements[l]).map((l) => `${s.settlements[l]} ${s.settlements[l] === 1 ? l : PLURAL[l]}`).join(", ") || "No city yet"}
          </p>
        </div>
      </section>

      <section aria-labelledby="heat">
        <h2 id="heat" className="mb-2 text-lg font-semibold">Last 26 weeks</h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-surface p-4">
          <div className="flex gap-1" role="grid" aria-label="Completions per day, oldest week first">
            <div className="mr-1 grid grid-rows-7 gap-1 text-[10px] leading-3 text-muted" aria-hidden>
              {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => <span key={i} className="h-3">{d}</span>)}
            </div>
            {s.heatmap.map((week) => (
              <div key={week[0].day} role="row" className="grid grid-rows-7 gap-1">
                {week.map((c) => (
                  <span
                    key={c.day}
                    role="gridcell"
                    title={c.future ? "" : `${fmt(c.day, { month: "short", day: "numeric" })}: ${c.count} completion${c.count === 1 ? "" : "s"}`}
                    aria-label={c.future ? undefined : `${fmt(c.day, { weekday: "long", month: "long", day: "numeric" })}: ${c.count} completion${c.count === 1 ? "" : "s"}`}
                    className={`h-3 w-3 rounded-sm ${c.future ? "bg-transparent" : LEVEL_BG[c.level]} ${c.day === s.today ? "ring-1 ring-ink" : ""}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1 text-xs text-muted">
            Less {LEVEL_BG.map((b) => <span key={b} className={`inline-block h-3 w-3 rounded-sm ${b}`} aria-hidden />)} More
          </p>
        </div>
      </section>

      <section aria-labelledby="habits">
        <h2 id="habits" className="mb-2 text-lg font-semibold">Streaks</h2>
        {s.habits.length ? (
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr><th className="py-1 font-medium">Habit</th><th className="font-medium">Current</th><th className="font-medium">Best</th><th className="font-medium">Done</th></tr>
            </thead>
            <tbody>
              {s.habits.map((h) => {
                const unit = h.weeklyTarget ? "wk" : "d";
                return (
                  <tr key={h.id} className="border-t border-line">
                    <td className="py-2">{h.name}{h.archived && <span className="text-muted"> (archived)</span>}</td>
                    <td>{h.current} {unit}</td>
                    <td>{h.longest} {unit}</td>
                    <td>{h.total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <p className="text-muted">No habits yet.</p>}
        <p className="mt-2 text-xs text-muted">d = scheduled days in a row, wk = weeks in a row hitting your target.</p>
      </section>

      <section aria-labelledby="ms">
        <h2 id="ms" className="mb-2 text-lg font-semibold">Milestones</h2>
        <p className="mb-2 text-sm text-muted">A 7-day streak raises a park, 30 days a district hall, 100 days a landmark. Milestone buildings never get damaged.</p>
        {s.milestones.length ? (
          <ul className="space-y-1 text-sm">
            {s.milestones.map((m) => (
              <li key={m.id}><span className="font-medium capitalize">{m.label}</span><span className="text-muted"> · {m.habit}, {fmt(m.unlockedOn, { month: "short", day: "numeric", year: "numeric" })}</span></li>
            ))}
          </ul>
        ) : <p className="text-sm">None yet. Your first one comes at a 7-day streak.</p>}
      </section>
    </div>
  );
}

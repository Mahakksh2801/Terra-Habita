import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/server/session";
import { getToday } from "@/server/today";
import { Checklist } from "@/components/Checklist";
import { TimezoneSync } from "@/components/TimezoneSync";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const userId = await requireUserId();
  const t = await getToday(prisma, userId);
  const dateLabel = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${t.today}T00:00:00Z`),
  );
  const best = Math.max(0, ...t.habits.map((h) => h.streak));

  return (
    <div className="space-y-8">
      {!t.timezoneConfirmed && <TimezoneSync current={t.timezone} />}
      <div>
        <h1 className="text-2xl font-bold">{dateLabel}</h1>
        <p className="text-muted">Your day runs on {t.timezone.replace(/_/g, " ")} time.</p>
      </div>

      {t.habits.length ? (
        <Checklist habits={t.habits} />
      ) : (
        <div className="rounded-lg border border-dashed border-line p-6 text-center">
          <p className="mb-3">You have no habits yet. Each one you complete adds a building to your first city.</p>
          <Link href="/habits/new" className="rounded-md bg-accent px-4 py-2 font-medium text-accent-ink">Add your first habit</Link>
        </div>
      )}

      <section aria-labelledby="city" className="grid gap-4 sm:grid-cols-3">
        <h2 id="city" className="sr-only">Your settlement</h2>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Active city</p>
          <p className="text-lg font-semibold">{t.city?.name ?? "Not founded yet"}</p>
          <p className="text-sm text-muted">{t.city ? `${t.city.buildingCount} building${t.city.buildingCount === 1 ? "" : "s"}` : "Founded by your first check-off"}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Building condition</p>
          {t.city ? (
            <ul className="text-sm">
              <li><span className="font-semibold text-healthy">{t.city.healthyCount}</span> healthy</li>
              <li><span className="font-semibold text-decaying">{t.city.decayingCount}</span> damaged</li>
              <li><span className="font-semibold text-ruined">{t.city.ruinedCount}</span> ruined</li>
            </ul>
          ) : (
            <p className="text-sm text-muted">No buildings yet</p>
          )}
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-muted">Streaks</p>
          <p className="text-lg font-semibold">{best} day{best === 1 ? "" : "s"} best current</p>
          <p className="text-sm text-muted">{t.totalCompletions} completions all time</p>
        </div>
      </section>
    </div>
  );
}

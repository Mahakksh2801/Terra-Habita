import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/server/session";
import { catchUp } from "@/server/nightly";
import { getMap } from "@/server/map";
import { IsoMap } from "@/components/IsoMap";

export const dynamic = "force-dynamic";

export default async function MapPage({ params }: { params: Promise<{ id?: string[] }> }) {
  const userId = await requireUserId();
  await catchUp(prisma, userId);
  const { id } = await params;
  const view = await getMap(prisma, userId, id?.[0]);

  if (!view) {
    return (
      <div className="rounded-lg border border-dashed border-line p-6 text-center">
        <p className="mb-3">Nothing to see yet. Your first check-off founds your city and raises its first building.</p>
        <Link href="/dashboard" className="rounded-md bg-accent px-4 py-2 font-medium text-accent-ink">Go to today</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1">
          {view.trail.map((t) => (
            <li key={t.id} className="flex items-center gap-1">
              <Link href={`/map/${t.id}`} className="underline">{t.name}</Link>
              <span aria-hidden>/</span>
            </li>
          ))}
          <li aria-current="page" className="font-medium text-ink">{view.name}</li>
        </ol>
      </nav>
      <div>
        <h1 className="text-2xl font-bold">{view.name}</h1>
        <p className="text-muted">
          {view.level === "city" ? "City" : view.level[0].toUpperCase() + view.level.slice(1)} · {view.totals.buildings} building{view.totals.buildings === 1 ? "" : "s"}
          {view.level !== "city" && ` across ${view.childCount} ${view.childCount === 1 ? "area" : "areas"}`}
        </p>
      </div>
      <IsoMap view={view} />
    </div>
  );
}

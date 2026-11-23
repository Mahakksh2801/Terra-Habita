import type { Db } from "@/lib/db";
import { fromDbDate } from "@/lib/day";
import { CITY_GRID_SIZE } from "@/lib/game";

export type MapStatus = "healthy" | "decaying" | "ruined";

export interface MapItem {
  id: string;
  gx: number;
  gy: number;
  /** Building type for cities; the child's level for higher zoom levels. */
  type: string;
  /** The habit's colour for habit buildings; unset for milestones and regions. */
  color?: string;
  /** Habit name, for the colour legend. */
  habitName?: string;
  tier: number;
  status: MapStatus;
  label: string;
  detail: string;
  /** Drill-down target for settlements. */
  href?: string;
}

export interface MapView {
  id: string;
  level: string;
  name: string;
  trail: { id: string; name: string; level: string }[];
  gridW: number;
  gridH: number;
  items: MapItem[];
  totals: { buildings: number; healthy: number; decaying: number; ruined: number };
  childCount: number;
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/** Height tier for a region tile, from how many buildings it holds. */
export function regionTier(buildings: number): number {
  if (buildings >= 5000) return 6;
  if (buildings >= 1500) return 5;
  if (buildings >= 500) return 4;
  if (buildings >= 100) return 3;
  if (buildings >= 25) return 2;
  return 1;
}

/** Overall health of a region from its building counts. */
export function regionStatus(healthy: number, decaying: number, ruined: number): MapStatus {
  const total = healthy + decaying + ruined;
  if (!total) return "healthy";
  if (ruined / total >= 0.25) return "ruined";
  if ((decaying + ruined) / total >= 0.15) return "decaying";
  return "healthy";
}

/** The map for one settlement (the active city when no id is given). */
export async function getMap(db: Db, userId: string, id?: string): Promise<MapView | null> {
  const node = id
    ? await db.settlement.findFirst({ where: { id, userId } })
    : await db.settlement.findFirst({ where: { userId, isActive: true } });
  if (!node) return null;

  const trail: MapView["trail"] = [];
  let cursor = node.parentId;
  while (cursor) {
    const p = await db.settlement.findFirstOrThrow({ where: { id: cursor, userId } });
    trail.unshift({ id: p.id, name: p.name, level: p.level });
    cursor = p.parentId;
  }

  const totals = {
    buildings: node.buildingCount,
    healthy: node.healthyCount,
    decaying: node.decayingCount,
    ruined: node.ruinedCount,
  };

  if (node.level === "city") {
    const buildings = await db.building.findMany({
      where: { settlementId: node.id },
      include: { habit: { select: { name: true } }, milestone: { select: { id: true } } },
    });
    const items: MapItem[] = buildings.map((b) => ({
      id: b.id,
      gx: b.gridX,
      gy: b.gridY,
      type: b.type,
      color: b.color ?? undefined,
      habitName: b.color ? (b.habit?.name ?? "Removed habit") : undefined,
      tier: b.tier,
      status: b.status,
      label: `${b.type.replace(/_/g, " ")}`,
      detail: `${b.habit?.name ?? (b.milestone ? "Milestone" : "Removed habit")}, built ${fromDbDate(b.builtOn)}${b.status === "healthy" ? "" : `, ${b.status === "ruined" ? "ruined" : "damaged"} (${b.condition}%)`}`,
    }));
    return { id: node.id, level: node.level, name: node.name, trail, gridW: node.gridSize || CITY_GRID_SIZE, gridH: node.gridSize || CITY_GRID_SIZE, items, totals, childCount: 0 };
  }

  const children = await db.settlement.findMany({ where: { parentId: node.id }, orderBy: { foundedOn: "asc" } });
  const xs = children.map((c) => c.tileX ?? 0);
  const ys = children.map((c) => c.tileY ?? 0);
  const baseX = xs.length ? Math.min(...xs) : 0;
  const baseY = ys.length ? Math.min(...ys) : 0;
  const items: MapItem[] = children.map((c) => ({
    id: c.id,
    gx: (c.tileX ?? 0) - baseX,
    gy: (c.tileY ?? 0) - baseY,
    type: c.level,
    tier: regionTier(c.buildingCount),
    status: regionStatus(c.healthyCount, c.decayingCount, c.ruinedCount),
    label: c.name,
    detail: `${c.level}, ${plural(c.buildingCount, "building")}${c.isActive ? ", growing now" : ""}`,
    href: `/map/${c.id}`,
  }));
  const gridW = Math.max(3, ...items.map((i) => i.gx + 1));
  const gridH = Math.max(3, ...items.map((i) => i.gy + 1));
  return { id: node.id, level: node.level, name: node.name, trail, gridW, gridH, items, totals, childCount: children.length };
}

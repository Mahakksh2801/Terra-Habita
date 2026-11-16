import type { Tx } from "@/lib/db";
import type { Settlement, SettlementLevel } from "@prisma/client";
import {
  CITY_GRID_SIZE, type Level, type LocalDate, planPromotion, settlementName, spiralOrder,
} from "@/lib/game";
import { toDbDate } from "@/lib/day";

/** Children sit on their parent's map in spiral order around its centre. */
const TILE_GRID = 31;

async function foundSettlement(
  tx: Tx,
  userId: string,
  level: Level,
  parentId: string | null,
  today: LocalDate,
  isActive = false,
) {
  const index = await tx.settlement.count({ where: { userId, level } });
  const siblingIndex = parentId ? await tx.settlement.count({ where: { parentId } }) : 0;
  const tile = spiralOrder(TILE_GRID)[siblingIndex];
  const created = await tx.settlement.create({
    data: {
      userId,
      level: level as SettlementLevel,
      name: settlementName(level, index),
      parentId,
      foundedOn: toDbDate(today),
      gridSize: CITY_GRID_SIZE,
      isActive,
      tileX: parentId ? tile.x : null,
      tileY: parentId ? tile.y : null,
    },
  });
  if (parentId) await tx.settlement.update({ where: { id: parentId }, data: { childCount: { increment: 1 } } });
  return created;
}

/** The city new buildings go into, founding the first one if needed. */
export async function ensureActiveCity(tx: Tx, userId: string, today: LocalDate) {
  const active = await tx.settlement.findFirst({ where: { userId, isActive: true } });
  return active ?? foundSettlement(tx, userId, "city", null, today, true);
}

/** The settlement and its ancestors, bottom-up. */
export async function ancestry(tx: Tx, settlementId: string) {
  const chain: Settlement[] = [];
  let id: string | null = settlementId;
  while (id) {
    const s: Settlement = await tx.settlement.findUniqueOrThrow({ where: { id } });
    chain.push(s);
    id = s.parentId;
  }
  return chain;
}

/**
 * Recount building aggregates for the given cities from their buildings, then
 * roll the totals up through every ancestor. Higher levels never scan buildings.
 */
export async function refreshAggregates(tx: Tx, cityIds: Iterable<string>) {
  const ids = [...new Set(cityIds)];
  if (!ids.length) return;
  const counts = await tx.building.groupBy({
    by: ["settlementId", "status"],
    where: { settlementId: { in: ids } },
    _count: { _all: true },
  });
  for (const id of ids) {
    const of = (status: string) =>
      counts.find((c) => c.settlementId === id && c.status === status)?._count._all ?? 0;
    const healthy = of("healthy");
    const decaying = of("decaying");
    const ruined = of("ruined");
    await tx.settlement.update({
      where: { id },
      data: { healthyCount: healthy, decayingCount: decaying, ruinedCount: ruined, buildingCount: healthy + decaying + ruined },
    });
  }

  // Roll up parent by parent.
  let parentIds = new Set(
    (await tx.settlement.findMany({ where: { id: { in: ids } }, select: { parentId: true } }))
      .map((s) => s.parentId)
      .filter((p): p is string => p !== null),
  );
  while (parentIds.size) {
    const next = new Set<string>();
    for (const parentId of parentIds) {
      const sum = await tx.settlement.aggregate({
        where: { parentId },
        _sum: { buildingCount: true, healthyCount: true, decayingCount: true, ruinedCount: true },
        _count: { _all: true },
      });
      const parent = await tx.settlement.update({
        where: { id: parentId },
        data: {
          buildingCount: sum._sum.buildingCount ?? 0,
          healthyCount: sum._sum.healthyCount ?? 0,
          decayingCount: sum._sum.decayingCount ?? 0,
          ruinedCount: sum._sum.ruinedCount ?? 0,
          childCount: sum._count._all,
        },
      });
      if (parent.parentId) next.add(parent.parentId);
    }
    parentIds = next;
  }
}

/**
 * If the active city is now full, found the next city (and any new parents)
 * as planned by the pure promotion rules. Returns the new active city, if any.
 */
export async function promoteIfFull(tx: Tx, userId: string, cityId: string, today: LocalDate) {
  const chain = await ancestry(tx, cityId);
  const plan = planPromotion(
    chain.map((s) => ({ id: s.id, level: s.level as Level, size: s.level === "city" ? s.buildingCount : s.childCount })),
  );
  if (!plan.newChain.length) return null;

  let parentId = plan.chainParentId;
  if (plan.newRoot) {
    const top = chain[chain.length - 1];
    const root = await foundSettlement(tx, userId, plan.newRoot, null, today);
    const tile = spiralOrder(TILE_GRID)[0];
    await tx.settlement.update({ where: { id: top.id }, data: { parentId: root.id, tileX: tile.x, tileY: tile.y } });
    await tx.settlement.update({ where: { id: root.id }, data: { childCount: 1 } });
    parentId = root.id;
  }

  let newCity = null;
  for (const level of plan.newChain) {
    const s = await foundSettlement(tx, userId, level, parentId, today, level === "city");
    parentId = s.id;
    if (level === "city") newCity = s;
  }
  await tx.settlement.update({ where: { id: cityId }, data: { isActive: false } });
  await refreshAggregates(tx, [cityId]);
  return newCity;
}

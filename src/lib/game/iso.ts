/**
 * Isometric projection for the 3-D map. Pure geometry, so it can be unit
 * tested and reused by every zoom level.
 */
export const TILE_W = 64;
export const TILE_H = 32;
/** Pixels of height per height tier (so a tier-6 tower is much taller than tier 1). */
export const TIER_HEIGHT = 11;
export const BASE_HEIGHT = 12;

export interface Point {
  x: number;
  y: number;
}

/** Screen position of the top corner of grid cell (gx, gy). */
export function project(gx: number, gy: number): Point {
  return { x: ((gx - gy) * TILE_W) / 2, y: ((gx + gy) * TILE_H) / 2 };
}

/** Draw order: far cells first so near ones paint over them. */
export function depth(gx: number, gy: number): number {
  return gx + gy;
}

export function buildingHeight(tier: number, status: "healthy" | "decaying" | "ruined"): number {
  const full = BASE_HEIGHT + Math.max(0, tier - 1) * TIER_HEIGHT;
  if (status === "ruined") return Math.max(4, Math.round(full * 0.25));
  if (status === "decaying") return Math.round(full * 0.8);
  return full;
}

const pts = (ps: Point[]) => ps.map((p) => `${round(p.x)},${round(p.y)}`).join(" ");
const round = (n: number) => Math.round(n * 10) / 10;

export interface BoxFaces {
  top: string;
  left: string;
  right: string;
  /** Screen y of the lowest point, for bounding boxes. */
  bottom: number;
}

/**
 * Polygon point strings for a box of the given height standing on cell
 * (gx, gy). `inset` (0..0.4) shrinks the footprint so neighbours have a gap.
 */
export function boxFaces(gx: number, gy: number, height: number, inset = 0.1): BoxFaces {
  const a = inset;
  const b = 1 - inset;
  const c = (u: number, v: number): Point => project(gx + u, gy + v);
  const n = c(a, a); // back corner
  const e = c(b, a);
  const s = c(b, b); // front corner
  const w = c(a, b);
  const up = (p: Point): Point => ({ x: p.x, y: p.y - height });
  return {
    top: pts([up(n), up(e), up(s), up(w)]),
    left: pts([up(w), up(s), s, w]),
    right: pts([up(s), up(e), e, s]),
    bottom: s.y,
  };
}

/** Flat diamond for the ground under cell (gx, gy). */
export function groundTile(gx: number, gy: number): string {
  return pts([project(gx, gy), project(gx + 1, gy), project(gx + 1, gy + 1), project(gx, gy + 1)]);
}

export interface Bounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/** A viewBox that fits a gridW x gridH ground plus the tallest building. */
export function mapBounds(gridW: number, gridH: number, maxHeight: number, pad = 24): Bounds {
  const corners = [project(0, 0), project(gridW, 0), project(0, gridH), project(gridW, gridH)];
  const minX = Math.min(...corners.map((p) => p.x)) - pad;
  const maxX = Math.max(...corners.map((p) => p.x)) + pad;
  const minY = Math.min(...corners.map((p) => p.y)) - maxHeight - pad;
  const maxY = Math.max(...corners.map((p) => p.y)) + pad;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/**
 * A viewBox that fits just the occupied cells (at least `minSpan` cells across)
 * so a young city fills the screen instead of floating on an empty grid.
 */
export function contentBounds(cells: { gx: number; gy: number }[], maxHeight: number, minSpan = 6, pad = 24): Bounds {
  if (!cells.length) return mapBounds(minSpan, minSpan, maxHeight, pad);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of cells) {
    x0 = Math.min(x0, c.gx); y0 = Math.min(y0, c.gy);
    x1 = Math.max(x1, c.gx + 1); y1 = Math.max(y1, c.gy + 1);
  }
  const grow = (lo: number, hi: number): [number, number] => {
    const extra = Math.max(0, minSpan - (hi - lo));
    return [lo - extra / 2, hi + extra / 2];
  };
  [x0, x1] = grow(x0, x1);
  [y0, y1] = grow(y0, y1);
  const corners = [project(x0, y0), project(x1, y0), project(x0, y1), project(x1, y1)];
  const minX = Math.min(...corners.map((p) => p.x)) - pad;
  const maxX = Math.max(...corners.map((p) => p.x)) + pad;
  const minY = Math.min(...corners.map((p) => p.y)) - maxHeight - pad;
  const maxY = Math.max(...corners.map((p) => p.y)) + pad;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

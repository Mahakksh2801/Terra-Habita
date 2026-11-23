/**
 * Isometric projection for the 3-D map. Pure geometry, so it can be unit
 * tested and reused by every zoom level.
 */
export const TILE_W = 64;
export const TILE_H = 32;
import { BUILDING } from "./config";

/** Region tiles on the state/country/... maps grow with how much they hold. */
export const REGION_TIER_HEIGHT = 11;
export const REGION_BASE_HEIGHT = 12;

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

/** Every habit building is the same height, whatever its type, age or condition. */
export function buildingHeight(): number {
  return BUILDING.height;
}

/** Height of a region tile (a city on the state map, and so on). */
export function regionHeight(tier: number, status: "healthy" | "decaying" | "ruined"): number {
  const full = REGION_BASE_HEIGHT + Math.max(0, tier - 1) * REGION_TIER_HEIGHT;
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

export type Face = "left" | "right";

/**
 * Window panes on one visible wall of a box, as polygon point strings:
 * `cols` across the wall and `rows` up it, spread evenly with wall showing
 * between them. The left wall runs from the west corner to the front corner,
 * the right wall from the front corner to the east corner.
 */
export function faceWindows(
  gx: number,
  gy: number,
  height: number,
  inset: number,
  face: Face,
  cols: number = BUILDING.windowCols,
  rows: number = BUILDING.windowRows,
): string[] {
  if (height <= 0 || cols < 1 || rows < 1) return [];
  const a = inset;
  const b = 1 - inset;
  // u runs 0..1 along the wall, lift is pixels above the ground.
  const at = (u: number, lift: number): Point => {
    const p = face === "left" ? project(gx + a + (b - a) * u, gy + b) : project(gx + b, gy + b - (b - a) * u);
    return { x: p.x, y: p.y - lift };
  };
  const out: string[] = [];
  const padU = 0.14;
  const padV = height * 0.12;
  const cellU = (1 - 2 * padU) / cols;
  const cellV = (height - 2 * padV) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u0 = padU + c * cellU + cellU * 0.18;
      const u1 = padU + (c + 1) * cellU - cellU * 0.18;
      const v0 = padV + r * cellV + cellV * 0.18;
      const v1 = padV + (r + 1) * cellV - cellV * 0.18;
      out.push(pts([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)]));
    }
  }
  return out;
}

/** Inner roof plate: the top face shrunk toward its centre. */
export function roofPlate(gx: number, gy: number, height: number, inset: number): string {
  return boxFaces(gx, gy, height, inset).top;
}

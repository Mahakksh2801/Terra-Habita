import { describe, expect, it } from "vitest";
import { contentBounds, faceWindows, roofPlate, boxFaces, buildingHeight, depth, groundTile, mapBounds, project, regionHeight, TILE_H, TILE_W } from "../iso";
import { BUILDING, WINDOWS_PER_FACE } from "../config";

describe("iso projection", () => {
  it("puts the origin at 0,0 and steps half a tile per axis", () => {
    expect(project(0, 0)).toEqual({ x: 0, y: 0 });
    expect(project(1, 0)).toEqual({ x: TILE_W / 2, y: TILE_H / 2 });
    expect(project(0, 1)).toEqual({ x: -TILE_W / 2, y: TILE_H / 2 });
    expect(project(1, 1)).toEqual({ x: 0, y: TILE_H });
  });

  it("orders far cells before near ones", () => {
    expect(depth(0, 0)).toBeLessThan(depth(3, 4));
    expect(depth(5, 1)).toBe(depth(2, 4));
  });

  it("gives every habit building the same height", () => {
    expect(buildingHeight()).toBe(BUILDING.height);
  });

  it("region tiles still grow with tier and shrink when damaged or ruined", () => {
    expect(regionHeight(6, "healthy")).toBeGreaterThan(regionHeight(1, "healthy"));
    expect(regionHeight(3, "decaying")).toBeLessThan(regionHeight(3, "healthy"));
    expect(regionHeight(3, "ruined")).toBeLessThan(regionHeight(3, "decaying"));
    expect(regionHeight(1, "ruined")).toBeGreaterThan(0);
  });

  it("builds three faces whose top is raised by the height", () => {
    const flat = boxFaces(2, 2, 0);
    const tall = boxFaces(2, 2, 20);
    expect(tall.bottom).toBe(flat.bottom);
    expect(tall.top).not.toBe(flat.top);
    for (const f of [tall.top, tall.left, tall.right]) expect(f.split(" ")).toHaveLength(4);
  });

  it("makes a four-corner ground tile and bounds that contain the grid", () => {
    expect(groundTile(0, 0).split(" ")).toHaveLength(4);
    const b = mapBounds(24, 24, 80);
    expect(b.width).toBeGreaterThan(24 * TILE_W - 1);
    expect(b.minY).toBeLessThan(-80);
    expect(b.minX + b.width).toBeGreaterThan(project(24, 0).x);
  });

  it("fits content tightly but never smaller than the minimum span", () => {
    const one = contentBounds([{ gx: 12, gy: 12 }], 12);
    const full = mapBounds(24, 24, 12);
    expect(one.width).toBeLessThan(full.width / 2);
    expect(one.width).toBeGreaterThan(5 * TILE_W / 2);
    const wide = contentBounds([{ gx: 0, gy: 0 }, { gx: 23, gy: 23 }], 12);
    expect(wide.height).toBeGreaterThan(one.height);
  });

  it("puts the same 4 windows on both visible walls, and a roof plate", () => {
    expect(WINDOWS_PER_FACE).toBe(4);
    const h = buildingHeight();
    const left = faceWindows(1, 1, h, BUILDING.inset, "left");
    const right = faceWindows(1, 1, h, BUILDING.inset, "right");
    expect(left).toHaveLength(4);
    expect(right).toHaveLength(4);
    expect(left).not.toEqual(right);
    // Same on a building anywhere else on the grid.
    expect(faceWindows(9, 3, h, BUILDING.inset, "left")).toHaveLength(4);
    for (const w of [...left, ...right]) expect(w.split(" ")).toHaveLength(4);
    expect(roofPlate(1, 1, 30, 0.3)).not.toBe(boxFaces(1, 1, 30, 0.1).top);
  });
});

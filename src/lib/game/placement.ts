/**
 * Grid placement. Cities grow outward from the centre: cells are filled in a
 * square spiral order, so a young city is a compact cluster rather than a row.
 */
export interface Cell {
  x: number;
  y: number;
}

const spiralCache = new Map<number, Cell[]>();

/** Every cell of an n x n grid, ordered by a square spiral from the centre. */
export function spiralOrder(gridSize: number): Cell[] {
  if (!Number.isInteger(gridSize) || gridSize <= 0) throw new RangeError(`bad grid size ${gridSize}`);
  const cached = spiralCache.get(gridSize);
  if (cached) return cached;

  const out: Cell[] = [];
  const total = gridSize * gridSize;
  let x = Math.floor((gridSize - 1) / 2);
  let y = x;
  const dirs = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];
  let dir = 0;
  let leg = 1;
  const inside = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < gridSize && cy < gridSize;
  if (inside(x, y)) out.push({ x, y });
  while (out.length < total) {
    for (let rep = 0; rep < 2; rep++) {
      for (let i = 0; i < leg; i++) {
        x += dirs[dir][0];
        y += dirs[dir][1];
        if (inside(x, y)) out.push({ x, y });
      }
      dir = (dir + 1) % 4;
    }
    leg++;
  }
  spiralCache.set(gridSize, out);
  return out;
}

export const cellKey = (c: Cell) => `${c.x},${c.y}`;

/** The next free cell in spiral order, or null when the grid is full. */
export function nextFreeCell(gridSize: number, occupied: ReadonlySet<string>): Cell | null {
  for (const cell of spiralOrder(gridSize)) if (!occupied.has(cellKey(cell))) return cell;
  return null;
}

/** The next `count` free cells, in order. Fewer are returned if the grid fills. */
export function nextFreeCells(gridSize: number, occupied: ReadonlySet<string>, count: number): Cell[] {
  const out: Cell[] = [];
  if (count <= 0) return out;
  for (const cell of spiralOrder(gridSize)) {
    if (occupied.has(cellKey(cell))) continue;
    out.push(cell);
    if (out.length === count) break;
  }
  return out;
}

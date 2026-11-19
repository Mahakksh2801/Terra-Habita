"use client";

import { memo, useMemo, useRef, useState } from "react";
import { boxFaces, buildingHeight, contentBounds, depth, groundTile, project, rightFaceWindows, roofPlate, TIER_HEIGHT, BASE_HEIGHT } from "@/lib/game/iso";
import type { MapItem, MapView } from "@/server/map";

/** Base colour per building type / region level. */
const BASE: Record<string, string> = {
  gym: "#d9633c",
  library: "#4c7fd0",
  office: "#7a8696",
  plaza: "#e0a63a",
  studio: "#a35fc2",
  house: "#c98a5a",
  shop: "#3fa58f",
  park: "#4fae5a",
  district_hall: "#b5483f",
  landmark: "#e6c14d",
  city: "#5c8f6e",
  state: "#4f8aa8",
  country: "#8d6fb5",
  continent: "#b88a4a",
  world: "#4a7fb8",
};

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function gray(f: number): string {
  const v = Math.round(120 * f);
  return `rgb(${v},${Math.round(v * 0.95)},${Math.round(v * 0.88)})`;
}

/** Park: a low lawn with three trees. */
function Park({ item }: { item: MapItem }) {
  const lawn = boxFaces(item.gx, item.gy, 4, 0.06);
  const trees: [number, number][] = [[0.3, 0.35], [0.68, 0.3], [0.5, 0.7]];
  return (
    <g>
      <title>{`park: ${item.detail}`}</title>
      <polygon points={lawn.left} fill="#3c8a46" />
      <polygon points={lawn.right} fill="#2f6e38" />
      <polygon points={lawn.top} fill="#62c46c" />
      {trees.map(([u, v], i) => {
        const p = project(item.gx + u, item.gy + v);
        return (
          <g key={i}>
            <rect x={p.x - 1} y={p.y - 10} width={2} height={7} fill="#6b4a2b" />
            <circle cx={p.x} cy={p.y - 13} r={6} fill="#2e8b3e" />
            <circle cx={p.x - 1.5} cy={p.y - 14.5} r={3} fill="#58b866" />
          </g>
        );
      })}
    </g>
  );
}

/** A box stacked on another: drawn at `lift` pixels above the ground. */
function Stack({ gx, gy, h, inset, lift, base }: { gx: number; gy: number; h: number; inset: number; lift: number; base: string }) {
  const f = boxFaces(gx, gy, h, inset);
  return (
    <g transform={`translate(0 ${-lift})`}>
      <polygon points={f.left} fill={shade(base, 0.82)} />
      <polygon points={f.right} fill={shade(base, 0.6)} />
      <polygon points={f.top} fill={shade(base, 1.15)} />
    </g>
  );
}

/** District hall: wide base, a narrower upper hall and a cap. Landmark: a gold spire tower. */
function Monument({ item }: { item: MapItem }) {
  const landmark = item.type === "landmark";
  const base = BASE[item.type];
  const h1 = landmark ? 22 : 16;
  const h2 = landmark ? 30 : 12;
  const h3 = landmark ? 18 : 5;
  const top = h1 + h2;
  const tip = project(item.gx + 0.5, item.gy + 0.5);
  return (
    <g>
      <title>{`${item.label}: ${item.detail}`}</title>
      <Stack gx={item.gx} gy={item.gy} h={h1} inset={0.08} lift={0} base={base} />
      <Stack gx={item.gx} gy={item.gy} h={h2} inset={landmark ? 0.24 : 0.2} lift={h1} base={landmark ? base : "#e9e1d0"} />
      <Stack gx={item.gx} gy={item.gy} h={h3} inset={landmark ? 0.36 : 0.3} lift={top} base={landmark ? base : "#b5483f"} />
      {landmark && <polygon points={`${tip.x - 3},${tip.y - top - h3} ${tip.x + 3},${tip.y - top - h3} ${tip.x},${tip.y - top - h3 - 22}`} fill="#fff3b0" />}
      {!landmark && <rect x={tip.x - 0.6} y={tip.y - top - h3 - 14} width={1.2} height={14} fill="#333" />}
      {!landmark && <polygon points={`${tip.x + 0.6},${tip.y - top - h3 - 14} ${tip.x + 8},${tip.y - top - h3 - 11} ${tip.x + 0.6},${tip.y - top - h3 - 8}`} fill="#b5483f" />}
    </g>
  );
}

const Block = memo(function Block({ item }: { item: MapItem }) {
  if (item.type === "park") return <Park item={item} />;
  if (item.type === "district_hall" || item.type === "landmark") return <Monument item={item} />;
  const h = buildingHeight(item.tier, item.status);
  const f = boxFaces(item.gx, item.gy, h, item.href ? 0.06 : 0.12);
  const base = BASE[item.type] ?? "#888888";
  const ruined = item.status === "ruined";
  const faces = ruined
    ? { top: gray(1.1), left: gray(0.72), right: gray(0.55), roof: gray(1.3), glass: gray(1.6) }
    : {
        top: shade(base, 1.12),
        left: shade(base, 0.82),
        right: shade(base, 0.6),
        roof: shade(base, 1.32),
        glass: "rgba(235,246,255,0.55)",
      };
  // Windows only on healthy and damaged towers; ruined ones stay blank.
  const windows = ruined || h < 14 ? [] : rightFaceWindows(item.gx, item.gy, h, item.href ? 0.06 : 0.12, 2, Math.max(1, Math.round(h / 18)));
  const roof = roofPlate(item.gx, item.gy, h, 0.34);
  const body = (
    <g>
      <title>{`${item.label}: ${item.detail}`}</title>
      <polygon points={f.left} fill={faces.left} />
      <polygon points={f.right} fill={faces.right} />
      {windows.map((w, i) => (
        <polygon key={i} points={w} fill={faces.glass} />
      ))}
      <polygon points={f.top} fill={faces.top} />
      <polygon points={roof} fill={faces.roof} opacity={0.9} />
      {item.status === "decaying" && (
        // Damaged: dashed amber top edge plus a crack, so it isn't colour-only.
        <>
          <polygon points={f.top} fill="none" stroke="#ffb020" strokeWidth={2.5} strokeDasharray="4 3" />
          <polyline points={f.left.split(" ").slice(0, 3).join(" ")} fill="none" stroke="#2a1a00" strokeWidth={1.5} />
        </>
      )}
      {ruined && <polygon points={f.top} fill="none" stroke="#6b1e1e" strokeWidth={2} strokeDasharray="2 3" />}
    </g>
  );
  return item.href ? (
    <a href={item.href} aria-label={`${item.label}: ${item.detail}. Open.`} className="cursor-pointer outline-none [&:focus-visible>g]:opacity-80">
      {body}
    </a>
  ) : (
    body
  );
});

export function IsoMap({ view }: { view: MapView }) {
  const maxTier = Math.max(1, ...view.items.map((i) => i.tier));
  const maxH = BASE_HEIGHT + (maxTier - 1) * TIER_HEIGHT;
  const b = useMemo(() => contentBounds(view.items, maxH, view.level === "city" ? 6 : 3), [view.items, view.level, maxH]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const items = useMemo(() => [...view.items].sort((a, c) => depth(a.gx, a.gy) - depth(c.gx, c.gy)), [view.items]);
  const ground = useMemo(() => {
    const tiles: string[] = [];
    for (let x = 0; x < view.gridW; x++) for (let y = 0; y < view.gridH; y++) tiles.push(groundTile(x, y));
    return tiles;
  }, [view.gridW, view.gridH]);

  const vw = b.width / zoom;
  const vh = b.height / zoom;
  const vx = b.minX + (b.width - vw) / 2 - pan.x;
  const vy = b.minY + (b.height - vh) / 2 - pan.y;

  const scale = () => (svgRef.current ? vw / svgRef.current.getBoundingClientRect().width : 1);
  const clampZoom = (z: number) => Math.max(1, Math.min(8, z));

  const legend = [
    { label: "Healthy: full height, full colour", cls: "bg-healthy" },
    { label: "Damaged: shorter, dashed amber top", cls: "bg-decaying" },
    { label: "Ruined: low grey rubble", cls: "bg-ruined" },
  ];
  const kinds = view.level === "city" ? [...new Set(view.items.map((i) => i.type))] : [];

  return (
    <div>
      <div className="relative overflow-hidden rounded-lg border border-line bg-surface">
        <svg
          ref={svgRef}
          viewBox={`${vx} ${vy} ${vw} ${vh}`}
          role="img"
          aria-label={`Isometric map of ${view.name}, ${view.items.length} ${view.level === "city" ? "buildings" : "areas"}. A list follows below.`}
          className="block h-[70vh] min-h-[320px] w-full touch-none select-none"
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
            (e.target as Element).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const k = scale();
            setPan({ x: d.px + (e.clientX - d.x) * k, y: d.py + (e.clientY - d.y) * k });
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={(e) => setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))}
        >
          <defs>
            <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--surface)" />
              <stop offset="1" stopColor="var(--line)" stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <g aria-hidden>
            {ground.map((p, i) => (
              <polygon key={i} points={p} fill="url(#ground)" stroke="var(--line)" strokeOpacity={0.6} strokeWidth={0.6} />
            ))}
          </g>
          <g>{items.map((it) => <Block key={it.id} item={it} />)}</g>
        </svg>
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => clampZoom(z * 1.4))} className="h-9 w-9 rounded-md border border-line bg-surface text-lg font-semibold">+</button>
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => clampZoom(z / 1.4))} className="h-9 w-9 rounded-md border border-line bg-surface text-lg font-semibold">−</button>
          <button type="button" aria-label="Reset view" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="h-9 w-9 rounded-md border border-line bg-surface text-xs">Fit</button>
        </div>
        {!view.items.length && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-muted">Empty ground. Your first check-off raises a building here.</p>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted" aria-label="Legend">
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-2"><span className={`inline-block h-3 w-3 rounded-sm ${l.cls}`} aria-hidden />{l.label}</li>
        ))}
        {kinds.map((k) => (
          <li key={k} className="flex items-center gap-2 capitalize"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: BASE[k] }} aria-hidden />{k.replace(/_/g, " ")}</li>
        ))}
        <li>Taller means more lifetime completions when it was built. Drag to pan, scroll or +/− to zoom.</li>
      </ul>

      <details className="mt-4">
        <summary className="cursor-pointer font-medium">List of {view.level === "city" ? "buildings" : "areas"} ({view.items.length})</summary>
        <ul className="mt-2 space-y-1 text-sm">
          {[...view.items].reverse().map((i) => (
            <li key={i.id}>
              {i.href ? <a className="underline" href={i.href}>{i.label}</a> : <span className="font-medium capitalize">{i.label}</span>}
              <span className="text-muted"> · {i.detail}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

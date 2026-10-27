// Deterministic plan for the 20 ordinary city blocks: stacked boxes that stay
// strictly inside each lot footprint, roof clutter, beacons, crown lights,
// rooftop billboards and sidewalk trees. Pure data; the bake step turns it
// into merged geometry.

import { neon } from '@/styles/tokens';
import { BUILDING_LOTS, DISTRICTS, type DistrictId, type Rect } from '../config/layout';
import { ACCENT, COLORS, FLOOR_H, SECONDARY, WIN_COLS, WIN_ROWS } from './constants';
import { createRng, type Rng } from './lib/random';

export interface PlanBox {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y0: number;
  y1: number;
  color: string;
  /** Window light gain (0 = blank wall). */
  win: number;
  uOff: number;
  vOff: number;
}

export interface RoofItem {
  kind: 'ac' | 'tank' | 'vent' | 'antenna';
  x: number;
  z: number;
  y: number;
  sx: number;
  sy: number;
  sz: number;
}

export interface BeaconSpec {
  x: number;
  y: number;
  z: number;
  color: string;
  /** Blinks per second (0 = steady). */
  rate: number;
  phase: number;
  size: number;
  intensity: number;
}

export interface BillboardSpec {
  id: string;
  text: string;
  color: string;
  font: 'display' | 'mono';
  x: number;
  y: number;
  z: number;
  rotationY: number;
  fontSize: number;
  width: number;
  flicker: boolean;
}

export interface CrownSpec {
  box: PlanBox;
  color: string;
  corners: boolean;
}

export interface TreeSpec {
  x: number;
  z: number;
  y: number;
  scale: number;
  tint: number;
}

export interface CityPlan {
  boxes: PlanBox[];
  roofItems: RoofItem[];
  beacons: BeaconSpec[];
  crowns: CrownSpec[];
  billboards: BillboardSpec[];
  trees: TreeSpec[];
}

/** Total height range per lot ring (index within the mirrored local list). */
const HEIGHTS: Array<[number, number]> = [
  [6.5, 10.5], // nearest the hub — keeps the centre open
  [10, 15.5],
  [12.5, 19],
  [12.5, 19],
  [18.5, 26],
];

const MARGIN = 0.75;
const SIZE = 5.5; // five bays

const BILLBOARDS: Record<string, { text: string; color: string; font: 'display' | 'mono'; flicker?: boolean }> = {
  'nw-0': { text: 'O(log n)', color: neon.cyan, font: 'mono' },
  'ne-0': { text: 'f/1.8', color: neon.magenta, font: 'display', flicker: true },
  'sw-1': { text: 'HELLO, WORLD', color: neon.emerald, font: 'mono' },
  'se-1': { text: '24 FPS', color: neon.violet, font: 'display' },
};

const floors = (h: number) => Math.max(1, Math.round(h / FLOOR_H)) * FLOOR_H;

function nearestDistrict(x: number, z: number): DistrictId {
  let best: DistrictId = 'hub';
  let bestD = Infinity;
  for (const id of ['engineering', 'creative', 'about', 'gaming'] as const) {
    const [cx, cz] = DISTRICTS[id].center;
    const d = Math.hypot(x - cx, z - cz);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

interface LocalBox {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y0: number;
  y1: number;
  win: number;
}

function archetype(r: Rng, ring: number, H: number): LocalBox[] {
  const roll = r.next();
  const out: LocalBox[] = [];
  const gain = () => r.range(0.72, 1.2);
  if (roll < 0.4) {
    // Podium + tower (+ crown).
    const hp = floors(r.range(1.8, 2.8));
    out.push({ x0: 0, x1: SIZE, z0: 0, z1: SIZE, y0: 0, y1: hp, win: r.range(1.05, 1.3) });
    const w = r.chance(0.5) ? 3.3 : 4.4;
    const d = r.chance(0.5) ? 3.3 : 4.4;
    const ox = r.pick([0, (SIZE - w) / 2, SIZE - w]);
    const oz = r.pick([0, (SIZE - d) / 2, SIZE - d]);
    const top = Math.max(hp + 2 * FLOOR_H, H);
    out.push({ x0: ox, x1: ox + w, z0: oz, z1: oz + d, y0: hp, y1: top, win: gain() });
    if (top > 11 && r.chance(0.6)) {
      const cw = w - 1.1;
      const cd = d - 1.1;
      out.push({ x0: ox + 0.55, x1: ox + 0.55 + cw, z0: oz + 0.55, z1: oz + 0.55 + cd, y0: top, y1: top + floors(r.range(1.8, 2.8)), win: gain() * 0.8 });
    }
  } else if (roll < 0.62) {
    // Twin slabs.
    const second = floors(H * r.range(0.55, 0.85));
    out.push({ x0: 0, x1: 2.2, z0: 0, z1: SIZE, y0: 0, y1: H, win: gain() });
    out.push({ x0: 3.3, x1: SIZE, z0: 0, z1: SIZE, y0: 0, y1: second, win: gain() });
  } else if (roll < 0.82) {
    // Slab + low annex.
    const annex = floors(H * r.range(0.32, 0.5));
    out.push({ x0: 0, x1: SIZE, z0: 0, z1: 3.3, y0: 0, y1: H, win: gain() });
    out.push({ x0: 0, x1: SIZE, z0: 3.3, z1: SIZE, y0: 0, y1: annex, win: r.range(0.9, 1.25) });
  } else {
    // Stepped (wedding cake).
    const a = floors(H * 0.45);
    const b = floors(H * 0.75);
    out.push({ x0: 0, x1: SIZE, z0: 0, z1: SIZE, y0: 0, y1: a, win: gain() });
    out.push({ x0: 0.55, x1: 4.95, z0: 0.55, z1: 4.95, y0: a, y1: b, win: gain() });
    out.push({ x0: 1.1, x1: 4.4, z0: 1.1, z1: 4.4, y0: b, y1: Math.max(b + 2 * FLOOR_H, H), win: gain() });
  }
  // Random quarter turn / mirror so neighbouring blocks differ.
  const turn = r.int(0, 3);
  return out.map((b) => rotateLocal(b, turn));
}

function rotateLocal(b: LocalBox, turn: number): LocalBox {
  let { x0, x1, z0, z1 } = b;
  for (let i = 0; i < turn; i++) {
    // (x, z) → (z, SIZE - x)
    const nx0 = z0;
    const nx1 = z1;
    const nz0 = SIZE - x1;
    const nz1 = SIZE - x0;
    x0 = nx0;
    x1 = nx1;
    z0 = nz0;
    z1 = nz1;
  }
  return { ...b, x0, x1, z0, z1 };
}

function treesFor(lot: Rect, ring: number, r: Rng): TreeSpec[] {
  const out: TreeSpec[] = [];
  const inset = 0.38;
  // Edges facing the avenues (closest to the x = 0 and z = 0 axes).
  const innerX = Math.abs(lot.minX) < Math.abs(lot.maxX) ? lot.minX + inset : lot.maxX - inset;
  const innerZ = Math.abs(lot.minZ) < Math.abs(lot.maxZ) ? lot.minZ + inset : lot.maxZ - inset;
  const along = [1.25, 3.5, 5.75];
  const edges: Array<'x' | 'z'> = ring === 0 ? ['x', 'z'] : r.chance(0.5) ? ['x'] : ['z'];
  for (const edge of edges) {
    for (const t of along) {
      if (!r.chance(0.85)) continue;
      const x = edge === 'x' ? innerX : lot.minX + t;
      const z = edge === 'z' ? innerZ : lot.minZ + t;
      out.push({ x, z, y: 0.12, scale: r.range(0.82, 1.1), tint: r.range(0.8, 1.2) });
    }
  }
  return out;
}

export function planCity(): CityPlan {
  const plan: CityPlan = { boxes: [], roofItems: [], beacons: [], crowns: [], billboards: [], trees: [] };

  BUILDING_LOTS.forEach((lot) => {
    const ring = Number(lot.id.split('-')[1]);
    const r = createRng(`lot:${lot.id}`);
    const [hMin, hMax] = HEIGHTS[ring] ?? HEIGHTS[0];
    const H = floors(r.range(hMin, hMax));
    const ox = lot.minX + MARGIN;
    const oz = lot.minZ + MARGIN;
    const facade = r.pick(COLORS.facades);
    const local = archetype(r, ring, H);
    const boxes: PlanBox[] = local.map((b) => ({
      x0: ox + b.x0,
      x1: ox + b.x1,
      z0: oz + b.z0,
      z1: oz + b.z1,
      y0: b.y0,
      y1: b.y1,
      color: facade,
      win: b.win,
      uOff: r.int(0, WIN_COLS - 1),
      vOff: r.int(0, WIN_ROWS - 1),
    }));
    plan.boxes.push(...boxes);

    const top = boxes.reduce((a, b) => (b.y1 > a.y1 ? b : a));
    const cx = (lot.minX + lot.maxX) / 2;
    const cz = (lot.minZ + lot.maxZ) / 2;
    const district = nearestDistrict(cx, cz);

    // Roof clutter on the highest roof (inset so it never overhangs).
    const rx0 = top.x0 + 0.45;
    const rx1 = top.x1 - 0.45;
    const rz0 = top.z0 + 0.45;
    const rz1 = top.z1 - 0.45;
    const billboard = BILLBOARDS[lot.id];
    const units = billboard ? 1 : r.int(1, 3);
    for (let i = 0; i < units; i++) {
      plan.roofItems.push({ kind: 'ac', x: r.range(rx0 + 0.4, rx1 - 0.4), z: r.range(rz0 + 0.3, rz1 - 0.3), y: top.y1, sx: 0.72, sy: 0.42, sz: 0.5 });
    }
    if (r.chance(0.35) && !billboard) {
      plan.roofItems.push({ kind: 'tank', x: r.range(rx0 + 0.5, rx1 - 0.5), z: r.range(rz0 + 0.5, rz1 - 0.5), y: top.y1, sx: 0.42, sy: 0.85, sz: 0.42 });
    }
    if (r.chance(0.5)) {
      plan.roofItems.push({ kind: 'vent', x: r.range(rx0 + 0.2, rx1 - 0.2), z: r.range(rz0 + 0.2, rz1 - 0.2), y: top.y1, sx: 0.3, sy: 0.32, sz: 0.3 });
    }
    if (r.chance(ring >= 2 ? 0.75 : 0.45)) {
      const x = r.range(rx0, rx1);
      const z = r.range(rz0, rz1);
      const h = r.range(1.4, ring >= 4 ? 3.6 : 2.4);
      plan.roofItems.push({ kind: 'antenna', x, z, y: top.y1, sx: 0.06, sy: h, sz: 0.06 });
      plan.beacons.push({ x, y: top.y1 + h + 0.06, z, color: neon.amber, rate: r.range(0.45, 0.8), phase: r.next(), size: 0.11, intensity: 3.2 });
    }

    // Restrained crown light on roughly a third of the blocks.
    if (r.chance(0.42) && !billboard) {
      plan.crowns.push({ box: top, color: r.chance(0.6) ? ACCENT[district] : r.pick(SECONDARY[district]), corners: ring === 4 && r.chance(0.6) });
    }

    if (billboard) {
      const rotationY = Math.atan2(-cx, -cz); // face the hub
      const roofW = Math.min(top.x1 - top.x0, top.z1 - top.z0);
      const em = billboard.font === 'mono' ? 0.6 : 0.85;
      const width = Math.min(roofW * 1.25, 4.6);
      const fontSize = Math.min(0.78, width / (billboard.text.length * em));
      plan.billboards.push({
        id: lot.id,
        text: billboard.text,
        color: billboard.color,
        font: billboard.font,
        x: (top.x0 + top.x1) / 2,
        y: top.y1 + 1.15,
        z: (top.z0 + top.z1) / 2,
        rotationY,
        fontSize,
        width,
        flicker: Boolean(billboard.flicker),
      });
    }

    plan.trees.push(...treesFor(lot, ring, r));
  });

  return plan;
}

export const CITY_PLAN: CityPlan = planCity();

// Gaming Zone (static parts): the hex light floor of the plaza, the three
// arcade cabinets (bodies, trims, marquees, pads), the open-frame gaming PC
// and the hub data server (see pcRig.ts / server.ts), and the arena access
// roads with their arrows. Screens and RGB effects are animated components
// (Gaming.tsx); positions all come from layout.ts so colliders agree.

import { ExtrudeGeometry, Matrix4, Shape, Vector3, type BufferGeometry } from 'three';
import { neon } from '@/styles/tokens';
import { ARENA, GAMING_SPOTS, PLAZAS, RACE, type InteractiveSpot } from '../../config/layout';
import { COLORS, Y } from '../constants';
import { rgb, type RGB } from '../lib/GeometryBuilder';
import { createRng } from '../lib/random';
import { signUv } from '../lib/signAtlas';
import { zoneUv } from '../lib/zoneAtlas';
import { decal } from './streets';
import { cylinder, type Builders } from './builders';
import { atlasQuad, Frame, localMat } from './frame';
import { bakePcRig } from './pcRig';
import { bakeServer } from './server';

const UP = new Vector3(0, 1, 0);

// ---------------------------------------------------------------- cabinets

export interface CabinetDef {
  spot: InteractiveSpot;
  screen: 'blocks' | 'pacmaze' | 'catgpt';
  marquee: string;
  accent: string;
  body: string;
}

export const CABINETS: CabinetDef[] = [
  { spot: GAMING_SPOTS.tetris, screen: 'blocks', marquee: 'cab:blocks', accent: neon.cyan, body: '#121a36' },
  { spot: GAMING_SPOTS.pacman, screen: 'pacmaze', marquee: 'cab:pacmaze', accent: '#ffd23e', body: '#1f1a0c' },
  { spot: GAMING_SPOTS.catgpt, screen: 'catgpt', marquee: 'cab:catgpt', accent: neon.magenta, body: '#220c26' },
];

/** Cabinet dimensions in its local frame (front = +Z). */
export const CAB = {
  /** Uniform scale of the whole cabinet (footprint stays inside the 0.8 collider). */
  scale: 1.22,
  width: 0.86,
  /** Side profile (z, y), counter-clockwise. */
  profile: [
    [0.36, 0.0],
    [0.36, 0.9],
    [0.44, 0.96],
    [0.44, 1.02],
    [0.2, 1.1],
    [0.08, 1.78],
    [0.2, 1.84],
    [0.2, 2.14],
    [-0.4, 2.14],
    [-0.4, 0.0],
  ] as Array<[number, number]>,
  /** Screen centre / size / tilt (rx) in the local frame. */
  screen: { y: 1.44, z: 0.152, w: 0.5, h: 0.625, rx: -Math.atan2(0.12, 0.68) },
  marquee: { y: 1.99, z: 0.206, w: 0.82 },
  /** Control panel surface: front lip (z, y) → back (z, y). */
  panel: { z0: 0.44, y0: 1.02, z1: 0.2, y1: 1.1 },
} as const;

let cabinetTemplate: BufferGeometry | null = null;
function cabinetBody(): BufferGeometry {
  if (!cabinetTemplate) {
    const shape = new Shape();
    CAB.profile.forEach(([z, y], i) => (i === 0 ? shape.moveTo(z, y) : shape.lineTo(z, y)));
    shape.closePath();
    const g = new ExtrudeGeometry(shape, { depth: CAB.width, bevelEnabled: false, curveSegments: 1 });
    // Shape x → local Z, shape y → local Y, extrusion → local −X (right-handed), centred on x.
    g.applyMatrix4(new Matrix4().set(0, 0, -1, CAB.width / 2, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
    cabinetTemplate = g.index ? g.toNonIndexed() : g;
  }
  return cabinetTemplate;
}

/** Point on the control panel surface at fraction t (0 = front lip). */
export function panelPoint(t: number): [number, number] {
  const p = CAB.panel;
  return [p.z0 + (p.z1 - p.z0) * t, p.y0 + (p.y1 - p.y0) * t];
}

export function cabinetFrame(def: CabinetDef): Frame {
  return new Frame(def.spot.x, 0, def.spot.z, def.spot.rotationY, CAB.scale);
}

function cabinet(b: Builders, def: CabinetDef): void {
  const { spot } = def;
  const f = cabinetFrame(def);
  const body = rgb(def.body);
  const dark = rgb('#07080d');
  const accent = rgb(def.accent, 1.7);
  const soft = rgb(def.accent, 0.9);
  f.geo(b.metal, cabinetBody(), new Matrix4(), body);
  // Screen bezel (dark glass) just proud of the sloped front.
  const s = CAB.screen;
  f.box(b.glass, 0, s.y, s.z - 0.012, s.w + 0.12, s.h + 0.12, 0.012, dark, s.rx);
  // Neon trims along the front profile on both sides.
  const hw = CAB.width / 2 + 0.004;
  for (const x of [-hw, hw]) {
    for (let i = 0; i < 7; i++) {
      const [z0, y0] = CAB.profile[i];
      const [z1, y1] = CAB.profile[i + 1];
      f.bar(b.neon, [x, y0, z0], [x, y1, z1], 0.028, i >= 5 ? soft : accent);
    }
    f.bar(b.neon, [x, 2.14, 0.2], [x, 2.14, -0.4], 0.028, soft);
    // A stripe of side art.
    f.bar(b.neon, [x, 0.25, 0.3], [x, 1.55, -0.3], 0.05, rgb(def.accent, 0.8));
  }
  // Marquee box front: light bar under it and the atlas marquee.
  const m = CAB.marquee;
  f.box(b.neon, 0, 1.84 - 0.012, 0.18, CAB.width - 0.04, 0.02, 0.05, accent);
  const zq = zoneUv(def.marquee);
  f.quad(b.zone, 0, m.y, m.z, m.w, m.w / zq.aspect, rgb('#ffffff', 1.25), zq.uv);
  // Coin door.
  f.box(b.metal, 0, 0.55, 0.365, 0.34, 0.36, 0.012, rgb('#0b0c12'));
  for (const x of [-0.07, 0.07]) f.box(b.neon, x, 0.62, 0.373, 0.035, 0.08, 0.006, rgb(neon.amber, 2.2));
  // Joystick (static; the buttons blink in the FX mesh).
  const [jz, jy] = panelPoint(0.45);
  f.geo(b.metal, cylinder(10), localMat(-0.18, jy + 0.06, jz, 0.012, 0.12, 0.012), dark);
  f.geo(b.neon, cylinder(10), localMat(-0.18, jy + 0.13, jz, 0.035, 0.05, 0.035), rgb(def.accent, 1.4));
  // Pad ring and a light pool in front of the screen.
  b.neon.flatRing(spot.pad.x, spot.pad.z, spot.pad.radius - 0.06, 0.06, Y.inlay, rgb(def.accent, 1.2), 56);
  b.neon.flatRing(spot.pad.x, spot.pad.z, spot.pad.radius - 0.32, 0.03, Y.inlay, rgb(def.accent, 0.6), 48);
  const fx = Math.sin(spot.rotationY);
  const fz = Math.cos(spot.rotationY);
  decal(b, spot.x + fx * 1.2, spot.z + fz * 1.2, 2.6, 2.4, spot.rotationY, def.accent, 0.3);
  decal(b, spot.x, spot.z, 2.0, 2.0, 0, def.accent, 0.12);
}

// ---------------------------------------------------------------- plaza floor

function hexFloor(b: Builders): void {
  const plaza = PLAZAS.find((p) => p.id === 'gaming');
  if (!plaza) return;
  const { x: cx, z: cz } = plaza;
  const R = 1.05; // hex circumradius
  const w = Math.sqrt(3) * R;
  const rInner = 2.5;
  const rOuter = plaza.r - 0.75;
  const r = createRng('gaming-hex');
  const line = rgb(neon.orange, 0.2);
  const palette = [neon.orange, neon.magenta, neon.amber, neon.orange];
  const keepClear = Object.values(GAMING_SPOTS);
  for (let q = -6; q <= 6; q++) {
    for (let k = -6; k <= 6; k++) {
      const hx = cx + w * (q + k / 2);
      const hz = cz + 1.5 * R * k;
      const d = Math.hypot(hx - cx, hz - cz);
      if (d > rOuter || d < rInner) continue;
      // Outline edges (flat quads), each hex draws its six; shared edges overlap harmlessly.
      for (let i = 0; i < 6; i++) {
        const a0 = Math.PI / 6 + (i * Math.PI) / 3;
        const a1 = a0 + Math.PI / 3;
        const x0 = hx + Math.cos(a0) * R;
        const z0 = hz + Math.sin(a0) * R;
        const x1 = hx + Math.cos(a1) * R;
        const z1 = hz + Math.sin(a1) * R;
        const len = Math.hypot(x1 - x0, z1 - z0);
        b.markings.flatQuad((x0 + x1) / 2, (z0 + z1) / 2, len, 0.045, -Math.atan2(z1 - z0, x1 - x0), Y.marking, line);
      }
      // Some cells glow (soft additive tiles), never under a prop.
      if (keepClear.some((s) => Math.hypot(hx - s.x, hz - s.z) < 1.4)) continue;
      if (!r.chance(0.16)) continue;
      const color = rgb(r.pick(palette), r.range(0.06, 0.12));
      for (let i = 0; i < 6; i++) {
        const a0 = Math.PI / 6 + (i * Math.PI) / 3;
        const a1 = a0 + Math.PI / 3;
        const ri = R * 0.92;
        b.decals.tri(
          new Vector3(hx, Y.decal, hz),
          new Vector3(hx + Math.cos(a1) * ri, Y.decal, hz + Math.sin(a1) * ri),
          new Vector3(hx + Math.cos(a0) * ri, Y.decal, hz + Math.sin(a0) * ri),
          color,
          [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        );
      }
    }
  }
  // A chequered band just inside the plaza rim, behind the cabinets.
  const band0 = plaza.r - 0.62;
  const band1 = plaza.r - 0.42;
  const n = 120;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const c: RGB = i % 2 ? rgb(neon.orange, 0.55) : rgb('#0b0c14');
    const p = (a: number, rr: number) => new Vector3(cx + Math.cos(a) * rr, Y.marking, cz + Math.sin(a) * rr);
    b.markings.quad(p(a0, band0), p(a1, band0), p(a1, band1), p(a0, band1), c);
  }
}

// ---------------------------------------------------------------- access roads

function accessRoads(b: Builders): void {
  const asphalt = rgb(COLORS.asphalt);
  const edge = rgb(neon.white, 0.35);
  const arrow = rgb(neon.orange, 1.05);
  const south = new Vector3(0, 0, 1);
  const chev = signUv('chevron');
  const word = zoneUv('ground:arena');
  for (const road of ARENA.accessRoads) {
    b.asphalt.flatRect(road.minX, road.minZ, road.maxX, road.maxZ, Y.avenue, asphalt);
    const cx = (road.minX + road.maxX) / 2;
    // Dashed edge lines outside the plaza.
    for (let z = 33.4; z < road.maxZ - 0.6; z += 1.6) {
      for (const x of [road.minX + 0.3, road.maxX - 0.3]) b.neon.flatRect(x - 0.05, z, x + 0.05, z + 0.8, Y.marking, edge);
    }
    // Chevrons toward the arena and the painted word before the entrance.
    for (let z = 34.5; z < road.maxZ - 4.5; z += 1.5) atlasQuad(b.signs, chev, new Vector3(cx, Y.inlay + 0.003, z), UP, south, 1.25, arrow);
    atlasQuad(b.zone, word, new Vector3(cx, Y.decal + 0.004, road.maxZ - 2.6), UP, south, 5.2, rgb(neon.orange, 1.0));
  }
}

// ---------------------------------------------------------------- race start

function raceStart(b: Builders): void {
  const s = RACE.start;
  // Chequered grid line just ahead of the start spot (the car faces south).
  const z = s.z + 1.8;
  const sq = 0.4;
  for (let i = 0; i < 12; i++) {
    for (let j = 0; j < 2; j++) {
      const x0 = s.x - 2.4 + i * sq;
      const c = (i + j) % 2 ? rgb('#e8ecf6', 0.75) : rgb('#0a0b12');
      b.markings.flatRect(x0, z + j * sq, x0 + sq, z + (j + 1) * sq, Y.marking, c);
    }
  }
  atlasQuad(b.zone, zoneUv('ground:start'), new Vector3(s.x, Y.decal + 0.004, z + 2.3), UP, new Vector3(0, 0, 1), 3.9, rgb(neon.white, 1.1));
  decal(b, s.x, s.z, 3.4, 3.4, 0, neon.orange, 0.2);
}

export function bakeGaming(b: Builders): void {
  hexFloor(b);
  for (const def of CABINETS) cabinet(b, def);
  bakePcRig(b);
  bakeServer(b);
  accessRoads(b);
  raceStart(b);
}

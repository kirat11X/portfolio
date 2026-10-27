// Car-soccer arena (static): striped turf, line markings, glowing walls that
// match ARENA.walls exactly (they are colliders), LED boards on the inner
// faces, framed goals with nets (cyan north, orange south), boost-pad floor
// glows, floodlight towers, spectator stands with canopies, and the stadium
// scoreboard frame (live digits: <ArenaScoreboard />).

import { Vector3 } from 'three';
import { neon } from '@/styles/tokens';
import { ARENA, type ArenaWall } from '../../config/layout';
import { Y } from '../constants';
import { rgb, trs, type RGB } from '../lib/GeometryBuilder';
import { createRng } from '../lib/random';
import { zoneUv } from '../lib/zoneAtlas';
import { decal } from './streets';
import { cylinder, type Builders } from './builders';
import { atlasQuad } from './frame';
import { ARENA_LAMPS, BLEACHERS, FLOODLIGHTS, PARKING, SCOREBOARD } from '../gamingLayout';

const _a = new Vector3();
const _b = new Vector3();
const UP = new Vector3(0, 1, 0);

export const TEAM = { home: neon.cyan, away: neon.orange } as const;
export const GOAL_HEIGHT = 2.7;

/** Boost pads: big ones near the corners and halfway line, small ones between. */
export const BOOST_PADS: Array<{ x: number; z: number; r: number }> = (() => {
  const { pitch } = ARENA;
  const cz = ARENA.center.z;
  return [
    { x: pitch.minX + 3, z: pitch.minZ + 3.4, r: 1.0 },
    { x: pitch.maxX - 3, z: pitch.minZ + 3.4, r: 1.0 },
    { x: pitch.minX + 3, z: pitch.maxZ - 3.4, r: 1.0 },
    { x: pitch.maxX - 3, z: pitch.maxZ - 3.4, r: 1.0 },
    { x: pitch.minX + 2.6, z: cz, r: 1.0 },
    { x: pitch.maxX - 2.6, z: cz, r: 1.0 },
    { x: -8, z: cz - 6, r: 0.55 },
    { x: 8, z: cz - 6, r: 0.55 },
    { x: -8, z: cz + 6, r: 0.55 },
    { x: 8, z: cz + 6, r: 0.55 },
  ];
})();

function turf(b: Builders): void {
  const { pitch, goals } = ARENA;
  const a = rgb('#0e2622');
  const c = rgb('#122d28');
  const band = 2;
  for (let z = pitch.minZ, i = 0; z < pitch.maxZ - 1e-6; z += band, i++) {
    b.asphalt.flatRect(pitch.minX, z, pitch.maxX, Math.min(pitch.maxZ, z + band), Y.avenue, i % 2 ? a : c);
  }
  for (const g of Object.values(goals)) b.asphalt.flatRect(g.area.minX, g.area.minZ, g.area.maxX, g.area.maxZ, Y.avenue, rgb('#0a1513'));
  // Faint team tint over each half.
  const cz = ARENA.center.z;
  decal(b, 0, (pitch.minZ + cz) / 2, 34, 14, 0, TEAM.home, 0.05);
  decal(b, 0, (pitch.maxZ + cz) / 2, 34, 14, 0, TEAM.away, 0.05);
}

function lines(b: Builders): void {
  const { pitch } = ARENA;
  const line = rgb(neon.white, 0.6);
  const y = Y.marking;
  const t = 0.08;
  const rect = (x0: number, z0: number, x1: number, z1: number, color: RGB = line) => {
    b.neon.flatRect(x0, z0 - t, x1, z0 + t, y, color);
    b.neon.flatRect(x0, z1 - t, x1, z1 + t, y, color);
    b.neon.flatRect(x0 - t, z0, x0 + t, z1, y, color);
    b.neon.flatRect(x1 - t, z0, x1 + t, z1, y, color);
  };
  const inset = 0.6;
  rect(pitch.minX + inset, pitch.minZ + inset, pitch.maxX - inset, pitch.maxZ - inset);
  const cz = ARENA.center.z;
  b.neon.flatRect(pitch.minX + inset, cz - t, pitch.maxX - inset, cz + t, y, line);
  b.neon.flatRing(ARENA.center.x, cz, 4.2, 0.12, y, line, 96);
  b.neon.flatRing(ARENA.center.x, cz, 4.6, 0.04, y, rgb(neon.white, 0.3), 96);
  b.neon.flatRing(ARENA.ballSpawn.x, ARENA.ballSpawn.z, 0.32, 0.3, y, line, 24);
  // Penalty boxes and arcs, tinted by the team defending them.
  rect(-7.5, pitch.minZ + inset, 7.5, pitch.minZ + 6, rgb(TEAM.home, 0.9));
  rect(-7.5, pitch.maxZ - 6, 7.5, pitch.maxZ - inset, rgb(TEAM.away, 0.9));
  b.neon.flatRing(0, pitch.minZ + 6, 2.6, 0.08, y, rgb(TEAM.home, 0.9), 32, 0, Math.PI);
  b.neon.flatRing(0, pitch.maxZ - 6, 2.6, 0.08, y, rgb(TEAM.away, 0.9), 32, Math.PI, Math.PI * 2);
  // Corner arcs.
  const corners: Array<[number, number, number]> = [
    [pitch.minX + inset, pitch.minZ + inset, 0],
    [pitch.maxX - inset, pitch.minZ + inset, Math.PI / 2],
    [pitch.maxX - inset, pitch.maxZ - inset, Math.PI],
    [pitch.minX + inset, pitch.maxZ - inset, (3 * Math.PI) / 2],
  ];
  for (const [x, z, a0] of corners) b.neon.flatRing(x, z, 1.1, 0.08, y, line, 10, a0, a0 + Math.PI / 2);
}

function boostPads(b: Builders): void {
  for (const pad of BOOST_PADS) {
    const color = pad.z < ARENA.center.z ? TEAM.home : TEAM.away;
    b.neon.flatRing(pad.x, pad.z, pad.r, 0.07, Y.inlay, rgb(color, 1.5), 36);
    decal(b, pad.x, pad.z, pad.r * 3.4, pad.r * 3.4, 0, neon.amber, 0.28);
  }
}

/** Inner face of a wall: the face looking at the pitch. */
function innerFace(w: ArenaWall): { normal: Vector3; centre: Vector3; length: number; along: 'x' | 'z' } | null {
  const { pitch } = ARENA;
  const alongX = w.maxX - w.minX >= w.maxZ - w.minZ;
  if (alongX) {
    const z = Math.abs(w.maxZ - pitch.minZ) < 1e-6 ? w.maxZ : Math.abs(w.minZ - pitch.maxZ) < 1e-6 ? w.minZ : null;
    if (z === null) return null;
    return { normal: new Vector3(0, 0, z === w.maxZ ? 1 : -1), centre: new Vector3((w.minX + w.maxX) / 2, 0, z), length: w.maxX - w.minX, along: 'x' };
  }
  const x = Math.abs(w.maxX - pitch.minX) < 1e-6 ? w.maxX : Math.abs(w.minX - pitch.maxX) < 1e-6 ? w.minX : null;
  if (x === null) return null;
  return { normal: new Vector3(x === w.maxX ? 1 : -1, 0, 0), centre: new Vector3(x, 0, (w.minZ + w.maxZ) / 2), length: w.maxZ - w.minZ, along: 'z' };
}

function walls(b: Builders): void {
  const { walls: list, wallHeight: h } = ARENA;
  const body = rgb('#121521');
  const cz = ARENA.center.z;
  // Boards in each half carry that half's team name between generic ones.
  const ledsFor = (z: number) => (z < cz ? ['arena:led-1', 'arena:led-0', 'arena:led-3'] : ['arena:led-2', 'arena:led-3', 'arena:led-0']);
  let ledIndex = 0;
  for (const w of list) {
    const goalPart = w.id.startsWith('arena:goal-');
    if (goalPart) continue;
    b.metal.box(w.minX, 0, w.minZ, w.maxX, h, w.maxZ, { color: body, top: rgb('#1d2233'), skip: { ny: true } });
    const alongX = w.maxX - w.minX >= w.maxZ - w.minZ;
    const mz = (w.minZ + w.maxZ) / 2;
    const mx = (w.minX + w.maxX) / 2;
    // Top rail in the team colour of that half (long walls split at halfway).
    const rail = (x0: number, z0: number, x1: number, z1: number) => {
      const zMid = (z0 + z1) / 2;
      const color = rgb(zMid < cz ? TEAM.home : TEAM.away, 2.0);
      b.neon.bar(_a.set(x0, h + 0.03, z0), _b.set(x1, h + 0.03, z1), 0.08, color);
    };
    if (alongX) rail(w.minX, mz, w.maxX, mz);
    else {
      rail(mx, w.minZ, mx, cz);
      rail(mx, cz, mx, w.maxZ);
    }
    // Inner face: base strip and LED boards.
    const face = innerFace(w);
    if (!face) continue;
    const off = face.normal.clone().multiplyScalar(0.012);
    if (face.along === 'x') {
      const z = face.centre.z + off.z;
      b.neon.bar(_a.set(w.minX, 0.06, z), _b.set(w.maxX, 0.06, z), 0.035, rgb(face.centre.z < cz ? TEAM.home : TEAM.away, 1.1));
    } else {
      const x = face.centre.x + off.x;
      b.neon.bar(_a.set(x, 0.06, w.minZ), _b.set(x, 0.06, cz), 0.035, rgb(TEAM.home, 1.1));
      b.neon.bar(_a.set(x, 0.06, cz), _b.set(x, 0.06, w.maxZ), 0.035, rgb(TEAM.away, 1.1));
    }
    const boardW = 5.4;
    const count = Math.floor((face.length - 0.6) / (boardW + 0.8));
    if (count < 1) continue;
    const step = face.length / count;
    for (let i = 0; i < count; i++) {
      const t = -face.length / 2 + step * (i + 0.5);
      const c = face.centre.clone().add(face.along === 'x' ? new Vector3(t, 0.56, 0) : new Vector3(0, 0.56, t)).add(off);
      const set = ledsFor(c.z);
      atlasQuad(b.zone, zoneUv(set[ledIndex++ % set.length]), c, face.normal, UP, boardW, rgb('#ffffff', 1.35));
    }
  }
}

function goals(b: Builders): void {
  for (const g of Object.values(ARENA.goals)) {
    const color = g.id === 'north' ? TEAM.home : TEAM.away;
    const frame = rgb(color, 2.4);
    const net = rgb(color, 0.42);
    const { area } = g;
    const H = GOAL_HEIGHT;
    const zMouth = g.z;
    const zBack = g.inward < 0 ? area.minZ : area.maxZ;
    const x0 = area.minX;
    const x1 = area.maxX;
    // Solid kick boards along the collider footprint (low), nets above.
    for (const w of ARENA.walls.filter((wall) => wall.id.startsWith(`arena:goal-${g.id}`))) {
      b.metal.box(w.minX, 0, w.minZ, w.maxX, 0.35, w.maxZ, { color: rgb('#10131d'), skip: { ny: true } });
    }
    // Frame: posts, crossbar, back posts and roof edges.
    const post = (x: number, z: number) => b.neon.bar(_a.set(x, 0, z), _b.set(x, H, z), 0.16, frame);
    post(x0, zMouth);
    post(x1, zMouth);
    b.neon.bar(_a.set(x0 - 0.08, H, zMouth), _b.set(x1 + 0.08, H, zMouth), 0.16, frame);
    const metal = rgb('#2a2f3e');
    for (const x of [x0, x1]) {
      b.metal.bar(_a.set(x, 0, zBack), _b.set(x, H - 0.2, zBack), 0.1, metal);
      b.metal.bar(_a.set(x, H, zMouth), _b.set(x, H - 0.2, zBack), 0.1, metal);
    }
    b.metal.bar(_a.set(x0, H - 0.2, zBack), _b.set(x1, H - 0.2, zBack), 0.1, metal);
    // Nets: back, sides and roof as thin glowing grids.
    const s = 0.42;
    const thin = 0.022;
    for (let x = x0 + s; x < x1 - 1e-6; x += s) {
      b.neon.bar(_a.set(x, 0.35, zBack), _b.set(x, H - 0.2, zBack), thin, net);
      b.neon.bar(_a.set(x, H, zMouth), _b.set(x, H - 0.2, zBack), thin, net);
    }
    for (let y = 0.35 + s; y < H - 0.2; y += s) b.neon.bar(_a.set(x0, y, zBack), _b.set(x1, y, zBack), thin, net);
    for (const x of [x0, x1]) {
      for (let k = 1; k < 7; k++) {
        const z = zMouth + ((zBack - zMouth) * k) / 7;
        const top = H + ((H - 0.2 - H) * k) / 7;
        b.neon.bar(_a.set(x, 0.35, z), _b.set(x, top, z), thin, net);
      }
      for (let y = 0.35 + s; y < H - 0.2; y += s) b.neon.bar(_a.set(x, y, zMouth), _b.set(x, y, zBack), thin, net);
    }
    for (let k = 1; k < 7; k++) {
      const z = zMouth + ((zBack - zMouth) * k) / 7;
      const y = H + ((H - 0.2 - H) * k) / 7;
      b.neon.bar(_a.set(x0, y, z), _b.set(x1, y, z), thin, net);
    }
    // Goal-mouth glow and goal line.
    decal(b, 0, (area.minZ + area.maxZ) / 2, 9.5, 4.5, 0, color, 0.3);
    b.neon.flatRect(x0, zMouth - 0.09, x1, zMouth + 0.09, Y.inlay, rgb(color, 1.6));
  }
}

function floodlights(b: Builders): void {
  const metal = rgb('#1c2030');
  const lamp = rgb('#f4f7ff', 3.2);
  const { center } = ARENA;
  for (const fl of FLOODLIGHTS) {
    const H = 11;
    b.metal.addGeometry(cylinder(12, 0.6, 1), trs(fl.x, H / 2, fl.z, 0, 0.32, H, 0.32), metal);
    b.metal.addGeometry(cylinder(12), trs(fl.x, 0.2, fl.z, 0, 0.62, 0.4, 0.62), metal);
    // Head: a panel facing the pitch centre, tilted down.
    const dx = center.x - fl.x;
    const dz = center.z - fl.z;
    const yaw = Math.atan2(dx, dz);
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const hx = fl.x + fx * 0.35;
    const hz = fl.z + fz * 0.35;
    const px = Math.cos(yaw);
    const pz = -Math.sin(yaw);
    for (let i = -1; i <= 1; i++) {
      for (let j = 0; j < 2; j++) {
        const cx = hx + px * i * 0.62;
        const cz = hz + pz * i * 0.62;
        const cy = H + 0.15 + j * 0.62;
        b.metal.box(cx - 0.3, cy - 0.3, cz - 0.3, cx + 0.3, cy + 0.3, cz + 0.3, { color: metal });
        b.neon.bar(_a.set(cx + fx * 0.31, cy, cz + fz * 0.31), _b.set(cx + fx * 0.32, cy, cz + fz * 0.32), 0.46, lamp);
      }
    }
    b.metal.bar(_a.set(hx - px * 1.0, H - 0.2, hz - pz * 1.0), _b.set(hx + px * 1.0, H - 0.2, hz + pz * 1.0), 0.12, metal);
    // Beacon on top and a pool of light on the pitch.
    b.beacons.push({ x: fl.x, y: H + 1.6, z: fl.z, color: '#ff4f4f', rate: 0.5, phase: fl.x * 0.1, size: 0.1, intensity: 3 });
    decal(b, fl.x + dx * 0.3, fl.z + dz * 0.3, 16, 16, 0, '#dfe8ff', 0.16);
    decal(b, fl.x + dx * 0.55, fl.z + dz * 0.55, 12, 12, 0, '#dfe8ff', 0.1);
  }
}


function stands(b: Builders): void {
  const r = createRng('arena-stands');
  for (const s of BLEACHERS) {
    const team = s.side < 0 ? TEAM.home : TEAM.away;
    const concrete = rgb('#171b28');
    const seat = rgb(team, 0.55);
    const rows = s.rows;
    const depth = (s.x1 - s.x0) / rows;
    for (let i = 0; i < rows; i++) {
      const y1 = 0.45 + i * 0.5;
      const xa = s.side < 0 ? s.x1 - depth * (i + 1) : s.x0 + depth * i;
      const xb = xa + depth;
      b.metal.box(xa, 0, s.z0, xb, y1, s.z1, { color: concrete, top: rgb('#1d2232'), skip: { ny: true } });
      // Seat strip at the front edge of each step.
      const xs = s.side < 0 ? xb - 0.32 : xa + 0.04;
      b.metal.box(xs, y1, s.z0 + 0.2, xs + 0.28, y1 + 0.12, s.z1 - 0.2, { color: seat });
      // Phone lights in the crowd.
      for (let k = 0; k < 14; k++) {
        const z = r.range(s.z0 + 0.4, s.z1 - 0.4);
        const x = xs + 0.14 + r.range(-0.1, 0.1);
        b.neon.box(x - 0.025, y1 + 0.14, z - 0.025, x + 0.025, y1 + 0.2, z + 0.025, { color: rgb(r.pick(['#ffffff', team, neon.amber]), r.range(1.2, 2.4)) });
      }
    }
    // Canopy on posts at the back, lit front edge.
    const xBack = s.side < 0 ? s.x0 + 0.2 : s.x1 - 0.2;
    const xFront = s.inner;
    const H = s.height + 1.8;
    for (let z = s.z0 + 0.4; z <= s.z1 - 0.39; z += (s.z1 - s.z0 - 0.8) / 4) {
      b.metal.bar(_a.set(xBack, 0, z), _b.set(xBack, H, z), 0.16, rgb('#20253a'));
    }
    const xa = Math.min(xBack, xFront);
    const xb = Math.max(xBack, xFront);
    b.metal.box(xa - 0.1, H, s.z0, xb + 0.1, H + 0.14, s.z1, { color: rgb('#1a1f30') });
    const xe = s.side < 0 ? xb + 0.1 : xa - 0.1;
    b.neon.bar(_a.set(xe, H + 0.07, s.z0), _b.set(xe, H + 0.07, s.z1), 0.07, rgb(team, 1.8));
    decal(b, (xa + xb) / 2, (s.z0 + s.z1) / 2, 6, s.z1 - s.z0 + 2, 0, team, 0.08);
  }
}

function scoreboard(b: Builders): void {
  const sb = SCOREBOARD;
  const metal = rgb('#1a1e2c');
  const top = sb.bottom + sb.height;
  for (const dx of sb.legs) {
    b.metal.box(sb.x + dx - 0.22, 0, sb.z - 0.22, sb.x + dx + 0.22, sb.bottom + 0.4, sb.z + 0.22, { color: metal, skip: { ny: true } });
  }
  const hw = sb.width / 2 + 0.25;
  b.metal.box(sb.x - hw, sb.bottom - 0.25, sb.z - 0.25, sb.x + hw, top + 0.25, sb.z + 0.25, { color: rgb('#0b0d15') });
  const face = sb.z - 0.26;
  const glow = rgb('#e8f1ff', 1.8);
  b.neon.bar(_a.set(sb.x - hw, sb.bottom - 0.25, face), _b.set(sb.x + hw, sb.bottom - 0.25, face), 0.07, glow);
  b.neon.bar(_a.set(sb.x - hw, top + 0.25, face), _b.set(sb.x + hw, top + 0.25, face), 0.07, glow);
  b.neon.bar(_a.set(sb.x - hw, sb.bottom - 0.25, face), _b.set(sb.x - hw, top + 0.25, face), 0.07, rgb(TEAM.away, 2));
  b.neon.bar(_a.set(sb.x + hw, sb.bottom - 0.25, face), _b.set(sb.x + hw, top + 0.25, face), 0.07, rgb(TEAM.home, 2));
  atlasQuad(b.zone, zoneUv('arena:board'), new Vector3(sb.x, sb.bottom + sb.height / 2, face - 0.006), new Vector3(0, 0, -1), UP, sb.width, rgb('#ffffff', 1.25));
  // A row of lamps on top.
  for (let i = -4; i <= 4; i++) b.neon.box(sb.x + i * 1.2 - 0.2, top + 0.3, sb.z - 0.15, sb.x + i * 1.2 + 0.2, top + 0.42, sb.z + 0.05, { color: rgb('#f4f7ff', 2) });
}

/** Paved concourse round the walls, lamps along the stands and parking bays beyond the trees. */
function surroundings(b: Builders): void {
  const { pitch } = ARENA;
  const y = 0.006;
  const pave = rgb('#1b2031');
  const t = ARENA.wallThickness;
  const o = 3.2;
  const x0 = pitch.minX - t - o;
  const x1 = pitch.maxX + t + o;
  const z0 = pitch.minZ - t - 1.0;
  const z1 = pitch.maxZ + t + o;
  b.ground.flatRect(x0, z0, x1, pitch.minZ - t, y, pave);
  b.ground.flatRect(x0, pitch.maxZ + t, x1, z1, y, pave);
  b.ground.flatRect(x0, pitch.minZ - t, pitch.minX - t, pitch.maxZ + t, y, pave);
  b.ground.flatRect(pitch.maxX + t, pitch.minZ - t, x1, pitch.maxZ + t, y, pave);
  const cz = ARENA.center.z;
  const edge = (za: number, zb: number) => rgb(((za + zb) / 2) < cz ? TEAM.home : TEAM.away, 0.75);
  for (const x of [x0, x1]) {
    b.neon.flatRect(x - 0.05, z0, x + 0.05, cz, Y.marking, edge(z0, cz));
    b.neon.flatRect(x - 0.05, cz, x + 0.05, z1, Y.marking, edge(cz, z1));
  }
  b.neon.flatRect(x0, z1 - 0.05, x1, z1 + 0.05, Y.marking, rgb(TEAM.away, 0.75));
  // Lamps.
  const metal = rgb('#161a27');
  const head = rgb(neon.amber, 2.6);
  for (const lamp of ARENA_LAMPS) {
    const ax = Math.cos(lamp.armAngle);
    const az = -Math.sin(lamp.armAngle);
    b.metal.addGeometry(cylinder(10), trs(lamp.x, 0.09, lamp.z, 0, 0.17, 0.18, 0.17), metal);
    b.metal.addGeometry(cylinder(8, 0.7, 1), trs(lamp.x, 1.8, lamp.z, 0, 0.07, 3.6, 0.07), metal);
    b.metal.bar(_a.set(lamp.x, 3.55, lamp.z), _b.set(lamp.x + ax * 0.85, 3.55, lamp.z + az * 0.85), 0.07, metal);
    const hx = lamp.x + ax * 0.8;
    const hz = lamp.z + az * 0.8;
    b.metal.addGeometry(cylinder(10), trs(hx, 3.5, hz, 0, 0.2, 0.07, 0.2), metal);
    b.neon.addGeometry(cylinder(10), trs(hx, 3.455, hz, 0, 0.16, 0.025, 0.16), head);
    decal(b, hx, hz, 3.6, 3.6, 0, neon.amber, 0.3);
  }
  // Parking bays (two facing rows) with lit kerbs.
  const line = rgb(neon.white, 0.3);
  for (const p of PARKING) {
    const mid = (p.x0 + p.x1) / 2;
    b.ground.flatRect(p.x0, p.z0, p.x1, p.z1, y, rgb('#151a28'));
    b.neon.flatRect(mid - 0.05, p.z0, mid + 0.05, p.z1, Y.marking, line);
    for (let z = p.z0; z <= p.z1 + 1e-6; z += 2.8) {
      b.neon.flatRect(p.x0 + 0.6, z - 0.05, p.x1 - 0.6, z + 0.05, Y.marking, line);
    }
    // EV chargers: tiny glowing bollards would need colliders; paint glyph squares instead.
    for (let z = p.z0 + 1.4; z < p.z1; z += 5.6) {
      for (const x of [p.x0 + 1.2, p.x1 - 1.2]) b.neon.flatRect(x - 0.25, z - 0.25, x + 0.25, z + 0.25, Y.marking, rgb(neon.emerald, 0.9));
    }
    decal(b, mid, (p.z0 + p.z1) / 2, p.x1 - p.x0 + 2, p.z1 - p.z0 + 2, 0, neon.violet, 0.05);
  }
}

export function bakeArena(b: Builders): void {
  surroundings(b);
  turf(b);
  lines(b);
  boostPads(b);
  walls(b);
  goals(b);
  floodlights(b);
  stands(b);
  scoreboard(b);
}

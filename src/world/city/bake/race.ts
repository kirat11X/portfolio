// Time trial (static): the racing ribbon round the outer border strip with
// dashed edges, a painted orange racing line, direction chevrons and kerbs on
// the tight corners; checkpoint gate posts with numbered plates; the start
// gantry in the Gaming Zone; the FINISH pylons and chequered line on the hub.
// The gate light bars are in the FX mesh (`buildGateFx`) so the next gate can
// be highlighted. Posts stand just outside each gate line (see gamingLayout).

import { CatmullRomCurve3, Vector3 } from 'three';
import { neon } from '@/styles/tokens';
import { RACE } from '../../config/layout';
import { COLORS, Y } from '../constants';
import { rgb } from '../lib/GeometryBuilder';
import { signUv } from '../lib/signAtlas';
import { zoneUv } from '../lib/zoneAtlas';
import { FX, type FxBuilder } from '../lib/fx';
import { FINISH_PYLON, GATE_POST, GATE_POSTS, RACE_GATES, START_GANTRY } from '../gamingLayout';
import { decal } from './streets';
import type { Builders } from './builders';
import { atlasQuad } from './frame';

const UP = new Vector3(0, 1, 0);
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _d = new Vector3();

const FINISH_INDEX = RACE_GATES.length - 1;

/** Track centre line: start → border-strip checkpoints → back into the Gaming Zone. */
export function trackCurve(): CatmullRomCurve3 {
  const pts = [
    new Vector3(RACE.start.x, 0, RACE.start.z),
    ...RACE.checkpoints.slice(0, 10).map((g) => new Vector3(g.x, 0, g.z)),
  ];
  return new CatmullRomCurve3(pts, false, 'centripetal');
}

function ribbon(b: Builders): void {
  const curve = trackCurve();
  const len = curve.getLength();
  const n = Math.ceil(len / 0.8);
  const pts = curve.getSpacedPoints(n);
  const half = 2.7;
  const asphalt = rgb(COLORS.asphalt);
  const edge = rgb(neon.white, 0.42);
  const racing = rgb(neon.orange, 0.85);
  const kerbA = rgb('#d4521f');
  const kerbB = rgb('#d9deea', 0.8);
  const side = (i: number) => {
    const p = pts[Math.min(i + 1, n)];
    const q = pts[Math.max(i - 1, 0)];
    const t = new Vector3().subVectors(p, q).setY(0).normalize();
    return { t, nrm: new Vector3(-t.z, 0, t.x) };
  };
  const turn: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = side(Math.max(i - 3, 0)).t;
    const c = side(Math.min(i + 3, n)).t;
    turn.push(a.x * c.z - a.z * c.x);
  }
  // Chevrons sit in gaps of the racing line.
  const chevronAt: number[] = [];
  for (let s = 6; s < len - 4; s += 7) chevronAt.push(s);
  const nearChevron = (d: number) => chevronAt.some((s) => Math.abs(d - s) < 1.1);
  let dist = 0;
  for (let i = 0; i < n; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const s0 = side(i);
    const s1 = side(i + 1);
    const seg = p0.distanceTo(p1);
    // Road surface (same colour as the avenues so overlaps never show).
    _a.copy(p0).addScaledVector(s0.nrm, -half).setY(Y.avenue);
    _b.copy(p1).addScaledVector(s1.nrm, -half).setY(Y.avenue);
    _c.copy(p1).addScaledVector(s1.nrm, half).setY(Y.avenue);
    _d.copy(p0).addScaledVector(s0.nrm, half).setY(Y.avenue);
    // Winding chosen so the normal is +Y regardless of travel direction.
    const ny = (_b.x - _a.x) * (_d.z - _a.z) - (_b.z - _a.z) * (_d.x - _a.x);
    if (ny < 0) b.asphalt.quad(_a.clone(), _b.clone(), _c.clone(), _d.clone(), asphalt);
    else b.asphalt.quad(_d.clone(), _c.clone(), _b.clone(), _a.clone(), asphalt);
    const mid = new Vector3().addVectors(p0, p1).multiplyScalar(0.5);
    const rot = -Math.atan2(s0.t.z, s0.t.x);
    // Dashed edges and racing line.
    if (Math.floor(dist / 1.6) % 2 === 0) {
      for (const k of [-half + 0.18, half - 0.18]) {
        const c = mid.clone().addScaledVector(s0.nrm, k);
        b.neon.flatQuad(c.x, c.z, seg + 0.02, 0.1, rot, Y.marking, edge);
      }
    }
    if (Math.floor(dist / 2.4) % 2 === 0 && !nearChevron(dist)) b.neon.flatQuad(mid.x, mid.z, seg + 0.02, 0.14, rot, Y.marking, racing);
    // Kerbs on the inside of tight turns.
    const k = turn[i];
    if (Math.abs(k) > 0.16) {
      const inner = k > 0 ? 1 : -1;
      const c = mid.clone().addScaledVector(s0.nrm, inner * (half + 0.3));
      b.markings.flatQuad(c.x, c.z, seg + 0.01, 0.55, rot, Y.marking, i % 2 ? kerbA : kerbB);
    }
    dist += seg;
  }
  // Chevrons pointing along the lap.
  const chev = signUv('chevron');
  for (const s of chevronAt) {
    const u = s / len;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u).setY(0).normalize();
    atlasQuad(b.signs, chev, new Vector3(p.x, Y.inlay + 0.003, p.z), UP, t, 1.5, rgb(neon.orange, 1.15));
  }
}

function postPair(gi: number) {
  return GATE_POSTS.filter((p) => p.gate === gi);
}

function gates(b: Builders): void {
  const metal = rgb('#1b1f2e');
  RACE_GATES.forEach((gate, gi) => {
    const finish = gi === FINISH_INDEX;
    const spec = finish ? FINISH_PYLON : GATE_POST;
    const [p0, p1] = postPair(gi);
    const fwd = new Vector3(-Math.sin(gate.rotationY), 0, -Math.cos(gate.rotationY));
    const back = fwd.clone().negate();
    const half = finish ? 0.3 : 0.15;
    for (const p of [p0, p1]) {
      b.metal.box(p.x - half, 0, p.z - half, p.x + half, spec.height, p.z + half, { color: metal, skip: { ny: true } });
      b.metal.box(p.x - half - 0.06, 0, p.z - half - 0.06, p.x + half + 0.06, 0.3, p.z + half + 0.06, { color: rgb('#252a3c') });
    }
    // Top beam across.
    const yb = spec.height - (finish ? 0.35 : 0.12);
    b.metal.bar(_a.set(p0.x, yb, p0.z), _b.set(p1.x, yb, p1.z), finish ? 0.34 : 0.16, metal);
    if (!finish) {
      // Number plates near the top of each post, facing the approaching car (both sides).
      const plate = zoneUv(`race:n${gi + 1}`);
      for (const p of [p0, p1]) {
        for (const nrm of [back, fwd]) {
          const c = new Vector3(p.x, spec.height - 0.75, p.z).addScaledVector(nrm, half + 0.012);
          atlasQuad(b.zone, plate, c, nrm, UP, 0.62, rgb('#ffffff', 1.4));
        }
      }
      decal(b, gate.x, gate.z, gate.width + 1.2, 2.2, gate.rotationY, neon.orange, 0.12);
    }
  });
}

function finish(b: Builders): void {
  const gate = RACE.finish;
  const [p0, p1] = postPair(FINISH_INDEX);
  const fwd = new Vector3(-Math.sin(gate.rotationY), 0, -Math.cos(gate.rotationY));
  const back = fwd.clone().negate();
  const word = zoneUv('race:finish-v');
  for (const p of [p0, p1]) {
    for (const nrm of [back, fwd]) {
      const c = new Vector3(p.x, 4.4, p.z).addScaledVector(nrm, 0.312);
      atlasQuad(b.zone, word, c, nrm, UP, 0.56, rgb('#ffffff', 1.5));
    }
  }
  // Chequered banner on the beam.
  const yb = FINISH_PYLON.height - 0.35;
  const dx = p1.x - p0.x;
  const dz = p1.z - p0.z;
  const L = Math.hypot(dx, dz);
  const ux = dx / L;
  const uz = dz / L;
  const cells = 16;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < 1; j++) {
      const t0 = 0.35 + ((L - 0.7) * i) / cells;
      const t1 = 0.35 + ((L - 0.7) * (i + 1)) / cells;
      const y0 = yb - 0.12 + j * 0.24;
      const color = (i + j) % 2 ? rgb('#f2f5ff', 0.95) : rgb('#0b0c12');
      for (const nrm of [back, fwd]) {
        const o = 0.18;
        const ax = p0.x + ux * t0 + nrm.x * o;
        const az = p0.z + uz * t0 + nrm.z * o;
        const bx = p0.x + ux * t1 + nrm.x * o;
        const bz = p0.z + uz * t1 + nrm.z * o;
        const quad = [new Vector3(ax, y0, az), new Vector3(bx, y0, bz), new Vector3(bx, y0 + 0.24, bz), new Vector3(ax, y0 + 0.24, az)];
        // Face along nrm.
        const cross = (bx - ax) * nrm.z - (bz - az) * nrm.x;
        if (cross < 0) b.neon.quad(quad[0], quad[1], quad[2], quad[3], color);
        else b.neon.quad(quad[1], quad[0], quad[3], quad[2], color);
      }
    }
  }
  // Chequered line on the ground across the gate.
  const sq = 0.35;
  const n = Math.round(gate.width / sq);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 2; j++) {
      const t = -gate.width / 2 + (i + 0.5) * sq;
      const x = gate.x + ux * t + fwd.x * (j - 0.5) * sq;
      const z = gate.z + uz * t + fwd.z * (j - 0.5) * sq;
      b.markings.flatQuad(x, z, sq, sq, gate.rotationY, Y.marking, (i + j) % 2 ? rgb('#e8ecf6', 0.8) : rgb('#0a0b12'));
    }
  }
  decal(b, gate.x, gate.z, gate.width + 2, 3, gate.rotationY, '#e8f1ff', 0.16);
}

function startGantry(b: Builders): void {
  const s = RACE.start;
  const metal = rgb('#1b1f2e');
  const { z, xs } = START_GANTRY;
  for (const x of xs) b.metal.box(x - 0.15, 0, z - 0.15, x + 0.15, 4.6, z + 0.15, { color: metal, skip: { ny: true } });
  b.metal.box(xs[0] - 0.15, 4.3, z - 0.2, xs[1] + 0.15, 4.9, z + 0.2, { color: rgb('#0b0d15') });
  const tt = zoneUv('race:timetrial');
  for (const nz of [-1, 1]) {
    atlasQuad(b.zone, tt, new Vector3(s.x, 4.6, z + nz * 0.212), new Vector3(0, 0, nz), UP, 5.4, rgb('#ffffff', 1.4));
  }
  b.neon.bar(_a.set(xs[0], 4.27, z), _b.set(xs[1], 4.27, z), 0.05, rgb(neon.orange, 2));
}

export function bakeRace(b: Builders): void {
  ribbon(b);
  gates(b);
  finish(b);
  startGantry(b);
}

/** Gate light bars and post strips (FX mode 3: dims all but the next gate while a lap runs). */
export function buildGateFx(fx: FxBuilder): void {
  RACE_GATES.forEach((gate, gi) => {
    const finish = gi === FINISH_INDEX;
    const spec = finish ? FINISH_PYLON : GATE_POST;
    const [p0, p1] = postPair(gi);
    const color = rgb(finish ? '#f2f5ff' : neon.orange, finish ? 1.3 : 2.2);
    fx.set({ mode: FX.gate, a: gi });
    const yb = spec.height - (finish ? 0.35 : 0.12) - (finish ? 0.62 : 0.14);
    fx.bar(_a.set(p0.x, yb, p0.z), _b.set(p1.x, yb, p1.z), finish ? 0.08 : 0.07, color);
    const half = finish ? 0.3 : 0.15;
    for (const p of [p0, p1]) {
      // Strip on the inner face (toward the gate centre).
      const ix = p.x - p.out[0] * (half + 0.01);
      const iz = p.z - p.out[1] * (half + 0.01);
      fx.bar(_a.set(ix, 0.35, iz), _b.set(ix, spec.height - 0.3, iz), 0.06, color);
    }
  });
}

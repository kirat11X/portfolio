// Lofted car bodies: a smooth surface swept through superellipse cross-sections
// placed along the car's length (front = -Z). Section parameters are
// interpolated with a monotone cubic, so the silhouette never overshoots
// between stations, and samples bunch up at the nose and tail to keep the
// rounded ends smooth. Pure geometry; colours are painted per vertex.

import { BufferAttribute, BufferGeometry, Color } from 'three';
import type { Station } from './designs';

type Param = 'w' | 'yb' | 'yt' | 'n' | 'nb' | 'tw';
const PARAMS: Param[] = ['w', 'yb', 'yt', 'n', 'nb', 'tw'];

export interface Section {
  w: number;
  yb: number;
  yt: number;
  n: number;
  nb: number;
  tw: number;
}

/** Fritsch–Carlson monotone cubic through (xs, ys); xs ascending. */
function monotone(xs: number[], ys: number[]): (x: number) => number {
  const count = xs.length;
  if (count === 1) return () => ys[0];
  const d: number[] = [];
  for (let i = 0; i < count - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m: number[] = [d[0]];
  for (let i = 1; i < count - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[count - 2]);
  for (let i = 0; i < count - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[count - 1]) return ys[count - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

export type Painter = (x: number, y: number, z: number, section: Section, angle: number, out: Color) => void;

export interface LoftOptions {
  /** Samples along the length (rings). */
  along?: number;
  /** Samples around each ring. */
  around?: number;
  /** Open strip between two angles instead of a closed tube (no caps). 0 = +X side, π/2 = top. */
  arc?: [number, number];
  /** Outward offset applied to every point (for roof caps / overlays). */
  inflate?: number;
  /** Clip the sweep to this z range (defaults to the stations' extent). */
  range?: [number, number];
  paint?: Painter;
}

export class Loft {
  readonly z0: number;
  readonly z1: number;
  private readonly fns: Record<Param, (z: number) => number>;

  constructor(stations: Station[]) {
    const sorted = [...stations].sort((a, b) => a.z - b.z);
    this.z0 = sorted[0].z;
    this.z1 = sorted[sorted.length - 1].z;
    const zs = sorted.map((s) => s.z);
    const fns = {} as Record<Param, (z: number) => number>;
    const defaults: Record<Param, number> = { w: 0, yb: 0, yt: 0, n: 2.6, nb: 3, tw: 0.86 };
    for (const p of PARAMS) fns[p] = monotone(zs, sorted.map((s) => s[p] ?? defaults[p]));
    this.fns = fns;
  }

  section(z: number, out: Section): Section {
    out.w = this.fns.w(z);
    out.yb = this.fns.yb(z);
    out.yt = this.fns.yt(z);
    out.n = this.fns.n(z);
    out.nb = this.fns.nb(z);
    out.tw = this.fns.tw(z);
    return out;
  }

  /** Point on the surface at length `z` and section angle `angle` (0 = +X side, π/2 = top). */
  point(z: number, angle: number, inflate = 0): [number, number, number] {
    const s = this.section(z, scratch);
    const [x, y] = sectionXY(angle, s, inflate);
    return [x, y, z];
  }

  /** Section angle (upper half, right side) where the surface reaches |x| = `x`; 0 = side, π/2 = crown. */
  angleForX(z: number, x: number, inflate = 0): number {
    const s = this.section(z, scratch);
    let lo = 0;
    let hi = Math.PI / 2;
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (sectionXY(mid, s, inflate)[0] > x) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }

  /**
   * A crisp painted stripe lying on the upper surface between |x| = x0 and x1
   * (mirrored when `mirror`), from z0 to z1. Returned non-indexed, uncoloured.
   */
  ribbon(x0: number, x1: number, z0: number, z1: number, inflate = 0.006, along = 32, across = 3): BufferGeometry {
    const positions: number[] = [];
    const indices: number[] = [];
    const cols = across + 1;
    for (let i = 0; i <= along; i++) {
      const z = z0 + ((z1 - z0) * i) / along;
      for (let j = 0; j < cols; j++) {
        const x = x0 + ((x1 - x0) * j) / across;
        const [px, py] = sectionXY(this.angleForX(z, x, inflate), this.section(z, scratch), inflate);
        positions.push(px, py, z);
      }
    }
    for (let i = 0; i < along; i++) {
      for (let j = 0; j < across; j++) {
        const a = i * cols + j;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        // x grows to the right, z backwards: (a, c, b) faces up.
        if (x1 > x0) indices.push(a, c, b, b, c, d);
        else indices.push(a, b, c, b, d, c);
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  geometry(options: LoftOptions = {}): BufferGeometry {
    const along = options.along ?? 40;
    const arc = options.arc;
    const around = options.around ?? (arc ? 16 : 44);
    const inflate = options.inflate ?? 0;
    const [za, zb] = options.range ?? [this.z0, this.z1];
    const closed = !arc;
    const ringCount = closed ? around : around + 1;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const color = new Color(1, 1, 1);
    const s: Section = { w: 0, yb: 0, yt: 0, n: 2, nb: 2, tw: 1 };

    const push = (x: number, y: number, z: number, angle: number) => {
      positions.push(x, y, z);
      color.setRGB(1, 1, 1);
      options.paint?.(x, y, z, s, angle, color);
      colors.push(color.r, color.g, color.b);
    };

    // Cosine spacing bunches rings at the ends where curvature is highest.
    const zAt = (i: number) => za + (zb - za) * (0.5 - 0.5 * Math.cos((Math.PI * i) / along));
    for (let i = 0; i <= along; i++) {
      const z = zAt(i);
      this.section(z, s);
      for (let j = 0; j < ringCount; j++) {
        const angle = arc ? arc[0] + ((arc[1] - arc[0]) * j) / around : (Math.PI * 2 * j) / around;
        const [x, y] = sectionXY(angle, s, inflate);
        push(x, y, z, angle);
      }
    }
    for (let i = 0; i < along; i++) {
      for (let j = 0; j < around; j++) {
        const j1 = closed ? (j + 1) % around : j + 1;
        const a = i * ringCount + j;
        const b = i * ringCount + j1;
        const c = (i + 1) * ringCount + j;
        const d = (i + 1) * ringCount + j1;
        // Wound so normals face outward.
        indices.push(a, b, c, b, d, c);
      }
    }
    if (closed) {
      // Caps: separate vertices so the end faces shade flat.
      for (const end of [0, along]) {
        const z = zAt(end);
        this.section(z, s);
        const centre = positions.length / 3;
        push(0, (s.yb + s.yt) / 2, z, 0);
        const first = positions.length / 3;
        for (let j = 0; j < around; j++) {
          const angle = (Math.PI * 2 * j) / around;
          const [x, y] = sectionXY(angle, s, inflate);
          push(x, y, z, angle);
        }
        for (let j = 0; j < around; j++) {
          const a = first + j;
          const b = first + ((j + 1) % around);
          if (end === 0) indices.push(centre, b, a);
          else indices.push(centre, a, b);
        }
      }
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }
}

const scratch: Section = { w: 0, yb: 0, yt: 0, n: 2, nb: 2, tw: 1 };

function sectionXY(angle: number, s: Section, inflate: number): [number, number] {
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  const n = sn >= 0 ? s.n : s.nb;
  const px = Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
  const py = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
  const h = (s.yt - s.yb) / 2 + inflate;
  const cy = (s.yb + s.yt) / 2;
  // Tumblehome: the upper half leans inward.
  const tumble = 1 - (1 - s.tw) * Math.max(0, py);
  return [(s.w + inflate) * px * tumble, cy + h * py];
}

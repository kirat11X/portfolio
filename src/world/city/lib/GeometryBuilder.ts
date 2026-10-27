// Accumulates many small static pieces (boxes, quads, rings, arbitrary
// geometries) into one non-indexed BufferGeometry so a whole category of the
// city renders in a single draw call. Colours are linear RGB and may exceed 1
// for HDR neon (they feed MeshBasicMaterial vertex colours directly).

import { BoxGeometry, BufferAttribute, BufferGeometry, Color, Matrix3, Matrix4, Vector3 } from 'three';

export type RGB = Color;

export interface WindowUv {
  /** Brightness of the window lights on this piece (0 = no windows). */
  gain: number;
  uOff: number;
  vOff: number;
  bayW: number;
  floorH: number;
  cols: number;
  rows: number;
}

export interface BoxOptions {
  color: RGB;
  /** Colour of the top face (defaults to `color`). */
  top?: RGB;
  /** Colour of the bottom face (defaults to `color`). */
  bottom?: RGB;
  /** Skip faces, e.g. the bottom of anything sitting on the ground. */
  skip?: Partial<Record<'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz', boolean>>;
  /** Window UVs on the side faces (facade material only). */
  windows?: WindowUv;
  /** Planar UV scale (world units per texture repeat) for non-window faces. */
  uvScale?: number;
}

const _v = new Vector3();
const _n = new Vector3();
const _nm = new Matrix3();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _d = new Vector3();
const _e1 = new Vector3();
const _e2 = new Vector3();

export class GeometryBuilder {
  private readonly pos: number[] = [];
  private readonly nor: number[] = [];
  private readonly uv: number[] = [];
  private readonly col: number[] = [];
  private readonly win: number[] | null;

  constructor(options: { windows?: boolean } = {}) {
    this.win = options.windows ? [] : null;
  }

  get vertexCount(): number {
    return this.pos.length / 3;
  }

  vertex(p: Vector3, n: Vector3, u: number, v: number, c: RGB, w = 0): void {
    this.pos.push(p.x, p.y, p.z);
    this.nor.push(n.x, n.y, n.z);
    this.uv.push(u, v);
    this.col.push(c.r, c.g, c.b);
    this.win?.push(w);
  }

  /**
   * Planar quad, corners counter-clockwise as seen from its front. `color` is
   * one colour or four (one per corner, a..d).
   */
  quad(a: Vector3, b: Vector3, c: Vector3, d: Vector3, color: RGB | RGB[], uvs?: number[], w = 0): void {
    _e1.subVectors(b, a);
    _e2.subVectors(c, a);
    _n.crossVectors(_e1, _e2).normalize();
    const t = uvs ?? [0, 0, 1, 0, 1, 1, 0, 1];
    const ca = Array.isArray(color) ? color[0] : color;
    const cb = Array.isArray(color) ? color[1] : color;
    const cc = Array.isArray(color) ? color[2] : color;
    const cd = Array.isArray(color) ? color[3] : color;
    this.vertex(a, _n, t[0], t[1], ca, w);
    this.vertex(b, _n, t[2], t[3], cb, w);
    this.vertex(c, _n, t[4], t[5], cc, w);
    this.vertex(a, _n, t[0], t[1], ca, w);
    this.vertex(c, _n, t[4], t[5], cc, w);
    this.vertex(d, _n, t[6], t[7], cd, w);
  }

  /** Triangle, counter-clockwise as seen from its front. */
  tri(a: Vector3, b: Vector3, c: Vector3, color: RGB, uvs?: number[], w = 0): void {
    _e1.subVectors(b, a);
    _e2.subVectors(c, a);
    _n.crossVectors(_e1, _e2).normalize();
    const t = uvs ?? [0, 0, 1, 0, 0, 1];
    this.vertex(a, _n, t[0], t[1], color, w);
    this.vertex(b, _n, t[2], t[3], color, w);
    this.vertex(c, _n, t[4], t[5], color, w);
  }

  /** Flat horizontal rectangle at height y (normal +Y). */
  flatRect(x0: number, z0: number, x1: number, z1: number, y: number, color: RGB, uvs?: number[]): void {
    this.quad(_a.set(x0, y, z1), _b.set(x1, y, z1), _c.set(x1, y, z0), _d.set(x0, y, z0), color, uvs);
  }

  /**
   * Flat horizontal quad centred at (x, z), size sx × sz, rotated by `rotY`
   * about +Y. UVs span 0..1 (used for decals).
   */
  flatQuad(x: number, z: number, sx: number, sz: number, rotY: number, y: number, color: RGB): void {
    const c = Math.cos(rotY);
    const s = Math.sin(rotY);
    const hx = sx / 2;
    const hz = sz / 2;
    // local (lx, lz) → world: x = lx*c + lz*s, z = -lx*s + lz*c
    const p = (lx: number, lz: number, out: Vector3) => out.set(x + lx * c + lz * s, y, z - lx * s + lz * c);
    this.quad(p(-hx, hz, _a), p(hx, hz, _b), p(hx, -hz, _c), p(-hx, -hz, _d), color, [0, 0, 1, 0, 1, 1, 0, 1]);
  }

  /** Flat horizontal ring (annulus) on the ground. */
  flatRing(cx: number, cz: number, radius: number, width: number, y: number, color: RGB, segments = 96, a0 = 0, a1 = Math.PI * 2): void {
    const r0 = radius - width / 2;
    const r1 = radius + width / 2;
    const step = (a1 - a0) / segments;
    for (let i = 0; i < segments; i++) {
      const t0 = a0 + i * step;
      const t1 = t0 + step;
      // Angles measured from +X toward +Z (matches layout.ts).
      _a.set(cx + Math.cos(t0) * r1, y, cz + Math.sin(t0) * r1);
      _b.set(cx + Math.cos(t1) * r1, y, cz + Math.sin(t1) * r1);
      _c.set(cx + Math.cos(t1) * r0, y, cz + Math.sin(t1) * r0);
      _d.set(cx + Math.cos(t0) * r0, y, cz + Math.sin(t0) * r0);
      // Order chosen so the normal points up (+Y).
      this.quad(_d, _c, _b, _a, color);
    }
  }

  /** Axis-aligned box. Faces wind counter-clockwise from outside. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, o: BoxOptions): void {
    const skip = o.skip ?? {};
    const top = o.top ?? o.color;
    const bottom = o.bottom ?? o.color;
    const s = o.uvScale ?? 4;
    const w = o.windows;
    const side = (
      a: Vector3,
      b: Vector3,
      c: Vector3,
      d: Vector3,
      width: number,
      sA: number,
      sB: number,
    ) => {
      if (w && w.gain > 0) {
        const u0 = w.uOff / w.cols;
        const u1 = (w.uOff + width / w.bayW) / w.cols;
        const v0 = w.vOff / w.rows;
        const v1 = (w.vOff + (y1 - y0) / w.floorH) / w.rows;
        this.quad(a, b, c, d, o.color, [u0, v0, u1, v0, u1, v1, u0, v1], w.gain);
      } else {
        this.quad(a, b, c, d, o.color, [sA / s, y0 / s, sB / s, y0 / s, sB / s, y1 / s, sA / s, y1 / s]);
      }
    };
    const dx = x1 - x0;
    const dz = z1 - z0;
    if (!skip.px) side(_a.set(x1, y0, z1), _b.set(x1, y0, z0), _c.set(x1, y1, z0), _d.set(x1, y1, z1), dz, -z1, -z0);
    if (!skip.nx) side(_a.set(x0, y0, z0), _b.set(x0, y0, z1), _c.set(x0, y1, z1), _d.set(x0, y1, z0), dz, z0, z1);
    if (!skip.pz) side(_a.set(x0, y0, z1), _b.set(x1, y0, z1), _c.set(x1, y1, z1), _d.set(x0, y1, z1), dx, x0, x1);
    if (!skip.nz) side(_a.set(x1, y0, z0), _b.set(x0, y0, z0), _c.set(x0, y1, z0), _d.set(x1, y1, z0), dx, -x1, -x0);
    if (!skip.py)
      this.quad(_a.set(x0, y1, z1), _b.set(x1, y1, z1), _c.set(x1, y1, z0), _d.set(x0, y1, z0), top, [
        x0 / s, -z1 / s, x1 / s, -z1 / s, x1 / s, -z0 / s, x0 / s, -z0 / s,
      ]);
    if (!skip.ny)
      this.quad(_a.set(x0, y0, z0), _b.set(x1, y0, z0), _c.set(x1, y0, z1), _d.set(x0, y0, z1), bottom, [
        x0 / s, -z0 / s, x1 / s, -z0 / s, x1 / s, -z1 / s, x0 / s, -z1 / s,
      ]);
  }

  /** Thin bar between two points (square cross-section `thickness`). */
  bar(from: Vector3, to: Vector3, thickness: number, color: RGB): void {
    const len = from.distanceTo(to);
    if (len < 1e-5) return;
    const m = barMatrix(from, to, thickness, thickness);
    this.addGeometry(unitBox(), m, color);
  }

  /** Appends any geometry transformed by `matrix`, with a uniform colour. */
  addGeometry(geometry: BufferGeometry, matrix: Matrix4, color: RGB, w = 0): void {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const t = g.getAttribute('uv');
    _nm.getNormalMatrix(matrix);
    for (let i = 0; i < p.count; i++) {
      _v.fromBufferAttribute(p, i).applyMatrix4(matrix);
      if (n) _n.fromBufferAttribute(n, i).applyMatrix3(_nm).normalize();
      else _n.set(0, 1, 0);
      this.vertex(_v, _n, t ? t.getX(i) : 0, t ? t.getY(i) : 0, color, w);
    }
    if (g !== geometry) g.dispose();
  }

  build(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('normal', new BufferAttribute(new Float32Array(this.nor), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array(this.uv), 2));
    g.setAttribute('color', new BufferAttribute(new Float32Array(this.col), 3));
    if (this.win) g.setAttribute('aWin', new BufferAttribute(new Float32Array(this.win), 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

let _unitBox: BufferGeometry | null = null;
/** Shared 1×1×1 box used as a template (never rendered or disposed). */
export function unitBox(): BufferGeometry {
  _unitBox ??= new BoxGeometry(1, 1, 1).toNonIndexed();
  return _unitBox;
}

const _up = new Vector3(0, 1, 0);
const _dir = new Vector3();
const _mid = new Vector3();
const _q = new Matrix4();

/** Matrix that maps the unit box onto a bar from `from` to `to`. */
export function barMatrix(from: Vector3, to: Vector3, sx: number, sz: number): Matrix4 {
  _dir.subVectors(to, from);
  const len = _dir.length();
  _dir.normalize();
  _mid.addVectors(from, to).multiplyScalar(0.5);
  // Build a basis with Y along the bar.
  const yAxis = _dir;
  const ref = Math.abs(yAxis.dot(_up)) > 0.99 ? _e1.set(1, 0, 0) : _e1.copy(_up);
  const xAxis = _e2.crossVectors(ref, yAxis).normalize();
  const zAxis = new Vector3().crossVectors(xAxis, yAxis).normalize();
  const m = new Matrix4().makeBasis(xAxis, yAxis, zAxis);
  m.multiply(_q.makeScale(sx, len, sz));
  m.setPosition(_mid);
  return m;
}

/** Convenience: linear colour from a hex string, optionally scaled (HDR). */
export function rgb(hex: string, scale = 1): Color {
  return new Color(hex).multiplyScalar(scale);
}

/** Matrix from translation, Y rotation and scale. */
export function trs(x: number, y: number, z: number, rotY = 0, sx = 1, sy = 1, sz = 1): Matrix4 {
  const m = new Matrix4().makeRotationY(rotY);
  m.multiply(new Matrix4().makeScale(sx, sy, sz));
  m.setPosition(x, y, z);
  return m;
}

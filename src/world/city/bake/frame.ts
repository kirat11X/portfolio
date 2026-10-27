// Local coordinate frame for building a prop around (x, z) turned by rotationY,
// so a prop can be modelled with its front on local +Z and dropped into any
// merged bucket. Also atlas-quad helpers shared by the newer bake modules.

import { Euler, Matrix4, Quaternion, Vector3, type BufferGeometry } from 'three';
import { barMatrix, unitBox, type GeometryBuilder, type RGB } from '../lib/GeometryBuilder';

const _q = new Quaternion();
const _e = new Euler();
const _s = new Vector3();
const _p = new Vector3();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _d = new Vector3();
const _r = new Vector3();
const _u = new Vector3();

/** Local transform matrix (Euler XYZ rotation), for Frame.geo. */
export function localMat(cx: number, cy: number, cz: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0): Matrix4 {
  _q.setFromEuler(_e.set(rx, ry, rz));
  return new Matrix4().compose(_p.set(cx, cy, cz), _q, _s.set(sx, sy, sz));
}

export class Frame {
  readonly m: Matrix4;

  constructor(x: number, y: number, z: number, rotationY: number, scale = 1) {
    this.m = new Matrix4().makeRotationY(rotationY).scale(new Vector3(scale, scale, scale)).setPosition(x, y, z);
  }

  point(lx: number, ly: number, lz: number, out = new Vector3()): Vector3 {
    return out.set(lx, ly, lz).applyMatrix4(this.m);
  }

  dir(lx: number, ly: number, lz: number, out = new Vector3()): Vector3 {
    return out.set(lx, ly, lz).transformDirection(this.m);
  }

  /** World matrix for a local transform (Euler XYZ order rotation). */
  mat(cx: number, cy: number, cz: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0): Matrix4 {
    return this.m.clone().multiply(localMat(cx, cy, cz, sx, sy, sz, rx, ry, rz));
  }

  /** Box centred at local (cx, cy, cz) with size (sx, sy, sz). */
  box(b: GeometryBuilder, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, color: RGB, rx = 0, ry = 0, rz = 0): void {
    b.addGeometry(unitBox(), this.mat(cx, cy, cz, sx, sy, sz, rx, ry, rz), color);
  }

  /** Box between local min/max corners. */
  span(b: GeometryBuilder, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, color: RGB): void {
    this.box(b, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0, color);
  }

  geo(b: GeometryBuilder, geometry: BufferGeometry, local: Matrix4, color: RGB): void {
    b.addGeometry(geometry, this.m.clone().multiply(local), color);
  }

  /** Bar between two local points. */
  bar(b: GeometryBuilder, from: [number, number, number], to: [number, number, number], t: number, color: RGB): void {
    this.point(...from, _a);
    this.point(...to, _b);
    if (_a.distanceTo(_b) < 1e-5) return;
    b.addGeometry(unitBox(), barMatrix(_a, _b, t, t), color);
  }

  /**
   * Quad in the local XY plane facing local +Z (before `rx`/`ry` tilt),
   * centred at (cx, cy, cz), size w × h, with explicit UVs [u0, v0, u1, v1].
   */
  quad(b: GeometryBuilder, cx: number, cy: number, cz: number, w: number, h: number, color: RGB, uv: [number, number, number, number] = [0, 0, 1, 1], rx = 0, ry = 0): void {
    const m = this.mat(cx, cy, cz, 1, 1, 1, rx, ry, 0);
    const hw = w / 2;
    const hh = h / 2;
    _a.set(-hw, -hh, 0).applyMatrix4(m);
    _b.set(hw, -hh, 0).applyMatrix4(m);
    _c.set(hw, hh, 0).applyMatrix4(m);
    _d.set(-hw, hh, 0).applyMatrix4(m);
    const [u0, v0, u1, v1] = uv;
    b.quad(_a, _b, _c, _d, color, [u0, v0, u1, v0, u1, v1, u0, v1]);
  }
}

/** World-space atlas quad centred at `centre`, facing `normal`, text-up `up`, `width` wide. Returns its height. */
export function atlasQuad(
  b: GeometryBuilder,
  entry: { uv: [number, number, number, number]; aspect: number },
  centre: Vector3,
  normal: Vector3,
  up: Vector3,
  width: number,
  color: RGB,
): number {
  const height = width / entry.aspect;
  _r.crossVectors(up, normal).normalize().multiplyScalar(width / 2);
  _u.copy(up).normalize().multiplyScalar(height / 2);
  _a.copy(centre).sub(_r).sub(_u);
  _b.copy(centre).add(_r).sub(_u);
  _c.copy(centre).add(_r).add(_u);
  _d.copy(centre).sub(_r).add(_u);
  const [u0, v0, u1, v1] = entry.uv;
  b.quad(_a, _b, _c, _d, color, [u0, v0, u1, v0, u1, v1, u0, v1]);
  return height;
}

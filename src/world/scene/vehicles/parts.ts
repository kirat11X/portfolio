// Small geometry helpers for the cars: vertex painting, merging mixed parts
// into one draw call, tubes along surface lines, wheels and boost flames.

import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  LatheGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Paint every vertex of `geometry` one colour (linear working space). */
export function tint(geometry: BufferGeometry, hex: string | Color, scale = 1): BufferGeometry {
  const color = hex instanceof Color ? hex : new Color(hex);
  const count = geometry.getAttribute('position').count;
  const data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    data[i * 3] = color.r * scale;
    data[i * 3 + 1] = color.g * scale;
    data[i * 3 + 2] = color.b * scale;
  }
  geometry.setAttribute('color', new BufferAttribute(data, 3));
  return geometry;
}

/**
 * Merge parts into one geometry with only position/normal/color, so mixed
 * primitives (indexed or not, with or without uvs) can share a draw call.
 * Input geometries are disposed.
 */
export function mergeParts(parts: BufferGeometry[]): BufferGeometry {
  const prepared = parts.map((part) => {
    const flat = part.index ? part.toNonIndexed() : part;
    if (flat !== part) part.dispose();
    for (const name of Object.keys(flat.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'color') flat.deleteAttribute(name);
    }
    if (!flat.getAttribute('normal')) flat.computeVertexNormals();
    if (!flat.getAttribute('color')) tint(flat, '#ffffff');
    flat.clearGroups();
    return flat;
  });
  const merged = mergeGeometries(prepared, false);
  for (const part of prepared) part.dispose();
  if (!merged) throw new Error('vehicle: could not merge parts');
  merged.computeBoundingSphere();
  return merged;
}

export function roundedBox(w: number, h: number, d: number, radius: number, segments = 2): BufferGeometry {
  return new RoundedBoxGeometry(w, h, d, segments, Math.min(radius, w / 2, h / 2, d / 2) * 0.999);
}

/** A tube through points (a light strip, trim line or rail). */
export function tube(points: Array<[number, number, number]>, radius: number, segments = 24, radial = 6): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)), false, 'centripetal');
  return new TubeGeometry(curve, segments, radius, radial, false);
}

export interface WheelLook {
  radius: number;
  width: number;
  /** Rim radius as a fraction of the tyre radius (bigger = lower profile). */
  rimRatio: number;
  spokes: number;
  /** Spoke width (fraction of rim radius). */
  spokeWidth: number;
  tyre: string;
  rim: string;
  hub: string;
  /** Number of tread blocks around the tyre (0 = slick). */
  treads: number;
}

/**
 * One wheel (axis along X, outer face +X): rounded tyre with tread blocks,
 * recessed dish, spokes and a hub cap, vertex-coloured into a single mesh.
 */
export function wheelGeometry(look: WheelLook): BufferGeometry {
  const { radius: r, width: w, rimRatio } = look;
  const rr = r * rimRatio;
  const half = w / 2;
  const shoulder = Math.min(0.06, (r - rr) * 0.45);
  // Tyre cross-section revolved around Y, then turned so the axle is X.
  const profile = [
    new Vector2(rr * 0.98, -half * 0.86),
    new Vector2(r - shoulder, -half),
    new Vector2(r - shoulder * 0.25, -half + shoulder * 0.6),
    new Vector2(r, -half + shoulder),
    new Vector2(r, half - shoulder),
    new Vector2(r - shoulder * 0.25, half - shoulder * 0.6),
    new Vector2(r - shoulder, half),
    new Vector2(rr * 0.98, half * 0.86),
  ];
  const parts: BufferGeometry[] = [tint(new LatheGeometry(profile, 30).rotateZ(-Math.PI / 2), look.tyre)];

  if (look.treads > 0) {
    const tread = new Color(look.tyre).multiplyScalar(1.6);
    for (let i = 0; i < look.treads; i++) {
      const angle = (i / look.treads) * Math.PI * 2;
      for (const side of [-1, 1]) {
        const block = roundedBox(w * 0.36, 0.035, (Math.PI * 2 * r) / look.treads * 0.5, 0.012, 1);
        block.translate(side * w * 0.2, r + 0.006, side * 0.02);
        block.rotateX(angle + (side > 0 ? Math.PI / look.treads : 0));
        parts.push(tint(block, tread));
      }
    }
  }

  // Dish: dark barrel, then a lip ring on the outer face.
  parts.push(tint(new CylinderGeometry(rr, rr, w * 0.82, 26, 1, true).rotateZ(-Math.PI / 2), '#07080d'));
  parts.push(tint(new CylinderGeometry(rr * 0.98, rr * 0.98, 0.01, 26).rotateZ(-Math.PI / 2).translate(half * 0.05, 0, 0), '#0b0c12'));
  parts.push(tint(new TorusGeometry(rr * 0.97, Math.max(0.012, rr * 0.06), 6, 28).rotateY(Math.PI / 2).translate(half * 0.82, 0, 0), look.rim));

  // Spokes from hub to rim, slightly dished outward.
  const sw = rr * look.spokeWidth;
  for (let i = 0; i < look.spokes; i++) {
    const angle = (i / look.spokes) * Math.PI * 2;
    const spoke = roundedBox(0.045, rr * 0.86, sw, Math.min(0.018, sw * 0.4), 1);
    spoke.translate(half * 0.7, rr * 0.47, 0);
    spoke.rotateX(angle);
    parts.push(tint(spoke, look.rim));
  }
  // Hub cap.
  parts.push(tint(new CylinderGeometry(rr * 0.24, rr * 0.3, 0.07, 16).rotateZ(-Math.PI / 2).translate(half * 0.78, 0, 0), look.hub));
  return mergeParts(parts);
}

/** Thin glowing ring on the outer face of a wheel (instanced alongside the wheel). */
export function wheelRing(radius: number, width: number, at: number): BufferGeometry {
  const ring = new TorusGeometry(radius, Math.max(0.008, radius * 0.035), 6, 32).rotateY(Math.PI / 2).translate((width / 2) * at, 0, 0);
  return mergeParts([ring]);
}

/**
 * Boost flame cones pointing +Z from z = 0 at each nozzle: white-hot at the
 * root fading to the accent and then to black (invisible with additive blending).
 */
export function flameGeometry(nozzles: Array<[number, number]>, radius: number, length: number, accent: string): BufferGeometry {
  const hot = new Color('#fff4e0');
  const mid = new Color(accent);
  const parts: BufferGeometry[] = [];
  const add = (x: number, y: number, r: number, len: number, gain: number) => {
    const cone = new CylinderGeometry(r * 0.25, r, len, 14, 6, true);
    cone.rotateX(Math.PI / 2); // axis along Z: wide end at z = -len/2, narrow at +len/2
    cone.translate(0, 0, len / 2);
    const pos = cone.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.min(1, Math.max(0, pos.getZ(i) / len));
      if (t < 0.35) c.copy(hot).lerp(mid, t / 0.35);
      else c.copy(mid).multiplyScalar(Math.pow(1 - (t - 0.35) / 0.65, 1.6));
      c.multiplyScalar(gain);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    cone.setAttribute('color', new BufferAttribute(colors, 3));
    cone.translate(x, y, 0);
    parts.push(cone);
  };
  for (const [x, y] of nozzles) {
    add(x, y, radius, length, 1.8);
    // Inner white-hot core and a longer, fainter exhaust trail.
    add(x, y, radius * 0.55, length * 0.6, 1.4);
    add(x, y, radius * 0.75, length * 1.9, 0.45);
  }
  return mergeParts(parts);
}

/** Downward light wash under a hover pad: an open cone, bright at the pad, fading to nothing. */
export function washCone(x: number, y: number, z: number, radius: number, length: number, color: string): BufferGeometry {
  const cone = new CylinderGeometry(radius * 0.8, radius * 1.5, length, 18, 4, true);
  cone.translate(0, -length / 2, 0);
  const pos = cone.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const base = new Color(color);
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, -pos.getY(i) / length);
    const k = Math.pow(1 - t, 2) * 0.7;
    colors[i * 3] = base.r * k;
    colors[i * 3 + 1] = base.g * k;
    colors[i * 3 + 2] = base.b * k;
  }
  cone.setAttribute('color', new BufferAttribute(colors, 3));
  return cone.translate(x, y, z);
}

/** Mirror a geometry across X (left ↔ right), keeping faces outward. */
export function mirrored(geometry: BufferGeometry): BufferGeometry {
  const copy = geometry.clone().scale(-1, 1, 1);
  const index = copy.index;
  if (index) {
    const array = index.array;
    for (let i = 0; i < array.length; i += 3) {
      const t = array[i + 1];
      array[i + 1] = array[i + 2];
      array[i + 2] = t;
    }
    index.needsUpdate = true;
  }
  copy.computeVertexNormals();
  return copy;
}

/** A ribbon on the right plus its mirror image on the left, painted one colour. */
export function pair(geometry: BufferGeometry, color: string | Color): BufferGeometry[] {
  tint(geometry, color);
  return [geometry, tint(mirrored(geometry), color)];
}

// Hub monolith, signposts and exhibit pedestals (static parts), plus the
// phone booth beside the Archive's Contact door.

import { Shape, ShapeGeometry, Vector3 } from 'three';
import { neon } from '@/styles/tokens';
import { HUB_PROPS } from '../../config/layout';
import { WORLD_EXHIBITS } from '../../config/exhibits';
import { ACCENT, COLORS } from '../constants';
import { PHONE_BOOTH } from '../propLayout';
import { rgb, trs, unitBox } from '../lib/GeometryBuilder';
import { cylinder, type Builders } from './builders';
import { SIGN_BLADES } from '../signposts';
import { atlasRow, type AtlasLabel } from '../lib/labelAtlas';

const _a = new Vector3();
const _b = new Vector3();

/** Slab footprint stays inside the 1.8 collider radius (half-diagonal ≈ 1.70). */
export const MONOLITH = { width: 3.3, depth: 0.8, y0: 0.5, y1: 6.9 } as const;

let arrowTip: ShapeGeometry | null = null;
function arrowGeometry(): ShapeGeometry {
  if (!arrowTip) {
    const s = new Shape();
    s.moveTo(0, -0.34);
    s.lineTo(0.5, 0);
    s.lineTo(0, 0.34);
    s.closePath();
    arrowTip = new ShapeGeometry(s);
  }
  return arrowTip;
}

export function bakeHub(b: Builders): void {
  const obsidian = rgb(COLORS.obsidian);
  const stone = rgb('#151927');
  const { x, z, r } = HUB_PROPS.monolith;
  b.metal.addGeometry(cylinder(48), trs(x, 0.125, z, 0, r, 0.25, r), stone);
  b.metal.addGeometry(cylinder(48), trs(x, 0.375, z, 0, r - 0.32, 0.25, r - 0.32), stone);
  const hw = MONOLITH.width / 2;
  const hd = MONOLITH.depth / 2;
  b.glass.box(x - hw, MONOLITH.y0, z - hd, x + hw, MONOLITH.y1, z + hd, { color: obsidian });
  const white = rgb(neon.white, 1.8);
  // Plinth light rings and slab edge lines.
  b.neon.flatRing(x, z, r + 0.005, 0.05, 0.255, rgb('#cfe6ff', 1.6), 96);
  b.neon.flatRing(x, z, r - 0.31, 0.04, 0.505, rgb(neon.cyan, 1.5), 96);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      b.neon.bar(_a.set(x + sx * (hw + 0.012), MONOLITH.y0, z + sz * (hd + 0.012)), _b.set(x + sx * (hw + 0.012), MONOLITH.y1, z + sz * (hd + 0.012)), 0.035, white);
    }
  }
  for (const sz of [-1, 1]) {
    b.neon.bar(_a.set(x - hw, MONOLITH.y1 + 0.01, z + sz * (hd + 0.012)), _b.set(x + hw, MONOLITH.y1 + 0.01, z + sz * (hd + 0.012)), 0.035, white);
    // Thin rule between the name and the tagline.
    b.neon.box(x - 1.1, 1.86, z + sz * (hd + 0.004) - 0.004, x + 1.1, 1.88, z + sz * (hd + 0.004) + 0.004, { color: rgb(neon.cyan, 1.2) });
  }

  // Signposts.
  const metal = rgb(COLORS.metal);
  for (const post of HUB_PROPS.signposts) {
    b.metal.addGeometry(cylinder(12), trs(post.x, 0.08, post.z, 0, 0.26, 0.16, 0.26), metal);
    b.metal.addGeometry(cylinder(8), trs(post.x, 1.7, post.z, 0, 0.065, 3.4, 0.065), metal);
    b.neon.addGeometry(cylinder(8), trs(post.x, 3.42, post.z, 0, 0.08, 0.06, 0.08), rgb(neon.white, 2));
  }
  for (const blade of SIGN_BLADES) {
    const accent = rgb(ACCENT[blade.district], 1.9);
    const c = Math.cos(blade.rotY);
    const s = Math.sin(blade.rotY);
    const at = (lx: number, ly: number, lz: number) => _a.set(blade.x + lx * c + lz * s, ly, blade.z - lx * s + lz * c);
    const L = blade.length;
    // Plate (local +X along the blade).
    b.metal.addGeometry(unitBox(), trs(at(0.12 + L / 2, blade.y, 0).x, blade.y, at(0.12 + L / 2, blade.y, 0).z, blade.rotY, L, 0.48, 0.05), rgb('#0c0e18'));
    // Arrow tip in the blade plane (neon material is double-sided).
    const tip = at(0.12 + L, blade.y, 0);
    b.neon.addGeometry(arrowGeometry(), trs(tip.x, blade.y, tip.z, blade.rotY), accent);
    // Label quads on both faces (atlas row, accent tint).
    const [u0, v0, u1, v1] = atlasRow(blade.label as AtlasLabel);
    const halfW = (L - 0.2) / 2;
    const halfH = 0.15;
    const cx = 0.12 + L / 2;
    for (const face of [1, -1]) {
      const z = face * 0.031;
      // Reading direction is local +X on the front face and local -X on the back.
      const l = face > 0 ? cx - halfW : cx + halfW;
      const r = face > 0 ? cx + halfW : cx - halfW;
      const p0 = at(l, blade.y - halfH, z).clone();
      const p1 = at(r, blade.y - halfH, z).clone();
      const p2 = at(r, blade.y + halfH, z).clone();
      const p3 = at(l, blade.y + halfH, z).clone();
      b.labels.quad(p0, p1, p2, p3, rgb(ACCENT[blade.district], 2.1), [u0, v0, u1, v0, u1, v1, u0, v1]);
    }
    // Outline rails.
    for (const ly of [blade.y + 0.24, blade.y - 0.24]) {
      const p0 = at(0.12, ly, 0).clone();
      b.neon.bar(p0, _b.copy(at(0.12 + L, ly, 0)), 0.03, accent);
    }
  }

  // Exhibit pedestals.
  for (const exhibit of WORLD_EXHIBITS) {
    const { x: ex, z: ez } = exhibit.slot;
    const accent = exhibit.district === 'engineering' ? neon.cyan : neon.violet;
    b.metal.addGeometry(cylinder(32), trs(ex, 0.05, ez, 0, 0.82, 0.1, 0.82), rgb('#141827'));
    b.metal.addGeometry(unitBox(), trs(ex, 0.64, ez, exhibit.slot.rotationY, 0.16, 1.08, 0.16), metal);
    b.metal.addGeometry(unitBox(), trs(ex, 1.17, ez, exhibit.slot.rotationY, 1.1, 0.06, 0.14), metal);
    b.neon.flatRing(ex, ez, 0.83, 0.035, 0.101, rgb(accent, 1.5), 64);
  }

  // Phone booth.
  const p = PHONE_BOOTH;
  const emerald = rgb(neon.emerald, 1.2);
  const bc = Math.cos(p.rotationY);
  const bs = Math.sin(p.rotationY);
  for (const [lx, lz] of [
    [-0.5, -0.5],
    [0.5, -0.5],
    [-0.5, 0.5],
    [0.5, 0.5],
  ]) {
    const wx = p.x + lx * bc + lz * bs;
    const wz = p.z - lx * bs + lz * bc;
    b.metal.addGeometry(unitBox(), trs(wx, 1.2, wz, p.rotationY, 0.09, 2.4, 0.09), metal);
  }
  b.metal.addGeometry(unitBox(), trs(p.x, 2.45, p.z, p.rotationY, 1.12, 0.12, 1.12), metal);
  b.metal.addGeometry(unitBox(), trs(p.x, 0.04, p.z, p.rotationY, 1.1, 0.08, 1.1), metal);
  // Back and side glass glow (emissive panels inside the frame).
  b.neon.addGeometry(unitBox(), trs(p.x - bs * 0.47, 1.35, p.z - bc * 0.47, p.rotationY, 0.86, 1.7, 0.02), rgb(neon.emerald, 0.22));
  // Side glass (dimmer), so the booth reads as a booth from the street and not a lone panel.
  for (const side of [-1, 1]) {
    b.neon.addGeometry(unitBox(), trs(p.x + side * bc * 0.47, 1.35, p.z - side * bs * 0.47, p.rotationY, 0.02, 1.7, 0.86), rgb(neon.emerald, 0.12));
  }
  b.neon.addGeometry(unitBox(), trs(p.x, 2.6, p.z, p.rotationY, 0.7, 0.18, 0.7), emerald);
}

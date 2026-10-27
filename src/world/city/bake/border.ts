// Border strip and arena surroundings: street lamps and two-post billboards
// with real skill / craft terms along the island edge (trees are instanced by
// <Trees />). Placement data lives in gamingLayout.ts with the colliders.

import { Vector3 } from 'three';
import { neon } from '@/styles/tokens';
import { COLORS } from '../constants';
import { rgb, trs, unitBox } from '../lib/GeometryBuilder';
import { signUv, TECH_TERMS } from '../lib/signAtlas';
import { BORDER_TERMS, zoneUv } from '../lib/zoneAtlas';
import { BILLBOARD_SPAN, BORDER_PROPS, billboardPosts } from '../gamingLayout';
import { decal } from './streets';
import { cylinder, type Builders } from './builders';
import { atlasQuad } from './frame';

const UP = new Vector3(0, 1, 0);
const _a = new Vector3();
const _b = new Vector3();

function lamp(b: Builders, x: number, z: number, nx: number, nz: number): void {
  const metal = rgb(COLORS.metal);
  const head = rgb(neon.amber, 2.6);
  b.metal.addGeometry(cylinder(10), trs(x, 0.09, z, 0, 0.17, 0.18, 0.17), metal);
  b.metal.addGeometry(cylinder(8, 0.7, 1), trs(x, 1.55, z, 0, 0.07, 3.1, 0.07), metal);
  b.metal.bar(_a.set(x, 3.05, z), _b.set(x + nx * 0.85, 3.05, z + nz * 0.85), 0.07, metal);
  const hx = x + nx * 0.8;
  const hz = z + nz * 0.8;
  const yaw = Math.atan2(-nz, nx);
  b.metal.addGeometry(unitBox(), trs(hx, 3.0, hz, yaw, 0.42, 0.07, 0.2), metal);
  b.neon.addGeometry(unitBox(), trs(hx, 2.955, hz, yaw, 0.34, 0.025, 0.14), head);
  decal(b, hx, hz, 3.4, 3.4, 0, neon.amber, 0.3);
}

const TINTS = [neon.cyan, neon.violet, neon.orange, neon.magenta, '#2de2c8', neon.amber];

function billboard(b: Builders, i: number, x: number, z: number, nx: number, nz: number, posts: Array<[number, number]>): void {
  const metal = rgb('#1a1e2c');
  const normal = new Vector3(nx, 0, nz);
  const tint = TINTS[i % TINTS.length];
  // Alternate creative / skill terms (zone atlas) with the tech marquees (sign atlas).
  const useZone = i % 2 === 0;
  const entry = useZone ? zoneUv(`term:${BORDER_TERMS[(i >> 1) % BORDER_TERMS.length]}`) : signUv(`tech:${TECH_TERMS[(i * 5 + 3) % TECH_TERMS.length]}`);
  const w = BILLBOARD_SPAN - 0.3;
  const h = w / entry.aspect;
  const yc = 2.3;
  for (const [px, pz] of posts) b.metal.bar(_a.set(px, 0, pz), _b.set(px, yc + h / 2 + 0.1, pz), 0.14, metal);
  // Backing panel, sign on the inward face, neon frame line under it.
  const tx = -nz;
  const tz = nx;
  const c = new Vector3(x, yc, z);
  b.metal.addGeometry(unitBox(), trs(x - nx * 0.06, yc, z - nz * 0.06, Math.atan2(nx, nz), w + 0.25, h + 0.25, 0.08), rgb('#090b13'));
  atlasQuad(useZone ? b.zone : b.signs, entry, c.clone().addScaledVector(normal, 0.0), normal, UP, w, rgb(tint, 1.7));
  b.neon.bar(_a.set(x - tx * (w / 2 + 0.12), yc - h / 2 - 0.16, z - tz * (w / 2 + 0.12)), _b.set(x + tx * (w / 2 + 0.12), yc - h / 2 - 0.16, z + tz * (w / 2 + 0.12)), 0.05, rgb(tint, 1.6));
  decal(b, x + nx * 1.4, z + nz * 1.4, 4.2, 2.4, Math.atan2(nx, nz), tint, 0.14);
}

export function bakeBorder(b: Builders): void {
  let bi = 0;
  for (const p of BORDER_PROPS) {
    if (p.kind === 'lamp') lamp(b, p.x, p.z, p.nx, p.nz);
    else if (p.kind === 'billboard') billboard(b, bi++, p.x, p.z, p.nx, p.nz, billboardPosts(p));
  }
}

// Streets: raised sidewalks on every lot, asphalt avenues, paved plazas with
// inlaid accent light lines, lane markings and crosswalks, streetlamps and
// the additive "wet street" light pools.

import { Vector3 } from 'three';
import { neon } from '@/styles/tokens';
import { AVENUES, BUILDING_LOTS, HUB_PROPS, PLAZAS, PORTALS, type DistrictId } from '../../config/layout';
import { WORLD_EXHIBITS } from '../../config/exhibits';
import { ACCENT, COLORS, Y } from '../constants';
import { STREET_LAMPS } from '../propLayout';
import { rgb, trs, unitBox } from '../lib/GeometryBuilder';
import { cylinder, type Builders } from './builders';

const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();

/** Start offsets (along the avenue from the hub) of the crosswalks on each avenue. */
export function crosswalkStarts(id: DistrictId, tHub: number, tDist: number): number[] {
  void tHub;
  return id === 'about' || id === 'gaming' ? [tDist - 1.55] : [];
}

function plazaDisc(b: Builders, cx: number, cz: number, r: number): void {
  const seg = 96;
  const white = rgb('#ffffff');
  for (let i = 0; i < seg; i++) {
    const t0 = (i / seg) * Math.PI * 2;
    const t1 = ((i + 1) / seg) * Math.PI * 2;
    const x0 = Math.cos(t0);
    const z0 = Math.sin(t0);
    const x1 = Math.cos(t1);
    const z1 = Math.sin(t1);
    b.plaza.tri(
      _a.set(cx, Y.plaza, cz),
      _b.set(cx + x1 * r, Y.plaza, cz + z1 * r),
      _c.set(cx + x0 * r, Y.plaza, cz + z0 * r),
      white,
      [0.5, 0.5, 0.5 + x1 / 2, 0.5 - z1 / 2, 0.5 + x0 / 2, 0.5 - z0 / 2],
    );
  }
}

/** Decal helper: additive light pool, `strength` scales the accent colour. */
export function decal(b: Builders, x: number, z: number, sx: number, sz: number, rotY: number, color: string, strength: number): void {
  b.decals.flatQuad(x, z, sx, sz, rotY, Y.decal, rgb(color, strength));
}

function plazaOf(id: DistrictId) {
  const p = PLAZAS.find((plaza) => plaza.id === id);
  if (!p) throw new Error(`Missing plaza ${id}`);
  return p;
}

export function bakeStreets(b: Builders): void {
  const sidewalk = rgb(COLORS.sidewalk);
  const curb = rgb(COLORS.curb);
  for (const lot of BUILDING_LOTS) {
    b.ground.box(lot.minX, 0, lot.minZ, lot.maxX, Y.sidewalk, lot.maxZ, { color: curb, top: sidewalk, skip: { ny: true } });
  }

  const asphalt = rgb(COLORS.asphalt);
  for (const a of AVENUES) b.asphalt.flatRect(a.minX, a.minZ, a.maxX, a.maxZ, Y.avenue, asphalt);

  for (const p of PLAZAS) plazaDisc(b, p.x, p.z, p.r);

  // Markings along each of the four avenue segments.
  const mark = rgb(COLORS.marking);
  const hub = plazaOf('hub');
  for (const id of ['engineering', 'creative', 'about', 'gaming'] as const) {
    const plaza = plazaOf(id);
    const len = Math.hypot(plaza.x, plaza.z);
    const dx = plaza.x / len;
    const dz = plaza.z / len;
    const px = -dz;
    const pz = dx;
    const along = (t: number, k: number): [number, number] => [dx * t + px * k, dz * t + pz * k];
    const strip = (t0: number, t1: number, k0: number, k1: number) => {
      const [ax, az] = along(t0, k0);
      const [bx, bz] = along(t1, k1);
      b.markings.flatRect(Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz), Y.marking, mark);
    };
    const tHub = hub.r;
    const tDist = len - plaza.r;
    // Crosswalk at the district-plaza entry of the north/south avenues. The
    // hub ends stay clear for the ground-painted district labels.
    for (const t of crosswalkStarts(id, tHub, tDist)) {
      for (let s = -3; s <= 3; s++) strip(t, t + 1.2, s * 1 - 0.2, s * 1 + 0.2);
    }
    // Edge lines following the plaza circles.
    for (const k of [-3.72, 3.72]) {
      const t0 = Math.sqrt(hub.r * hub.r - k * k);
      const t1 = len - Math.sqrt(plaza.r * plaza.r - k * k);
      strip(t0, t1, k - 0.05, k + 0.05);
    }
  }

  // Inlaid light lines.
  b.neon.flatRing(0, 0, hub.r - 0.42, 0.07, Y.inlay, rgb(neon.white, 1.25), 160);
  b.neon.flatRing(0, 0, 2.55, 0.05, Y.inlay, rgb(neon.cyan, 1.4), 96);
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + (i / 8) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    b.neon.bar(_a.set(ca * 8.7, Y.inlay, sa * 8.7), _b.set(ca * 9.35, Y.inlay, sa * 9.35), 0.06, rgb(neon.white, 1.1));
  }
  for (const id of ['engineering', 'creative', 'about', 'gaming'] as const) {
    const plaza = plazaOf(id);
    const accent = ACCENT[id];
    b.neon.flatRing(plaza.x, plaza.z, plaza.r - 0.38, 0.07, Y.inlay, rgb(accent, 1.6), 144);
    b.neon.flatRing(plaza.x, plaza.z, 2.1, 0.04, Y.inlay, rgb(accent, 0.9), 72);
    const len = Math.hypot(plaza.x, plaza.z);
    const dx = plaza.x / len;
    const dz = plaza.z / len;
    // Soft accent pool over the whole plaza and a stronger one by the landmark.
    decal(b, plaza.x, plaza.z, plaza.r * 2.1, plaza.r * 2.1, 0, accent, 0.07);
    decal(b, plaza.x + dx * 6.5, plaza.z + dz * 6.5, 6, 9, Math.atan2(dx, dz), accent, 0.2);
  }
  decal(b, 0, 0, 10, 10, 0, '#cfe6ff', 0.12);

  for (const portal of PORTALS) {
    const fx = Math.sin(portal.rotationY);
    const fz = Math.cos(portal.rotationY);
    decal(b, portal.x + fx * 1.1, portal.z + fz * 1.1, 3.2, 2.6, portal.rotationY, ACCENT[portal.district], 0.38);
  }
  for (const exhibit of WORLD_EXHIBITS) {
    const { x, z, rotationY } = exhibit.slot;
    const accent = exhibit.district === 'engineering' ? neon.cyan : neon.violet;
    decal(b, x + Math.sin(rotationY) * 1.6, z + Math.cos(rotationY) * 1.6, 3.8, 2.8, rotationY, accent, 0.16);
  }
  for (const post of HUB_PROPS.signposts) decal(b, post.x, post.z, 2.2, 2.2, 0, '#cfe6ff', 0.08);

  bakeLamps(b);
}

function bakeLamps(b: Builders): void {
  const metal = rgb(COLORS.metal);
  const head = rgb(neon.amber, 2.6);
  for (const lamp of STREET_LAMPS) {
    const ax = Math.cos(lamp.armAngle);
    const az = -Math.sin(lamp.armAngle);
    b.metal.addGeometry(cylinder(10), trs(lamp.x, 0.09, lamp.z, 0, 0.17, 0.18, 0.17), metal);
    b.metal.addGeometry(cylinder(8, 0.7, 1), trs(lamp.x, 1.55, lamp.z, 0, 0.07, 3.1, 0.07), metal);
    b.metal.bar(_a.set(lamp.x, 3.05, lamp.z), _b.set(lamp.x + ax * 0.85, 3.05, lamp.z + az * 0.85), 0.07, metal);
    const hx = lamp.x + ax * 0.8;
    const hz = lamp.z + az * 0.8;
    b.metal.addGeometry(unitBox(), trs(hx, 3.0, hz, lamp.armAngle, 0.42, 0.07, 0.2), metal);
    b.neon.addGeometry(unitBox(), trs(hx, 2.955, hz, lamp.armAngle, 0.34, 0.025, 0.14), head);
    decal(b, hx, hz, 3.4, 3.4, 0, neon.amber, 0.32);
  }
}


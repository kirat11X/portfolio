// Layout of the ground-painted district labels near the hub, plus a pure
// overlap check. Each label sits on its avenue's centreline outside the hub
// plaza ring: the word first, then an arrow on the far side pointing toward
// the district. Words read upright for the north-facing spawn camera.

import { HUB_PROPS, PLAZAS, type DistrictId } from '../config/layout';
import { STREET_LAMPS, LAMP_COLLIDER_RADIUS } from './propLayout';
import { SIGN_BLADES } from './signposts';
import { crosswalkStarts } from './bake/streets';

export interface FootRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface GroundLabelLayout {
  id: Exclude<DistrictId, 'hub'>;
  atlas: string;
  /** Unit direction from the hub toward the district. */
  dir: [number, number];
  word: { x: number; z: number; quadW: number; quadH: number; rect: FootRect };
  arrow: { x: number; z: number; size: number; rect: FootRect };
}

/** Fraction of the atlas cell the word actually covers (measured from the art). */
const WORD_FILL: Record<Exclude<DistrictId, 'hub'>, number> = { engineering: 0.96, creative: 0.96, about: 0.95, gaming: 0.78 };
const ATLAS_ASPECT = 1020 / 192;
const HUB_R = 10;
const START = 10.5; // first unit along the avenue past the ring (with margin)
const GAP = 0.3;
const ARROW = 0.9;

function rectAround(x: number, z: number, hx: number, hz: number): FootRect {
  return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
}

export function groundLabelLayout(): GroundLabelLayout[] {
  const defs: Array<{ id: Exclude<DistrictId, 'hub'>; dir: [number, number]; quadW: number }> = [
    { id: 'engineering', dir: [-1, 0], quadW: 3.1 },
    { id: 'creative', dir: [1, 0], quadW: 3.1 },
    { id: 'about', dir: [0, -1], quadW: 5.8 },
    { id: 'gaming', dir: [0, 1], quadW: 4.6 },
  ];
  return defs.map(({ id, dir, quadW }) => {
    const quadH = quadW / ATLAS_ASPECT;
    const textW = quadW * WORD_FILL[id];
    const textH = quadH * 0.7;
    // Extent of the word along the avenue (x for east/west avenues, z for north/south).
    const along = dir[0] !== 0 ? textW : textH;
    const across = dir[0] !== 0 ? textH : textW;
    const t0 = START + along / 2;
    const ta = START + along + GAP + ARROW / 2;
    const wx = dir[0] * t0;
    const wz = dir[1] * t0;
    const ax = dir[0] * ta;
    const az = dir[1] * ta;
    const word = {
      x: wx,
      z: wz,
      quadW,
      quadH,
      rect: dir[0] !== 0 ? rectAround(wx, wz, along / 2, across / 2) : rectAround(wx, wz, across / 2, along / 2),
    };
    const arrow = { x: ax, z: az, size: ARROW, rect: rectAround(ax, az, ARROW / 2, ARROW / 2) };
    return { id, atlas: `ground:${dir[0] < 0 ? 'west' : dir[0] > 0 ? 'east' : dir[1] < 0 ? 'north' : 'south'}`, dir, word, arrow };
  });
}

function rectsOverlap(a: FootRect, b: FootRect): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

function rectCircle(r: FootRect, x: number, z: number, radius: number): boolean {
  const cx = Math.max(r.minX, Math.min(x, r.maxX));
  const cz = Math.max(r.minZ, Math.min(z, r.maxZ));
  return Math.hypot(cx - x, cz - z) < radius;
}

/** Problems found (empty when the layout is clean). */
export function checkGroundLabels(layout = groundLabelLayout()): string[] {
  const issues: string[] = [];
  const rects = layout.flatMap((l) => [
    { name: `${l.id} word`, rect: l.word.rect },
    { name: `${l.id} arrow`, rect: l.arrow.rect },
  ]);
  for (const { name, rect } of rects) {
    // Hub ring band (inlay ring + plaza edge): every corner must lie outside r = HUB_R.
    const straddlesX = rect.minX < 0 && rect.maxX > 0;
    const straddlesZ = rect.minZ < 0 && rect.maxZ > 0;
    const closest = Math.hypot(straddlesX ? 0 : Math.min(Math.abs(rect.minX), Math.abs(rect.maxX)), straddlesZ ? 0 : Math.min(Math.abs(rect.minZ), Math.abs(rect.maxZ)));
    if (closest < HUB_R + 0.2) issues.push(`${name} touches the hub ring (closest r = ${closest.toFixed(2)})`);
    // Inside the avenue (|offset| ≤ 4 − margin).
    const lateral = straddlesX ? Math.max(Math.abs(rect.minX), Math.abs(rect.maxX)) : Math.max(Math.abs(rect.minZ), Math.abs(rect.maxZ));
    if (lateral > 3.6) issues.push(`${name} leaves the avenue (lateral ${lateral.toFixed(2)})`);
    // District plazas.
    for (const p of PLAZAS) {
      if (p.id === 'hub') continue;
      if (rectCircle(rect, p.x, p.z, p.r + 0.2)) issues.push(`${name} enters the ${p.id} plaza`);
    }
    // Crosswalks.
    for (const p of PLAZAS) {
      if (p.id === 'hub') continue;
      const len = Math.hypot(p.x, p.z);
      const dx = p.x / len;
      const dz = p.z / len;
      for (const t of crosswalkStarts(p.id, HUB_R, len - p.r)) {
        const xs = [dx * t, dx * (t + 1.2), -dz * 3.4, dz * 3.4];
        const zs = [dz * t, dz * (t + 1.2), dx * 3.4, -dx * 3.4];
        const cw = dx !== 0
          ? { minX: Math.min(xs[0], xs[1]), maxX: Math.max(xs[0], xs[1]), minZ: -3.4, maxZ: 3.4 }
          : { minX: -3.4, maxX: 3.4, minZ: Math.min(zs[0], zs[1]), maxZ: Math.max(zs[0], zs[1]) };
        if (rectsOverlap(rect, cw)) issues.push(`${name} overlaps the ${p.id} crosswalk`);
      }
    }
    // Signposts (post + blade footprint in plan).
    for (const post of HUB_PROPS.signposts) if (rectCircle(rect, post.x, post.z, post.r)) issues.push(`${name} overlaps a signpost`);
    for (const blade of SIGN_BLADES) {
      const ex = blade.x + Math.cos(blade.rotY) * (blade.length + 0.62);
      const ez = blade.z - Math.sin(blade.rotY) * (blade.length + 0.62);
      const br = { minX: Math.min(blade.x, ex) - 0.25, maxX: Math.max(blade.x, ex) + 0.25, minZ: Math.min(blade.z, ez) - 0.25, maxZ: Math.max(blade.z, ez) + 0.25 };
      if (rectsOverlap(rect, br)) issues.push(`${name} lies under the ${blade.id} blade`);
    }
    for (const lamp of STREET_LAMPS) if (rectCircle(rect, lamp.x, lamp.z, LAMP_COLLIDER_RADIUS + 0.2)) issues.push(`${name} overlaps ${lamp.id}`);
  }
  // Labels against each other.
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++)
      if (rectsOverlap(rects[i].rect, rects[j].rect)) issues.push(`${rects[i].name} overlaps ${rects[j].name}`);
  return issues;
}

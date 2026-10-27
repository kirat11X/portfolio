// Bakes the city blocks from CITY_PLAN into the facade / neon / metal buckets.

import { Vector3 } from 'three';
import { BAY_W, COLORS, FLOOR_H, WIN_COLS, WIN_ROWS } from '../constants';
import { CITY_PLAN, type PlanBox } from '../buildingPlan';
import { rgb, trs, unitBox } from '../lib/GeometryBuilder';
import { cylinder, type Builders } from './builders';

const _a = new Vector3();
const _b = new Vector3();

function parapet(b: Builders, box: PlanBox): void {
  const c = rgb(COLORS.parapet);
  const t = 0.12;
  const h = 0.28;
  const y0 = box.y1;
  const y1 = box.y1 + h;
  const o = { color: c, skip: { ny: true } };
  b.facade.box(box.x0, y0, box.z0, box.x1, y1, box.z0 + t, o);
  b.facade.box(box.x0, y0, box.z1 - t, box.x1, y1, box.z1, o);
  b.facade.box(box.x0, y0, box.z0 + t, box.x0 + t, y1, box.z1 - t, o);
  b.facade.box(box.x1 - t, y0, box.z0 + t, box.x1, y1, box.z1 - t, o);
}

export function bakeBuildings(b: Builders): void {
  const roof = rgb(COLORS.roof);
  for (const box of CITY_PLAN.boxes) {
    b.facade.box(box.x0, box.y0, box.z0, box.x1, box.y1, box.z1, {
      color: rgb(box.color),
      top: roof,
      skip: { ny: true },
      windows: { gain: box.win, uOff: box.uOff, vOff: box.vOff, bayW: BAY_W, floorH: FLOOR_H, cols: WIN_COLS, rows: WIN_ROWS },
    });
    parapet(b, box);
  }

  const clutter = rgb(COLORS.clutter);
  const dark = rgb(COLORS.metal);
  for (const item of CITY_PLAN.roofItems) {
    if (item.kind === 'ac' || item.kind === 'vent') {
      b.facade.box(item.x - item.sx / 2, item.y, item.z - item.sz / 2, item.x + item.sx / 2, item.y + item.sy, item.z + item.sz / 2, {
        color: clutter,
        top: rgb('#30364b'),
        skip: { ny: true },
      });
    } else if (item.kind === 'tank') {
      b.facade.addGeometry(cylinder(12), trs(item.x, item.y + 0.2 + item.sy / 2, item.z, 0, item.sx, item.sy, item.sx), clutter);
      b.facade.addGeometry(cylinder(12, 0.15, 1), trs(item.x, item.y + 0.2 + item.sy + 0.12, item.z, 0, item.sx, 0.24, item.sx), clutter);
      b.facade.addGeometry(unitBox(), trs(item.x, item.y + 0.1, item.z, 0, item.sx * 1.4, 0.2, item.sx * 1.4), dark);
    } else {
      b.facade.bar(_a.set(item.x, item.y, item.z), _b.set(item.x, item.y + item.sy, item.z), 0.07, dark);
      b.facade.bar(_a.set(item.x - 0.3, item.y + item.sy * 0.7, item.z), _b.set(item.x + 0.3, item.y + item.sy * 0.7, item.z), 0.04, dark);
    }
  }
  b.beacons.push(...CITY_PLAN.beacons);

  for (const crown of CITY_PLAN.crowns) {
    const { x0, x1, z0, z1, y1 } = crown.box;
    const y = y1 + 0.3;
    const col = rgb(crown.color, 1.5);
    const t = 0.055;
    const e = 0.02;
    b.neon.bar(_a.set(x0 - e, y, z0 - e), _b.set(x1 + e, y, z0 - e), t, col);
    b.neon.bar(_a.set(x0 - e, y, z1 + e), _b.set(x1 + e, y, z1 + e), t, col);
    b.neon.bar(_a.set(x0 - e, y, z0 - e), _b.set(x0 - e, y, z1 + e), t, col);
    b.neon.bar(_a.set(x1 + e, y, z0 - e), _b.set(x1 + e, y, z1 + e), t, col);
    if (crown.corners) {
      const vc = rgb(crown.color, 1.05);
      for (const [cx, cz] of [
        [x0 - e, z0 - e],
        [x1 + e, z0 - e],
        [x0 - e, z1 + e],
        [x1 + e, z1 + e],
      ]) {
        b.neon.bar(_a.set(cx, y1 * 0.35, cz), _b.set(cx, y, cz), 0.045, vc);
      }
    }
  }

  // Billboard rails and posts (the letters themselves are Text components).
  for (const board of CITY_PLAN.billboards) {
    const c = Math.cos(board.rotationY);
    const s = Math.sin(board.rotationY);
    const local = (lx: number, y: number, lz: number) => _a.set(board.x + lx * c + lz * s, y, board.z - lx * s + lz * c);
    const base = board.y - board.fontSize * 0.62;
    const roofY = board.y - 1.15;
    const half = board.width * 0.36;
    for (const lx of [-half, half]) {
      const from = local(lx, roofY, -0.08).clone();
      b.metal.bar(from, _b.copy(local(lx, base, -0.08)), 0.08, dark);
    }
    const left = local(-board.width / 2, base, -0.08).clone();
    b.metal.bar(left, _b.copy(local(board.width / 2, base, -0.08)), 0.09, dark);
  }
}

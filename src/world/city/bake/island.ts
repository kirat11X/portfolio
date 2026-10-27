// Island slab: chamfered rounded-rectangle top, gradient side walls, underside,
// and a thin glowing trim line around the side like a lit display base.

import { Vector3 } from 'three';
import { ISLAND_CENTER, islandOutline } from '../../config/layout';
import { COLORS, ISLAND_DEPTH } from '../constants';
import { rgb } from '../lib/GeometryBuilder';
import type { Builders } from './builders';

const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _d = new Vector3();
const _o = new Vector3();

export function bakeIsland(b: Builders): void {
  const chamfer = 0.14;
  const outer = islandOutline(0);
  const top = islandOutline(-chamfer);
  const n = outer.length;
  const ground = rgb(COLORS.ground);
  const s = 4;

  // Top surface: fan from the centre (normal +Y needs (c, p[i+1], p[i])).
  _o.set(ISLAND_CENTER.x, 0, ISLAND_CENTER.z);
  for (let i = 0; i < n; i++) {
    const [x0, z0] = top[i];
    const [x1, z1] = top[(i + 1) % n];
    b.ground.tri(_o, _a.set(x1, 0, z1), _b.set(x0, 0, z0), ground, [ISLAND_CENTER.x / s, -ISLAND_CENTER.z / s, x1 / s, -z1 / s, x0 / s, -z0 / s]);
  }

  const edge = rgb('#323952');
  const sideTop = rgb(COLORS.islandSide);
  const sideBottom = rgb('#07080e');
  const bottom = rgb(COLORS.islandBottom);
  const yTop = -chamfer;
  const yBot = -ISLAND_DEPTH;
  for (let i = 0; i < n; i++) {
    const [x0, z0] = outer[i];
    const [x1, z1] = outer[(i + 1) % n];
    const [tx0, tz0] = top[i];
    const [tx1, tz1] = top[(i + 1) % n];
    // Chamfer.
    b.island.quad(_a.set(tx0, 0, tz0), _b.set(tx1, 0, tz1), _c.set(x1, yTop, z1), _d.set(x0, yTop, z0), edge);
    // Side wall with a vertical gradient.
    b.island.quad(
      _a.set(x0, yTop, z0),
      _b.set(x1, yTop, z1),
      _c.set(x1, yBot, z1),
      _d.set(x0, yBot, z0),
      [sideTop, sideTop, sideBottom, sideBottom],
    );
    // Underside.
    b.island.tri(_o.set(ISLAND_CENTER.x, yBot, ISLAND_CENTER.z), _a.set(x0, yBot, z0), _b.set(x1, yBot, z1), bottom);
  }

  // Trim lines just proud of the wall.
  const trim = (y0: number, y1: number, offset: number, color: ReturnType<typeof rgb>) => {
    const ring = islandOutline(offset);
    for (let i = 0; i < ring.length; i++) {
      const [x0, z0] = ring[i];
      const [x1, z1] = ring[(i + 1) % ring.length];
      b.neon.quad(_a.set(x0, y1, z0), _b.set(x1, y1, z1), _c.set(x1, y0, z1), _d.set(x0, y0, z0), color);
    }
  };
  trim(-0.34, -0.28, 0.012, rgb('#bfe6ff', 1.7));
  trim(-ISLAND_DEPTH + 0.06, -ISLAND_DEPTH + 0.09, 0.012, rgb('#5b6cff', 0.9));
}

// Second layer of detail: readable signage from the shared sign atlas (tech
// marquees, ground-painted district labels and path chevrons, Contact
// boards, creative-tool tiles, murals), tech props (server racks, a GPU
// monument, rooftop cooling units, circuit traces), creative props (film
// reel, camera on a tripod, paint-splash light pools) and contrast plates
// behind portal labels.

import { Matrix4, RingGeometry, Vector3 } from 'three';
import { neon } from '@/styles/tokens';
import { BUILDING_LOTS, DISTRICTS, LANDMARKS, PLAZAS, PORTALS } from '../../config/layout';
import { ACCENT, COLORS, EXTRA, Y } from '../constants';
import { CITY_PLAN, type PlanBox } from '../buildingPlan';
import { CAMERA_PROP, CONTACT_BOARDS, FILM_REEL, GPU_MONUMENT, PDC_SIGN, RACKS } from '../propLayout';
import { PORTAL_LABEL_TEXT, PORTAL_LABEL_SIZE, PORTAL_DOOR_H } from '../portalLabels';
import { rgb, trs, unitBox, type RGB } from '../lib/GeometryBuilder';
import { signUv, TECH_TERMS } from '../lib/signAtlas';
import { zoneUv } from '../lib/zoneAtlas';
import { atlasQuad } from './frame';
import { createRng } from '../lib/random';
import { decal } from './streets';
import { checkGroundLabels, groundLabelLayout } from '../groundLabels';
import { cylinder, type Builders } from './builders';

const UP = new Vector3(0, 1, 0);
const _r = new Vector3();
const _u = new Vector3();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _d = new Vector3();

/**
 * Atlas quad centred at `centre`, facing `normal`, with text-up `up`.
 * Height follows the entry's aspect from `width`. Returns the height.
 */
function signQuad(b: Builders, id: string, centre: Vector3, normal: Vector3, up: Vector3, width: number, color: RGB): number {
  const { uv, aspect } = signUv(id);
  const height = width / aspect;
  _r.crossVectors(up, normal).normalize().multiplyScalar(width / 2);
  _u.copy(up).normalize().multiplyScalar(height / 2);
  _a.copy(centre).sub(_r).sub(_u);
  _b.copy(centre).add(_r).sub(_u);
  _c.copy(centre).add(_r).add(_u);
  _d.copy(centre).sub(_r).add(_u);
  const [u0, v0, u1, v1] = uv;
  b.signs.quad(_a, _b, _c, _d, color, [u0, v0, u1, v0, u1, v1, u0, v1]);
  return height;
}

const N = (x: number, y: number, z: number) => new Vector3(x, y, z);

/** Cylinder template turned to face ±Z: radius r, thickness d along Z. */
function discZ(x: number, y: number, z: number, r: number, d: number): Matrix4 {
  return new Matrix4()
    .makeTranslation(x, y, z)
    .multiply(new Matrix4().makeRotationX(Math.PI / 2))
    .multiply(new Matrix4().makeScale(r, d, r));
}

/** Outward face of a box looking toward the island centre (dominant axis). */
function faceTowardCentre(box: PlanBox): { normal: Vector3; centre: Vector3; width: number } {
  const cx = (box.x0 + box.x1) / 2;
  const cz = (box.z0 + box.z1) / 2;
  if (Math.abs(cx) >= Math.abs(cz)) {
    const sx = -Math.sign(cx) || 1;
    return { normal: N(sx, 0, 0), centre: N(sx > 0 ? box.x1 : box.x0, 0, cz), width: box.z1 - box.z0 };
  }
  const sz = -Math.sign(cz) || 1;
  return { normal: N(0, 0, sz), centre: N(cx, 0, sz > 0 ? box.z1 : box.z0), width: box.x1 - box.x0 };
}

function boxesOf(lotId: string): PlanBox[] {
  const lot = BUILDING_LOTS.find((l) => l.id === lotId);
  if (!lot) return [];
  return CITY_PLAN.boxes.filter((bx) => bx.x0 >= lot.minX && bx.x1 <= lot.maxX && bx.z0 >= lot.minZ && bx.z1 <= lot.maxZ);
}

// ---------------------------------------------------------------- signage

function techMarquees(b: Builders): void {
  const lots = ['nw-0', 'sw-0', 'nw-1', 'sw-1', 'nw-2', 'sw-2', 'nw-3', 'sw-3', 'nw-4', 'sw-4'];
  const tints = [neon.cyan, EXTRA.teal, neon.cyan, EXTRA.amber, EXTRA.teal, neon.cyan, EXTRA.amber, neon.cyan, EXTRA.teal, neon.cyan];
  lots.forEach((lotId, i) => {
    const boxes = boxesOf(lotId);
    if (!boxes.length) return;
    const top = boxes.reduce((a, c) => (c.y1 > a.y1 ? c : a));
    const face = faceTowardCentre(top);
    const term = TECH_TERMS[i % TECH_TERMS.length];
    const width = Math.min(face.width * 0.92, term.length > 9 ? 5.2 : 3.6);
    const { aspect } = signUv(`tech:${term}`);
    const y = top.y1 - 0.35 - width / aspect / 2;
    const centre = face.centre.clone().addScaledVector(face.normal, 0.07);
    centre.y = y;
    signQuad(b, `tech:${term}`, centre, face.normal, UP, width, rgb(tints[i], 1.55));
  });
  // Two more on the Engineering Lab's side walls.
  const L = LANDMARKS.engineering;
  signQuad(b, 'tech:BYTETRACK', N((L.minX + L.maxX) / 2, 7.6, L.maxZ + 0.04), N(0, 0, 1), UP, 4.6, rgb(neon.cyan, 1.6));
  signQuad(b, 'tech:C++17', N((L.minX + L.maxX) / 2, 7.6, L.minZ - 0.04), N(0, 0, -1), UP, 3.4, rgb(EXTRA.teal, 1.6));
}

function groundLabels(b: Builders): void {
  const north = N(0, 0, -1);
  const y = Y.decal + 0.004;
  const gains: Record<string, number> = { engineering: 0.95, creative: 0.95, about: 1.05, gaming: 1.2 };
  for (const l of groundLabelLayout()) {
    const color = rgb(ACCENT[l.id], gains[l.id]);
    signQuad(b, l.atlas, N(l.word.x, y, l.word.z), UP, north, l.word.quadW, color);
    signQuad(b, 'arrow', N(l.arrow.x, y, l.arrow.z), UP, N(l.dir[0], 0, l.dir[1]), l.arrow.size, color);
  }
  if (import.meta.env.DEV) {
    const issues = checkGroundLabels();
    if (issues.length) console.warn('[city] ground label overlaps:', issues);
  }
}

function chevronPaths(b: Builders): void {
  for (const id of ['engineering', 'creative', 'about', 'gaming'] as const) {
    const plaza = PLAZAS.find((p) => p.id === id);
    if (!plaza) continue;
    const len = Math.hypot(plaza.x, plaza.z);
    const dx = plaza.x / len;
    const dz = plaza.z / len;
    const strong = id === 'gaming';
    const color = rgb(ACCENT[id], strong ? 1.25 : 0.7);
    // The Gaming path stops short of the arcade cabinets' pads.
    const end = id === 'gaming' ? len + 2.6 : len + plaza.r - 1.6;
    for (let t = len - plaza.r + 1.2; t < end; t += 1.5) {
      if (Math.abs(t - len) < 2.8) continue; // plaza centre ring
      const centre = N(dx * t, Y.inlay + 0.003, dz * t);
      // Chevron art points "up" in the atlas; up = travel direction.
      signQuad(b, 'chevron', centre, UP, N(dx, 0, dz), strong ? 1.25 : 1.0, color);
    }
  }
}

function contactSignage(b: Builders): void {
  // Free-standing boards at the Archive avenue entry, readable from the hub:
  // each faces the hub (toward z = 0).
  const metal = rgb(COLORS.metal);
  for (const board of CONTACT_BOARDS) {
    const width = 3.6;
    const { aspect } = signUv(board.atlas);
    const h = width / aspect;
    const yc = 2.0 + h / 2;
    const fz = board.z < 0 ? 1 : -1; // facing direction along z
    for (const dx of [-1.45, 1.45]) b.metal.addGeometry(unitBox(), trs(board.x + dx, (yc + h / 2) / 2, board.z - fz * 0.07, 0, 0.1, yc + h / 2, 0.1), metal);
    b.metal.addGeometry(unitBox(), trs(board.x, yc, board.z - fz * 0.06, 0, width + 0.2, h + 0.18, 0.08), rgb('#0a0c16'));
    signQuad(b, board.atlas, N(board.x, yc, board.z), N(0, 0, fz), UP, width, rgb(board.atlas === 'sayhello' ? neon.emerald : EXTRA.teal, 1.6));
    decal(b, board.x, board.z + fz * 1.2, 4.4, 2.4, 0, neon.emerald, 0.16);
    // Archive styling: blue frame, plinth and a "this way" plate pointing to the doors.
    const blue = rgb(neon.blue, 1.5);
    const fx0 = board.x - width / 2 - 0.12;
    const fx1 = board.x + width / 2 + 0.12;
    const fy0 = yc - h / 2 - 0.11;
    const fy1 = yc + h / 2 + 0.11;
    const zf = board.z + fz * 0.005;
    b.neon.bar(_a.set(fx0, fy0, zf), _b.set(fx1, fy0, zf), 0.04, blue);
    b.neon.bar(_a.set(fx0, fy1, zf), _b.set(fx1, fy1, zf), 0.04, blue);
    b.neon.bar(_a.set(fx0, fy0, zf), _b.set(fx0, fy1, zf), 0.04, blue);
    b.neon.bar(_a.set(fx1, fy0, zf), _b.set(fx1, fy1, zf), 0.04, blue);
    b.metal.addGeometry(unitBox(), trs(board.x, 0.14, board.z - fz * 0.07, 0, 3.4, 0.28, 0.6), rgb('#141829'));
    b.neon.bar(_a.set(board.x - 1.7, 0.29, board.z - fz * 0.07 + fz * 0.3), _b.set(board.x + 1.7, 0.29, board.z - fz * 0.07 + fz * 0.3), 0.035, rgb(neon.blue, 1.2));
    const plate = zoneUv('archive:this-way');
    const pw = 2.9;
    const ph = pw / plate.aspect;
    const py = fy0 - 0.2 - ph / 2;
    b.metal.addGeometry(unitBox(), trs(board.x, py, board.z - fz * 0.06, 0, pw + 0.12, ph + 0.1, 0.06), rgb('#0a0c16'));
    atlasQuad(b.zone, plate, N(board.x, py, board.z), N(0, 0, fz), UP, pw, rgb(neon.blue, 1.7));
  }
}

function creativeSignage(b: Builders): void {
  // App-tile row on the studio's upper volume, facing the plaza (west).
  const tiles = ['tile:ps', 'tile:pr', 'tile:ae', 'tile:figma', 'tile:canva'];
  const x = LANDMARKS.creative.minX + 1.2 - 0.05;
  tiles.forEach((id, i) => {
    signQuad(b, id, N(x, 9.45, -3.4 + i * 1.7), N(-1, 0, 0), UP, 1.45, rgb('#ffffff', 1.25));
  });
  // Rooftop tile signs on two creative-side blocks.
  const roofSets: Array<[string, string[]]> = [
    ['ne-1', ['tile:ps', 'tile:pr', 'tile:ae']],
    ['se-2', ['tile:figma', 'tile:canva']],
  ];
  const metal = rgb(COLORS.metal);
  for (const [lotId, ids] of roofSets) {
    const boxes = boxesOf(lotId);
    if (!boxes.length) continue;
    const top = boxes.reduce((a, c) => (c.y1 > a.y1 ? c : a));
    const cx = (top.x0 + top.x1) / 2;
    const cz = (top.z0 + top.z1) / 2;
    const rot = Math.atan2(-cx, -cz);
    const normal = N(Math.sin(rot), 0, Math.cos(rot));
    const right = new Vector3().crossVectors(UP, normal);
    const size = 1.5;
    ids.forEach((id, i) => {
      const off = (i - (ids.length - 1) / 2) * (size + 0.2);
      const c = N(cx, top.y1 + 0.3 + 0.55 + size / 2, cz).addScaledVector(right, off);
      b.metal.bar(N(c.x, top.y1, c.z).addScaledVector(normal, -0.08), N(c.x, c.y - size / 2, c.z).addScaledVector(normal, -0.08), 0.08, metal);
      b.metal.addGeometry(unitBox(), trs(c.x - normal.x * 0.06, c.y, c.z - normal.z * 0.06, rot, size + 0.1, size + 0.1, 0.06), rgb('#0b0c16'));
      signQuad(b, id, c, normal, UP, size, rgb('#ffffff', 1.3));
    });
  }
  // Murals on blank lower walls facing the hub.
  const murals: Array<[string, string]> = [
    ['ne-0', 'mural:a'],
    ['se-0', 'mural:b'],
    ['ne-3', 'mural:b'],
    ['se-3', 'mural:a'],
  ];
  for (const [lotId, id] of murals) {
    const boxes = boxesOf(lotId);
    if (!boxes.length) continue;
    const low = boxes.reduce((a, c) => (c.y0 <= a.y0 && c.x1 - c.x0 + c.z1 - c.z0 >= a.x1 - a.x0 + a.z1 - a.z0 ? c : a));
    const face = faceTowardCentre(low);
    const width = Math.min(face.width * 0.86, 4.2);
    const { aspect } = signUv(id);
    const h = Math.min(width / aspect, low.y1 - low.y0 - 0.5);
    const centre = face.centre.clone().addScaledVector(face.normal, 0.06);
    centre.y = 0.35 + h / 2;
    signQuad(b, id, centre, face.normal, UP, h * aspect, rgb('#ffffff', 1.05));
  }
}

function portalPlates(b: Builders): void {
  const plate = rgb('#070910');
  for (const portal of PORTALS) {
    const text = PORTAL_LABEL_TEXT[portal.id] ?? portal.label;
    const w = text.length * PORTAL_LABEL_SIZE * 0.78 + 0.6;
    const fx = Math.sin(portal.rotationY);
    const fz = Math.cos(portal.rotationY);
    b.metal.addGeometry(
      unitBox(),
      trs(portal.x + fx * 0.1, PORTAL_DOOR_H + 0.42, portal.z + fz * 0.1, portal.rotationY, w, PORTAL_LABEL_SIZE + 0.26, 0.04),
      plate,
    );
  }
}

// ---------------------------------------------------------------- tech props

function racks(b: Builders): void {
  const body = rgb('#10131e');
  const metal = rgb(COLORS.metal);
  const r = createRng('racks');
  const leds = [neon.cyan, EXTRA.teal, neon.emerald, EXTRA.amber, neon.blue];
  for (const rack of RACKS) {
    b.metal.box(rack.x - 0.5, 0, rack.z - 0.4, rack.x + 0.5, 2.4, rack.z + 0.4, { color: body, top: metal });
    const fz = rack.z + 0.405;
    for (let row = 0; row < 14; row++) {
      const y = 0.3 + row * 0.145;
      const n = r.int(1, 4);
      for (let k = 0; k < n; k++) {
        const x = rack.x - 0.38 + k * 0.1;
        b.neon.box(x, y, fz, x + 0.05, y + 0.03, fz + 0.012, { color: rgb(r.pick(leds), r.range(1.2, 2.2)) });
      }
      if (r.chance(0.4)) b.neon.box(rack.x + 0.05, y, fz, rack.x + 0.05 + r.range(0.1, 0.32), y + 0.02, fz + 0.012, { color: rgb(neon.cyan, 0.7) });
    }
    if (r.chance(0.6)) b.beacons.push({ x: rack.x + 0.36, y: 2.2, z: fz + 0.03, color: r.pick([neon.cyan, EXTRA.amber, neon.emerald]), rate: r.range(0.8, 1.6), phase: r.next(), size: 0.04, intensity: 3 });
  }
  // Cable trays above each rack row.
  for (const [x0, x1] of [
    [-32.2, -27.4],
    [-20.6, -17.0],
  ]) {
    b.metal.box(x0, 2.62, -17.0, x1, 2.7, -16.6, { color: metal });
    for (const x of [x0 + 0.2, x1 - 0.2]) b.metal.bar(N(x, 2.4, -16.8), N(x, 2.62, -16.8), 0.05, metal);
    b.neon.bar(N(x0, 2.71, -16.6), N(x1, 2.71, -16.6), 0.025, rgb(EXTRA.teal, 1.3));
  }
  decal(b, -29.8, -15.6, 6, 2.6, 0, neon.cyan, 0.16);
  decal(b, -18.8, -15.6, 5, 2.6, 0, neon.cyan, 0.16);
}

let fanRing: RingGeometry | null = null;
function gpu(b: Builders): void {
  const { x, z, length } = GPU_MONUMENT;
  const body = rgb('#141826');
  const shroud = rgb('#1d2234');
  const metal = rgb(COLORS.metal);
  const H = 1.7;
  const T = 0.45;
  const y0 = 0.35;
  // Stand and card body (fans face north, toward the plaza).
  b.metal.box(x - length / 2 + 0.3, 0, z - 0.45, x - length / 2 + 0.7, y0, z + 0.45, { color: metal });
  b.metal.box(x + length / 2 - 0.7, 0, z - 0.45, x + length / 2 - 0.3, y0, z + 0.45, { color: metal });
  b.metal.box(x - length / 2, y0, z - T / 2, x + length / 2, y0 + H, z + T / 2, { color: body, top: shroud });
  b.metal.box(x - length / 2 - 0.08, y0 - 0.1, z - 0.3, x - length / 2, y0 + H + 0.1, z + 0.3, { color: rgb('#2a3044') });
  // Glowing top edge and VRAM strip.
  b.neon.bar(N(x - length / 2, y0 + H + 0.01, z - T / 2 - 0.01), N(x + length / 2, y0 + H + 0.01, z - T / 2 - 0.01), 0.04, rgb(neon.cyan, 2));
  for (let i = 0; i < 8; i++) {
    const vx = x - length / 2 + 0.35 + i * 0.5;
    b.neon.box(vx, y0 + 0.08, z - T / 2 - 0.02, vx + 0.32, y0 + 0.18, z - T / 2 - 0.005, { color: rgb(i % 2 ? EXTRA.amber : EXTRA.teal, 1.5) });
  }
  // Three fans.
  fanRing ??= new RingGeometry(0.54, 0.6, 40);
  for (const dx of [-1.45, 0, 1.45]) {
    const fz = z - T / 2 - 0.01;
    const yc = y0 + H / 2 + 0.08;
    b.metal.addGeometry(cylinder(28), discZ(x + dx, yc, fz, 0.56, 0.04), rgb('#0b0d16'));
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      b.metal.bar(N(x + dx + Math.cos(a) * 0.1, yc + Math.sin(a) * 0.1, fz - 0.03), N(x + dx + Math.cos(a + 0.5) * 0.5, yc + Math.sin(a + 0.5) * 0.5, fz - 0.03), 0.05, rgb('#232a3e'));
    }
    b.neon.addGeometry(fanRing, trs(x + dx, yc, fz - 0.04, Math.PI), rgb(neon.cyan, 1.7));
    b.neon.addGeometry(cylinder(16), discZ(x + dx, yc, fz - 0.05, 0.12, 0.02), rgb(EXTRA.amber, 1.6));
  }
  decal(b, x, z - 1.4, 6.4, 3, 0, neon.cyan, 0.22);
}

function coolingRoofs(b: Builders): void {
  const metal = rgb('#20263a');
  for (const lotId of ['nw-2', 'sw-2', 'nw-4']) {
    const boxes = boxesOf(lotId);
    if (!boxes.length) continue;
    const top = boxes.reduce((a, c) => (c.y1 > a.y1 ? c : a));
    const cx = (top.x0 + top.x1) / 2;
    const cz = (top.z0 + top.z1) / 2;
    const span = Math.min(top.x1 - top.x0, top.z1 - top.z0) > 4 ? 1 : 0.5;
    for (const ox of [-span, span]) {
      for (const oz of [-span, span]) {
        const ux = cx + ox * 0.95;
        const uz = cz + oz * 0.95;
        b.facade.box(ux - 0.45, top.y1, uz - 0.45, ux + 0.45, top.y1 + 0.42, uz + 0.45, { color: metal, top: rgb('#151927'), skip: { ny: true } });
        b.neon.flatRing(ux, uz, 0.32, 0.035, top.y1 + 0.425, rgb(EXTRA.teal, 1.3), 28);
      }
    }
  }
}

function circuitTraces(b: Builders): void {
  const [cx, cz] = DISTRICTS.engineering.center;
  const trace = rgb(EXTRA.teal, 1.0);
  const via = rgb(neon.cyan, 1.7);
  const y = Y.inlay + 0.002;
  const pt = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return N(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
  };
  for (const base of [0, 180]) {
    for (const off of [-24, -12, 12, 24]) {
      const a0 = base + off;
      const jog = off > 0 ? 6 : -6;
      const p1 = pt(2.4, a0);
      const p2 = pt(4.2, a0);
      const p3 = pt(4.9, a0 + jog);
      const p4 = pt(8.2, a0 + jog);
      b.neon.bar(p1, p2, 0.05, trace);
      b.neon.bar(p2, p3, 0.05, trace);
      b.neon.bar(p3, p4, 0.05, trace);
      b.neon.box(p4.x - 0.11, y - 0.01, p4.z - 0.11, p4.x + 0.11, y + 0.02, p4.z + 0.11, { color: via });
    }
  }
}

// ---------------------------------------------------------------- creative props

function filmReel(b: Builders): void {
  const { x, z, r } = FILM_REEL;
  const metal = rgb('#1b1f30');
  const yc = r + 0.45;
  const flat = (geo: ReturnType<typeof cylinder>, s: number, depth: number, color: RGB, dz = 0) =>
    b.metal.addGeometry(geo, discZ(x, yc, z + dz, s, depth), color);
  flat(cylinder(40), r, 0.12, metal);
  // Holes (dark discs) on both faces and a hub.
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    for (const side of [1, -1]) {
      b.metal.addGeometry(
        cylinder(20),
        discZ(x + Math.cos(a) * r * 0.55, yc + Math.sin(a) * r * 0.55, z + side * 0.065, r * 0.24, 0.02),
        rgb('#05060a'),
      );
    }
  }
  flat(cylinder(20), 0.22, 0.2, rgb(neon.magenta, 1.6));
  // Neon rims.
  fanRing ??= new RingGeometry(0.54, 0.6, 40);
  for (const side of [1, -1]) b.neon.addGeometry(fanRing, trs(x, yc, z + side * 0.07, side > 0 ? 0 : Math.PI, r / 0.58, r / 0.58, 1), rgb(neon.violet, 1.8));
  // Stand.
  b.metal.bar(N(x - 0.9, 0, z), N(x, yc, z), 0.1, metal);
  b.metal.bar(N(x + 0.9, 0, z), N(x, yc, z), 0.1, metal);
  // Film strip ribbon trailing onto the ground.
  b.metal.box(x + 0.6, 0.02, z - 0.25, x + 3.2, 0.06, z + 0.25, { color: rgb('#151827') });
  for (let i = 0; i < 9; i++) b.neon.box(x + 0.7 + i * 0.28, 0.065, z - 0.2, x + 0.82 + i * 0.28, 0.07, z - 0.14, { color: rgb(EXTRA.amber, 1.2) });
  decal(b, x, z + 1.3, 5, 3, 0, neon.magenta, 0.2);
}

function cameraProp(b: Builders): void {
  const { x, z } = CAMERA_PROP;
  const body = rgb('#161a2a');
  const metal = rgb(COLORS.metal);
  const top = 2.2;
  for (const a of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) b.metal.bar(N(x + Math.cos(a) * 0.75, 0, z + Math.sin(a) * 0.75), N(x, top, z), 0.06, metal);
  b.metal.box(x - 0.7, top, z - 0.4, x + 0.7, top + 0.9, z + 0.4, { color: body });
  b.metal.box(x - 0.45, top + 0.9, z - 0.2, x - 0.05, top + 1.1, z + 0.2, { color: body });
  // Lens toward the plaza (north, -Z).
  b.metal.addGeometry(cylinder(28), discZ(x, top + 0.45, z - 0.6, 0.34, 0.45), rgb('#0b0d16'));
  fanRing ??= new RingGeometry(0.54, 0.6, 40);
  b.neon.addGeometry(fanRing, trs(x, top + 0.45, z - 0.83, Math.PI, 0.6, 0.6, 1), rgb(EXTRA.coral, 2));
  b.neon.addGeometry(cylinder(12), discZ(x + 0.5, top + 0.75, z - 0.41, 0.06, 0.02), rgb('#ff4a4a', 3));
  decal(b, x, z - 1.4, 4, 3, 0, EXTRA.coral, 0.2);
}

function pdcSignFrame(b: Builders): void {
  const p = PDC_SIGN;
  const h = p.width / p.aspect;
  const yc = p.bottom + h / 2;
  const c = Math.cos(p.rotationY);
  const s = Math.sin(p.rotationY);
  const at = (lx: number, ly: number, lz: number) => N(p.x + lx * c + lz * s, ly, p.z - lx * s + lz * c);
  const metal = rgb(COLORS.metal);
  for (const lx of [-p.width * 0.36, p.width * 0.36]) b.metal.bar(at(lx, 0, -0.1), at(lx, p.bottom + 0.2, -0.1), 0.1, metal);
  // Back box of the lightbox.
  const back = at(0, yc, -0.1);
  b.metal.addGeometry(unitBox(), trs(back.x, yc, back.z, p.rotationY, p.width + 0.3, h + 0.3, 0.16), rgb('#0b0c16'));
  // Neon frame: violet sides, magenta top and bottom.
  const hw = p.width / 2 + 0.1;
  const hh = h / 2 + 0.1;
  const violet = rgb(neon.violet, 1.8);
  const magenta = rgb(neon.magenta, 1.6);
  b.neon.bar(at(-hw, yc - hh, 0.01), at(-hw, yc + hh, 0.01), 0.05, violet);
  b.neon.bar(at(hw, yc - hh, 0.01), at(hw, yc + hh, 0.01), 0.05, violet);
  b.neon.bar(at(-hw, yc + hh, 0.01), at(hw, yc + hh, 0.01), 0.05, magenta);
  b.neon.bar(at(-hw, yc - hh, 0.01), at(hw, yc - hh, 0.01), 0.05, magenta);
  const front = at(0, 0, 1.4);
  decal(b, front.x, front.z, 3.6, 2.4, p.rotationY, neon.magenta, 0.16);
}

function paintSplashes(b: Builders): void {
  const [cx, cz] = DISTRICTS.creative.center;
  const r = createRng('splash');
  const colors = [neon.magenta, EXTRA.coral, EXTRA.amber, EXTRA.teal, neon.violet];
  for (let i = 0; i < 16; i++) {
    const a = r.range(-0.6, 0.6) + (i % 2 ? Math.PI * 0.5 : -Math.PI * 0.5);
    const rad = r.range(8.6, 11.5);
    const s = r.range(0.8, 2.2);
    decal(b, cx + Math.cos(a) * rad, cz + Math.sin(a) * rad, s, s * r.range(0.7, 1.2), r.next() * 3, colors[i % colors.length], r.range(0.25, 0.45));
  }
}

export function bakeEnrichment(b: Builders): void {
  techMarquees(b);
  groundLabels(b);
  chevronPaths(b);
  contactSignage(b);
  creativeSignage(b);
  portalPlates(b);
  racks(b);
  gpu(b);
  coolingRoofs(b);
  circuitTraces(b);
  filmReel(b);
  cameraProp(b);
  paintSplashes(b);
  pdcSignFrame(b);
}

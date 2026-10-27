// Static parts of the four landmark buildings. Each fills its LANDMARKS rect
// exactly (the whole rect is a collider) with its front on the plaza side.
// Signs, doors and animated sculptures are separate components.

import { Vector3 } from 'three';
import { neon } from '@/styles/tokens';
import { LANDMARKS, PORTALS } from '../../config/layout';
import { BAY_W, COLORS, FLOOR_H, WIN_COLS, WIN_ROWS } from '../constants';
import { rgb, trs, unitBox } from '../lib/GeometryBuilder';
import { zoneUv } from '../lib/zoneAtlas';
import { atlasQuad } from './frame';
import { cylinder, type Builders } from './builders';

const _a = new Vector3();
const _b = new Vector3();

const win = (gain: number, uOff: number, vOff: number) => ({ gain, uOff, vOff, bayW: BAY_W, floorH: FLOOR_H, cols: WIN_COLS, rows: WIN_ROWS });

/** Neon outline of an axis-aligned box's top rectangle. */
function topOutline(b: Builders, x0: number, x1: number, z0: number, z1: number, y: number, color: ReturnType<typeof rgb>, t = 0.06): void {
  b.neon.bar(_a.set(x0, y, z0), _b.set(x1, y, z0), t, color);
  b.neon.bar(_a.set(x0, y, z1), _b.set(x1, y, z1), t, color);
  b.neon.bar(_a.set(x0, y, z0), _b.set(x0, y, z1), t, color);
  b.neon.bar(_a.set(x1, y, z0), _b.set(x1, y, z1), t, color);
}

function engineering(b: Builders): void {
  const L = LANDMARKS.engineering; // front at maxX (east)
  const glassTop = 9;
  const cyan = rgb(neon.cyan, 2.1);
  const cyanSoft = rgb(neon.cyan, 1.2);
  const metal = rgb(COLORS.metal);
  const glass = rgb(COLORS.glass);
  // Recessed arcade on the ground floor, cantilevered glass block above.
  b.glass.box(L.minX, 0, L.minZ, L.maxX - 0.7, 3.2, L.maxZ, { color: glass, skip: { ny: true, py: true } });
  b.glass.box(L.minX, 3.2, L.minZ, L.maxX, glassTop, L.maxZ, { color: glass });
  b.glass.box(L.minX, glassTop, -4.4, L.minX + 3.8, glassTop + 2.3, 4.4, { color: glass, skip: { ny: true } });
  // Vestibule around the door.
  b.glass.box(L.maxX - 0.7, 0, -1.55, L.maxX - 0.02, 3.2, 1.55, { color: rgb('#0c1626'), skip: { ny: true, py: true } });
  // Arcade columns and facade fins.
  for (const z of [-5.85, -3.6, 3.6, 5.85]) b.metal.box(L.maxX - 0.32, 0, z - 0.11, L.maxX - 0.1, 3.2, z + 0.11, { color: metal, skip: { ny: true } });
  for (let z = -5.25; z <= 5.3; z += 1.5) {
    if (Math.abs(z) < 1.4) continue;
    b.metal.box(L.maxX, 3.3, z - 0.05, L.maxX + 0.12, glassTop - 0.1, z + 0.05, { color: metal, skip: { ny: true } });
  }
  b.metal.box(L.maxX, 3.2, L.minZ, L.maxX + 0.16, 3.45, L.maxZ, { color: metal });
  b.metal.box(L.maxX, 6.15, L.minZ, L.maxX + 0.1, 6.3, L.maxZ, { color: metal });
  // Server racks behind the arcade (x faces +X).
  const rx = L.maxX - 0.69;
  for (const [z0, z1, u0, u1] of [
    [-5.65, -1.75, 0, 0.5],
    [1.75, 5.65, 0.5, 1],
  ]) {
    b.racks.quad(_a.set(rx, 0.15, z1), _b.set(rx, 0.15, z0), new Vector3(rx, 3.05, z0), new Vector3(rx, 3.05, z1), rgb('#ffffff'), [u0, 0, u1, 0, u1, 1, u0, 1]);
  }
  // Cyan edge lines.
  const e = 0.03;
  for (const [x, z] of [
    [L.maxX + e, L.minZ - e],
    [L.maxX + e, L.maxZ + e],
    [L.minX - e, L.minZ - e],
    [L.minX - e, L.maxZ + e],
  ]) {
    b.neon.bar(_a.set(x, 3.2, z), _b.set(x, glassTop, z), 0.06, cyan);
  }
  topOutline(b, L.minX - e, L.maxX + e, L.minZ - e, L.maxZ + e, glassTop, cyan);
  topOutline(b, L.minX - e, L.minX + 3.8 + e, -4.4 - e, 4.4 + e, glassTop + 2.3, cyanSoft, 0.05);
  b.neon.bar(_a.set(L.maxX + 0.17, 3.33, L.minZ), _b.set(L.maxX + 0.17, 3.33, L.maxZ), 0.045, cyanSoft);
  b.neon.bar(_a.set(L.maxX - 0.68, 3.1, L.minZ + 0.1), _b.set(L.maxX - 0.68, 3.1, L.maxZ - 0.1), 0.04, cyanSoft);
  // Sign rail on the roof edge.
  b.metal.box(L.maxX - 0.75, glassTop, -5.4, L.maxX - 0.6, glassTop + 0.18, 5.4, { color: metal });
  // Rooftop dish + mast.
  b.metal.bar(_a.set(L.minX + 1.9, glassTop + 2.3, 2.6), _b.set(L.minX + 1.9, glassTop + 4.6, 2.6), 0.08, metal);
  b.beacons.push({ x: L.minX + 1.9, y: glassTop + 4.68, z: 2.6, color: neon.cyan, rate: 0.6, phase: 0.2, size: 0.12, intensity: 3.5 });
}

function creative(b: Builders): void {
  const L = LANDMARKS.creative; // front at minX (west)
  const body = rgb('#161828');
  const metal = rgb(COLORS.metal);
  const violet = rgb(neon.violet, 1.8);
  const magenta = rgb(neon.magenta, 1.7);
  b.facade.box(L.minX, 0, L.minZ, L.maxX, 8.1, L.maxZ, { color: body, top: rgb(COLORS.roof), skip: { ny: true }, windows: win(0, 0, 0) });
  b.facade.box(L.minX + 1.2, 8.1, -5, L.maxX, 10.8, 5, { color: body, top: rgb(COLORS.roof), skip: { ny: true }, windows: win(0.55, 3, 7) });
  // Large light-box frames either side of the door.
  for (const [z0, z1] of [
    [-5.45, -1.9],
    [1.9, 5.45],
  ]) {
    const x = L.minX;
    b.metal.box(x - 0.14, 0.75, z0 - 0.12, x, 6.35, z1 + 0.12, { color: metal });
    b.lightboxes.quad(
      _a.set(x - 0.15, 0.9, z0),
      _b.set(x - 0.15, 0.9, z1),
      new Vector3(x - 0.15, 6.2, z1),
      new Vector3(x - 0.15, 6.2, z0),
      rgb('#ffffff'),
      z0 < 0 ? [0, 0, 0.5, 0, 0.5, 1, 0, 1] : [0.5, 0, 1, 0, 1, 1, 0.5, 1],
    );
  }
  const e = 0.03;
  topOutline(b, L.minX - e, L.maxX + e, L.minZ - e, L.maxZ + e, 8.1, violet);
  topOutline(b, L.minX + 1.2 - e, L.maxX + e, -5 - e, 5 + e, 10.8, magenta, 0.05);
  b.neon.bar(_a.set(L.minX - e, 0.1, L.minZ - e), _b.set(L.minX - e, 8.1, L.minZ - e), 0.05, violet);
  b.neon.bar(_a.set(L.minX - e, 0.1, L.maxZ + e), _b.set(L.minX - e, 8.1, L.maxZ + e), 0.05, violet);
  // Plinth for the rooftop aperture sculpture.
  b.metal.addGeometry(cylinder(16), trs(36.6, 11.0, 0, 0, 0.9, 0.4, 0.9), metal);
  b.metal.bar(_a.set(36.6, 11.2, 0), _b.set(36.6, 12.0, 0), 0.16, metal);
}

function archive(b: Builders): void {
  const L = LANDMARKS.about; // front at maxZ (south), three doors: About, Résumé, Contact
  const body = rgb('#141829');
  const metal = rgb('#1b2032');
  const blue = rgb(neon.blue, 1.9);
  const doors = PORTALS.filter((p) => p.district === 'about').map((p) => p.x);
  b.facade.box(L.minX, 0, L.minZ, L.maxX, 7.2, L.maxZ, { color: body, top: rgb(COLORS.roof), skip: { ny: true }, windows: win(0.6, 5, 2) });
  b.facade.box(L.minX + 2, 7.2, L.minZ, L.maxX - 2, 9.0, L.minZ + 4, { color: body, top: rgb(COLORS.roof), skip: { ny: true } });
  // Vertical fins across the front like archive shelving / book spines.
  for (let x = L.minX + 0.3; x <= L.maxX - 0.29; x += 0.6) {
    if (doors.some((dx) => Math.abs(x - dx) < 1.45)) continue;
    b.metal.box(x - 0.08, 0.5, L.maxZ, x + 0.08, 6.8, L.maxZ + 0.32, { color: metal });
  }
  // Door canopies.
  for (const dx of doors) {
    b.metal.box(dx - 1.5, 4.12, L.maxZ, dx + 1.5, 4.28, L.maxZ + 0.9, { color: metal });
    b.neon.bar(_a.set(dx - 1.45, 4.11, L.maxZ + 0.88), _b.set(dx + 1.45, 4.11, L.maxZ + 0.88), 0.04, blue);
  }
  const e = 0.03;
  topOutline(b, L.minX - e, L.maxX + e, L.minZ - e, L.maxZ + e, 7.2, blue);
  b.neon.bar(_a.set(L.minX, 6.95, L.maxZ + 0.34), _b.set(L.maxX, 6.95, L.maxZ + 0.34), 0.05, rgb(neon.blue, 1.3));
  b.metal.box(-4.2, 7.2, L.maxZ - 0.75, 4.2, 7.36, L.maxZ - 0.6, { color: metal });
}

// Original pixel motifs for the arcade facade (rows top → bottom, '#' lit).
const PIXEL_HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
const PIXEL_PAD = ['.#######.', '##.###.##', '#...#.#.#', '##.###.##', '.##...##.'];

function pixelArt(b: Builders, rows: string[], cx: number, cy: number, z: number, px: number, color: ReturnType<typeof rgb>): void {
  const w = rows[0].length;
  rows.forEach((row, r) => {
    for (let c = 0; c < w; c++) {
      if (row[c] !== '#') continue;
      // The facade faces −Z, so the viewer's right is world −X.
      const x = cx + (w / 2 - c - 0.5) * px;
      const y = cy + (rows.length / 2 - r - 0.5) * px;
      b.neon.box(x - px * 0.42, y - px * 0.42, z - 0.04, x + px * 0.42, y + px * 0.42, z, { color });
    }
  });
}

/** Arcade hall (Gaming Zone). No door: the games stand in the plaza in front. */
function arcadeHall(b: Builders): void {
  const L = LANDMARKS.gaming; // front at minZ (north)
  const body = rgb('#151325');
  const metal = rgb(COLORS.metal);
  const dark = rgb('#08070f');
  const orange = rgb(neon.orange, 2.0);
  const magenta = rgb(neon.magenta, 1.7);
  const amber = rgb(neon.amber, 1.8);
  const f = L.minZ;
  b.facade.box(L.minX, 0, L.minZ, L.maxX, 6.3, L.maxZ, { color: body, top: rgb(COLORS.roof), skip: { ny: true }, windows: win(0.35, 2, 19) });
  b.facade.box(L.minX + 1.5, 6.3, L.minZ + 1.5, L.maxX - 1.5, 8.4, L.maxZ, { color: body, top: rgb(COLORS.roof), skip: { ny: true } });
  // Front: a dark showcase wall covering the windows, with a glowing archway.
  b.metal.box(L.minX + 0.2, 0, f - 0.12, L.maxX - 0.2, 5.9, f, { color: dark });
  // Stepped pixel archway (no door): dark recess + orange outline.
  b.metal.box(-2.1, 0, f - 0.14, 2.1, 3.3, f - 0.12, { color: rgb('#120a1a') });
  const steps: Array<[number, number]> = [
    [2.1, 2.6],
    [1.8, 2.9],
    [1.5, 3.2],
    [-1.5, 3.2],
  ];
  const zf = f - 0.17;
  let prev: [number, number] = [2.1, 0];
  for (const side of [1, -1]) {
    prev = [side * 2.1, 0];
    for (const [sx, sy] of steps.slice(0, 3)) {
      const x = side * sx;
      b.neon.bar(_a.set(prev[0], prev[1], zf), _b.set(prev[0], sy, zf), 0.09, orange);
      b.neon.bar(_a.set(prev[0], sy, zf), _b.set(x, sy, zf), 0.09, orange);
      prev = [x, sy];
    }
  }
  b.neon.bar(_a.set(-1.5, 3.2, zf), _b.set(1.5, 3.2, zf), 0.09, orange);
  // Inside the arch: a soft gradient light bar and a row of "screen" panels.
  for (let i = 0; i < 4; i++) {
    const x = -1.35 + i * 0.9;
    b.neon.box(x - 0.32, 1.1, f - 0.15, x + 0.32, 1.9, f - 0.14, { color: rgb(i % 2 ? neon.magenta : neon.cyan, 0.55) });
  }
  b.neon.bar(_a.set(-1.9, 0.08, f - 0.16), _b.set(1.9, 0.08, f - 0.16), 0.06, magenta);
  // Pixel motifs either side of the arch.
  pixelArt(b, PIXEL_PAD, 4.0, 2.0, zf + 0.02, 0.22, orange);
  pixelArt(b, PIXEL_HEART, -4.0, 2.0, zf + 0.02, 0.24, magenta);
  // ARCADE sign over the arch, ticker strip under it.
  const arc = zoneUv('gz:arcade');
  atlasQuad(b.zone, arc, new Vector3(0, 4.55, f - 0.2), new Vector3(0, 0, -1), new Vector3(0, 1, 0), 6.4, rgb('#ffffff', 1.5));
  const tick = zoneUv('gz:ticker');
  atlasQuad(b.zone, tick, new Vector3(0, 3.62, f - 0.2), new Vector3(0, 0, -1), new Vector3(0, 1, 0), 7.6, rgb(neon.amber, 1.6));
  // Vertical ARCADE blades on both front corners.
  const blade = zoneUv('gz:blade');
  for (const x of [L.minX + 0.75, L.maxX - 0.75]) {
    b.metal.box(x - 0.5, 0.45, f - 0.32, x + 0.5, 5.75, f - 0.12, { color: rgb('#0b0a14') });
    atlasQuad(b.zone, blade, new Vector3(x, 3.1, f - 0.33), new Vector3(0, 0, -1), new Vector3(0, 1, 0), 0.95, rgb('#ffffff', 1.5));
  }
  // Marquee frame with chase lights is in the FX mesh; static rails here.
  b.neon.bar(_a.set(L.minX + 0.2, 5.92, f - 0.14), _b.set(L.maxX - 0.2, 5.92, f - 0.14), 0.07, amber);
  const e = 0.03;
  topOutline(b, L.minX - e, L.maxX + e, L.minZ - e, L.maxZ + e, 6.3, orange);
  topOutline(b, L.minX + 1.5 - e, L.maxX - 1.5 + e, L.minZ + 1.5 - e, L.maxZ + e, 8.4, magenta, 0.05);
  for (const x of [L.minX - e, L.maxX + e]) b.neon.bar(_a.set(x, 0.1, f - e), _b.set(x, 6.3, f - e), 0.06, orange);
  // Rooftop: a giant arcade joystick and two buttons on the upper tier.
  const jx = 2.6;
  const jz = 37;
  const top = 8.4;
  b.metal.box(jx - 0.9, top, jz - 0.7, jx + 0.9, top + 0.35, jz + 0.7, { color: rgb('#1d1a2c') });
  b.metal.bar(_a.set(jx, top + 0.35, jz), _b.set(jx - 0.35, top + 2.0, jz - 0.25), 0.16, metal);
  b.neon.addGeometry(cylinder(16), trs(jx - 0.38, top + 2.15, jz - 0.27, 0, 0.42, 0.5, 0.42), rgb(neon.magenta, 1.9));
  for (const [x, c] of [
    [-1.6, neon.cyan],
    [-3.0, neon.amber],
  ] as const) {
    b.metal.addGeometry(cylinder(16), trs(x, top + 0.15, jz, 0, 0.55, 0.3, 0.55), rgb('#1d1a2c'));
    b.neon.addGeometry(cylinder(16), trs(x, top + 0.38, jz, 0, 0.42, 0.18, 0.42), rgb(c, 1.8));
  }
  b.beacons.push({ x: -4.2, y: 8.7, z: (L.minZ + L.maxZ) / 2 + 1, color: neon.orange, rate: 0.9, phase: 0.4, size: 0.18, intensity: 4 });
  void prev;
}

/** "ABOUT · RÉSUMÉ · CONTACT" across the Archive front, above the three doors. */
function archiveDoorLine(b: Builders): void {
  const L = LANDMARKS.about;
  const entry = zoneUv('archive:doors');
  // Above the social badges (y ≈ 5.35) and below the roof-line bar (6.95).
  const w = 9;
  const y = 6.36;
  const h = w / entry.aspect;
  const z = L.maxZ + 0.36;
  b.metal.box(-w / 2 - 0.25, y - h / 2 - 0.08, L.maxZ + 0.32, w / 2 + 0.25, y + h / 2 + 0.08, z, { color: rgb('#090c18') });
  atlasQuad(b.zone, entry, new Vector3(0, y, z + 0.01), new Vector3(0, 0, 1), new Vector3(0, 1, 0), w, rgb(neon.blue, 1.9));
}

export function bakeLandmarks(b: Builders): void {
  engineering(b);
  creative(b);
  archive(b);
  arcadeHall(b);
  archiveDoorLine(b);
  void unitBox;
}

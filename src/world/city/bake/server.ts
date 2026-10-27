// The data server on the hub roundabout rim (TOWER_ROUNDABOUT.server): a
// glowing rack with server units, an empty RAM bay on top, the sign "FEED THE
// SERVER — GIVE IT RAM", and a RAM stick floating above the slot. The rack
// bakes into the city buckets; `buildServerFx` adds the blinking LEDs, the
// slot status lights and the floating stick (driven by uRam: 0 floating,
// 1 seated). Local front (+Z) faces the tower.

import { RingGeometry, type BufferGeometry } from 'three';
import { neon } from '@/styles/tokens';
import { TOWER_ROUNDABOUT } from '../../config/layout';
import { rgb } from '../lib/GeometryBuilder';
import { createRng } from '../lib/random';
import { FX, type FxBuilder } from '../lib/fx';
import { zoneUv } from '../lib/zoneAtlas';
import { decal } from './streets';
import type { Builders } from './builders';
import { Frame, localMat } from './frame';

const spot = TOWER_ROUNDABOUT.server;
const frame = () => new Frame(spot.x, 0, spot.z, spot.rotationY);

export const RACK = {
  hw: 0.34,
  hd: 0.28,
  h: 1.9,
  units: 9,
  bay: { hw: 0.3, y0: 1.9, y1: 2.05, hd: 0.1 },
  ram: { hw: 0.22, h: 0.13, t: 0.014, seatY: 1.99, lift: 0.75 },
  /** Extra yaw on the sign so it also reads from the hub's south approach. */
  signYaw: 0.56,
  signW: 1.3,
  signY: 3.3,
} as const;

let ringTemplate: BufferGeometry | null = null;
function ring(): BufferGeometry {
  ringTemplate ??= new RingGeometry(0.82, 1, 40).toNonIndexed();
  return ringTemplate;
}

function unitY(i: number): number {
  return 0.16 + i * 0.155;
}

export function bakeServer(b: Builders): void {
  const f = frame();
  const { hw, hd, h, bay } = RACK;
  const body = rgb('#10131c');
  const unit = rgb('#1b2030');
  const metal = rgb('#2a2f3e');
  f.span(b.metal, -hw, 0, -hd, hw, h, hd, body);
  for (let i = 0; i < RACK.units; i++) {
    const y = unitY(i);
    f.span(b.metal, -hw + 0.04, y, hd, hw - 0.04, y + 0.13, hd + 0.02, unit);
    f.span(b.metal, -hw + 0.06, y + 0.03, hd + 0.02, -hw + 0.12, y + 0.1, hd + 0.025, metal);
  }
  // Glowing edge strips.
  for (const x of [-hw - 0.005, hw + 0.005]) f.span(b.neon, x - 0.012, 0.05, hd - 0.02, x + 0.012, h - 0.05, hd + 0.006, rgb(neon.emerald, 1.6));
  f.span(b.neon, -hw, h - 0.012, hd - 0.02, hw, h + 0.004, hd + 0.006, rgb(neon.emerald, 1.4));
  // RAM bay on top with a dark slot and a label on its front.
  f.span(b.metal, -bay.hw, bay.y0, -bay.hd, bay.hw, bay.y1, bay.hd, metal);
  f.span(b.metal, -RACK.ram.hw - 0.02, bay.y1, -0.016, RACK.ram.hw + 0.02, bay.y1 + 0.004, 0.016, rgb('#020203'));
  const sl = zoneUv('srv:slot');
  f.quad(b.zone, 0, (bay.y0 + bay.y1) / 2, bay.hd + 0.004, 0.5, 0.5 / sl.aspect, rgb(neon.emerald, 1.6), sl.uv);
  // Sign on a post.
  const sg = zoneUv('srv:sign');
  const sH = RACK.signW / sg.aspect;
  f.bar(b.metal, [0, bay.y1, -0.2], [0, RACK.signY - sH / 2, -0.2], 0.07, metal);
  f.box(b.metal, 0, RACK.signY, -0.17, RACK.signW + 0.08, sH + 0.08, 0.05, rgb('#090b12'), 0, RACK.signYaw);
  f.quad(b.zone, Math.sin(RACK.signYaw) * 0.03, RACK.signY, -0.17 + Math.cos(RACK.signYaw) * 0.03, RACK.signW, sH, rgb(neon.emerald, 1.7), sg.uv, 0, RACK.signYaw);
  f.box(b.neon, 0, RACK.signY - sH / 2 - 0.045, -0.17, RACK.signW + 0.08, 0.02, 0.06, rgb(neon.emerald, 1.8), 0, RACK.signYaw);
  // Light pool and pad.
  const front = f.point(0, 0, 0.9);
  decal(b, front.x, front.z, 2.4, 2.4, spot.rotationY, neon.emerald, 0.32);
  b.neon.flatRing(spot.pad.x, spot.pad.z, spot.pad.radius - 0.06, 0.06, 0.046, rgb(neon.emerald, 1.2), 56);
}

/** Blinking LEDs, slot status lights and the floating RAM stick (FX mesh; uRam drives the stick). */
export function buildServerFx(fx: FxBuilder): void {
  const f = frame();
  const { hd, bay, ram } = RACK;
  const r = createRng('server-leds');
  const colors = [neon.emerald, neon.cyan, neon.amber, neon.emerald];
  for (let i = 0; i < RACK.units; i++) {
    const y = unitY(i) + 0.065;
    for (let k = 0; k < 6; k++) {
      fx.set({ mode: FX.blink, a: r.next(), b: r.range(0.7, 3.2), c: 0.15 });
      f.box(fx, -0.02 + k * 0.045, y, hd + 0.024, 0.022, 0.022, 0.006, rgb(r.pick(colors), 2.6));
    }
  }
  // Slot status: red and blinking while waiting, green once fed.
  fx.set({ mode: FX.ramStatus });
  for (const x of [-ram.hw - 0.05, ram.hw + 0.05]) f.box(fx, x, bay.y1 + 0.006, 0, 0.03, 0.012, 0.12, rgb('#ffffff'));
  f.box(fx, 0, bay.y1 - 0.03, bay.hd + 0.006, 0.52, 0.018, 0.004, rgb('#ffffff'));
  // The stick: modelled seated in the slot; the shader lifts it by `lift` while uRam < 1.
  const pivot = f.point(0, 0, 0);
  fx.set({ mode: FX.ram, a: ram.lift, pivot });
  const y0 = ram.seatY;
  const pcb = rgb('#0f4a33');
  f.span(fx, -ram.hw, y0, -ram.t / 2, ram.hw, y0 + ram.h, ram.t / 2, pcb);
  f.span(fx, -ram.hw + 0.01, y0, -ram.t / 2 - 0.001, ram.hw - 0.01, y0 + 0.022, ram.t / 2 + 0.001, rgb('#d9a92e', 1.4));
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const x = -ram.hw + 0.06 + k * 0.105;
      f.box(fx, x, y0 + 0.07, (side * (ram.t + 0.008)) / 2, 0.075, 0.06, 0.008, rgb('#0b0c10'));
    }
  }
  f.span(fx, -ram.hw, y0 + ram.h, -ram.t / 2 - 0.002, ram.hw, y0 + ram.h + 0.03, ram.t / 2 + 0.002, rgb(neon.emerald, 2.6));
  // Halo under the floating stick (rides with it).
  f.geo(fx, ring(), localMat(0, y0 - 0.02, 0, 0.34, 0.34, 1, -Math.PI / 2), rgb(neon.cyan, 1.6));
}

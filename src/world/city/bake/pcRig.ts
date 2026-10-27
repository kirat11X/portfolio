// The open-frame gaming PC at GAMING_SPOTS.pc: a desk with an open test-bench
// rig (motherboard, four RGB RAM sticks, a vertically mounted triple-fan GPU
// with an "RTX 5090" text plate, a 360 mm AIO with RGB fans, PSU and sleeved
// cables), a wide monitor on an arm showing the welcome screen, keyboard,
// mouse and a build placard. Static parts bake into the city buckets;
// `buildPcFx` adds the RGB lighting and spinning fans to an FX builder.
// Everything stays inside the spot's collider radius (local front = +Z).

import { RingGeometry, Vector3, type BufferGeometry } from 'three';
import { neon } from '@/styles/tokens';
import { GAMING_SPOTS } from '../../config/layout';
import { rgb } from '../lib/GeometryBuilder';
import { FX, type FxBuilder } from '../lib/fx';
import { zoneUv } from '../lib/zoneAtlas';
import { decal } from './streets';
import { cylinder, type Builders } from './builders';
import { Frame, localMat } from './frame';

const spot = GAMING_SPOTS.pc;
const frame = () => new Frame(spot.x, 0, spot.z, spot.rotationY);

export const PC = {
  desk: { hw: 1.0, hd: 0.38, top: 0.8 },
  monitor: { y: 2.12, z: -0.3, w: 2.0, h: 0.92, tilt: -0.2, screenW: 1.9 },
  gpu: { x0: -0.3, x1: 0.44, y0: 0.88, y1: 1.26, z0: 0.0, z1: 0.1, fans: [-0.17, 0.07, 0.31], fanY: 1.06, fanR: 0.105 },
  rad: { x0: -0.63, x1: -0.41, y0: 0.86, y1: 1.62, z0: -0.13, z1: -0.07, fans: [0.99, 1.24, 1.49], fanX: -0.52, fanR: 0.1 },
  ram: { xs: [0.13, 0.165, 0.2, 0.235], y0: 1.16, y1: 1.5, z0: -0.215, z1: -0.15 },
  pump: { x: -0.06, y: 1.33, z: -0.17, r: 0.085 },
  keyboard: { x: -0.22, z: 0.24, w: 0.72, d: 0.2 },
  mouse: { x: 0.34, z: 0.24 },
} as const;

let ringTemplate: BufferGeometry | null = null;
function ring(): BufferGeometry {
  ringTemplate ??= new RingGeometry(0.88, 1, 28).toNonIndexed();
  return ringTemplate;
}

/** A cylinder whose axis is local Z (a disc facing +Z), radius r, thickness d. */
const discZ = (x: number, y: number, z: number, r: number, d: number) => localMat(x, y, z, r, d, r, Math.PI / 2);

export function bakePcRig(b: Builders): void {
  const f = frame();
  const { desk, monitor, gpu, rad, ram, pump } = PC;
  const deskC = rgb('#1b1d2b');
  const dark = rgb('#0b0c12');
  const grey = rgb('#2b2e3a');
  const silver = rgb('#7d8496');
  const pcb = rgb('#0d2824');

  // Desk.
  f.span(b.metal, -desk.hw, desk.top - 0.04, -desk.hd, desk.hw, desk.top, desk.hd, deskC);
  for (const x of [-desk.hw + 0.06, desk.hw - 0.06]) {
    for (const z of [-desk.hd + 0.06, desk.hd - 0.06]) f.span(b.metal, x - 0.03, 0, z - 0.03, x + 0.03, desk.top - 0.04, z + 0.03, dark);
  }
  f.span(b.metal, -0.75, desk.top, 0.1, 0.55, desk.top + 0.004, 0.37, rgb('#0a0b11'));

  // Monitor on an arm.
  f.span(b.metal, -0.2, desk.top, -0.37, 0.2, desk.top + 0.02, -0.2, grey);
  f.bar(b.metal, [0, desk.top, -0.3], [0, monitor.y - 0.2, -0.34], 0.06, grey);
  f.box(b.metal, 0, monitor.y, monitor.z - 0.04, 0.3, 0.2, 0.05, grey, monitor.tilt);
  f.box(b.metal, 0, monitor.y, monitor.z, monitor.w, monitor.h, 0.05, dark, monitor.tilt);
  const n = new Vector3(0, Math.sin(-monitor.tilt), Math.cos(monitor.tilt));
  const sc = zoneUv('pc:monitor');
  const sh = monitor.screenW / sc.aspect;
  f.quad(b.zone, 0, monitor.y + n.y * 0.028, monitor.z + n.z * 0.028, monitor.screenW, sh, rgb('#ffffff', 1.15), sc.uv, monitor.tilt);

  // Bench base and standoffs.
  f.span(b.metal, -0.66, desk.top, -0.3, 0.48, desk.top + 0.03, 0.13, rgb('#22252f'));
  // Motherboard with heatsinks and chipset.
  f.span(b.metal, -0.33, 0.86, -0.245, 0.35, 1.57, -0.225, pcb);
  f.span(b.metal, -0.31, 1.49, -0.225, 0.08, 1.55, -0.18, silver);
  f.span(b.metal, -0.31, 1.08, -0.225, -0.25, 1.49, -0.18, silver);
  f.span(b.metal, 0.06, 0.9, -0.225, 0.28, 0.98, -0.2, grey);
  for (const [x, y] of [
    [-0.3, 0.9],
    [0.32, 0.9],
    [-0.3, 1.54],
    [0.32, 1.54],
  ]) f.bar(b.metal, [x, desk.top + 0.03, -0.26], [x, y, -0.26], 0.02, silver);
  // Pump block.
  f.geo(b.metal, cylinder(20), discZ(pump.x, pump.y, pump.z, pump.r, 0.06), dark);
  // RAM heat spreaders.
  for (const x of ram.xs) f.span(b.metal, x - 0.011, ram.y0, ram.z0, x + 0.011, ram.y1, ram.z1, grey);
  // GPU: shroud, backplate, silver edges, mount bracket.
  f.span(b.metal, gpu.x0, gpu.y0, gpu.z0, gpu.x1, gpu.y1, gpu.z1, rgb('#20232c'));
  f.bar(b.metal, [gpu.x0, gpu.y1 - 0.01, gpu.z1 + 0.004], [gpu.x1, gpu.y1 - 0.01, gpu.z1 + 0.004], 0.022, silver);
  f.bar(b.metal, [gpu.x0, gpu.y0 + 0.01, gpu.z1 + 0.004], [gpu.x1, gpu.y0 + 0.01, gpu.z1 + 0.004], 0.022, silver);
  f.span(b.metal, gpu.x0 - 0.03, desk.top + 0.03, -0.02, gpu.x0, gpu.y1, 0.02, silver);
  for (const x of gpu.fans) f.geo(b.metal, cylinder(24), discZ(x, gpu.fanY, gpu.z1 + 0.002, gpu.fanR + 0.01, 0.006), rgb('#090a0f'));
  const gp = zoneUv('pc:gpu');
  // Sits between the fan rims (top ≈ y1 − 0.085) and the silver top edge bar (bottom ≈ y1 − 0.021).
  f.quad(b.zone, (gpu.x0 + gpu.x1) / 2, gpu.y1 - 0.055, gpu.z1 + 0.008, 0.3, 0.3 / gp.aspect, rgb('#ffffff', 1.4), gp.uv);
  // AIO radiator + tubes.
  f.span(b.metal, rad.x0, rad.y0, rad.z0, rad.x1, rad.y1, rad.z1, rgb('#15171e'));
  for (const y of rad.fans) f.geo(b.metal, cylinder(24), discZ(rad.fanX, y, rad.z1 + 0.002, rad.fanR + 0.01, 0.006), rgb('#090a0f'));
  f.bar(b.metal, [pump.x - 0.04, pump.y + 0.04, pump.z + 0.02], [rad.x1 - 0.02, 1.52, rad.z1 - 0.01], 0.028, dark);
  f.bar(b.metal, [pump.x - 0.04, pump.y - 0.04, pump.z + 0.02], [rad.x1 - 0.02, 1.12, rad.z1 - 0.01], 0.028, dark);
  // PSU with an orange stripe, and sleeved cables to the board and GPU.
  f.span(b.metal, 0.52, desk.top, -0.3, 0.86, 0.98, 0.04, rgb('#111217'));
  f.box(b.neon, 0.69, 0.9, 0.043, 0.3, 0.02, 0.004, rgb(neon.orange, 1.6));
  const sleeve = [rgb('#e86a2c'), rgb('#e9ecf4'), rgb('#e86a2c')];
  sleeve.forEach((c, i) => {
    const dz = -0.2 + i * 0.03;
    f.bar(b.metal, [0.55, 0.98, dz], [0.42, 1.12, dz], 0.022, c);
    f.bar(b.metal, [0.42, 1.12, dz], [0.355, 1.3, -0.215], 0.022, c);
    f.bar(b.metal, [0.6, 0.98, -0.02 + i * 0.025], [0.42, 1.28, 0.03 + i * 0.012], 0.02, c);
  });
  // Keyboard and mouse bodies.
  const kb = PC.keyboard;
  f.box(b.metal, kb.x, desk.top + 0.015, kb.z, kb.w, 0.025, kb.d, rgb('#14151d'));
  f.box(b.metal, PC.mouse.x, desk.top + 0.018, PC.mouse.z, 0.065, 0.03, 0.11, rgb('#14151d'));
  // Build placard on a little acrylic stand.
  const pl = zoneUv('pc:placard');
  const plW = 0.44;
  f.box(b.glass, 0.74, desk.top + 0.11, 0.25, plW + 0.03, plW / pl.aspect + 0.03, 0.012, rgb('#0b1320'), -0.35);
  f.quad(b.zone, 0.74, desk.top + 0.11 + 0.004, 0.25 + 0.008, plW, plW / pl.aspect, rgb('#ffffff', 1.3), pl.uv, -0.35);
  f.box(b.metal, 0.74, desk.top + 0.01, 0.2, 0.3, 0.02, 0.12, grey);
  // Light pools.
  const c = f.point(0, 0, 0.4);
  decal(b, c.x, c.z, 3.2, 2.2, spot.rotationY, neon.orange, 0.3);
  decal(b, spot.x, spot.z, 2.6, 2.6, 0, neon.magenta, 0.14);
  b.neon.flatRing(spot.pad.x, spot.pad.z, spot.pad.radius - 0.06, 0.06, 0.046, rgb(neon.orange, 1.2), 56);
}

function fan(fx: FxBuilder, f: Frame, x: number, y: number, z: number, r: number, hue: number, speed: number): void {
  const pivot = f.point(x, y, z);
  const axis = f.dir(0, 0, 1);
  // Rim (RGB) and hub cap.
  fx.set({ mode: FX.rgb, a: hue, b: 0.12, c: 1.9 });
  f.geo(fx, ring(), localMat(x, y, z + 0.004, r, r, 1), rgb('#ffffff'));
  f.geo(fx, cylinder(12), localMat(x, y, z + 0.006, r * 0.28, 0.008, r * 0.28, Math.PI / 2), rgb('#ffffff'));
  // Blades spin about the fan axis.
  fx.set({ mode: FX.static, pivot, axis, speed });
  const blade = rgb('#5d6476');
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const br = r * 0.6;
    f.box(fx, x + Math.cos(a) * br, y + Math.sin(a) * br, z + 0.003, r * 0.62, r * 0.26, 0.004, blade, 0, 0.35, a);
  }
}

/** RGB lighting and spinning fans of the PC (FX mesh). */
export function buildPcFx(fx: FxBuilder): void {
  const f = frame();
  const { desk, monitor, gpu, rad, ram, pump, keyboard: kb, mouse } = PC;
  // RAM light bars, each a step further round the colour wheel.
  ram.xs.forEach((x, i) => {
    fx.set({ mode: FX.rgb, a: i * 0.08, b: 0.18, c: 2.4 });
    f.span(fx, x - 0.012, ram.y1, ram.z0 + 0.004, x + 0.012, ram.y1 + 0.06, ram.z1 - 0.004, rgb('#ffffff'));
  });
  // Pump ring.
  fx.set({ mode: FX.rgb, a: 0.5, b: 0.15, c: 2.2 });
  f.geo(fx, ring(), localMat(pump.x, pump.y, pump.z + 0.032, pump.r * 0.9, pump.r * 0.9, 1), rgb('#ffffff'));
  // GPU fans and accent strip.
  gpu.fans.forEach((x, i) => fan(fx, f, x, gpu.fanY, gpu.z1 + 0.008, gpu.fanR, i * 0.12, 9));
  fx.set({ mode: FX.rgb, a: 0.2, b: 0.12, c: 2 });
  f.span(fx, gpu.x0 + 0.02, gpu.y1 - 0.004, gpu.z1 - 0.004, gpu.x1 - 0.02, gpu.y1 + 0.006, gpu.z1 + 0.006, rgb('#ffffff'));
  // Radiator fans.
  rad.fans.forEach((y, i) => fan(fx, f, rad.fanX, y, rad.z1 + 0.008, rad.fanR, 0.3 + i * 0.12, -7));
  // Keyboard keys.
  fx.set({ mode: FX.rgb, a: 0, b: 0.1, c: 1.25 });
  const cols = 15;
  const rows = 4;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = kb.x - kb.w / 2 + 0.03 + (i + 0.5) * ((kb.w - 0.06) / cols);
      const z = kb.z - kb.d / 2 + 0.025 + (j + 0.5) * ((kb.d - 0.05) / rows);
      f.box(fx, x, desk.top + 0.032, z, 0.034, 0.012, 0.03, rgb('#ffffff'));
    }
  }
  // Mouse stripe, desk edge strip and the monitor's bias light.
  fx.set({ mode: FX.rgb, a: 0.6, b: 0.14, c: 2 });
  f.box(fx, mouse.x, desk.top + 0.035, mouse.z + 0.02, 0.012, 0.006, 0.07, rgb('#ffffff'));
  fx.set({ mode: FX.rgb, a: 0, b: 0.08, c: 1.6 });
  f.span(fx, -desk.hw, desk.top - 0.035, desk.hd, desk.hw, desk.top - 0.008, desk.hd + 0.008, rgb('#ffffff'));
  const yb = monitor.y - (monitor.h / 2) * Math.cos(monitor.tilt) - 0.01;
  const zb = monitor.z - 0.03 - (monitor.h / 2) * Math.sin(monitor.tilt);
  f.span(fx, -monitor.w / 2 + 0.05, yb - 0.012, zb - 0.02, monitor.w / 2 - 0.05, yb + 0.004, zb, rgb('#ffffff'));
}

// Procedural canvas textures. Nothing is downloaded: every surface pattern in
// the city is drawn here once and uploaded to the GPU. Callers own the
// returned textures and must dispose them on unmount.

import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three';
import { createRng } from './random';
import { WIN_COLS, WIN_ROWS } from '../constants';

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [canvas, ctx];
}

function finish(texture: Texture, repeat: boolean, colour: boolean, anisotropy = 4): Texture {
  texture.wrapS = texture.wrapT = repeat ? RepeatWrapping : ClampToEdgeWrapping;
  texture.colorSpace = colour ? SRGBColorSpace : NoColorSpace;
  texture.anisotropy = anisotropy;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * The one shared window atlas. RGB = light colour of the window (black when
 * unlit), alpha = glass mask (1 inside window panes, 0 on the wall). The facade
 * shader darkens glass and adds RGB as emission.
 */
export function createWindowTexture(): Texture {
  const cw = 64;
  const ch = 32;
  const [canvas, ctx] = makeCanvas(WIN_COLS * cw, WIN_ROWS * ch);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const r = createRng('kirat-city-windows');
  const warm = ['#ffd49a', '#ffc27a', '#ffb867', '#ffe0b0', '#f7c88c'];
  const cool = ['#cfe8ff', '#b8dcff', '#a6ccff', '#e4f1ff'];
  const accent = ['#c3a2ff', '#ff8fe4', '#7fe9ff'];

  for (let row = 0; row < WIN_ROWS; row++) {
    const kind = r.next();
    const ribbon = kind < 0.3;
    const solid = kind > 0.88;
    const occupancy = r.pick([0.04, 0.12, 0.22, 0.3, 0.38, 0.62]);
    const coolRow = r.chance(0.35);
    const y = row * ch;
    if (solid) continue; // spandrel / plant floor: wall only
    for (let col = 0; col < WIN_COLS; col++) {
      const x = col * cw;
      const wx = ribbon ? x + 2 : x + 10;
      const ww = ribbon ? cw - 4 : cw - 20;
      const wy = y + 7;
      const wh = ch - 13;
      const lit = r.chance(occupancy);
      if (!lit) {
        // Dark glass with a faint cool sky reflection toward the top.
        const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
        g.addColorStop(0, '#141b2e');
        g.addColorStop(1, '#06080e');
        ctx.fillStyle = g;
        ctx.fillRect(wx, wy, ww, wh);
        continue;
      }
      const roll = r.next();
      const base = roll < 0.07 ? r.pick(accent) : coolRow ? (roll < 0.75 ? r.pick(cool) : r.pick(warm)) : roll < 0.8 ? r.pick(warm) : r.pick(cool);
      const level = r.range(0.42, 1);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#05060a';
      ctx.fillRect(wx, wy, ww, wh);
      ctx.globalAlpha = level;
      const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
      g.addColorStop(0, base);
      g.addColorStop(0.7, base);
      g.addColorStop(1, shade(base, 0.62));
      ctx.fillStyle = g;
      ctx.fillRect(wx, wy, ww, wh);
      ctx.globalAlpha = 1;
      // Small interior details: blinds or a dim silhouette.
      if (r.chance(0.3)) {
        ctx.fillStyle = 'rgba(5,6,10,0.55)';
        for (let k = 0; k < 3; k++) ctx.fillRect(wx, wy + 3 + k * 5, ww, 1.5);
      } else if (r.chance(0.25)) {
        ctx.fillStyle = 'rgba(5,6,10,0.6)';
        ctx.fillRect(wx + ww * r.range(0.15, 0.7), wy + wh * 0.35, ww * 0.16, wh * 0.65);
      }
      if (ribbon) {
        // Mullion between ribbon panes.
        ctx.fillStyle = '#05060a';
        ctx.fillRect(x + cw / 2 - 1, wy, 2, wh);
      }
    }
  }
  return finish(new CanvasTexture(canvas), true, true, 8);
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

/** Soft radial falloff (white RGB, alpha falloff) for additive glow decals. */
export function createGlowTexture(): Texture {
  const size = 128;
  const [canvas, ctx] = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.72)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.26)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.07)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return finish(new CanvasTexture(canvas), false, false, 1);
}

/**
 * Plaza paving drawn in polar form: an outer border course, staggered
 * concentric field courses and a compass medallion in the middle.
 */
export function createPlazaTexture(): Texture {
  const size = 1024;
  const c = size / 2;
  const R = size / 2;
  const [canvas, ctx] = makeCanvas(size, size);
  const r = createRng('kirat-plaza');
  ctx.fillStyle = '#121624';
  ctx.fillRect(0, 0, size, size);

  const ring = (r0: number, r1: number, fill: string) => {
    ctx.beginPath();
    ctx.arc(c, c, r1, 0, Math.PI * 2);
    ctx.arc(c, c, r0, 0, Math.PI * 2, true);
    ctx.fillStyle = fill;
    ctx.fill('evenodd');
  };
  const circleLine = (rad: number, width: number, stroke: string) => {
    ctx.beginPath();
    ctx.arc(c, c, rad, 0, Math.PI * 2);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  const radial = (a: number, r0: number, r1: number, width: number, stroke: string) => {
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
    ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  // Field courses.
  const field0 = R * 0.36;
  const field1 = R * 0.88;
  const courses = 11;
  for (let k = 0; k < courses; k++) {
    const r0 = field0 + ((field1 - field0) * k) / courses;
    const r1 = field0 + ((field1 - field0) * (k + 1)) / courses;
    const tone = 18 + (k % 2) * 3 + r.int(-1, 1);
    ring(r0, r1, `rgb(${tone - 2},${tone + 1},${tone + 13})`);
    circleLine(r0, 2, '#0a0c14');
    const mid = (r0 + r1) / 2;
    const blocks = Math.max(12, Math.round((Math.PI * 2 * mid) / 52));
    const offset = (k % 2) * 0.5;
    for (let j = 0; j < blocks; j++) {
      const a = ((j + offset) / blocks) * Math.PI * 2;
      radial(a, r0, r1, 1.6, '#0b0d16');
    }
  }
  // Outer border course with fine radial joints and a light curb.
  ring(field1, R * 0.985, '#191d2c');
  circleLine(field1, 4, '#090b12');
  for (let j = 0; j < 120; j++) radial((j / 120) * Math.PI * 2, field1, R * 0.985, 1.4, '#0d0f18');
  ring(R * 0.985, R, '#262b3d');
  // Medallion.
  ring(0, field0, '#0f121d');
  circleLine(field0, 5, '#090b12');
  circleLine(R * 0.3, 2, '#1c2132');
  circleLine(R * 0.18, 2, '#1c2132');
  for (let j = 0; j < 8; j++) {
    const a = (j / 8) * Math.PI * 2;
    radial(a, R * 0.05, j % 2 ? R * 0.24 : R * 0.33, j % 2 ? 1.5 : 2.5, '#1e2335');
  }
  // Stone grain.
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r.next() - 0.5) * 7;
    d[i] = clamp255(d[i] + n);
    d[i + 1] = clamp255(d[i + 1] + n);
    d[i + 2] = clamp255(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
  return finish(new CanvasTexture(canvas), false, true, 8);
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Greyscale concrete slabs (multiplied by vertex colour) used for the island
 * ground and sidewalks. One repeat covers 4 × 4 world units.
 */
export function createTileTexture(): Texture {
  const size = 512;
  const [canvas, ctx] = makeCanvas(size, size);
  const r = createRng('kirat-tiles');
  const px = size / 4; // pixels per world unit
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(0, 0, size, size);
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 2; gx++) {
      const tone = Math.round(r.range(196, 232));
      ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
      ctx.fillRect(gx * 2 * px + 2, gy * px + 2, 2 * px - 4, px - 4);
    }
  }
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r.next() - 0.5) * 22;
    d[i] = clamp255(d[i] + n);
    d[i + 1] = clamp255(d[i + 1] + n);
    d[i + 2] = clamp255(d[i + 2] + n);
  }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = 'rgba(40,40,40,0.9)';
  for (let gy = 0; gy <= 4; gy++) ctx.fillRect(0, gy * px - 1, size, 2);
  for (let gx = 0; gx <= 2; gx++) ctx.fillRect(gx * 2 * px - 1, 0, 2, size);
  return finish(new CanvasTexture(canvas), true, true, 8);
}

/** Server racks seen through the Engineering Lab's arcade (emissive). */
export function createRackTexture(): Texture {
  const w = 512;
  const h = 256;
  const [canvas, ctx] = makeCanvas(w, h);
  const r = createRng('kirat-racks');
  ctx.fillStyle = '#020306';
  ctx.fillRect(0, 0, w, h);
  const racks = 6;
  const rw = w / racks;
  for (let i = 0; i < racks; i++) {
    const x = i * rw + 6;
    const width = rw - 12;
    ctx.fillStyle = '#0a0e18';
    ctx.fillRect(x, 10, width, h - 20);
    ctx.strokeStyle = '#1b2438';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, 11, width - 2, h - 22);
    for (let u = 0; u < 22; u++) {
      const y = 18 + u * 10.4;
      ctx.fillStyle = '#0e1422';
      ctx.fillRect(x + 4, y, width - 8, 8);
      const leds = r.int(1, 4);
      for (let k = 0; k < leds; k++) {
        const roll = r.next();
        ctx.fillStyle = roll < 0.62 ? '#3ee0ff' : roll < 0.85 ? '#5b8cff' : roll < 0.95 ? '#34f5a6' : '#ffb547';
        ctx.globalAlpha = r.range(0.45, 1);
        ctx.fillRect(x + 8 + k * 7, y + 3, 4, 2.5);
        ctx.globalAlpha = 1;
      }
      if (r.chance(0.35)) {
        ctx.fillStyle = 'rgba(62,224,255,0.25)';
        ctx.fillRect(x + width * 0.45, y + 3, width * r.range(0.15, 0.4), 2);
      }
    }
  }
  // Cool light spill at the top of the arcade.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(62,224,255,0.16)');
  g.addColorStop(0.35, 'rgba(62,224,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return finish(new CanvasTexture(canvas), false, true, 4);
}

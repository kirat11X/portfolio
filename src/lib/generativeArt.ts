// Deterministic generative cover art.
//
// Projects without real imagery get an abstract composition drawn from their
// slug and category. The motifs are deliberately non-representational (no fake
// UI, no fake photos), so they cannot be mistaken for screenshots or for the
// person's own creative work. The same SVG is used in the DOM (<img src>) and
// as a texture on the 3D world's exhibit panels, keeping both views consistent.

import type { ProjectCategory } from '@/types';
import { neon, palette } from '@/styles/tokens';

export type ArtMotif =
  | 'detect'
  | 'network'
  | 'blocks'
  | 'tree'
  | 'wave'
  | 'bokeh'
  | 'retouch'
  | 'film'
  | 'motion'
  | 'wireframe'
  | 'poster';

export type ArtAspect = 'landscape' | 'portrait' | 'square';

export const motifByCategory: Record<ProjectCategory, ArtMotif> = {
  software: 'blocks',
  ml: 'network',
  cv: 'detect',
  dsa: 'tree',
  research: 'wave',
  photography: 'bokeh',
  editing: 'retouch',
  video: 'film',
  motion: 'motion',
  'ui-ux': 'wireframe',
  'graphic-design': 'poster',
};

const secondaryByCategory: Record<ProjectCategory, string> = {
  software: neon.blue,
  ml: neon.violet,
  cv: neon.amber,
  dsa: neon.emerald,
  research: neon.blue,
  photography: neon.amber,
  editing: neon.magenta,
  video: neon.magenta,
  motion: neon.cyan,
  'ui-ux': neon.cyan,
  'graphic-design': neon.amber,
};

const engineeringCategories = new Set<ProjectCategory>(['software', 'ml', 'cv', 'dsa', 'research']);

export interface ArtOptions {
  seed: string;
  category: ProjectCategory;
  aspect?: ArtAspect;
  /** Override the primary accent (defaults to the discipline colour). */
  accent?: string;
  /** Override the secondary accent (defaults to a per-category colour). */
  accent2?: string;
}

const SIZES: Record<ArtAspect, [number, number]> = {
  landscape: [1200, 750],
  portrait: [900, 1200],
  square: [1000, 1000],
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;

const f = (n: number) => (Math.round(n * 10) / 10).toString();
const range = (r: Rand, min: number, max: number) => min + r() * (max - min);
const int = (r: Rand, min: number, max: number) => Math.floor(range(r, min, max + 1));

interface Ctx {
  r: Rand;
  w: number;
  h: number;
  a: string;
  b: string;
}

function detect({ r, w, h, a, b }: Ctx): string {
  const vx = w * range(r, 0.4, 0.6);
  const vy = h * 0.42;
  let out = '';
  for (let i = 1; i <= 7; i++) {
    const y = vy + (h - vy) * Math.pow(i / 7, 1.8);
    out += `<line x1="0" y1="${f(y)}" x2="${w}" y2="${f(y)}" stroke="${a}" stroke-opacity="${f(0.05 + i * 0.02)}"/>`;
  }
  for (let i = -8; i <= 8; i++) {
    out += `<line x1="${f(vx)}" y1="${f(vy)}" x2="${f(vx + i * w * 0.14)}" y2="${h}" stroke="${a}" stroke-opacity="0.12"/>`;
  }
  const boxes = int(r, 3, 4);
  for (let i = 0; i < boxes; i++) {
    const bw = range(r, w * 0.12, w * 0.26);
    const bh = range(r, h * 0.16, h * 0.34);
    const x = range(r, w * 0.06, w * 0.94 - bw);
    const y = range(r, h * 0.1, h * 0.86 - bh);
    const c = i === 0 ? b : a;
    const k = Math.min(bw, bh) * 0.22;
    out += `<rect x="${f(x)}" y="${f(y)}" width="${f(bw)}" height="${f(bh)}" fill="${c}" fill-opacity="0.05" stroke="${c}" stroke-opacity="0.35"/>`;
    out += `<path d="M${f(x)} ${f(y + k)}V${f(y)}H${f(x + k)}M${f(x + bw - k)} ${f(y)}H${f(x + bw)}V${f(y + k)}M${f(x + bw)} ${f(y + bh - k)}V${f(y + bh)}H${f(x + bw - k)}M${f(x + k)} ${f(y + bh)}H${f(x)}V${f(y + bh - k)}" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="square"/>`;
    out += `<rect x="${f(x)}" y="${f(y - 22)}" width="${f(Math.min(bw, 120))}" height="16" fill="${c}" fill-opacity="${i === 0 ? 0.9 : 0.45}"/>`;
    if (i === 0) {
      const cx = x + bw / 2;
      const cy = y + bh / 2;
      out += `<path d="M${f(cx - 14)} ${f(cy)}H${f(cx + 14)}M${f(cx)} ${f(cy - 14)}V${f(cy + 14)}" stroke="${c}" stroke-width="2"/>`;
    }
  }
  const sy = range(r, h * 0.2, h * 0.8);
  out += `<rect x="0" y="${f(sy)}" width="${w}" height="2" fill="${a}" fill-opacity="0.7"/>`;
  return out;
}

function network({ r, w, h, a, b }: Ctx): string {
  const layers = int(r, 4, 5);
  const cols: Array<Array<[number, number]>> = [];
  for (let l = 0; l < layers; l++) {
    const n = l === layers - 1 ? int(r, 2, 3) : int(r, 3, 6);
    const x = w * (0.14 + (0.72 * l) / (layers - 1));
    const gap = (h * 0.62) / Math.max(1, n - 1);
    const top = h / 2 - (gap * (n - 1)) / 2;
    cols.push(Array.from({ length: n }, (_, i) => [x, n === 1 ? h / 2 : top + gap * i]));
  }
  let out = '';
  for (let l = 0; l < layers - 1; l++) {
    for (const [x1, y1] of cols[l]) {
      for (const [x2, y2] of cols[l + 1]) {
        out += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${a}" stroke-opacity="0.13"/>`;
      }
    }
  }
  const path = cols.map((col) => col[int(r, 0, col.length - 1)]);
  out += `<polyline points="${path.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="none" stroke="${b}" stroke-width="3.5"/>`;
  cols.forEach((col) =>
    col.forEach(([x, y]) => {
      const lit = path.some(([px, py]) => px === x && py === y);
      out += `<circle cx="${f(x)}" cy="${f(y)}" r="${lit ? 11 : 8}" fill="${lit ? b : palette.ink900}" stroke="${lit ? b : a}" stroke-width="2.5"/>`;
    }),
  );
  return out;
}

function blocks({ r, w, h, a, b }: Ctx): string {
  const s = Math.min(w, h) * 0.085;
  const ox = w / 2;
  const oy = h * 0.58;
  const iso = (x: number, y: number, z: number): [number, number] => [
    ox + (x - y) * s * 0.866,
    oy + (x + y) * s * 0.5 - z * s,
  ];
  const cubes: Array<[number, number, number]> = [];
  for (let gx = -1; gx <= 1; gx++) {
    for (let gy = -1; gy <= 1; gy++) {
      if (r() < 0.25) continue;
      const height = int(r, 1, 3);
      for (let z = 0; z < height; z++) cubes.push([gx * 1.35, gy * 1.35, z]);
    }
  }
  cubes.sort((p, q) => p[0] + p[1] - (q[0] + q[1]) || p[2] - q[2]);
  const highlight = int(r, 0, Math.max(0, cubes.length - 1));
  let out = '';
  cubes.forEach(([x, y, z], i) => {
    const c = i === highlight ? b : a;
    const p = (dx: number, dy: number, dz: number) => iso(x + dx, y + dy, z + dz).map(f).join(',');
    const top = [p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)].join(' ');
    const left = [p(0, 1, 1), p(1, 1, 1), p(1, 1, 0), p(0, 1, 0)].join(' ');
    const right = [p(1, 0, 1), p(1, 1, 1), p(1, 1, 0), p(1, 0, 0)].join(' ');
    out += `<polygon points="${left}" fill="${c}" fill-opacity="0.10" stroke="${c}" stroke-opacity="0.7" stroke-width="2"/>`;
    out += `<polygon points="${right}" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-opacity="0.7" stroke-width="2"/>`;
    out += `<polygon points="${top}" fill="${c}" fill-opacity="${i === highlight ? 0.55 : 0.3}" stroke="${c}" stroke-width="2"/>`;
  });
  return out;
}

function tree({ r, w, h, a, b }: Ctx): string {
  let out = '';
  const nodes: Array<{ x: number; y: number; depth: number; parent: number }> = [];
  const depthMax = 4;
  const grow = (x: number, y: number, depth: number, spread: number, parent: number) => {
    const index = nodes.push({ x, y, depth, parent }) - 1;
    if (depth >= depthMax) return;
    for (const dir of [-1, 1]) {
      if (depth > 1 && r() < 0.28) continue;
      grow(x + dir * spread, y + h * 0.17, depth + 1, spread / 2, index);
    }
  };
  grow(w / 2, h * 0.16, 0, w * 0.21, -1);
  const leaves = nodes.map((n, i) => ({ n, i })).filter(({ i }) => !nodes.some((m) => m.parent === i));
  const target = leaves[int(r, 0, leaves.length - 1)]?.i ?? 0;
  const lit = new Set<number>();
  for (let i = target; i >= 0; i = nodes[i].parent) lit.add(i);
  nodes.forEach((n, i) => {
    if (n.parent < 0) return;
    const p = nodes[n.parent];
    const on = lit.has(i);
    out += `<line x1="${f(p.x)}" y1="${f(p.y)}" x2="${f(n.x)}" y2="${f(n.y)}" stroke="${on ? b : a}" stroke-opacity="${on ? 1 : 0.4}" stroke-width="${on ? 3.5 : 2}"/>`;
  });
  nodes.forEach((n, i) => {
    const on = lit.has(i);
    out += `<circle cx="${f(n.x)}" cy="${f(n.y)}" r="${on ? 13 : 10}" fill="${on ? b : palette.ink900}" stroke="${on ? b : a}" stroke-width="2.5"/>`;
  });
  const bars = 16;
  const bw = (w * 0.6) / bars;
  for (let i = 0; i < bars; i++) {
    const bh = h * 0.03 + (h * 0.09 * (i + 1)) / bars;
    out += `<rect x="${f(w * 0.2 + i * bw)}" y="${f(h * 0.93 - bh)}" width="${f(bw * 0.7)}" height="${f(bh)}" fill="${a}" fill-opacity="${f(0.15 + (0.5 * i) / bars)}"/>`;
  }
  return out;
}

function wave({ r, w, h, a, b }: Ctx): string {
  let out = `<path d="M${f(w * 0.08)} ${f(h * 0.12)}V${f(h * 0.88)}H${f(w * 0.94)}" fill="none" stroke="${a}" stroke-opacity="0.4" stroke-width="2"/>`;
  for (let i = 0; i < 10; i++) {
    const x = w * 0.08 + (w * 0.86 * i) / 9;
    out += `<line x1="${f(x)}" y1="${f(h * 0.88)}" x2="${f(x)}" y2="${f(h * 0.9)}" stroke="${a}" stroke-opacity="0.5"/>`;
  }
  const waves = int(r, 3, 5);
  for (let k = 0; k < waves; k++) {
    const amp = range(r, h * 0.05, h * 0.16);
    const freq = range(r, 1.2, 3.2);
    const phase = range(r, 0, Math.PI * 2);
    const base = range(r, h * 0.3, h * 0.65);
    let d = '';
    for (let i = 0; i <= 60; i++) {
      const x = w * 0.08 + (w * 0.86 * i) / 60;
      const y = base + Math.sin(phase + (i / 60) * Math.PI * 2 * freq) * amp;
      d += `${i ? 'L' : 'M'}${f(x)} ${f(y)}`;
    }
    out += `<path d="${d}" fill="none" stroke="${k === 0 ? b : a}" stroke-width="${k === 0 ? 3.5 : 2}" stroke-opacity="${k === 0 ? 1 : 0.45}"/>`;
  }
  const slope = range(r, -0.35, -0.1);
  for (let i = 0; i < 34; i++) {
    const t = r();
    const x = w * 0.1 + w * 0.82 * t;
    const y = h * 0.75 + slope * (x - w * 0.1) + range(r, -h * 0.07, h * 0.07);
    out += `<circle cx="${f(x)}" cy="${f(y)}" r="4" fill="${a}" fill-opacity="0.7"/>`;
  }
  return out;
}

function bokeh({ r, w, h, a, b }: Ctx): string {
  const colors = [a, b, neon.magenta, neon.blue];
  let out = `<rect x="0" y="${f(h * 0.62)}" width="${w}" height="${f(h * 0.38)}" fill="${b}" fill-opacity="0.06"/>`;
  out += `<line x1="0" y1="${f(h * 0.62)}" x2="${w}" y2="${f(h * 0.62)}" stroke="${b}" stroke-opacity="0.35"/>`;
  const n = int(r, 14, 22);
  for (let i = 0; i < n; i++) {
    const rad = range(r, 18, Math.min(w, h) * 0.17);
    out += `<circle cx="${f(range(r, 0, w))}" cy="${f(range(r, h * 0.05, h * 0.8))}" r="${f(rad)}" fill="${colors[int(r, 0, colors.length - 1)]}" fill-opacity="${f(range(r, 0.08, 0.32))}" stroke="#ffffff" stroke-opacity="0.08"/>`;
  }
  return out;
}

function retouch({ r, w, h, a, b }: Ctx): string {
  const split = w * range(r, 0.42, 0.58);
  let out = '';
  for (let i = 0; i < 9; i++) {
    const cx = range(r, 0, w);
    const cy = range(r, 0, h);
    const rad = range(r, w * 0.06, w * 0.16);
    const left = cx < split;
    out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad)}" fill="${left ? '#9aa0b4' : i % 2 ? a : b}" fill-opacity="${left ? 0.12 : 0.3}"/>`;
  }
  out += `<rect x="0" y="0" width="${f(split)}" height="${h}" fill="${palette.void}" fill-opacity="0.35"/>`;
  out += `<line x1="${f(split)}" y1="0" x2="${f(split)}" y2="${h}" stroke="#ffffff" stroke-width="3"/>`;
  out += `<circle cx="${f(split)}" cy="${f(h / 2)}" r="26" fill="${palette.ink900}" stroke="#ffffff" stroke-width="3"/>`;
  out += `<path d="M${f(split - 8)} ${f(h / 2 - 9)}l-9 9 9 9M${f(split + 8)} ${f(h / 2 - 9)}l9 9-9 9" fill="none" stroke="#ffffff" stroke-width="3"/>`;
  return out;
}

function film({ r, w, h, a, b }: Ctx): string {
  const top = h * 0.24;
  const bandH = h * 0.52;
  let out = `<rect x="0" y="${f(top)}" width="${w}" height="${f(bandH)}" fill="${palette.ink900}" stroke="${a}" stroke-opacity="0.35"/>`;
  for (let x = 14; x < w; x += 46) {
    out += `<rect x="${x}" y="${f(top + 12)}" width="24" height="16" rx="3" fill="${a}" fill-opacity="0.35"/>`;
    out += `<rect x="${x}" y="${f(top + bandH - 28)}" width="24" height="16" rx="3" fill="${a}" fill-opacity="0.35"/>`;
  }
  const frames = 4;
  const fw = (w - 80) / frames;
  for (let i = 0; i < frames; i++) {
    const x = 40 + i * fw;
    out += `<rect x="${f(x + 8)}" y="${f(top + 44)}" width="${f(fw - 16)}" height="${f(bandH - 88)}" fill="${i % 2 ? b : a}" fill-opacity="${f(range(r, 0.12, 0.3))}"/>`;
    out += `<circle cx="${f(x + fw * range(r, 0.3, 0.7))}" cy="${f(top + bandH / 2)}" r="${f(range(r, 14, 40))}" fill="#ffffff" fill-opacity="0.12"/>`;
  }
  const cx = w / 2;
  const cy = top + bandH / 2;
  out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="46" fill="${palette.void}" fill-opacity="0.7" stroke="#ffffff" stroke-width="3"/>`;
  out += `<path d="M${f(cx - 14)} ${f(cy - 22)}L${f(cx + 24)} ${f(cy)}L${f(cx - 14)} ${f(cy + 22)}Z" fill="#ffffff"/>`;
  const play = range(r, 0.2, 0.8);
  out += `<rect x="${f(w * 0.08)}" y="${f(h * 0.86)}" width="${f(w * 0.84)}" height="4" fill="#ffffff" fill-opacity="0.15"/>`;
  out += `<rect x="${f(w * 0.08)}" y="${f(h * 0.86)}" width="${f(w * 0.84 * play)}" height="4" fill="${b}"/>`;
  out += `<circle cx="${f(w * 0.08 + w * 0.84 * play)}" cy="${f(h * 0.86 + 2)}" r="9" fill="${b}"/>`;
  return out;
}

function motionCurves({ r, w, h, a, b }: Ctx): string {
  let out = '';
  for (let i = 0; i < 3; i++) {
    const y0 = h * range(r, 0.65, 0.85);
    const y1 = h * range(r, 0.15, 0.35);
    const c1 = w * range(r, 0.25, 0.55);
    const c2 = w * range(r, 0.45, 0.75);
    const x0 = w * 0.1;
    const x1 = w * 0.9;
    out += `<path d="M${f(x0)} ${f(y0)}C${f(c1)} ${f(y0)} ${f(c2)} ${f(y1)} ${f(x1)} ${f(y1)}" fill="none" stroke="${i === 0 ? b : a}" stroke-width="${i === 0 ? 4 : 2}" stroke-opacity="${i === 0 ? 1 : 0.45}"/>`;
    for (const [x, y] of [
      [x0, y0],
      [x1, y1],
    ]) {
      out += `<rect x="${f(x - 10)}" y="${f(y - 10)}" width="20" height="20" transform="rotate(45 ${f(x)} ${f(y)})" fill="${i === 0 ? b : palette.ink900}" stroke="${i === 0 ? b : a}" stroke-width="2.5"/>`;
    }
  }
  const dots = 14;
  for (let i = 0; i < dots; i++) {
    const t = i / (dots - 1);
    const eased = t * t * (3 - 2 * t);
    out += `<circle cx="${f(w * 0.12 + w * 0.76 * eased)}" cy="${f(h * 0.92)}" r="6" fill="${a}" fill-opacity="${f(0.25 + 0.75 * t)}"/>`;
  }
  return out;
}

function wireframe({ r, w, h, a, b }: Ctx): string {
  const fw = Math.min(w * 0.56, h * 0.95);
  const fh = fw * 0.66;
  const x = w * 0.12;
  const y = (h - fh) / 2;
  let out = `<rect x="${f(x)}" y="${f(y)}" width="${f(fw)}" height="${f(fh)}" rx="18" fill="${palette.ink900}" stroke="${a}" stroke-opacity="0.7" stroke-width="2.5"/>`;
  out += `<rect x="${f(x)}" y="${f(y)}" width="${f(fw)}" height="34" rx="18" fill="${a}" fill-opacity="0.12"/>`;
  [0, 1, 2].forEach((i) => {
    out += `<circle cx="${f(x + 24 + i * 18)}" cy="${f(y + 17)}" r="5" fill="${a}" fill-opacity="0.6"/>`;
  });
  out += `<rect x="${f(x + 24)}" y="${f(y + 56)}" width="${f(fw * 0.55)}" height="${f(fh * 0.38)}" rx="10" fill="${b}" fill-opacity="0.22" stroke="${b}" stroke-opacity="0.6"/>`;
  for (let i = 0; i < 4; i++) {
    out += `<rect x="${f(x + 24)}" y="${f(y + 70 + fh * 0.38 + i * 22)}" width="${f(fw * range(r, 0.3, 0.75))}" height="10" rx="5" fill="#ffffff" fill-opacity="0.14"/>`;
  }
  out += `<rect x="${f(x + fw * 0.66)}" y="${f(y + 56)}" width="${f(fw * 0.28)}" height="${f(fh * 0.7)}" rx="10" fill="${a}" fill-opacity="0.08" stroke="${a}" stroke-opacity="0.4"/>`;
  const px = x + fw + w * 0.06;
  const pw = Math.min(w * 0.18, h * 0.32);
  const ph = pw * 2;
  const py = (h - ph) / 2 + h * 0.05;
  out += `<rect x="${f(px)}" y="${f(py)}" width="${f(pw)}" height="${f(ph)}" rx="22" fill="${palette.ink900}" stroke="${a}" stroke-opacity="0.7" stroke-width="2.5"/>`;
  out += `<rect x="${f(px + 14)}" y="${f(py + 30)}" width="${f(pw - 28)}" height="${f(pw * 0.7)}" rx="8" fill="${b}" fill-opacity="0.22"/>`;
  out += `<rect x="${f(px + 14)}" y="${f(py + ph - 56)}" width="${f(pw - 28)}" height="30" rx="15" fill="${b}"/>`;
  const cx = x + fw * 0.4;
  const cy = y + fh * 0.62;
  out += `<path d="M${f(cx)} ${f(cy)}l0 34 9-9 8 17 7-3-8-17 13 0z" fill="#ffffff" stroke="${palette.void}" stroke-width="2"/>`;
  return out;
}

function poster({ r, w, h, a, b }: Ctx): string {
  const cx = w * range(r, 0.3, 0.7);
  const cy = h * range(r, 0.3, 0.6);
  const rad = Math.min(w, h) * range(r, 0.22, 0.32);
  let out = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad)}" fill="${b}" fill-opacity="0.85"/>`;
  const rw = w * range(r, 0.25, 0.4);
  const rh = h * range(r, 0.3, 0.5);
  const angle = range(r, -25, 25);
  out += `<rect x="${f(cx - rw * 0.2)}" y="${f(cy - rh * 0.1)}" width="${f(rw)}" height="${f(rh)}" transform="rotate(${f(angle)} ${f(cx)} ${f(cy)})" fill="${a}" fill-opacity="0.55" style="mix-blend-mode:screen"/>`;
  for (let i = 0; i < 9; i++) {
    out += `<line x1="${f(w * 0.06 + i * 16)}" y1="${f(h * 0.08)}" x2="${f(w * 0.06 + i * 16 + 60)}" y2="${f(h * 0.08 + 60)}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="3"/>`;
  }
  out += `<rect x="${f(w * 0.06)}" y="${f(h * 0.78)}" width="${f(w * 0.38)}" height="22" fill="#ffffff" fill-opacity="0.85"/>`;
  out += `<rect x="${f(w * 0.06)}" y="${f(h * 0.78 + 34)}" width="${f(w * 0.22)}" height="12" fill="#ffffff" fill-opacity="0.35"/>`;
  return out;
}

const MOTIFS: Record<ArtMotif, (ctx: Ctx) => string> = {
  detect,
  network,
  blocks,
  tree,
  wave,
  bokeh,
  retouch,
  film,
  motion: motionCurves,
  wireframe,
  poster,
};

/** Returns a standalone SVG document for the given project seed and category. */
export function generateArtSvg(options: ArtOptions): string {
  const { seed, category, aspect = 'landscape' } = options;
  const [w, h] = SIZES[aspect];
  const isEngineering = engineeringCategories.has(category);
  const a = options.accent ?? (isEngineering ? palette.eng : palette.cre);
  const b = options.accent2 ?? secondaryByCategory[category];
  const r = mulberry32(hashString(`${seed}:${category}`));
  const g1x = range(r, 0.15, 0.85);
  const g1y = range(r, 0.1, 0.6);
  const g2x = range(r, 0.15, 0.85);
  const motif = MOTIFS[motifByCategory[category]]({ r, w, h, a, b });
  const tick = 22;
  const inset = 26;
  const corners = [
    `M${inset} ${inset + tick}V${inset}H${inset + tick}`,
    `M${w - inset - tick} ${inset}H${w - inset}V${inset + tick}`,
    `M${w - inset} ${h - inset - tick}V${h - inset}H${w - inset - tick}`,
    `M${inset + tick} ${h - inset}H${inset}V${h - inset - tick}`,
  ].join('');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    '<defs>' +
    `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${palette.ink850}"/><stop offset="1" stop-color="${palette.void}"/></linearGradient>` +
    `<radialGradient id="g1" cx="${f(g1x)}" cy="${f(g1y)}" r="0.65"><stop offset="0" stop-color="${a}" stop-opacity="0.26"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="g2" cx="${f(g2x)}" cy="0.95" r="0.6"><stop offset="0" stop-color="${b}" stop-opacity="0.18"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></radialGradient>` +
    '<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity="0.045"/></pattern>' +
    '<filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter>' +
    '</defs>' +
    `<rect width="${w}" height="${h}" fill="url(#bg)"/>` +
    `<rect width="${w}" height="${h}" fill="url(#grid)"/>` +
    `<rect width="${w}" height="${h}" fill="url(#g1)"/>` +
    `<rect width="${w}" height="${h}" fill="url(#g2)"/>` +
    `<g filter="url(#glow)" opacity="0.65">${motif}</g>` +
    `<g>${motif}</g>` +
    `<path d="${corners}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="2"/>` +
    '</svg>'
  );
}

const cache = new Map<string, string>();

/** Data URL for generateArtSvg, memoised per option set. */
export function artDataUrl(options: ArtOptions): string {
  const key = `${options.seed}|${options.category}|${options.aspect ?? 'landscape'}|${options.accent ?? ''}|${options.accent2 ?? ''}`;
  let url = cache.get(key);
  if (!url) {
    url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(generateArtSvg(options))}`;
    cache.set(key, url);
  }
  return url;
}

export const ART_SIZES = SIZES;

// One canvas atlas for every piece of baked signage in the city: facade
// marquees with real tech-stack terms, ground-painted district labels and
// path chevrons, the Archive's "say hello" contact boards, creative-tool app
// tiles (original simplified renditions, drawn here — no logo files) and two
// abstract murals. Everything that uses it renders in ONE draw call; vertex
// colours tint white entries per placement (HDR values bloom).
//
// Layout is computed without a canvas so the bake step can read UVs.

import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace, type Texture } from 'three';
import { CANVAS_FONTS, canvasFontsReady, setTracking } from './canvasFonts';
import { createRng } from './random';

export const SIGN_ATLAS_SIZE = 2048;

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

interface Entry {
  id: string;
  w: number;
  h: number;
  draw: Draw;
}

/** Real terms from src/data/engineeringProjects.ts tags and profile skills. */
export const TECH_TERMS = [
  'COMPUTER VISION',
  'PYTORCH',
  'YOLO',
  'RAG',
  'FASTAPI',
  'GO · GIN',
  'OPENCV',
  'WHISPER',
  'FAISS',
  'LANGCHAIN',
  'BYTETRACK',
  'C++17',
] as const;

export type GroundDir = 'west' | 'east' | 'north' | 'south';

// ---------------------------------------------------------------- drawing helpers

export function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, family: string, maxW: number, start: number, tracking = 0): number {
  let size = start;
  for (; size > 10; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    setTracking(ctx, tracking * size);
    if (ctx.measureText(text).width <= maxW) break;
  }
  return size;
}

export function plate(ctx: CanvasRenderingContext2D, w: number, h: number, radius: number, border: number): void {
  ctx.beginPath();
  ctx.roundRect(border, border, w - border * 2, h - border * 2, radius);
  ctx.fillStyle = 'rgba(5,7,14,0.92)';
  ctx.fill();
  ctx.lineWidth = border;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.stroke();
}

export function glowText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, blur: number): void {
  ctx.save();
  ctx.shadowColor = 'rgba(255,255,255,0.55)';
  ctx.shadowBlur = blur;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
  ctx.restore();
  ctx.fillText(text, x, y);
}

export const marquee =
  (text: string): Draw =>
  (ctx, w, h) => {
    plate(ctx, w, h, h * 0.22, 5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    fitFont(ctx, text, 600, CANVAS_FONTS.display, w * 0.84, h * 0.5, 0.08);
    ctx.fillStyle = '#ffffff';
    glowText(ctx, text, w / 2, h / 2 + 3, 14);
  };

export function arrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dir: GroundDir): void {
  const a = { east: 0, south: Math.PI / 2, west: Math.PI, north: -Math.PI / 2 }[dir];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(size * 0.55, 0);
  ctx.lineTo(-size * 0.45, -size * 0.5);
  ctx.lineTo(-size * 0.2, 0);
  ctx.lineTo(-size * 0.45, size * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Ground label: the district word alone (its arrow is a separate quad). */
const groundWord =
  (text: string): Draw =>
  (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    fitFont(ctx, text, 700, CANVAS_FONTS.display, w - 40, h * 0.66, 0.12);
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 18;
    ctx.fillText(text, w / 2, h / 2 + 4);
    ctx.restore();
  };

/** Solid arrow pointing "up" in the atlas (rotated per placement). */
const groundArrow: Draw = (ctx, w, h) => {
  ctx.save();
  ctx.shadowColor = 'rgba(255,255,255,0.55)';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffffff';
  arrowHead(ctx, w / 2, h / 2, Math.min(w, h) * 0.78, 'north');
  ctx.restore();
};

const chevron: Draw = (ctx, w, h) => {
  ctx.save();
  ctx.shadowColor = 'rgba(255,255,255,0.6)';
  ctx.shadowBlur = 12;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = w * 0.13;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.2, h * 0.68);
  ctx.lineTo(w * 0.5, h * 0.32);
  ctx.lineTo(w * 0.8, h * 0.68);
  ctx.stroke();
  ctx.restore();
};

function tileBase(ctx: CanvasRenderingContext2D, w: number, bg: string, edge: string): void {
  const r = w * 0.2;
  ctx.beginPath();
  ctx.roundRect(8, 8, w - 16, w - 16, r);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = edge;
  ctx.stroke();
}

const letterTile =
  (letters: string, bg: string, fg: string): Draw =>
  (ctx, w) => {
    tileBase(ctx, w, bg, fg);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(w * 0.42)}px ${CANVAS_FONTS.body}`;
    setTracking(ctx, 0);
    ctx.fillText(letters, w / 2, w / 2 + w * 0.03);
  };

const figmaTile: Draw = (ctx, w) => {
  tileBase(ctx, w, '#1b1b1f', '#e9e9ef');
  const u = w * 0.13;
  const cx = w / 2;
  const top = w * 0.18;
  const pill = (x: number, y: number, color: string, shape: 'l' | 'r' | 'c' | 'd') => {
    ctx.fillStyle = color;
    ctx.beginPath();
    if (shape === 'c') ctx.arc(x + u, y + u, u, 0, Math.PI * 2);
    else if (shape === 'l') ctx.roundRect(x, y, 2 * u, 2 * u, [u, 0, 0, u]);
    else if (shape === 'r') ctx.roundRect(x, y, 2 * u, 2 * u, [0, u, u, 0]);
    else ctx.roundRect(x, y, 2 * u, 2 * u, [u, 0, u, u]);
    ctx.fill();
  };
  pill(cx - 2 * u, top, '#f24e1e', 'l');
  pill(cx, top, '#ff7262', 'r');
  pill(cx - 2 * u, top + 2 * u, '#a259ff', 'l');
  pill(cx, top + 2 * u, '#1abcfe', 'c');
  pill(cx - 2 * u, top + 4 * u, '#0acf83', 'd');
};

const canvaTile: Draw = (ctx, w) => {
  const g = ctx.createLinearGradient(0, w, w, 0);
  g.addColorStop(0, '#00c4cc');
  g.addColorStop(1, '#7d2ae8');
  ctx.beginPath();
  ctx.arc(w / 2, w / 2, w / 2 - 10, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#eafcff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `italic 700 ${Math.round(w * 0.24)}px ${CANVAS_FONTS.body}`;
  setTracking(ctx, -2);
  ctx.fillText('Canva', w / 2, w / 2 + 4);
  setTracking(ctx, 0);
};

const mural =
  (seed: string, palette: string[]): Draw =>
  (ctx, w, h) => {
    const r = createRng(seed);
    ctx.fillStyle = '#0d0e1c';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = palette[i % palette.length];
      ctx.globalAlpha = r.range(0.55, 0.95);
      const kind = r.int(0, 2);
      const x = r.range(-0.1, 0.9) * w;
      const y = r.range(-0.1, 0.9) * h;
      ctx.beginPath();
      if (kind === 0) ctx.arc(x, y, r.range(0.12, 0.32) * w, 0, Math.PI * 2);
      else if (kind === 1) ctx.roundRect(x, y, r.range(0.2, 0.55) * w, r.range(0.12, 0.4) * h, 18);
      else {
        ctx.moveTo(x, y);
        ctx.lineTo(x + r.range(0.2, 0.5) * w, y + r.range(-0.2, 0.3) * h);
        ctx.lineTo(x + r.range(0, 0.3) * w, y + r.range(0.2, 0.5) * h);
        ctx.closePath();
      }
      ctx.fill();
    }
    // Paint splashes.
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = palette[r.int(0, palette.length - 1)];
      ctx.globalAlpha = r.range(0.6, 1);
      ctx.beginPath();
      ctx.arc(r.next() * w, r.next() * h, r.range(2, 12), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#f2f4f8';
    ctx.strokeRect(5, 5, w - 10, h - 10);
  };

// ---------------------------------------------------------------- entries

const PAINT = ['#ff4fd8', '#ffb547', '#2de2c8', '#ff7a6b', '#b48cff', '#5b8cff'];

const ENTRIES: Entry[] = [
  { id: 'mural:a', w: 512, h: 384, draw: mural('mural-a', PAINT) },
  { id: 'mural:b', w: 512, h: 384, draw: mural('mural-b', ['#2de2c8', '#ff7a6b', '#ffb547', '#b48cff']) },
  { id: 'tile:ps', w: 256, h: 256, draw: letterTile('Ps', '#001e36', '#31a8ff') },
  { id: 'tile:pr', w: 256, h: 256, draw: letterTile('Pr', '#00005b', '#9999ff') },
  { id: 'tile:ae', w: 256, h: 256, draw: letterTile('Ae', '#00005b', '#cf96fd') },
  { id: 'tile:figma', w: 256, h: 256, draw: figmaTile },
  { id: 'tile:canva', w: 256, h: 256, draw: canvaTile },
  { id: 'ground:west', w: 1020, h: 192, draw: groundWord('ENGINEERING') },
  { id: 'ground:east', w: 1020, h: 192, draw: groundWord('CREATIVE') },
  { id: 'ground:north', w: 1020, h: 192, draw: groundWord('THE ARCHIVE') },
  { id: 'ground:south', w: 1020, h: 192, draw: groundWord('GAMING') },
  { id: 'arrow', w: 192, h: 192, draw: groundArrow },
  { id: 'sayhello', w: 1020, h: 192, draw: marquee('SAY HELLO') },
  { id: 'socials', w: 1020, h: 112, draw: marquee('EMAIL · GITHUB · LINKEDIN') },
  ...TECH_TERMS.map((t) => ({ id: `tech:${t}`, w: t.length > 9 ? 768 : 512, h: 112, draw: marquee(t) })),
  { id: 'chevron', w: 128, h: 128, draw: chevron },
];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const LAYOUT: Map<string, Rect> = (() => {
  const map = new Map<string, Rect>();
  const sorted = [...ENTRIES].sort((a, b) => b.h - a.h);
  let x = 0;
  let y = 0;
  let shelf = 0;
  const pad = 4;
  for (const e of sorted) {
    if (x + e.w > SIGN_ATLAS_SIZE) {
      x = 0;
      y += shelf + pad;
      shelf = 0;
    }
    map.set(e.id, { x, y, w: e.w, h: e.h });
    x += e.w + pad;
    shelf = Math.max(shelf, e.h);
  }
  if (y + shelf > SIGN_ATLAS_SIZE) throw new Error('Sign atlas overflow');
  return map;
})();

/** UV rect [u0, v0, u1, v1] (flipY) and aspect (w / h) of an atlas entry. */
export function signUv(id: string): { uv: [number, number, number, number]; aspect: number } {
  const r = LAYOUT.get(id);
  if (!r) throw new Error(`Unknown sign atlas entry: ${id}`);
  const s = SIGN_ATLAS_SIZE;
  const inset = 1.5;
  return {
    uv: [(r.x + inset) / s, 1 - (r.y + r.h - inset) / s, (r.x + r.w - inset) / s, 1 - (r.y + inset) / s],
    aspect: r.w / r.h,
  };
}

function drawAll(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const e of ENTRIES) {
    const r = LAYOUT.get(e.id);
    if (!r) continue;
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.beginPath();
    ctx.rect(0, 0, r.w, r.h);
    ctx.clip();
    e.draw(ctx, r.w, r.h);
    ctx.restore();
  }
}

export function createSignAtlas(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = SIGN_ATLAS_SIZE;
  canvas.height = SIGN_ATLAS_SIZE;
  drawAll(canvas);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  canvasFontsReady().then(() => {
    drawAll(canvas);
    texture.needsUpdate = true;
  });
  return texture;
}

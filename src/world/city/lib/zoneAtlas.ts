// Canvas atlas for the newer zones: the Gaming Zone (arcade signage, cabinet
// marquees, the gaming PC's monitor, GPU plate and placard, the data server's
// sign), the car-soccer arena (scoreboard face, LED boards, ground words), the
// time trial (FINISH / START, gate numbers) and the Archive's door line.
// Original artwork drawn here (no logo files). One texture, one draw call;
// vertex colours tint or scale each placement.

import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace, type Texture } from 'three';
import { neon } from '@/styles/tokens';
import { profileData } from '@/data/profile';
import { CANVAS_FONTS, canvasFontsReady, setTracking } from './canvasFonts';
import { fitFont, glowText, marquee, plate } from './signAtlas';
import { createRng } from './random';
import { safeText } from './text';

export const ZONE_ATLAS_SIZE = 2048;

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

interface Entry {
  id: string;
  w: number;
  h: number;
  draw: Draw;
}

/** Real skills and crafts from the profile, for the border billboards. */
export const BORDER_TERMS = [
  'PHOTOGRAPHY',
  'MOTION DESIGN',
  'COLOUR GRADE',
  'UI DESIGN',
  'DOCKER',
  'POSTGRESQL',
  'REACT',
  'TYPOGRAPHY',
] as const;

export const RACE_NUMBERS = 12;

const FULL_NAME = safeText(profileData.name).toUpperCase();

// ---------------------------------------------------------------- helpers

function gradientText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, h: number, stops: string[], blur = 18): void {
  const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  stops.forEach((c, i) => g.addColorStop(i / Math.max(1, stops.length - 1), c));
  ctx.save();
  ctx.shadowColor = stops[stops.length - 1];
  ctx.shadowBlur = blur;
  ctx.fillStyle = g;
  ctx.fillText(text, x, y);
  ctx.restore();
  ctx.fillStyle = g;
  ctx.fillText(text, x, y);
}

function scanlines(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number, step = 4): void {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, step / 2);
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function centred(ctx: CanvasRenderingContext2D): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
}

// ---------------------------------------------------------------- Gaming Zone

/** "ARCADE" stacked vertically on a blade sign, letters orange → magenta. */
const arcadeBlade: Draw = (ctx, w, h) => {
  plate(ctx, w, h, w * 0.24, 6);
  centred(ctx);
  const letters = 'ARCADE'.split('');
  const cell = (h - 60) / letters.length;
  ctx.font = `700 ${Math.round(Math.min(cell * 0.82, w * 0.66))}px ${CANVAS_FONTS.display}`;
  setTracking(ctx, 0);
  letters.forEach((ch, i) => {
    const y = 30 + cell * (i + 0.5);
    const t = i / (letters.length - 1);
    const color = t < 0.5 ? neon.orange : neon.magenta;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#fff3ea';
    ctx.fillText(ch, w / 2, y + 4);
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(ch, w / 2, y + 4);
  });
};

/** Pixel border + "ARCADE" across the hall front. */
const arcadeWide: Draw = (ctx, w, h) => {
  ctx.fillStyle = 'rgba(8,6,18,0.95)';
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, 26);
  ctx.fill();
  // Pixel dots border, alternating hues.
  const step = 22;
  for (let x = 20; x < w - 16; x += step) {
    for (const y of [16, h - 22]) {
      ctx.fillStyle = (x / step) % 2 < 1 ? neon.orange : neon.magenta;
      ctx.fillRect(x, y, 8, 8);
    }
  }
  centred(ctx);
  fitFont(ctx, 'ARCADE', 700, CANVAS_FONTS.display, w * 0.8, h * 0.62, 0.14);
  gradientText(ctx, 'ARCADE', w / 2, h / 2 + 4, h * 0.5, ['#fff2c4', '#ffb547', '#ff6a2c'], 24);
};

/** Thin ticker strip under the marquee. */
const ticker: Draw = (ctx, w, h) => {
  ctx.fillStyle = 'rgba(6,6,14,0.94)';
  ctx.fillRect(0, 0, w, h);
  centred(ctx);
  const text = 'INSERT COIN  ·  3 CABINETS  ·  1 RIG  ·  1 LAP';
  fitFont(ctx, text, 600, CANVAS_FONTS.mono, w * 0.94, h * 0.56, 0.12);
  ctx.fillStyle = '#ffffff';
  glowText(ctx, text, w / 2, h / 2 + 2, 10);
};

const blocksMarquee: Draw = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0c1a4a');
  g.addColorStop(1, '#050a1e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const colors = ['#3ee0ff', '#ffd23e', '#b48cff', '#34f5a6', '#ff4f6d', '#ff9f3e', '#5b8cff'];
  const s = h / 7;
  for (let i = 0; i < Math.ceil(w / s); i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(i * s + 1, 1, s - 2, s - 2);
    ctx.fillRect(i * s + 1, h - s + 1, s - 2, s - 2);
  }
  centred(ctx);
  fitFont(ctx, 'BLOCKS', 700, CANVAS_FONTS.display, w * 0.82, h * 0.56, 0.1);
  gradientText(ctx, 'BLOCKS', w / 2, h / 2 + 3, h * 0.5, ['#ffffff', '#9df3ff', '#3ee0ff']);
};

const pacMarquee: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#05040c';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#2b4dff';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  // Chomper and a dot trail.
  const cy = h / 2;
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(46, cy);
  ctx.arc(46, cy, h * 0.2, 0.6, Math.PI * 2 - 0.6);
  ctx.closePath();
  ctx.fill();
  centred(ctx);
  fitFont(ctx, 'PAC-MAZE', 700, CANVAS_FONTS.display, w * 0.7, h * 0.5, 0.06);
  gradientText(ctx, 'PAC-MAZE', w / 2 + 24, cy + 3, h * 0.45, ['#fff7c2', '#ffd23e', '#ffb547']);
};

const catMarquee: Draw = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#2a0c3a');
  g.addColorStop(1, '#3a0c2a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Two cat ears on the left.
  ctx.fillStyle = neon.magenta;
  const ex = 40;
  for (const dx of [0, 34]) {
    ctx.beginPath();
    ctx.moveTo(ex + dx, h * 0.68);
    ctx.lineTo(ex + dx + 13, h * 0.28);
    ctx.lineTo(ex + dx + 26, h * 0.68);
    ctx.closePath();
    ctx.fill();
  }
  centred(ctx);
  ctx.font = `700 ${Math.round(h * 0.5)}px ${CANVAS_FONTS.body}`;
  fitFont(ctx, 'CatGPT', 700, CANVAS_FONTS.body, w * 0.66, h * 0.58, 0);
  gradientText(ctx, 'CatGPT', w / 2 + 30, h / 2 + 3, h * 0.5, ['#ffffff', '#ffc2f3', '#ff4fd8']);
};

/** The gaming PC monitor: synthwave horizon, welcome line and the owner's name. */
const monitor: Draw = (ctx, w, h) => {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#060818');
  sky.addColorStop(0.55, '#1a0b33');
  sky.addColorStop(0.62, '#2b0a2e');
  sky.addColorStop(1, '#07040f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const r = createRng('monitor-stars');
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(220,230,255,${r.range(0.25, 0.9)})`;
    ctx.fillRect(r.next() * w, r.next() * h * 0.5, 2, 2);
  }
  // Striped sun on the horizon.
  const horizon = h * 0.64;
  const sunR = h * 0.24;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, horizon);
  ctx.clip();
  const sun = ctx.createLinearGradient(0, horizon - sunR, 0, horizon);
  sun.addColorStop(0, '#ffd23e');
  sun.addColorStop(1, '#ff4fd8');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(w * 0.78, horizon, sunR, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#1a0b33';
  for (let k = 0; k < 5; k++) ctx.fillRect(w * 0.78 - sunR, horizon - sunR * 0.12 - k * sunR * 0.17, sunR * 2, 3 + k * 0.6);
  ctx.restore();
  // Perspective grid floor.
  ctx.strokeStyle = 'rgba(255,79,216,0.7)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const t = Math.pow(i / 8, 1.8);
    const y = horizon + t * (h - horizon);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(62,224,255,0.55)';
  for (let i = -12; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * 22, horizon);
    ctx.lineTo(w / 2 + i * 140, h);
    ctx.stroke();
  }
  // Header bar with the owner's name.
  ctx.fillStyle = 'rgba(4,5,12,0.75)';
  ctx.fillRect(0, 0, w, 44);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `600 22px ${CANVAS_FONTS.display}`;
  setTracking(ctx, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(FULL_NAME, 22, 24);
  ctx.textAlign = 'right';
  ctx.font = `500 18px ${CANVAS_FONTS.mono}`;
  setTracking(ctx, 2);
  ctx.fillStyle = '#ffb547';
  ctx.fillText('PORTFOLIO · PLAYER 1', w - 22, 24);
  // Welcome copy.
  centred(ctx);
  ctx.textAlign = 'left';
  const x0 = 46;
  fitFont(ctx, 'Welcome to my portfolio —', 600, CANVAS_FONTS.body, w * 0.62, 56, 0);
  ctx.save();
  ctx.shadowColor = 'rgba(62,224,255,0.8)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#eafcff';
  ctx.fillText('Welcome to my portfolio —', x0, h * 0.26);
  ctx.restore();
  fitFont(ctx, 'the sci-fi world', 700, CANVAS_FONTS.display, w * 0.6, 64, 0.02);
  gradientText(ctx, 'the sci-fi world', x0, h * 0.43, 60, ['#ffffff', '#ffb547', '#ff6a2c'], 20);
  scanlines(ctx, w, h, 0.16, 4);
  vignette(ctx, w, h, 0.55);
};

const gpuPlate: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#05060b';
  ctx.fillRect(0, 0, w, h);
  centred(ctx);
  fitFont(ctx, 'RTX 5090', 700, CANVAS_FONTS.display, w * 0.86, h * 0.68, 0.14);
  ctx.fillStyle = '#ffffff';
  glowText(ctx, 'RTX 5090', w / 2, h / 2 + 3, 12);
};

/** Acrylic placard on the desk: the build sheet. */
const placard: Draw = (ctx, w, h) => {
  plate(ctx, w, h, 22, 5);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(h * 0.11)}px ${CANVAS_FONTS.mono}`;
  setTracking(ctx, 5);
  ctx.fillStyle = neon.orange;
  ctx.fillText('THE RIG · OPEN BENCH', 34, h * 0.17);
  ctx.font = `700 ${Math.round(h * 0.3)}px ${CANVAS_FONTS.display}`;
  setTracking(ctx, 2);
  ctx.fillStyle = '#ffffff';
  glowText(ctx, '128 GB', 30, h * 0.47, 14);
  ctx.font = `500 ${Math.round(h * 0.11)}px ${CANVAS_FONTS.mono}`;
  setTracking(ctx, 3);
  ctx.fillStyle = '#d7dcef';
  ctx.fillText('DDR5 · 4 × 32 GB · RGB', 34, h * 0.7);
  ctx.fillText('RTX 5090 · 360 MM AIO', 34, h * 0.85);
};

const serverSign: Draw = (ctx, w, h) => {
  plate(ctx, w, h, 26, 6);
  centred(ctx);
  fitFont(ctx, 'FEED THE SERVER', 700, CANVAS_FONTS.display, w * 0.88, h * 0.34, 0.06);
  ctx.fillStyle = '#ffffff';
  glowText(ctx, 'FEED THE SERVER', w / 2, h * 0.36, 16);
  ctx.font = `600 ${Math.round(h * 0.2)}px ${CANVAS_FONTS.mono}`;
  setTracking(ctx, h * 0.04);
  ctx.fillStyle = '#ffffff';
  glowText(ctx, '— GIVE IT RAM —', w / 2, h * 0.72, 10);
};

const slotLabel: Draw = (ctx, w, h) => {
  centred(ctx);
  ctx.font = `600 ${Math.round(h * 0.56)}px ${CANVAS_FONTS.mono}`;
  setTracking(ctx, h * 0.08);
  ctx.fillStyle = '#ffffff';
  glowText(ctx, 'RAM SLOT ▼', w / 2, h / 2 + 2, 8);
};

// ---------------------------------------------------------------- arena

/** Full scoreboard face; the live digits are drawn on top by <ArenaScoreboard />. */
const scoreboard: Draw = (ctx, w, h) => {
  ctx.fillStyle = '#05060c';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  // Header.
  centred(ctx);
  fitFont(ctx, 'CAR SOCCER', 700, CANVAS_FONTS.display, w * 0.6, h * 0.15, 0.12);
  gradientText(ctx, 'CAR SOCCER', w / 2, h * 0.12, h * 0.13, ['#ffffff', '#e8f1ff', '#9fb8ff'], 14);
  // Team windows (digits go in the dark boxes).
  const teams: Array<[string, string, number]> = [
    ['CYAN', neon.cyan, 0.22],
    ['ORANGE', neon.orange, 0.78],
  ];
  for (const [name, color, cx] of teams) {
    const bw = w * 0.3;
    const bx = w * cx - bw / 2;
    ctx.fillStyle = color;
    ctx.fillRect(bx, h * 0.3, bw, h * 0.12);
    ctx.fillStyle = '#05060c';
    ctx.font = `700 ${Math.round(h * 0.085)}px ${CANVAS_FONTS.display}`;
    setTracking(ctx, 6);
    ctx.fillText(name, w * cx, h * 0.365);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.strokeRect(bx, h * 0.45, bw, h * 0.47);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(bx, h * 0.45, bw, h * 0.47);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(h * 0.16)}px ${CANVAS_FONTS.display}`;
  ctx.fillText(':', w / 2, h * 0.67);
  ctx.font = `500 ${Math.round(h * 0.045)}px ${CANVAS_FONTS.mono}`;
  setTracking(ctx, 4);
  ctx.fillStyle = '#a9aec0';
  ctx.fillText('CYAN DEFENDS NORTH  ·  ORANGE DEFENDS SOUTH', w / 2, h * 0.225);
  scanlines(ctx, w, h, 0.12, 6);
};

const ledBoard =
  (text: string, color: string): Draw =>
  (ctx, w, h) => {
    ctx.fillStyle = '#04050a';
    ctx.fillRect(0, 0, w, h);
    // LED dot texture.
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 2; x < w; x += 6) for (let y = 2; y < h; y += 6) ctx.fillRect(x, y, 3, 3);
    centred(ctx);
    fitFont(ctx, text, 700, CANVAS_FONTS.display, w * 0.9, h * 0.62, 0.12);
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.fillText(text, w / 2, h / 2 + 3);
    ctx.restore();
  };

const groundWord =
  (text: string): Draw =>
  (ctx, w, h) => {
    centred(ctx);
    fitFont(ctx, text, 700, CANVAS_FONTS.display, w - 40, h * 0.66, 0.12);
    ctx.save();
    ctx.shadowColor = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, w / 2, h / 2 + 4);
    ctx.restore();
  };

// ---------------------------------------------------------------- race

const verticalWord =
  (text: string): Draw =>
  (ctx, w, h) => {
    ctx.fillStyle = 'rgba(5,6,12,0.94)';
    ctx.beginPath();
    ctx.roundRect(3, 3, w - 6, h - 6, w * 0.18);
    ctx.fill();
    // Chequered caps.
    const s = w / 6;
    for (const y0 of [8, h - 8 - s * 2]) {
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#ffffff' : 'rgba(255,255,255,0.08)';
        ctx.fillRect(i * s + 1, y0 + j * s, s - 1, s - 1);
      }
    }
    centred(ctx);
    const letters = text.split('');
    const top = 16 + s * 2;
    const cell = (h - 2 * top) / letters.length;
    ctx.font = `700 ${Math.round(Math.min(cell * 0.8, w * 0.7))}px ${CANVAS_FONTS.display}`;
    setTracking(ctx, 0);
    ctx.fillStyle = '#ffffff';
    letters.forEach((ch, i) => glowText(ctx, ch, w / 2, top + cell * (i + 0.5) + 3, 16));
  };

const raceNumber =
  (n: number): Draw =>
  (ctx, w, h) => {
    ctx.fillStyle = 'rgba(5,6,12,0.95)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    centred(ctx);
    const label = n >= RACE_NUMBERS ? 'F' : String(n);
    ctx.font = `700 ${Math.round(h * (label.length > 1 ? 0.42 : 0.52))}px ${CANVAS_FONTS.display}`;
    setTracking(ctx, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, w / 2, h / 2 + 4);
  };

// ---------------------------------------------------------------- entries

const ENTRIES: Entry[] = [
  { id: 'pc:monitor', w: 1024, h: 440, draw: monitor },
  { id: 'arena:board', w: 896, h: 358, draw: scoreboard },
  { id: 'gz:blade', w: 160, h: 820, draw: arcadeBlade },
  { id: 'race:finish-v', w: 136, h: 820, draw: verticalWord('FINISH') },
  { id: 'pc:placard', w: 512, h: 240, draw: placard },
  { id: 'srv:sign', w: 896, h: 240, draw: serverSign },
  { id: 'gz:arcade', w: 896, h: 192, draw: arcadeWide },
  { id: 'ground:arena', w: 640, h: 128, draw: groundWord('ARENA') },
  { id: 'ground:start', w: 640, h: 128, draw: groundWord('START') },
  { id: 'race:timetrial', w: 896, h: 128, draw: marquee('TIME TRIAL · 1 LAP') },
  { id: 'cab:blocks', w: 512, h: 144, draw: blocksMarquee },
  { id: 'cab:pacmaze', w: 512, h: 144, draw: pacMarquee },
  { id: 'cab:catgpt', w: 512, h: 144, draw: catMarquee },
  { id: 'archive:doors', w: 1280, h: 112, draw: marquee('ABOUT  ·  RÉSUMÉ  ·  CONTACT') },
  { id: 'archive:this-way', w: 768, h: 96, draw: marquee('▲  THE ARCHIVE · DOORS AHEAD') },
  ...Array.from({ length: RACE_NUMBERS }, (_, i) => ({ id: `race:n${i + 1}`, w: 96, h: 96, draw: raceNumber(i + 1) })),
  { id: 'arena:led-0', w: 640, h: 60, draw: ledBoard('CAR SOCCER', neon.white) },
  { id: 'arena:led-1', w: 640, h: 60, draw: ledBoard('TEAM CYAN', neon.cyan) },
  { id: 'arena:led-2', w: 640, h: 60, draw: ledBoard('TEAM ORANGE', neon.orange) },
  { id: 'arena:led-3', w: 640, h: 60, draw: ledBoard('BOOST · KICK · SCORE', neon.amber) },
  { id: 'gz:ticker', w: 1280, h: 64, draw: ticker },
  { id: 'pc:gpu', w: 512, h: 96, draw: gpuPlate },
  { id: 'srv:slot', w: 384, h: 72, draw: slotLabel },
  ...BORDER_TERMS.map((t) => ({ id: `term:${t}`, w: t.length > 8 ? 640 : 448, h: 96, draw: marquee(t) })),
];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Skyline bottom-left packing (tallest first): much tighter than shelves for mixed sizes. */
const LAYOUT: Map<string, Rect> = (() => {
  const map = new Map<string, Rect>();
  const S = ZONE_ATLAS_SIZE;
  const pad = 4;
  let sky: Array<{ x: number; y: number; w: number }> = [{ x: 0, y: 0, w: S }];
  const sorted = [...ENTRIES].sort((a, b) => b.h - a.h || b.w - a.w);
  for (const e of sorted) {
    const w = e.w + pad;
    const h = e.h + pad;
    let best: { i: number; x: number; y: number } | null = null;
    for (let i = 0; i < sky.length; i++) {
      const x = sky[i].x;
      if (x + w > S + pad) break;
      let y = 0;
      let covered = 0;
      for (let j = i; j < sky.length && covered < w; j++) {
        y = Math.max(y, sky[j].y);
        covered += sky[j].w;
      }
      if (covered < w || y + h > S + pad) continue;
      if (!best || y < best.y || (y === best.y && x < best.x)) best = { i, x, y };
    }
    if (!best) throw new Error(`Zone atlas overflow at ${e.id}`);
    map.set(e.id, { x: best.x, y: best.y, w: e.w, h: e.h });
    // Raise the skyline under the new rect.
    const next: typeof sky = [];
    const x0 = best.x;
    const x1 = best.x + w;
    for (const seg of sky) {
      const s0 = seg.x;
      const s1 = seg.x + seg.w;
      if (s1 <= x0 || s0 >= x1) next.push(seg);
      else {
        if (s0 < x0) next.push({ x: s0, y: seg.y, w: x0 - s0 });
        if (s1 > x1) next.push({ x: x1, y: seg.y, w: s1 - x1 });
      }
    }
    next.push({ x: x0, y: best.y + h, w });
    next.sort((a, b) => a.x - b.x);
    // Merge equal-height neighbours.
    sky = next.reduce<typeof sky>((acc, seg) => {
      const last = acc[acc.length - 1];
      if (last && last.y === seg.y && last.x + last.w === seg.x) last.w += seg.w;
      else acc.push({ ...seg });
      return acc;
    }, []);
  }
  return map;
})();

/** UV rect [u0, v0, u1, v1] (flipY) and aspect (w / h) of an atlas entry. */
export function zoneUv(id: string): { uv: [number, number, number, number]; aspect: number } {
  const r = LAYOUT.get(id);
  if (!r) throw new Error(`Unknown zone atlas entry: ${id}`);
  const s = ZONE_ATLAS_SIZE;
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

export function createZoneAtlas(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = ZONE_ATLAS_SIZE;
  canvas.height = ZONE_ATLAS_SIZE;
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

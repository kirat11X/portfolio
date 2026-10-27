// Attract-mode art for the three arcade cabinets, drawn into one small canvas
// (three 256 × 320 panels side by side). Pure functions of time so the screen
// can be redrawn at a low frame rate, or drawn once (reduced motion / low tier).

import { CANVAS_FONTS, setTracking } from './canvasFonts';

export const SCREEN_W = 256;
export const SCREEN_H = 320;
export const SCREEN_IDS = ['blocks', 'pacmaze', 'catgpt'] as const;
export type ScreenId = (typeof SCREEN_IDS)[number];

/** UV rect [u0, v0, u1, v1] of a panel (canvas flipY). */
export function screenUv(id: ScreenId): [number, number, number, number] {
  const i = SCREEN_IDS.indexOf(id);
  const n = SCREEN_IDS.length;
  return [i / n + 0.002, 0.004, (i + 1) / n - 0.002, 0.996];
}

function crt(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.7);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function blink(t: number, rate: number): boolean {
  return Math.floor(t * rate) % 2 === 0;
}

// ---------------------------------------------------------------- BLOCKS

const PIECES: Array<{ cells: Array<[number, number]>; color: string }> = [
  { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], color: '#3ee0ff' },
  { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: '#ffd23e' },
  { cells: [[1, 0], [0, 1], [1, 1], [2, 1]], color: '#b48cff' },
  { cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: '#5b8cff' },
  { cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: '#ff9f3e' },
  { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], color: '#34f5a6' },
];
const STACK_COLORS = ['#3ee0ff', '#ffd23e', '#b48cff', '#34f5a6', '#ff4f6d', '#ff9f3e', '#5b8cff'];
// Bottom rows of the well (10 wide), '.' empty.
const STACK = ['..##.#..##', '#.####.###', '####.#####', '#########.', '###.######'];

function drawBlocks(ctx: CanvasRenderingContext2D, t: number): void {
  const w = SCREEN_W;
  const h = SCREEN_H;
  ctx.fillStyle = '#04061a';
  ctx.fillRect(0, 0, w, h);
  const cols = 10;
  const rows = 17;
  const cell = 15;
  const ox = 14;
  const oy = 32;
  ctx.strokeStyle = 'rgba(62,224,255,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(ox - 2, oy - 2, cols * cell + 4, rows * cell + 4);
  const block = (cx: number, cy: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(ox + cx * cell + 1, oy + cy * cell + 1, cell - 2, cell - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(ox + cx * cell + 1, oy + cy * cell + 1, cell - 2, 3);
  };
  STACK.forEach((row, r) => {
    for (let c = 0; c < cols; c++) if (row[c] === '#') block(c, rows - STACK.length + r, STACK_COLORS[(r * 3 + c) % STACK_COLORS.length]);
  });
  // A piece falls one row every 0.2 s, then the next one starts.
  const fall = rows - STACK.length - 2;
  const step = Math.floor(t / 0.2);
  const pieceIndex = Math.floor(step / fall) % PIECES.length;
  const y = step % fall;
  const piece = PIECES[pieceIndex];
  const px = [3, 4, 2, 5, 3, 4][pieceIndex];
  for (const [cx, cy] of piece.cells) block(px + cx, y + cy, piece.color);
  // Side panel.
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `600 13px ${CANVAS_FONTS.mono}`;
  setTracking(ctx, 1);
  const sx = ox + cols * cell + 12;
  ctx.fillText('NEXT', sx, oy);
  const next = PIECES[(pieceIndex + 1) % PIECES.length];
  for (const [cx, cy] of next.cells) {
    ctx.fillStyle = next.color;
    ctx.fillRect(sx + cx * 10, oy + 22 + cy * 10, 9, 9);
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText('LINES', sx, oy + 70);
  ctx.fillStyle = '#ffd23e';
  ctx.fillText(String(12 + (step % 40)).padStart(3, '0'), sx, oy + 88);
  ctx.fillStyle = '#3ee0ff';
  ctx.textAlign = 'center';
  ctx.font = `700 18px ${CANVAS_FONTS.display}`;
  ctx.fillText('BLOCKS', w / 2, 6);
  if (blink(t, 1.6)) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 12px ${CANVAS_FONTS.mono}`;
    ctx.fillText('PRESS START', sx + 28, oy + 150);
  }
  crt(ctx, w, h);
}

// ---------------------------------------------------------------- PAC-MAZE

// 13 × 15 maze: '#' wall, '.' dot, ' ' empty.
const MAZE = [
  '#############',
  '#.....#.....#',
  '#.###.#.###.#',
  '#...........#',
  '#.###.#.###.#',
  '#.....#.....#',
  '###.#####.###',
  '  #.......#  ',
  '###.## ##.###',
  '#...........#',
  '#.###.#.###.#',
  '#...#...#...#',
  '###.#.#.#.###',
  '#.....#.....#',
  '#############',
];
// Loop the chomper runs (cell coordinates).
const LOOP: Array<[number, number]> = [
  [1, 3], [11, 3], [11, 5], [7, 5], [7, 3], [5, 3], [5, 9], [11, 9], [11, 13], [1, 13], [1, 9], [3, 9], [3, 3],
];

function loopPoint(s: number): [number, number, number] {
  const segs = LOOP.map((p, i) => [p, LOOP[(i + 1) % LOOP.length]] as const);
  const lens = segs.map(([a, b]) => Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]));
  const total = lens.reduce((a, b) => a + b, 0);
  let d = ((s % total) + total) % total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= lens[i]) {
      const [a, b] = segs[i];
      const k = lens[i] ? d / lens[i] : 0;
      const dir = Math.atan2(Math.sign(b[1] - a[1]), Math.sign(b[0] - a[0]));
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, dir];
    }
    d -= lens[i];
  }
  return [LOOP[0][0], LOOP[0][1], 0];
}

function drawPacMaze(ctx: CanvasRenderingContext2D, t: number): void {
  const w = SCREEN_W;
  const h = SCREEN_H;
  ctx.fillStyle = '#020208';
  ctx.fillRect(0, 0, w, h);
  const cell = 18;
  const ox = (w - 13 * cell) / 2;
  const oy = 36;
  ctx.strokeStyle = '#3b5bff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#3b5bff';
  ctx.shadowBlur = 6;
  MAZE.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== '#') continue;
      ctx.strokeRect(ox + c * cell + 3, oy + r * cell + 3, cell - 6, cell - 6);
    }
  });
  ctx.shadowBlur = 0;
  const s = t * 4.2;
  const [px, py, dir] = loopPoint(s);
  // Dots, eaten just behind the chomper.
  ctx.fillStyle = '#ffd9b0';
  MAZE.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== '.') continue;
      ctx.fillRect(ox + c * cell + cell / 2 - 2, oy + r * cell + cell / 2 - 2, 4, 4);
    }
  });
  const mouth = 0.15 + 0.35 * Math.abs(Math.sin(t * 12));
  const cx = ox + px * cell + cell / 2;
  const cy = oy + py * cell + cell / 2;
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, cell * 0.62, dir + mouth, dir + Math.PI * 2 - mouth);
  ctx.closePath();
  ctx.fill();
  // A ghost following.
  const [gx, gy] = loopPoint(s - 3.2);
  const gcx = ox + gx * cell + cell / 2;
  const gcy = oy + gy * cell + cell / 2;
  const gr = cell * 0.6;
  ctx.fillStyle = '#ff4fd8';
  ctx.beginPath();
  ctx.arc(gcx, gcy - 2, gr, Math.PI, 0);
  ctx.lineTo(gcx + gr, gcy + gr);
  for (let i = 0; i < 4; i++) ctx.lineTo(gcx + gr - (i + 0.5) * (gr / 2), gcy + gr - (i % 2 ? 0 : 4));
  ctx.lineTo(gcx - gr, gcy + gr);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(gcx - 6, gcy - 5, 5, 6);
  ctx.fillRect(gcx + 2, gcy - 5, 5, 6);
  ctx.fillStyle = '#ffd23e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `700 18px ${CANVAS_FONTS.display}`;
  ctx.fillText('PAC-MAZE', w / 2, 6);
  if (blink(t, 1.3)) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 12px ${CANVAS_FONTS.mono}`;
    ctx.fillText('INSERT COIN', w / 2, h - 18);
  }
  crt(ctx, w, h);
}

// ---------------------------------------------------------------- CatGPT

function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, tail: 'left' | 'right'): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.beginPath();
  if (tail === 'left') {
    ctx.moveTo(x + 10, y + h - 2);
    ctx.lineTo(x - 6, y + h + 8);
    ctx.lineTo(x + 24, y + h - 2);
  } else {
    ctx.moveTo(x + w - 10, y + h - 2);
    ctx.lineTo(x + w + 6, y + h + 8);
    ctx.lineTo(x + w - 24, y + h - 2);
  }
  ctx.fill();
}

function catFace(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, wink: boolean): void {
  ctx.fillStyle = '#ff4fd8';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.9, y - r * 0.2);
  ctx.lineTo(x - r * 0.75, y - r * 1.25);
  ctx.lineTo(x - r * 0.2, y - r * 0.75);
  ctx.lineTo(x + r * 0.2, y - r * 0.75);
  ctx.lineTo(x + r * 0.75, y - r * 1.25);
  ctx.lineTo(x + r * 0.9, y - r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0420';
  if (wink) ctx.fillRect(x - r * 0.5, y - r * 0.15, r * 0.32, r * 0.08);
  else ctx.fillRect(x - r * 0.45, y - r * 0.3, r * 0.2, r * 0.3);
  ctx.fillRect(x + r * 0.25, y - r * 0.3, r * 0.2, r * 0.3);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.12, y + r * 0.15);
  ctx.lineTo(x + r * 0.12, y + r * 0.15);
  ctx.lineTo(x, y + r * 0.3);
  ctx.closePath();
  ctx.fill();
}

function drawCatGpt(ctx: CanvasRenderingContext2D, t: number): void {
  const w = SCREEN_W;
  const h = SCREEN_H;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a0626');
  g.addColorStop(1, '#0a0312');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,79,216,0.18)';
  ctx.fillRect(0, 0, w, 34);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `700 17px ${CANVAS_FONTS.body}`;
  setTracking(ctx, 0);
  ctx.fillText('CatGPT', 40, 18);
  catFace(ctx, 22, 20, 9, false);
  // Conversation: question, typing dots, then "meow?" — on a 6 s loop.
  const cycle = t % 6;
  bubble(ctx, 70, 52, 172, 50, '#2b3a8f', 'right');
  ctx.fillStyle = '#ffffff';
  ctx.font = `500 14px ${CANVAS_FONTS.body}`;
  ctx.fillText('how do I centre', 82, 68);
  ctx.fillText('a div?', 82, 87);
  catFace(ctx, 28, 160, 16, cycle > 4.4 && cycle < 4.8);
  if (cycle < 2.2) {
    bubble(ctx, 56, 140, 80, 40, '#3a1446', 'left');
    for (let i = 0; i < 3; i++) {
      const on = Math.floor(t * 4) % 3 === i;
      ctx.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(78 + i * 18, 160, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    bubble(ctx, 56, 132, 150, 56, '#ff4fd8', 'left');
    ctx.fillStyle = '#1a0420';
    ctx.font = `700 28px ${CANVAS_FONTS.display}`;
    ctx.fillText('meow?', 72, 161);
  }
  // Prompt box.
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(14, h - 58, w - 28, 38, 12);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `500 13px ${CANVAS_FONTS.body}`;
  ctx.fillText(blink(t, 1.5) ? 'Ask CatGPT anything|' : 'Ask CatGPT anything', 28, h - 39);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `500 10px ${CANVAS_FONTS.mono}`;
  ctx.textAlign = 'center';
  ctx.fillText('CatGPT can make mistakes. Mostly naps.', w / 2, h - 10);
  crt(ctx, w, h);
}

const DRAW: Record<ScreenId, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  blocks: drawBlocks,
  pacmaze: drawPacMaze,
  catgpt: drawCatGpt,
};

/** Draws all three panels at time `t` (seconds). */
export function drawArcadeScreens(canvas: HTMLCanvasElement, t: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  SCREEN_IDS.forEach((id, i) => {
    ctx.save();
    ctx.translate(i * SCREEN_W, 0);
    ctx.beginPath();
    ctx.rect(0, 0, SCREEN_W, SCREEN_H);
    ctx.clip();
    DRAW[id](ctx, t);
    ctx.restore();
  });
}

// Education display on the Engineering Lab's glass front, above the gallery
// door: grade (headline), degree, the college's seal + wordmark on a light
// sign card, and the institution name. Values come from profileData.education
// so the world stays in sync with the rest of the site.
//
// Two draw calls: neon text on a canvas (HDR, blooms) and a tone-mapped light
// card carrying the two logo images. If an image fails, the card still shows.

import { useMemo } from 'react';
import { CanvasTexture, Color, LinearFilter, LinearMipmapLinearFilter, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { neon, palette } from '@/styles/tokens';
import { profileData } from '@/data/profile';
import { LANDMARKS } from '../config/layout';
import { CANVAS_FONTS, canvasFontsReady, setTracking } from './lib/canvasFonts';
import { safeText } from './lib/text';
import { useDisposable } from './lib/useDisposable';

const PANEL_W = 9.0;
const PANEL_H = 4.5;
const TEX_W = 2048;
const TEX_H = 1024;
const CARD_W = 3.7;
const CARD_H = 1.42;
const CARD_TEX_W = 1024;
const CARD_TEX_H = 394;

/** "CGPA: 8.82 / 10" → "CGPA : 8.82"; field → "B.Tech CSE"; institution as is. */
function educationLines(): { grade: string; degree: string; institution: string } | null {
  const edu = profileData.education[0];
  if (!edu) return null;
  const gradeMatch = edu.grade?.match(/([A-Za-z]+)\s*:\s*([\d.]+)/);
  const grade = gradeMatch ? `${gradeMatch[1].toUpperCase()} : ${gradeMatch[2]}` : '';
  const short = /B\.?\s*Tech/i.test(edu.degree) ? 'B.Tech' : edu.degree;
  const field = /computer science/i.test(edu.field) && /engineering/i.test(edu.field) ? 'CSE' : edu.field;
  return { grade, degree: safeText(`${short} ${field}`), institution: safeText(edu.institution) };
}

function drawText(canvas: HTMLCanvasElement, lines: NonNullable<ReturnType<typeof educationLines>>): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  // Subtle dark backing so the text reads against the glass.
  ctx.beginPath();
  ctx.roundRect(8, 8, TEX_W - 16, TEX_H - 16, 48);
  ctx.fillStyle = 'rgba(3,6,12,0.78)';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(62,224,255,0.55)';
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glow = (text: string, y: number, color: string, blur: number) => {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.fillText(text, TEX_W / 2, y);
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.85;
    ctx.fillText(text, TEX_W / 2, y);
    ctx.globalAlpha = 1;
  };
  ctx.font = `700 200px ${CANVAS_FONTS.display}`;
  setTracking(ctx, 10);
  if (lines.grade) glow(lines.grade, 175, neon.cyan, 40);
  ctx.font = `600 104px ${CANVAS_FONTS.body}`;
  setTracking(ctx, 2);
  glow(lines.degree, 362, '#bff4ff', 22);
  // (The logo card sits between y ≈ 440 and 760.)
  ctx.font = `600 64px ${CANVAS_FONTS.body}`;
  setTracking(ctx, 1);
  ctx.fillStyle = palette.fg;
  let size = 64;
  while (ctx.measureText(lines.institution).width > TEX_W * 0.9 && size > 30) {
    size -= 2;
    ctx.font = `600 ${size}px ${CANVAS_FONTS.body}`;
  }
  glow(lines.institution, 880, '#d8e2f5', 10);
  setTracking(ctx, 0);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCard(canvas: HTMLCanvasElement, seal: HTMLImageElement | null, mark: HTMLImageElement | null): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, CARD_TEX_W, CARD_TEX_H);
  ctx.beginPath();
  ctx.roundRect(4, 4, CARD_TEX_W - 8, CARD_TEX_H - 8, 56);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  const pad = 34;
  const h = CARD_TEX_H - pad * 2;
  let x = 70;
  if (seal) {
    const w = (seal.width / seal.height) * h;
    ctx.drawImage(seal, x, pad, w, h);
    x += w + 60;
  }
  if (mark) {
    const mh = h * 0.92;
    const w = (mark.width / mark.height) * mh;
    ctx.drawImage(mark, Math.min(x, CARD_TEX_W - w - 60), pad + (h - mh) / 2, w, mh);
  }
}

/** Builds the display resources and starts the async repaints (fonts, logos). */
function createDisplay(lines: ReturnType<typeof educationLines>) {
  // No "alive" gate on the async repaints below: React StrictMode's dev-time
  // mount → cleanup → mount cycle disposes these memoised resources once and
  // reuses them, so a gate would block the logo/font repaint forever. Drawing
  // into a disposed texture's canvas is harmless (three.js re-uploads lazily).
  const textCanvas = document.createElement('canvas');
  textCanvas.width = TEX_W;
  textCanvas.height = TEX_H;
  const cardCanvas = document.createElement('canvas');
  cardCanvas.width = CARD_TEX_W;
  cardCanvas.height = CARD_TEX_H;
  const make = (c: HTMLCanvasElement) => {
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.minFilter = LinearMipmapLinearFilter;
    t.magFilter = LinearFilter;
    t.anisotropy = 8;
    return t;
  };
  const textTex = make(textCanvas);
  const cardTex = make(cardCanvas);
  if (lines) drawText(textCanvas, lines);
  drawCard(cardCanvas, null, null);
  canvasFontsReady().then(() => {
    if (!lines) return;
    drawText(textCanvas, lines);
    textTex.needsUpdate = true;
  });
  Promise.all([loadImage('/world/pec-seal.png'), loadImage('/world/pec-wordmark.png')]).then(([seal, mark]) => {
    drawCard(cardCanvas, seal, mark);
    cardTex.needsUpdate = true;
  });
  return {
    textTex,
    cardTex,
    textGeo: new PlaneGeometry(PANEL_W, PANEL_H),
    cardGeo: new PlaneGeometry(CARD_W, CARD_H),
    // HDR text so the headline blooms.
    textMat: new MeshBasicMaterial({ map: textTex, transparent: true, toneMapped: false, color: new Color(1.6, 1.6, 1.6), depthWrite: false }),
    // Tone-mapped, modestly lit card: reads at night without blowing out.
    cardMat: new MeshBasicMaterial({ map: cardTex, transparent: true, color: new Color(0.82, 0.82, 0.82) }),
  };
}

export function EducationDisplay() {
  const lines = useMemo(() => educationLines(), []);
  const res = useDisposable(
    () => createDisplay(lines),
    [lines],
    (r) => [r.textTex, r.cardTex, r.textGeo, r.cardGeo, r.textMat, r.cardMat],
  );

  if (!lines) return null;
  const x = LANDMARKS.engineering.maxX + 0.2; // in front of the façade fins
  return (
    <group name="education-display" position={[x, 6.3, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh geometry={res.textGeo} material={res.textMat} renderOrder={5} />
      <mesh geometry={res.cardGeo} material={res.cardMat} position={[0, -0.39, 0.02]} renderOrder={6} />
    </group>
  );
}

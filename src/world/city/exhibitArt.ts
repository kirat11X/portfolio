// Exhibit panel faces: the project's generative cover art composited on a
// canvas with a legibility scrim and its labels (category, title, "view"
// hint, placeholder flag) drawn in the site's own typefaces. One texture —
// and one draw call — per panel, cached per exhibit with reference counting
// and disposed when the last user unmounts.

import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace, type Texture } from 'three';
import { palette } from '@/styles/tokens';
import { artDataUrl } from '@/lib/generativeArt';
import { getCategory } from '@/data/categories';
import type { WorldExhibit } from '../config/exhibits';
import { CANVAS_FONTS, canvasFontsReady, setTracking } from './lib/canvasFonts';
import { safeText } from './lib/text';

interface Entry {
  texture: CanvasTexture;
  refs: number;
}

const cache = new Map<string, Entry>();
export const ART_PX = { w: 1024, h: 640 } as const;
const M = 52; // margin in px

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawLabels(ctx: CanvasRenderingContext2D, exhibit: WorldExhibit, accent: string): void {
  const { w, h } = ART_PX;
  const project = exhibit.project;
  ctx.textBaseline = 'alphabetic';
  // Category, top left.
  ctx.font = `500 26px ${CANVAS_FONTS.mono}`;
  setTracking(ctx, 4);
  ctx.fillStyle = accent;
  ctx.textAlign = 'left';
  ctx.fillText(safeText(getCategory(project.category).label.toUpperCase()), M, M + 18);
  if (project.placeholder) {
    ctx.textAlign = 'right';
    ctx.fillStyle = palette.signal;
    ctx.font = `500 22px ${CANVAS_FONTS.mono}`;
    ctx.fillText('PLACEHOLDER', w - M, M + 16);
  }
  // Title, bottom left, at most two lines.
  setTracking(ctx, 0);
  ctx.textAlign = 'left';
  const title = safeText(project.title);
  const maxWidth = w - 2 * M;
  let size = 70;
  let lines: string[] = [];
  for (; size >= 46; size -= 4) {
    ctx.font = `600 ${size}px ${CANVAS_FONTS.body}`;
    lines = wrap(ctx, title, maxWidth);
    if (lines.length <= 2) break;
  }
  if (lines.length > 2) {
    lines = lines.slice(0, 2);
    let last = lines[1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[1] = `${last.trimEnd()}…`;
  }
  ctx.fillStyle = palette.fg;
  const lineH = size * 1.12;
  const baseY = h - M - 56;
  lines.forEach((line, i) => ctx.fillText(line, M, baseY - (lines.length - 1 - i) * lineH));
  // "View" hint.
  ctx.font = `500 22px ${CANVAS_FONTS.mono}`;
  setTracking(ctx, 5);
  ctx.fillStyle = 'rgba(242,244,248,0.78)';
  ctx.fillText('VIEW PROJECT  ›', M, h - M + 4);
  setTracking(ctx, 0);
}

function compose(texture: CanvasTexture, exhibit: WorldExhibit, accent: string, img: HTMLImageElement | null): void {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { w, h } = ART_PX;
  ctx.fillStyle = palette.ink900;
  ctx.fillRect(0, 0, w, h);
  if (img) {
    try {
      ctx.drawImage(img, 0, 0, w, h);
      ctx.getImageData(0, 0, 1, 1); // throws if drawing the SVG tainted the canvas
    } catch {
      // Tainted (very old engines): start over without the artwork.
      const fresh = document.createElement('canvas');
      fresh.width = w;
      fresh.height = h;
      texture.image = fresh;
      compose(texture, exhibit, accent, null);
      return;
    }
  }
  const bottom = ctx.createLinearGradient(0, h * 0.38, 0, h);
  bottom.addColorStop(0, 'rgba(4,5,10,0)');
  bottom.addColorStop(0.5, 'rgba(4,5,10,0.74)');
  bottom.addColorStop(1, 'rgba(4,5,10,0.94)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, w, h);
  const top = ctx.createLinearGradient(0, 0, 0, h * 0.24);
  top.addColorStop(0, 'rgba(4,5,10,0.72)');
  top.addColorStop(1, 'rgba(4,5,10,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, h);
  drawLabels(ctx, exhibit, accent);
  texture.needsUpdate = true;
}

export function acquireExhibitFace(exhibit: WorldExhibit, accent: string): Texture {
  let entry = cache.get(exhibit.id);
  if (!entry) {
    const canvas = document.createElement('canvas');
    canvas.width = ART_PX.w;
    canvas.height = ART_PX.h;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    texture.anisotropy = 4;
    const created: Entry = { texture, refs: 0 };
    entry = created;
    cache.set(exhibit.id, created);
    compose(texture, exhibit, accent, null);
    const img = new Image();
    img.decoding = 'async';
    const loaded = new Promise<HTMLImageElement | null>((resolve) => {
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
    img.src = artDataUrl({ seed: exhibit.project.slug, category: exhibit.project.category });
    Promise.all([loaded, canvasFontsReady()]).then(([image]) => {
      if (cache.get(exhibit.id) === created) compose(texture, exhibit, accent, image);
    });
  }
  entry.refs++;
  return entry.texture;
}

export function releaseExhibitFace(id: string): void {
  const entry = cache.get(id);
  if (!entry) return;
  entry.refs--;
  if (entry.refs <= 0) {
    entry.texture.dispose();
    cache.delete(id);
  }
}

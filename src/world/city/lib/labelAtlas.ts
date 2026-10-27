// A small canvas atlas of white labels (one per row) drawn in Unbounded, used
// for the signpost blades so all of them render in a single draw call.
// Vertex colours tint each quad with its district accent (HDR → bloom).

import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, type Texture } from 'three';
import { CANVAS_FONTS, canvasFontsReady, setTracking } from './canvasFonts';

export const ATLAS = { width: 1024, rowHeight: 128 } as const;

export const ATLAS_LABELS = ['ENGINEERING', 'CREATIVE', 'ABOUT', 'GAMING'] as const;
export type AtlasLabel = (typeof ATLAS_LABELS)[number];

/** UV rectangle [u0, v0, u1, v1] for a label row (texture flipY = true). */
export function atlasRow(label: AtlasLabel): [number, number, number, number] {
  const i = ATLAS_LABELS.indexOf(label);
  const n = ATLAS_LABELS.length;
  return [0, 1 - (i + 1) / n, 1, 1 - i / n];
}

function draw(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ATLAS_LABELS.forEach((label, i) => {
    let size = 100;
    ctx.font = `600 ${size}px ${CANVAS_FONTS.display}`;
    setTracking(ctx, 6);
    while (ctx.measureText(label).width > ATLAS.width * 0.9 && size > 30) {
      size -= 2;
      ctx.font = `600 ${size}px ${CANVAS_FONTS.display}`;
    }
    ctx.fillText(label, ATLAS.width / 2, i * ATLAS.rowHeight + ATLAS.rowHeight / 2 + 4);
  });
}

export function createLabelAtlas(): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS.width;
  canvas.height = ATLAS.rowHeight * ATLAS_LABELS.length;
  draw(canvas);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  canvasFontsReady().then(() => {
    draw(canvas);
    texture.needsUpdate = true;
  });
  return texture;
}

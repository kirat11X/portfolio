// Small procedural textures for ground decals (blob shadow, underglow,
// headlight beam). Generated on a 2D canvas once per world instance.

import { CanvasTexture, LinearFilter, SRGBColorSpace, type Texture } from 'three';

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** White radial falloff on transparent, tinted by the material colour. */
export function createRadialTexture(size = 128): Texture {
  return canvasTexture(size, size, (ctx) => {
    const half = size / 2;
    const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.62)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.18)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  });
}

/**
 * Headlight pool: a soft trapezoid that is brightest at the bottom edge (the
 * nose of the car) and fades with distance and toward the sides.
 */
export function createBeamTexture(width = 128, height = 256): Texture {
  return canvasTexture(width, height, (ctx) => {
    const image = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      const along = 1 - y / (height - 1); // 0 at the far end (top), 1 at the car
      const spread = 0.28 + 0.72 * (1 - along); // narrow near the car, wide far away
      const fade = Math.pow(along, 1.35) * Math.min(1, (1 - along) * 9 + 0.15);
      for (let x = 0; x < width; x++) {
        const u = Math.abs(x / (width - 1) - 0.5) * 2; // 0 centre … 1 edge
        const side = Math.max(0, 1 - Math.pow(u / spread, 2.2));
        const alpha = Math.max(0, Math.min(1, fade * side));
        const i = (y * width + x) * 4;
        image.data[i] = 255;
        image.data[i + 1] = 255;
        image.data[i + 2] = 255;
        image.data[i + 3] = Math.round(alpha * 255);
      }
    }
    ctx.putImageData(image, 0, 0);
  });
}

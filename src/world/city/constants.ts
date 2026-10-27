// Shared numbers and colours for the city art. Everything is derived from the
// lead's layout (src/world/config/layout.ts) and design tokens; this file only
// adds the art-specific constants (layer heights, facade grid, materials).

import { Vector3 } from 'three';
import { neon, palette } from '@/styles/tokens';
import type { DistrictId } from '../config/layout';

/** Width of one facade bay and height of one storey, in world units. */
export const BAY_W = 1.1;
export const FLOOR_H = 0.9;
/** Window cells in the shared window texture. */
export const WIN_COLS = 16;
export const WIN_ROWS = 32;

/**
 * Ground layers. Generous gaps (plus polygon offset on the upper layers) keep
 * the stack free of z-fighting even from the far overview camera.
 */
export const Y = {
  ground: 0,
  avenue: 0.012,
  plaza: 0.026,
  marking: 0.04,
  inlay: 0.046,
  pad: 0.052,
  decal: 0.06,
  sidewalk: 0.12,
} as const;

/** Thickness of the island slab below y = 0. */
export const ISLAND_DEPTH = 1.5;

export const ACCENT: Record<DistrictId, string> = {
  hub: neon.white,
  engineering: neon.cyan,
  creative: neon.violet,
  about: neon.blue,
  gaming: neon.orange,
};

export const COLORS = {
  void: palette.void,
  fog: '#070915',
  ground: '#191e2e',
  sidewalk: '#222839',
  curb: '#353c55',
  asphalt: '#0e111a',
  marking: '#1b1f2c',
  facades: ['#121626', '#141829', '#161a2c', '#111423', '#181c2f', '#13172a'],
  roof: '#1a1e2f',
  parapet: '#232839',
  clutter: '#2a2f42',
  metal: '#161a27',
  darkMetal: '#0c0e16',
  obsidian: '#06070c',
  glass: '#0a1322',
  islandSide: '#161b2b',
  islandBottom: '#05060a',
  tree: '#0f2629',
} as const;

export type DistrictAccent = keyof typeof ACCENT;

/** Direction toward the moon (sky glow and the moonlight both use it). */
export const MOON_DIR = new Vector3(-0.42, 0.34, -0.84).normalize();

/** Complementary accents layered over each district's lead colour. */
export const EXTRA = {
  coral: '#ff7a6b',
  teal: '#2de2c8',
  amber: neon.amber,
  magenta: neon.magenta,
} as const;

export const SECONDARY: Record<DistrictId, string[]> = {
  hub: [neon.cyan, EXTRA.amber],
  engineering: [EXTRA.teal, EXTRA.amber],
  creative: [EXTRA.magenta, EXTRA.coral, EXTRA.amber],
  about: [EXTRA.amber, neon.violet],
  gaming: [EXTRA.magenta, EXTRA.amber],
};

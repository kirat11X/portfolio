// Deterministic, static vector geometry for the loader backdrop: a distant
// skyline silhouette on the horizon and a perspective street grid below it.
// Computed once at module load; rendered as inline SVG (no WebGL, no images).

function mulberry32(seed: number) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

export interface Skyline {
  width: number;
  height: number;
  /** Building silhouettes (union of rectangles). */
  body: string;
  /** A few lit windows, cyan. */
  windows: string;
  /** A few lit windows, violet. */
  windowsAlt: string;
}

/**
 * Low in the middle (the sign sits there), taller toward both sides, with the
 * odd setback and antenna. Windows are sparse on purpose: it should read as a
 * far-off district at night, not a pattern.
 */
export function buildSkyline(width = 1600, height = 120, seed = 23): Skyline {
  const rand = mulberry32(seed);
  const body: string[] = [];
  const windows: string[] = [];
  const windowsAlt: string[] = [];
  let x = -8;

  while (x < width + 8) {
    const w = 14 + Math.floor(rand() * 40);
    const fromCentre = Math.abs((x + w / 2) / width - 0.5) * 2;
    const envelope = 0.16 + 0.84 * smoothstep(0.12, 0.8, fromCentre);
    const h = Math.max(6, Math.round(height * envelope * (0.42 + rand() * 0.58)));
    const top = height - h;
    body.push(`M${x} ${height}V${top}h${w}V${height}Z`);

    if (h > height * 0.38 && rand() < 0.38) {
      const sw = Math.max(5, Math.round(w * (0.35 + rand() * 0.35)));
      const sh = Math.round(h * (0.08 + rand() * 0.16));
      const sx = x + Math.round((w - sw) * rand());
      body.push(`M${sx} ${top}v${-sh}h${sw}v${sh}Z`);
    }
    if (h > height * 0.5 && rand() < 0.3) {
      const ax = x + Math.round(w * (0.25 + rand() * 0.5));
      const ah = Math.round(8 + rand() * 16);
      body.push(`M${ax} ${top}v${-ah}h1.6v${ah}Z`);
    }
    if (h > 20) {
      for (let wy = top + 5; wy < height - 5; wy += 7) {
        for (let wx = x + 3; wx < x + w - 4; wx += 5) {
          const roll = rand();
          if (roll < 0.035) windows.push(`M${wx} ${wy}h2v2.6h-2Z`);
          else if (roll < 0.045) windowsAlt.push(`M${wx} ${wy}h2v2.6h-2Z`);
        }
      }
    }
    x += w + (rand() < 0.28 ? 1 + Math.floor(rand() * 5) : 0);
  }

  return { width, height, body: body.join(''), windows: windows.join(''), windowsAlt: windowsAlt.join('') };
}

export interface FloorGrid {
  width: number;
  height: number;
  /** Cross streets: geometric spacing toward the vanishing point. */
  rows: string;
  /** Avenues: lines through the vanishing point at the top centre. */
  spokes: string;
  /** Scale that maps every row onto the previous one (loop period of the drift). */
  period: number;
}

/**
 * Rows are spaced geometrically (y = h · r^i) so scaling the whole grid by 1/r
 * about the vanishing point maps it exactly onto itself. Spokes pass through
 * the vanishing point, so they are invariant under that scale. Together that
 * makes a seamless "rolling forward" loop from one compositor-only transform.
 */
export function buildFloorGrid(width = 1000, height = 400, ratio = 0.8, spokeGap = 64): FloorGrid {
  const cx = width / 2;
  const rows: string[] = [];
  for (let y = height; y > 1.2; y *= ratio) rows.push(`M${-width * 3} ${y.toFixed(2)}H${width * 4}`);

  const spokes: string[] = [];
  const reach = 24;
  for (let j = -reach; j <= reach; j++) {
    const bx = cx + j * spokeGap;
    // Extend well past the bottom edge so the lines stay long while the grid scales up.
    spokes.push(`M${cx} 0L${(cx + (bx - cx) * 3).toFixed(1)} ${height * 3}`);
  }
  return { width, height, rows: rows.join(''), spokes: spokes.join(''), period: 1 / ratio };
}

export const SKYLINE = buildSkyline();
export const FLOOR = buildFloorGrid();

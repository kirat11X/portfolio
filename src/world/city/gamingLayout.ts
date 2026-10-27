// Placement of the Gaming Zone, arena, time-trial and border-strip props.
// Pure data (no three.js) so config/decorColliders.ts registers exactly the
// positions the art renders. Everything derives from config/layout.ts.

import { ARENA, ISLAND, RACE, gateEnds, insideIsland, islandOutline, type RaceGate } from '../config/layout';

export interface Footprint {
  id: string;
  x: number;
  z: number;
  r: number;
}

/** Every gate of the lap in order: the checkpoints, then the finish. Index = gate number − 1. */
export const RACE_GATES: RaceGate[] = [...RACE.checkpoints, RACE.finish];

/** Gate posts stand just beyond the gate line's ends so the line itself stays clear. */
export const GATE_POST = { r: 0.26, gap: 0.12, height: 4.3 } as const;
export const FINISH_PYLON = { r: 0.42, gap: 0.12, height: 8.2 } as const;

export interface GatePost {
  id: string;
  gate: number;
  x: number;
  z: number;
  r: number;
  /** Unit vector along the gate line, pointing away from the gate centre. */
  out: [number, number];
}

export const GATE_POSTS: GatePost[] = RACE_GATES.flatMap((gate, gi) => {
  const finish = gate.id === RACE.finish.id;
  const spec = finish ? FINISH_PYLON : GATE_POST;
  const ends = gateEnds(gate);
  return ends.map(([ex, ez], k) => {
    const dx = ex - gate.x;
    const dz = ez - gate.z;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len;
    const uz = dz / len;
    const off = spec.r + spec.gap;
    return { id: `gate-${gi}-${k}`, gate: gi, x: ex + ux * off, z: ez + uz * off, r: spec.r, out: [ux, uz] as [number, number] };
  });
});

/** Start gantry over the start spot (posts either side, the car passes under the beam). */
export const START_GANTRY = { z: RACE.start.z + 1.5, xs: [RACE.start.x - 3.0, RACE.start.x + 3.0], r: 0.24, height: 4.9 } as const;
export const START_GANTRY_POSTS: Footprint[] = START_GANTRY.xs.map((x, i) => ({ id: `start-gantry-${i}`, x, z: START_GANTRY.z, r: START_GANTRY.r }));

// ---------------------------------------------------------------- arena surroundings

const { pitch } = ARENA;
const WALL_OUT = ARENA.wallThickness;

/** Floodlight towers off the arena corners, clear of the access roads and the SW/SE race gates. */
export const FLOODLIGHTS: Footprint[] = [
  { id: 'flood-nw', x: pitch.minX - 4.5, z: pitch.minZ + 1.5, r: 0.7 },
  { id: 'flood-ne', x: pitch.maxX + 4.5, z: pitch.minZ + 1.5, r: 0.7 },
  { id: 'flood-sw', x: pitch.minX - 4.5, z: pitch.maxZ - 1.5, r: 0.7 },
  { id: 'flood-se', x: pitch.maxX + 4.5, z: pitch.maxZ - 1.5, r: 0.7 },
];

/** Stepped spectator stands along both long sides, outside the walls. */
export const BLEACHERS = (() => {
  const z0 = pitch.minZ + 5;
  const z1 = pitch.maxZ - 5;
  const depth = 4;
  const gap = 1.4; // from the wall's outer face
  return ([-1, 1] as const).map((side) => {
    const inner = side < 0 ? pitch.minX - WALL_OUT - gap : pitch.maxX + WALL_OUT + gap;
    const outer = inner + side * depth;
    return { side, x0: Math.min(inner, outer), x1: Math.max(inner, outer), z0, z1, inner, rows: 4, height: 2.3 };
  });
})();

/** Circle colliders covering each stand (spacing 2, radius 2.3 seals the box). */
export const BLEACHER_COLLIDERS: Footprint[] = BLEACHERS.flatMap((b) => {
  const out: Footprint[] = [];
  const cx = (b.x0 + b.x1) / 2;
  for (let z = b.z0 + 1, i = 0; z <= b.z1 - 1 + 1e-6; z += 2, i++) out.push({ id: `stand-${b.side < 0 ? 'w' : 'e'}-${i}`, x: cx, z, r: 2.3 });
  return out;
});

/** Stadium scoreboard behind the south goal, facing north over the pitch. */
export const SCOREBOARD = {
  x: 0,
  z: 79.0,
  width: 11,
  height: 4.4,
  /** Bottom edge of the board. */
  bottom: 3.6,
  legs: [-4.2, 4.2],
  legR: 0.32,
} as const;

/**
 * World positions for live score digits on the scoreboard: the centre of each
 * team's digit window on the board face. The board faces north (−Z), so text
 * placed here needs rotationY = π. Cyan (home) is on the viewer's left, which
 * is world +X for someone looking south at the board.
 */
export const SCOREBOARD_ANCHOR = {
  home: [SCOREBOARD.x + 0.28 * SCOREBOARD.width, SCOREBOARD.bottom + (1 - 0.685) * SCOREBOARD.height, SCOREBOARD.z - 0.3] as [number, number, number],
  away: [SCOREBOARD.x - 0.28 * SCOREBOARD.width, SCOREBOARD.bottom + (1 - 0.685) * SCOREBOARD.height, SCOREBOARD.z - 0.3] as [number, number, number],
  rotationY: Math.PI,
  digitSize: 1.75,
} as const;

/** Trees flanking the stands and the scoreboard. */
export const ARENA_TREES: Footprint[] = (() => {
  const out: Footprint[] = [];
  for (const side of [-1, 1]) {
    const x = side * (pitch.maxX + WALL_OUT + 9.2);
    for (let z = pitch.minZ + 4, i = 0; z <= pitch.maxZ - 4; z += 4.5, i++) out.push({ id: `atree-${side < 0 ? 'w' : 'e'}-${i}`, x, z, r: 0.42 });
  }
  return out;
})();

/** Street lamps between the stands and the tree rows, arms reaching toward the arena. */
export const ARENA_LAMPS: Array<Footprint & { armAngle: number }> = (() => {
  const out: Array<Footprint & { armAngle: number }> = [];
  for (const side of [-1, 1]) {
    const x = side * (pitch.maxX + WALL_OUT + 7.1);
    for (let z = pitch.minZ + 4.5, i = 0; z <= pitch.maxZ - 4; z += 6.5, i++) {
      out.push({ id: `alamp-${side < 0 ? 'w' : 'e'}-${i}`, x, z, r: 0.3, armAngle: side < 0 ? 0 : Math.PI });
    }
  }
  return out;
})();

/** Painted parking bays outside the tree rows (flat paint, no colliders). */
export const PARKING = ([-1, 1] as const).map((side) => ({
  side,
  x0: side < 0 ? -42 : 31,
  x1: side < 0 ? -31 : 42,
  z0: pitch.minZ + 3,
  z1: pitch.maxZ - 3,
}));

// ---------------------------------------------------------------- border strip

export type BorderKind = 'tree' | 'lamp' | 'billboard';

export interface BorderProp extends Footprint {
  kind: BorderKind;
  /** Inward normal (toward the island interior). */
  nx: number;
  nz: number;
  index: number;
}

const BORDER_INSET = 1.15;

function clearOfRace(x: number, z: number, pad: number): boolean {
  if (Math.hypot(x - RACE.start.x, z - RACE.start.z) < 4 + pad) return false;
  for (const post of GATE_POSTS) if (Math.hypot(x - post.x, z - post.z) < 3.2 + pad) return false;
  return true;
}

function clearOfArena(x: number, z: number): boolean {
  return !(x > pitch.minX - 12 && x < pitch.maxX + 12 && z > pitch.minZ - 3);
}

/** Lamps, trees and billboards along the island's outer edge. */
export const BORDER_PROPS: BorderProp[] = (() => {
  const ring = islandOutline(-BORDER_INSET, 6);
  // Resample the outline at even spacing.
  const pts: Array<[number, number, number, number]> = [];
  const spacing = 7.5;
  let carry = spacing / 2;
  for (let i = 0; i < ring.length; i++) {
    const [x0, z0] = ring[i];
    const [x1, z1] = ring[(i + 1) % ring.length];
    const seg = Math.hypot(x1 - x0, z1 - z0);
    if (seg < 1e-6) continue;
    let t = carry;
    while (t <= seg) {
      const k = t / seg;
      // Outline runs counter-clockwise seen from +Y with angle from +X toward +Z; inward normal = (dz, −dx) / seg.
      pts.push([x0 + (x1 - x0) * k, z0 + (z1 - z0) * k, (z1 - z0) / seg, -(x1 - x0) / seg]);
      t += spacing;
    }
    carry = t - seg;
  }
  const kinds: BorderKind[] = ['tree', 'lamp', 'tree', 'billboard', 'tree', 'lamp'];
  const out: BorderProp[] = [];
  let n = 0;
  pts.forEach(([x, z, nx, nz], i) => {
    // Inward normal sign check: step inward must stay on the island.
    const s = insideIsland(x + nx * 2, z + nz * 2) ? 1 : -1;
    const kind = kinds[i % kinds.length];
    const r = kind === 'tree' ? 0.42 : kind === 'lamp' ? 0.3 : 0.25;
    const reach = kind === 'billboard' ? 2.2 : 0;
    if (!clearOfRace(x, z, reach) || !clearOfArena(x, z)) return;
    if (!insideIsland(x, z, BORDER_INSET - 0.2)) return;
    out.push({ id: `border-${kind}-${n++}`, kind, x, z, r, nx: nx * s, nz: nz * s, index: i });
  });
  return out;
})();

/** Billboards are carried on two posts (colliders) spread along the island edge. */
export const BILLBOARD_SPAN = 3.6;
export function billboardPosts(p: BorderProp): Array<[number, number]> {
  const tx = -p.nz;
  const tz = p.nx;
  const h = BILLBOARD_SPAN / 2 - 0.2;
  return [
    [p.x - tx * h, p.z - tz * h],
    [p.x + tx * h, p.z + tz * h],
  ];
}

/** Every new prop collider (registered in config/decorColliders.ts). */
export const GAMING_DECOR: Footprint[] = [
  ...GATE_POSTS.map((p) => ({ id: p.id, x: p.x, z: p.z, r: p.r })),
  ...START_GANTRY_POSTS,
  ...FLOODLIGHTS,
  ...BLEACHER_COLLIDERS,
  ...SCOREBOARD.legs.map((dx, i) => ({ id: `scoreboard-leg-${i}`, x: SCOREBOARD.x + dx, z: SCOREBOARD.z, r: SCOREBOARD.legR })),
  ...ARENA_TREES,
  ...ARENA_LAMPS.map(({ id, x, z, r }) => ({ id, x, z, r })),
  ...BORDER_PROPS.flatMap((p) =>
    p.kind === 'billboard' ? billboardPosts(p).map(([x, z], k) => ({ id: `${p.id}-post${k}`, x, z, r: p.r })) : [{ id: p.id, x: p.x, z: p.z, r: p.r }],
  ),
];

/** Island drive margin (re-exported for the bake step). */
export const DRIVE_MARGIN = ISLAND.driveMargin;

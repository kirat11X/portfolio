// The world's shared map. Both the city-art code (what things look like) and the
// gameplay code (collisions, zones, travel) read from here, so visuals and
// physics always agree. Owned by the lead architect; request changes rather
// than editing.
//
// Conventions
// - Y is up, the ground is y = 0, one unit ≈ one metre.
// - North is -Z, south is +Z, east is +X, west is -X.
// - `heading` is a rotation about +Y in radians, exactly three.js `rotation.y`.
//   A model whose front faces -Z at rest is facing north at heading 0.
//   Forward vector: (-sin(heading), 0, -cos(heading)). East = -π/2, west = +π/2,
//   south = π.
// - `rotationY` on panels and doors orients a surface whose visible face is
//   local +Z (PlaneGeometry's default normal) toward the plaza it serves.

import { neon } from '@/styles/tokens';
import { paths } from '@/lib/routes';

export type DistrictId = 'hub' | 'engineering' | 'creative' | 'about' | 'gaming';
export type ExhibitDistrict = 'engineering' | 'creative';

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Spawn {
  x: number;
  z: number;
  heading: number;
}

export interface DistrictDef {
  id: DistrictId;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
  center: [x: number, z: number];
  /** Radius of the zone used to decide which district the vehicle is in. */
  zoneRadius: number;
  /** Where quick travel places the vehicle. Faces the district. */
  spawn: Spawn;
  /** Gallery or page this district leads to. */
  route: string | null;
}

/**
 * The island is a rounded rectangle. The original city sits in the square
 * x, z ∈ [−33, 33]; a 7-unit border strip runs all the way round it (the
 * time-trial route), and the island extends south past the Gaming Zone to hold
 * the car-soccer arena. Never assume the island is symmetric about z = 0: use
 * these bounds, `ISLAND_CENTER` / `ISLAND_SIZE` and the helpers below.
 */
export const ISLAND = {
  minX: -46,
  maxX: 46,
  minZ: -46,
  maxZ: 80,
  cornerRadius: 12,
  /** Keep the vehicle this far inside the edge. */
  driveMargin: 1.4,
} as const;

/** Centre of the island's bounding rectangle (not the hub: the hub stays at 0, 0). */
export const ISLAND_CENTER = { x: (ISLAND.minX + ISLAND.maxX) / 2, z: (ISLAND.minZ + ISLAND.maxZ) / 2 } as const;
/** Width (x) and depth (z) of the island's bounding rectangle. */
export const ISLAND_SIZE = { x: ISLAND.maxX - ISLAND.minX, z: ISLAND.maxZ - ISLAND.minZ } as const;
/** Distance from ISLAND_CENTER to the farthest point of the island (for cameras, fog and the skyline ring). */
export const ISLAND_RADIUS = Math.hypot(ISLAND_SIZE.x / 2, ISLAND_SIZE.z / 2);

export const DISTRICTS: Record<DistrictId, DistrictDef> = {
  hub: {
    id: 'hub',
    label: 'Central Plaza',
    shortLabel: 'Hub',
    description: 'The starting point. Every district is one road away.',
    accent: neon.white,
    center: [0, 0],
    zoneRadius: 11,
    spawn: { x: 0, z: 9, heading: 0 },
    route: null,
  },
  engineering: {
    id: 'engineering',
    label: 'Engineering Lab',
    shortLabel: 'Engineering',
    description: 'Software, machine learning, computer vision and research.',
    accent: neon.cyan,
    center: [-24, 0],
    zoneRadius: 12,
    spawn: { x: -13, z: 0, heading: Math.PI / 2 },
    route: paths.engineering,
  },
  creative: {
    id: 'creative',
    label: 'Creative Studio',
    shortLabel: 'Creative',
    description: 'Photography, editing, video, motion and design.',
    accent: neon.violet,
    center: [24, 0],
    zoneRadius: 12,
    spawn: { x: 13, z: 0, heading: -Math.PI / 2 },
    route: paths.creative,
  },
  about: {
    id: 'about',
    label: 'The Archive',
    shortLabel: 'About',
    description: 'Background, skills, résumé and ways to get in touch.',
    accent: neon.blue,
    center: [0, -24],
    zoneRadius: 12,
    spawn: { x: 0, z: -13, heading: 0 },
    route: paths.about,
  },
  gaming: {
    id: 'gaming',
    label: 'Gaming Zone',
    shortLabel: 'Gaming',
    description: 'Arcade cabinets, a gaming rig, car soccer and a time trial round the island.',
    accent: neon.orange,
    center: [0, 24],
    zoneRadius: 12,
    spawn: { x: 0, z: 13, heading: Math.PI },
    route: null,
  },
};

export const DISTRICT_ORDER: DistrictId[] = ['hub', 'engineering', 'creative', 'about', 'gaming'];

/** Paved roads. The two avenues cross at the hub and end at the landmark buildings. */
export const AVENUES: Rect[] = [
  { minX: -4, maxX: 4, minZ: -33, maxZ: 33 },
  { minX: -33, maxX: 33, minZ: -4, maxZ: 4 },
];

/** Circular plazas. The hub sits on the avenue crossing; districts sit at the avenue ends. */
export const PLAZAS: Array<{ id: DistrictId; x: number; z: number; r: number }> = [
  { id: 'hub', x: 0, z: 0, r: 10 },
  { id: 'engineering', x: -24, z: 0, r: 9 },
  { id: 'creative', x: 24, z: 0, r: 9 },
  { id: 'about', x: 0, z: -24, r: 9 },
  { id: 'gaming', x: 0, z: 24, r: 9 },
];

/**
 * Landmark buildings closing each avenue. Their plaza-facing side is the
 * "front" where the portal doors are. The Archive (about) is widened to carry
 * three doors; the Gaming Zone's arcade hall has no door (its games are in the
 * plaza in front of it, see GAMING_SPOTS).
 */
export const LANDMARKS: Record<Exclude<DistrictId, 'hub'>, Rect & { front: 'east' | 'west' | 'north' | 'south' }> = {
  engineering: { minX: -39, maxX: -33, minZ: -6, maxZ: 6, front: 'east' },
  creative: { minX: 33, maxX: 39, minZ: -6, maxZ: 6, front: 'west' },
  about: { minX: -9, maxX: 9, minZ: -39, maxZ: -33, front: 'south' },
  gaming: { minX: -6, maxX: 6, minZ: 33, maxZ: 39, front: 'north' },
};

/**
 * Footprints for ordinary city buildings (7 × 7 lots with 3-unit alleys).
 * Buildings must stay inside their lot: the whole lot is a collider.
 */
export const BUILDING_LOTS: Array<Rect & { id: string }> = (() => {
  const local: Rect[] = [
    { minX: 8, maxX: 15, minZ: 8, maxZ: 15 },
    { minX: 18, maxX: 25, minZ: 18, maxZ: 25 },
    { minX: 28, maxX: 35, minZ: 18, maxZ: 25 },
    { minX: 18, maxX: 25, minZ: 28, maxZ: 35 },
    { minX: 28, maxX: 35, minZ: 28, maxZ: 35 },
  ];
  const lots: Array<Rect & { id: string }> = [];
  for (const [sx, sz, name] of [
    [1, 1, 'se'],
    [-1, 1, 'sw'],
    [1, -1, 'ne'],
    [-1, -1, 'nw'],
  ] as const) {
    local.forEach((lot, i) => {
      const xs = [lot.minX * sx, lot.maxX * sx];
      const zs = [lot.minZ * sz, lot.maxZ * sz];
      lots.push({
        id: `${name}-${i}`,
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minZ: Math.min(...zs),
        maxZ: Math.max(...zs),
      });
    });
  }
  return lots;
})();

/** Interactive doors on landmark fronts. Clicking or pressing E in the trigger opens the route. */
export interface PortalDef {
  id: string;
  district: Exclude<DistrictId, 'hub' | 'gaming'>;
  label: string;
  route: string;
  /** Door centre on the building face (y = 0). */
  x: number;
  z: number;
  rotationY: number;
  /** Drive into this circle to focus the portal. */
  trigger: { x: number; z: number; radius: number };
}

export const PORTALS: PortalDef[] = [
  {
    id: 'portal:engineering',
    district: 'engineering',
    label: 'Engineering gallery',
    route: paths.engineering,
    x: -33,
    z: 0,
    rotationY: Math.PI / 2,
    trigger: { x: -30.6, z: 0, radius: 2 },
  },
  {
    id: 'portal:creative',
    district: 'creative',
    label: 'Creative gallery',
    route: paths.creative,
    x: 33,
    z: 0,
    rotationY: -Math.PI / 2,
    trigger: { x: 30.6, z: 0, radius: 2 },
  },
  {
    id: 'portal:about',
    district: 'about',
    label: 'About',
    route: paths.about,
    x: -5,
    z: -33,
    rotationY: 0,
    trigger: { x: -5, z: -30.6, radius: 1.8 },
  },
  {
    id: 'portal:resume',
    district: 'about',
    label: 'Resume',
    route: paths.resume,
    x: 0,
    z: -33,
    rotationY: 0,
    trigger: { x: 0, z: -30.6, radius: 1.8 },
  },
  {
    id: 'portal:contact',
    district: 'about',
    label: 'Contact',
    route: paths.contact,
    x: 5,
    z: -33,
    rotationY: 0,
    trigger: { x: 5, z: -30.6, radius: 1.8 },
  },
];

/** Fixed props in the hub, registered here because they collide. */
export const HUB_PROPS = {
  /** Central monolith carrying the name sign. */
  monolith: { x: 0, z: 0, r: 1.8 },
  /** Direction signposts on the four corners of the crossing. */
  signposts: [
    { x: -5.2, z: -5.2, r: 0.45 },
    { x: 5.2, z: -5.2, r: 0.45 },
    { x: -5.2, z: 5.2, r: 0.45 },
    { x: 5.2, z: 5.2, r: 0.45 },
  ],
} as const;

export interface ExhibitSlot {
  x: number;
  z: number;
  /** Turns the panel's front (+Z) toward the plaza centre. */
  rotationY: number;
  /** Stop on this pad to focus the exhibit. */
  pad: { x: number; z: number; radius: number };
}

function slotsAround(cx: number, cz: number, anglesDeg: number[]): ExhibitSlot[] {
  // 7.5 units out at 40° spacing keeps neighbouring pads from overlapping and
  // leaves a gap between pedestals wide enough for the vehicle to pass.
  const radius = 7.5;
  return anglesDeg.map((deg) => {
    const a = (deg * Math.PI) / 180;
    const x = cx + radius * Math.cos(a);
    const z = cz + radius * Math.sin(a);
    const dx = cx - x;
    const dz = cz - z;
    const len = Math.hypot(dx, dz);
    return {
      x,
      z,
      rotationY: Math.atan2(dx, dz),
      pad: { x: x + (dx / len) * 2.7, z: z + (dz / len) * 2.7, radius: 1.5 },
    };
  });
}

/**
 * Exhibit slots, most prominent first (nearest the hub, alternating north and
 * south of the avenue so the central lane to the portal stays clear).
 * Angles are measured from +X toward +Z around the plaza centre.
 */
export const EXHIBIT_SLOTS: Record<ExhibitDistrict, ExhibitSlot[]> = {
  engineering: slotsAround(-24, 0, [-50, 50, -90, 90, -130, 130]),
  creative: slotsAround(24, 0, [-130, 130, -90, 90, -50, 50]),
};

// ---------------------------------------------------------------------------
// Gaming Zone: interactive props (arcade cabinets, the gaming PC) and the data
// server on the hub roundabout. Each prop is a circle collider; its trigger
// pad sits in front of it (toward the plaza centre) like an exhibit pad.

export type SpotId = 'arcade:tetris' | 'arcade:pacman' | 'arcade:catgpt' | 'pc:rig' | 'server:ram';

export interface InteractiveSpot {
  /** Interactable id (focus / hover / interact all use it). */
  id: SpotId;
  label: string;
  /** Centre of the prop on the ground. */
  x: number;
  z: number;
  /** Turns the prop's front (local +Z: screen, monitor, rack door) toward its pad. */
  rotationY: number;
  /** Collider radius around (x, z). Art must keep the prop's footprint inside it. */
  radius: number;
  /** Stop on this pad to focus the prop. */
  pad: { x: number; z: number; radius: number };
}

/** A prop `ring` units from (cx, cz) at `deg` (from +X toward +Z), facing the centre, pad `padIn` units in front. */
function spotAround(
  id: SpotId,
  label: string,
  cx: number,
  cz: number,
  ring: number,
  deg: number,
  radius: number,
  padIn: number,
  padRadius: number,
): InteractiveSpot {
  const a = (deg * Math.PI) / 180;
  const ux = Math.cos(a);
  const uz = Math.sin(a);
  const x = cx + ux * ring;
  const z = cz + uz * ring;
  return {
    id,
    label,
    x,
    z,
    rotationY: Math.atan2(-ux, -uz),
    radius,
    pad: { x: x - ux * padIn, z: z - uz * padIn, radius: padRadius },
  };
}

const [GX, GZ] = [0, 24];

/**
 * Arcade cabinets on the south arc of the Gaming plaza (in front of the arcade
 * hall, screens facing north into the plaza) and the open-frame gaming PC on
 * its east side, monitor facing west.
 */
export const GAMING_SPOTS: Record<'tetris' | 'pacman' | 'catgpt' | 'pc', InteractiveSpot> = {
  tetris: spotAround('arcade:tetris', 'Tetris', GX, GZ, 7.2, 126, 0.8, 2.5, 1.2),
  pacman: spotAround('arcade:pacman', 'Pac-Man', GX, GZ, 7.2, 90, 0.8, 2.5, 1.2),
  catgpt: spotAround('arcade:catgpt', 'CatGPT', GX, GZ, 7.2, 54, 0.8, 2.5, 1.2),
  pc: spotAround('pc:rig', 'Gaming PC', GX, GZ, 7.2, 0, 1.1, 2.6, 1.2),
};

/**
 * The hub plaza doubles as the roundabout around the tower (monolith). The
 * cookie "give it RAM" data server stands on its east-north-east rim, outside
 * the east avenue mouth and clear of the signpost blades, facing the tower.
 */
export const TOWER_ROUNDABOUT = (() => {
  const server = spotAround('server:ram', 'Data server', 0, 0, 9.4, -28, 0.75, 2.4, 1.2);
  return {
    centre: { x: 0, z: 0 },
    /** Outer edge of the drivable ring (the hub plaza edge). */
    radius: 10,
    /** Island in the middle (the monolith collider). */
    innerRadius: 1.8,
    serverRackSpot: { x: server.x, z: server.z, rotationY: server.rotationY },
    server,
  };
})();

/** Every interactive prop (arcade cabinets, PC, server), for proximity focus and colliders. */
export const INTERACTIVE_SPOTS: InteractiveSpot[] = [...Object.values(GAMING_SPOTS), TOWER_ROUNDABOUT.server];

// ---------------------------------------------------------------------------
// Car-soccer arena, south of the Gaming Zone. The pitch is open ground walled
// on all four sides; goals are boxes behind the short (north/south) walls,
// open toward the pitch. Two access roads run from the Gaming plaza past the
// arcade hall to entrances in the north wall.

export interface ArenaWall extends Rect {
  id: string;
}

export interface GoalDef {
  id: 'north' | 'south';
  /** Centre of the goal mouth (on the pitch boundary). */
  x: number;
  z: number;
  /** Mouth width along x and depth away from the pitch. */
  width: number;
  depth: number;
  /** The volume inside the goal: the ball scores when its centre enters it. */
  area: Rect;
  /** Unit z direction from the mouth into the goal (−1 north goal, +1 south goal). */
  inward: -1 | 1;
}

const PITCH: Rect = { minX: -18, maxX: 18, minZ: 46, maxZ: 74 };
const WALL_T = 0.5;
const GOAL_W = 8;
const GOAL_D = 3;
const ENTRANCES: Array<{ minX: number; maxX: number }> = [
  { minX: -15, maxX: -9 },
  { minX: 9, maxX: 15 },
];

function goal(id: 'north' | 'south'): GoalDef {
  const inward = id === 'north' ? -1 : 1;
  const z = id === 'north' ? PITCH.minZ : PITCH.maxZ;
  const z1 = z + inward * GOAL_D;
  return {
    id,
    x: 0,
    z,
    width: GOAL_W,
    depth: GOAL_D,
    area: { minX: -GOAL_W / 2, maxX: GOAL_W / 2, minZ: Math.min(z, z1), maxZ: Math.max(z, z1) },
    inward,
  };
}

function arenaWalls(): ArenaWall[] {
  const { minX, maxX, minZ, maxZ } = PITCH;
  const t = WALL_T;
  const g = GOAL_W / 2;
  // North wall: corners, goal mouth (−4..4) and two entrances left open.
  const northSpans: Array<[number, number]> = [
    [minX - t, ENTRANCES[0].minX],
    [ENTRANCES[0].maxX, -g],
    [g, ENTRANCES[1].minX],
    [ENTRANCES[1].maxX, maxX + t],
  ];
  const walls: ArenaWall[] = [
    ...northSpans.map(([x0, x1], i) => ({ id: `arena:wall-n${i}`, minX: x0, maxX: x1, minZ: minZ - t, maxZ: minZ })),
    { id: 'arena:wall-s0', minX: minX - t, maxX: -g, minZ: maxZ, maxZ: maxZ + t },
    { id: 'arena:wall-s1', minX: g, maxX: maxX + t, minZ: maxZ, maxZ: maxZ + t },
    { id: 'arena:wall-w', minX: minX - t, maxX: minX, minZ: minZ - t, maxZ: maxZ + t },
    { id: 'arena:wall-e', minX: maxX, maxX: maxX + t, minZ: minZ - t, maxZ: maxZ + t },
  ];
  // Goal boxes: back and two sides; the mouth faces the pitch.
  for (const def of [goal('north'), goal('south')]) {
    const { area } = def;
    const back = def.inward < 0 ? { minZ: area.minZ - t, maxZ: area.minZ } : { minZ: area.maxZ, maxZ: area.maxZ + t };
    walls.push(
      { id: `arena:goal-${def.id}-back`, minX: area.minX - t, maxX: area.maxX + t, ...back },
      { id: `arena:goal-${def.id}-west`, minX: area.minX - t, maxX: area.minX, minZ: area.minZ, maxZ: area.maxZ },
      { id: `arena:goal-${def.id}-east`, minX: area.maxX, maxX: area.maxX + t, minZ: area.minZ, maxZ: area.maxZ },
    );
  }
  return walls;
}

export const ARENA = {
  /** Playing surface inside the walls. */
  pitch: PITCH,
  center: { x: 0, z: (PITCH.minZ + PITCH.maxZ) / 2 },
  /** Wall boxes (pitch walls + goal back/sides). All are static colliders. */
  walls: arenaWalls(),
  wallThickness: WALL_T,
  /** Suggested visual height of the walls (art) — the ball should bounce off them at any height. */
  wallHeight: 1.1,
  goals: { north: goal('north'), south: goal('south') },
  ballSpawn: { x: 0, z: (PITCH.minZ + PITCH.maxZ) / 2 },
  ballRadius: 1.1,
  /** Kick-off spot for the visitor's car: north half, facing the ball (south). */
  carKickoff: { x: 0, z: 52, heading: Math.PI },
  /**
   * Gaps in the north wall the car drives through. Gameplay should stop the
   * ball here (a ball-only barrier) so it cannot roll into the city.
   */
  entrances: ENTRANCES.map((e, i) => ({ id: `arena:entrance-${i}`, minX: e.minX, maxX: e.maxX, z: PITCH.minZ })),
  /** Paved access roads from the Gaming plaza past the arcade hall to the entrances. */
  accessRoads: ENTRANCES.map((e) => ({ minX: e.minX, maxX: e.maxX, minZ: 24, maxZ: PITCH.minZ })) as Rect[],
} as const;

// ---------------------------------------------------------------------------
// Time trial: a lap of the island's outer border strip. Start in the Gaming
// Zone, west along the south of the city, north up the west strip (behind the
// Engineering Lab), east along the north strip (behind the Archive), south down
// the east strip (behind the Creative Studio), back into the Gaming Zone, and
// finish at the hub roundabout.

export interface RaceGate {
  id: string;
  /** Centre of the gate line. */
  x: number;
  z: number;
  /** Length of the gate line; gate posts stand at its two ends. */
  width: number;
  /**
   * Direction of travel through the gate, as a heading (three.js rotation.y):
   * forward = (−sin, −cos). The gate line runs across it, along local X.
   */
  rotationY: number;
}

const N = 0;
const S = Math.PI;
const E = -Math.PI / 2;
const W = Math.PI / 2;

export const RACE: { start: Spawn; checkpoints: RaceGate[]; finish: RaceGate } = {
  start: { x: -9.5, z: 30, heading: S },
  checkpoints: [
    { id: 'gate-sw-south', x: -22, z: 40.5, width: 7, rotationY: W },
    { id: 'gate-west-south', x: -41, z: 30, width: 7, rotationY: N },
    { id: 'gate-west-engineering', x: -41.8, z: 0, width: 4.5, rotationY: N },
    { id: 'gate-nw-corner', x: -39, z: -39, width: 6, rotationY: -Math.PI / 4 },
    { id: 'gate-north-archive', x: 0, z: -41.8, width: 4.5, rotationY: E },
    { id: 'gate-ne-corner', x: 39, z: -39, width: 6, rotationY: (-3 * Math.PI) / 4 },
    { id: 'gate-east-creative', x: 41.8, z: 0, width: 4.5, rotationY: S },
    { id: 'gate-east-south', x: 41, z: 30, width: 7, rotationY: S },
    { id: 'gate-se-south', x: 22, z: 40.5, width: 7, rotationY: W },
    { id: 'gate-gaming-return', x: 12, z: 36, width: 5, rotationY: N },
    { id: 'gate-gaming-exit', x: 0, z: 17, width: 7, rotationY: N },
  ],
  finish: { id: 'finish-hub', x: 0, z: 7, width: 7, rotationY: N },
};

/** The two end points of a gate line. */
export function gateEnds(gate: RaceGate): [[number, number], [number, number]] {
  // Local +X of a heading h is (cos h, 0, −sin h).
  const hx = (Math.cos(gate.rotationY) * gate.width) / 2;
  const hz = (-Math.sin(gate.rotationY) * gate.width) / 2;
  return [
    [gate.x - hx, gate.z - hz],
    [gate.x + hx, gate.z + hz],
  ];
}

// ---------------------------------------------------------------------------
// Helpers

/** True when (x, z) is inside the island shrunk by `margin`. */
export function insideIsland(x: number, z: number, margin = 0): boolean {
  const minX = ISLAND.minX + margin;
  const maxX = ISLAND.maxX - margin;
  const minZ = ISLAND.minZ + margin;
  const maxZ = ISLAND.maxZ - margin;
  if (x < minX || x > maxX || z < minZ || z > maxZ) return false;
  const r = Math.max(0, ISLAND.cornerRadius - margin);
  const ix = Math.max(minX + r, Math.min(maxX - r, x));
  const iz = Math.max(minZ + r, Math.min(maxZ - r, z));
  return Math.hypot(x - ix, z - iz) <= r;
}

/** Closest point inside the island (shrunk by `margin`) to (x, z). */
export function clampToIsland(x: number, z: number, margin = ISLAND.driveMargin): [number, number] {
  const minX = ISLAND.minX + margin;
  const maxX = ISLAND.maxX - margin;
  const minZ = ISLAND.minZ + margin;
  const maxZ = ISLAND.maxZ - margin;
  const r = Math.max(0, ISLAND.cornerRadius - margin);
  let cx = Math.max(minX, Math.min(maxX, x));
  let cz = Math.max(minZ, Math.min(maxZ, z));
  const ix = Math.max(minX + r, Math.min(maxX - r, cx));
  const iz = Math.max(minZ + r, Math.min(maxZ - r, cz));
  const dx = cx - ix;
  const dz = cz - iz;
  const d = Math.hypot(dx, dz);
  if (d > r) {
    cx = ix + (dx / d) * r;
    cz = iz + (dz / d) * r;
  }
  return [cx, cz];
}

/** Perimeter of the island grown by `offset` (negative shrinks), angle increasing from +X toward +Z. */
export function islandOutline(offset = 0, perCorner = 14): Array<[number, number]> {
  const r = Math.max(0, ISLAND.cornerRadius + offset);
  const x0 = ISLAND.minX - offset + r;
  const x1 = ISLAND.maxX + offset - r;
  const z0 = ISLAND.minZ - offset + r;
  const z1 = ISLAND.maxZ + offset - r;
  const corners: Array<[number, number, number]> = [
    [x1, z1, 0],
    [x0, z1, Math.PI / 2],
    [x0, z0, Math.PI],
    [x1, z0, (3 * Math.PI) / 2],
  ];
  const pts: Array<[number, number]> = [];
  for (const [cx, cz, a0] of corners) {
    for (let i = 0; i <= perCorner; i++) {
      const a = a0 + (i / perCorner) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
  }
  return pts;
}

/** District whose zone contains (x, z), or null on the streets between them. */
export function districtAt(x: number, z: number): DistrictId | null {
  for (const id of DISTRICT_ORDER) {
    const d = DISTRICTS[id];
    if (Math.hypot(x - d.center[0], z - d.center[1]) <= d.zoneRadius) return id;
  }
  return null;
}

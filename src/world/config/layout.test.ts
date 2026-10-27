// World layout sanity. The shared map (layout.ts) drives both the city art and
// the gameplay physics, so these invariants keep visuals, collisions and
// interaction triggers in agreement — including whatever DECOR_COLLIDERS the
// city art adds later.
//
// The vehicle's collision circle comes from gameplay's tuning constants, so the
// clearances below always match the physics that ships.

import { describe, expect, it } from 'vitest';
import { paths } from '@/lib/routes';
import { VEHICLE } from '@/world/scene/tuning';
import {
  ARENA,
  AVENUES,
  BUILDING_LOTS,
  DISTRICTS,
  DISTRICT_ORDER,
  EXHIBIT_SLOTS,
  GAMING_SPOTS,
  HUB_PROPS,
  INTERACTIVE_SPOTS,
  ISLAND,
  LANDMARKS,
  PLAZAS,
  PORTALS,
  RACE,
  TOWER_ROUNDABOUT,
  clampToIsland,
  gateEnds,
  islandOutline,
  districtAt,
  insideIsland,
  type DistrictId,
  type ExhibitDistrict,
  type Rect,
} from './layout';
import { EXHIBIT_COLLIDER_RADIUS, getStaticColliders, type Collider } from './colliders';
import { DECOR_COLLIDERS } from './decorColliders';
import { WORLD_EXHIBITS } from './exhibits';

const VEHICLE_RADIUS = VEHICLE.radius;
const EPS = 1e-9;
const colliders = getStaticColliders();
const ROUTES = new Set<string>(Object.values(paths));
const EXHIBIT_DISTRICTS: ExhibitDistrict[] = ['engineering', 'creative'];

// ---------------------------------------------------------------------------
// Geometry

interface Circle {
  x: number;
  z: number;
  r: number;
}

const fmt = (n: number) => n.toFixed(2);
const at = (x: number, z: number) => `(${fmt(x)}, ${fmt(z)})`;

function distToRect(x: number, z: number, rect: Rect): number {
  const dx = Math.max(rect.minX - x, 0, x - rect.maxX);
  const dz = Math.max(rect.minZ - z, 0, z - rect.maxZ);
  return Math.hypot(dx, dz);
}

/** Signed distance from a point to a collider's surface (negative inside). */
function clearance(x: number, z: number, collider: Collider): number {
  if (collider.kind === 'circle') return Math.hypot(x - collider.x, z - collider.z) - collider.r;
  const outside = distToRect(x, z, collider);
  if (outside > 0) return outside;
  return -Math.min(x - collider.minX, collider.maxX - x, z - collider.minZ, collider.maxZ - z);
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.minX < b.maxX - EPS && a.maxX > b.minX + EPS && a.minZ < b.maxZ - EPS && a.maxZ > b.minZ + EPS;
}

function circleOverlapsCollider(circle: Circle, collider: Collider): boolean {
  return clearance(circle.x, circle.z, collider) < circle.r - EPS;
}

function onPavement(x: number, z: number): boolean {
  return (
    [...AVENUES, ...ARENA.accessRoads].some((road) => distToRect(x, z, road) === 0) || PLAZAS.some((p) => Math.hypot(x - p.x, z - p.z) <= p.r)
  );
}

const rectCorners = (rect: Rect): Array<[number, number]> => [
  [rect.minX, rect.minZ],
  [rect.maxX, rect.minZ],
  [rect.minX, rect.maxZ],
  [rect.maxX, rect.maxZ],
];

/** Collisions of a vehicle-sized circle at (x, z), as collider ids. */
function blockers(x: number, z: number, ignore: (collider: Collider) => boolean = () => false): string[] {
  return colliders.filter((c) => !ignore(c) && clearance(x, z, c) < VEHICLE_RADIUS - EPS).map((c) => c.id);
}

/** Every point the vehicle must be able to stand on, with a label. */
interface Target {
  label: string;
  x: number;
  z: number;
  /** The vehicle's centre must get inside this radius (0 = exactly the point). */
  radius: number;
}

const spawnTargets: Target[] = DISTRICT_ORDER.map((id) => ({ label: `spawn:${id}`, ...DISTRICTS[id].spawn, radius: 0 }));
const padTargets: Target[] = EXHIBIT_DISTRICTS.flatMap((district) =>
  EXHIBIT_SLOTS[district].map((slot, i) => ({ label: `pad:${district}[${i}]`, ...slot.pad })),
);
const portalTargets: Target[] = PORTALS.map((portal) => ({ label: `trigger:${portal.id}`, ...portal.trigger }));
const spotTargets: Target[] = INTERACTIVE_SPOTS.map((spot) => ({ label: `pad:${spot.id}`, ...spot.pad }));
const raceGates = [...RACE.checkpoints, RACE.finish];
const raceTargets: Target[] = [
  { label: 'race:start', ...RACE.start, radius: 0 },
  ...raceGates.map((gate) => ({ label: `race:${gate.id}`, x: gate.x, z: gate.z, radius: 0 })),
];
const arenaTargets: Target[] = [
  { label: 'arena:ball', ...ARENA.ballSpawn, radius: 0 },
  { label: 'arena:kickoff', ...ARENA.carKickoff, radius: 0 },
];

// ---------------------------------------------------------------------------

describe('island helpers', () => {
  it('insideIsland follows the rounded rectangle', () => {
    const { minX, maxX, minZ, maxZ, cornerRadius: r } = ISLAND;
    expect(insideIsland(0, 0)).toBe(true);
    expect(insideIsland(maxX - 0.01, 0)).toBe(true);
    expect(insideIsland(minX + 0.01, 0)).toBe(true);
    expect(insideIsland(0, minZ + 0.01)).toBe(true);
    expect(insideIsland(0, maxZ - 0.01)).toBe(true);
    expect(insideIsland(maxX + 0.01, 0)).toBe(false);
    expect(insideIsland(0, maxZ + 0.01)).toBe(false);
    expect(insideIsland(0, minZ - 0.01)).toBe(false);
    // Corners are cut by the rounding, on every corner (the island is not symmetric about z = 0).
    for (const [cx, cz, sx, sz] of [
      [maxX, maxZ, -1, -1],
      [minX, maxZ, 1, -1],
      [minX, minZ, 1, 1],
      [maxX, minZ, -1, 1],
    ]) {
      expect(insideIsland(cx + sx * 0.1, cz + sz * 0.1), `corner ${at(cx, cz)}`).toBe(false);
      const d = r - r * Math.SQRT1_2 + 0.01;
      expect(insideIsland(cx + sx * d, cz + sz * d), `rounded corner ${at(cx, cz)}`).toBe(true);
    }
    expect(insideIsland(maxX - 2, 0, 3)).toBe(false);
    expect(insideIsland(0, maxZ - 2, 3)).toBe(false);
  });

  it('islandOutline points lie on the island edge', () => {
    for (const [x, z] of islandOutline(0)) {
      expect(insideIsland(x, z, -1e-6), `${at(x, z)} inside`).toBe(true);
      expect(insideIsland(x, z, 1e-3), `${at(x, z)} on the edge`).toBe(false);
    }
  });

  it('clampToIsland is idempotent, lands inside the drive margin, and keeps inside points', () => {
    const problems: string[] = [];
    for (let x = ISLAND.minX - 20; x <= ISLAND.maxX + 20; x += 2.5) {
      for (let z = ISLAND.minZ - 20; z <= ISLAND.maxZ + 20; z += 2.5) {
        const [cx, cz] = clampToIsland(x, z);
        const [cx2, cz2] = clampToIsland(cx, cz);
        if (Math.abs(cx2 - cx) > 1e-9 || Math.abs(cz2 - cz) > 1e-9) problems.push(`not idempotent at ${at(x, z)}`);
        if (!insideIsland(cx, cz, ISLAND.driveMargin - 1e-6)) problems.push(`${at(x, z)} → ${at(cx, cz)} outside margin`);
        if (insideIsland(x, z, ISLAND.driveMargin) && (Math.abs(cx - x) > 1e-9 || Math.abs(cz - z) > 1e-9)) {
          problems.push(`inside point ${at(x, z)} moved to ${at(cx, cz)}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('districts', () => {
  it('DISTRICT_ORDER lists every district exactly once', () => {
    expect([...DISTRICT_ORDER].sort()).toEqual((Object.keys(DISTRICTS) as DistrictId[]).sort());
  });

  it('zones do not overlap, so districtAt is unambiguous', () => {
    const problems: string[] = [];
    DISTRICT_ORDER.forEach((a, i) =>
      DISTRICT_ORDER.slice(i + 1).forEach((b) => {
        const A = DISTRICTS[a];
        const B = DISTRICTS[b];
        const gap = Math.hypot(A.center[0] - B.center[0], A.center[1] - B.center[1]) - A.zoneRadius - B.zoneRadius;
        if (gap < 0) problems.push(`${a} and ${b} zones overlap by ${fmt(-gap)}`);
      }),
    );
    expect(problems).toEqual([]);
  });

  it('every spawn is inside the island, inside its own zone, on pavement and clear of colliders', () => {
    const problems = DISTRICT_ORDER.flatMap((id) => {
      const { spawn } = DISTRICTS[id];
      const out: string[] = [];
      if (!insideIsland(spawn.x, spawn.z, ISLAND.driveMargin + VEHICLE_RADIUS)) out.push(`${id} spawn outside the island`);
      if (districtAt(spawn.x, spawn.z) !== id) out.push(`districtAt(${id} spawn) = ${districtAt(spawn.x, spawn.z)}`);
      if (!onPavement(spawn.x, spawn.z)) out.push(`${id} spawn ${at(spawn.x, spawn.z)} is off the roads/plazas`);
      const hit = blockers(spawn.x, spawn.z);
      if (hit.length) out.push(`${id} spawn collides with ${hit.join(', ')}`);
      return out;
    });
    expect(problems).toEqual([]);
  });

  it('every spawn heading faces its district centre', () => {
    const problems = DISTRICT_ORDER.flatMap((id) => {
      const { spawn, center } = DISTRICTS[id];
      const forward = [-Math.sin(spawn.heading), -Math.cos(spawn.heading)];
      const toward = [center[0] - spawn.x, center[1] - spawn.z];
      return forward[0] * toward[0] + forward[1] * toward[1] > 0 ? [] : [`${id} spawn faces away from its centre`];
    });
    expect(problems).toEqual([]);
  });

  it('routes are real pages and each district has a plaza at its centre', () => {
    for (const id of DISTRICT_ORDER) {
      const district = DISTRICTS[id];
      if (district.route !== null) expect(ROUTES.has(district.route), `${id} route ${district.route}`).toBe(true);
      const plaza = PLAZAS.find((p) => p.id === id);
      expect(plaza, `${id} plaza`).toBeDefined();
      expect([plaza?.x, plaza?.z]).toEqual(district.center);
    }
    expect(DISTRICTS.hub.route).toBeNull();
  });
});

describe('static layout', () => {
  it('building lots have unique ids, positive size and sit fully on the island', () => {
    const ids = BUILDING_LOTS.map((lot) => lot.id);
    expect(new Set(ids).size).toBe(ids.length);
    const problems = BUILDING_LOTS.flatMap((lot) => [
      ...(lot.maxX > lot.minX && lot.maxZ > lot.minZ ? [] : [`${lot.id} has no area`]),
      ...rectCorners(lot)
        .filter(([x, z]) => !insideIsland(x, z))
        .map(([x, z]) => `${lot.id} corner ${at(x, z)} off the island`),
    ]);
    expect(problems).toEqual([]);
  });

  it('lots do not overlap each other, avenues, plazas or landmarks', () => {
    const problems: string[] = [];
    BUILDING_LOTS.forEach((lot, i) => {
      BUILDING_LOTS.slice(i + 1).forEach((other) => rectsOverlap(lot, other) && problems.push(`${lot.id} overlaps ${other.id}`));
      AVENUES.forEach((avenue, a) => rectsOverlap(lot, avenue) && problems.push(`${lot.id} overlaps avenue ${a}`));
      PLAZAS.forEach((plaza) => distToRect(plaza.x, plaza.z, lot) < plaza.r - EPS && problems.push(`${lot.id} overlaps plaza ${plaza.id}`));
      Object.entries(LANDMARKS).forEach(([id, landmark]) => rectsOverlap(lot, landmark) && problems.push(`${lot.id} overlaps landmark ${id}`));
    });
    expect(problems).toEqual([]);
  });

  it('landmarks sit on the island, off the avenues and plazas, with their front facing the plaza', () => {
    const problems = Object.entries(LANDMARKS).flatMap(([id, landmark]) => {
      const out: string[] = [];
      rectCorners(landmark)
        .filter(([x, z]) => !insideIsland(x, z))
        .forEach(([x, z]) => out.push(`${id} corner ${at(x, z)} off the island`));
      AVENUES.forEach((avenue, a) => rectsOverlap(landmark, avenue) && out.push(`${id} overlaps avenue ${a}`));
      PLAZAS.forEach((plaza) => distToRect(plaza.x, plaza.z, landmark) < plaza.r - EPS && out.push(`${id} overlaps plaza ${plaza.id}`));
      const [cx, cz] = DISTRICTS[id as DistrictId].center;
      const faces =
        (landmark.front === 'east' && cx >= landmark.maxX) ||
        (landmark.front === 'west' && cx <= landmark.minX) ||
        (landmark.front === 'north' && cz <= landmark.minZ) ||
        (landmark.front === 'south' && cz >= landmark.maxZ);
      if (!faces) out.push(`${id} front (${landmark.front}) does not face its plaza`);
      return out;
    });
    expect(problems).toEqual([]);
  });
});

describe('exhibit slots and pads', () => {
  it('slots are ordered nearest the hub first', () => {
    for (const district of EXHIBIT_DISTRICTS) {
      const distances = EXHIBIT_SLOTS[district].map((slot) => Math.hypot(slot.x, slot.z));
      distances.slice(1).forEach((d, i) => expect(d, `${district}[${i + 1}]`).toBeGreaterThanOrEqual(distances[i] - 1e-9));
    }
  });

  it('every slot is on the island, inside its district zone and plaza, and its panel faces the plaza centre', () => {
    const problems = EXHIBIT_DISTRICTS.flatMap((district) =>
      EXHIBIT_SLOTS[district].flatMap((slot, i) => {
        const name = `${district}[${i}]`;
        const out: string[] = [];
        const [cx, cz] = DISTRICTS[district].center;
        if (!insideIsland(slot.x, slot.z, ISLAND.driveMargin + EXHIBIT_COLLIDER_RADIUS)) out.push(`${name} off the island`);
        if (districtAt(slot.x, slot.z) !== district) out.push(`${name} outside its zone`);
        const plaza = PLAZAS.find((p) => p.id === district);
        if (plaza && Math.hypot(slot.x - plaza.x, slot.z - plaza.z) > plaza.r) out.push(`${name} outside its plaza`);
        const len = Math.hypot(cx - slot.x, cz - slot.z);
        const facing = (Math.sin(slot.rotationY) * (cx - slot.x) + Math.cos(slot.rotationY) * (cz - slot.z)) / len;
        if (facing < 0.99) out.push(`${name} panel +Z is not turned toward the plaza (cos ${fmt(facing)})`);
        return out;
      }),
    );
    expect(problems).toEqual([]);
  });

  it('pedestals (used or not) do not overlap any other collider', () => {
    const problems = EXHIBIT_DISTRICTS.flatMap((district) =>
      EXHIBIT_SLOTS[district].flatMap((slot, i) => {
        const pedestal = { x: slot.x, z: slot.z, r: EXHIBIT_COLLIDER_RADIUS };
        const own = (c: Collider) => c.kind === 'circle' && Math.abs(c.x - slot.x) < EPS && Math.abs(c.z - slot.z) < EPS;
        return colliders
          .filter((c) => !own(c) && circleOverlapsCollider(pedestal, c))
          .map((c) => `${district}[${i}] pedestal overlaps ${c.id}`);
      }),
    );
    expect(problems).toEqual([]);
  });

  it('pads are on the island and the vehicle fits on each pad centre', () => {
    const problems = padTargets.flatMap((pad) => [
      ...(insideIsland(pad.x, pad.z, ISLAND.driveMargin + VEHICLE_RADIUS) ? [] : [`${pad.label} off the island`]),
      ...blockers(pad.x, pad.z).map((id) => `${pad.label} centre ${at(pad.x, pad.z)} blocked by ${id}`),
    ]);
    expect(problems).toEqual([]);
  });

  it('pads of different exhibits never overlap, so pad focus is unambiguous', () => {
    const problems = EXHIBIT_DISTRICTS.flatMap((district) => {
      const slots = EXHIBIT_SLOTS[district];
      return slots.flatMap((a, i) =>
        slots.slice(i + 1).flatMap((b, k) => {
          const gap = Math.hypot(a.pad.x - b.pad.x, a.pad.z - b.pad.z) - a.pad.radius - b.pad.radius;
          return gap > EPS ? [] : [`${district}[${i}] and [${i + 1 + k}] pads overlap by ${fmt(-gap)}`];
        }),
      );
    });
    expect(problems).toEqual([]);
  });

  it(`the vehicle (diameter ${2 * VEHICLE_RADIUS}) fits between neighbouring pedestals`, () => {
    const problems = EXHIBIT_DISTRICTS.flatMap((district) => {
      const slots = EXHIBIT_SLOTS[district];
      return slots.flatMap((a, i) =>
        slots.slice(i + 1).flatMap((b, k) => {
          const gap = Math.hypot(a.x - b.x, a.z - b.z) - 2 * EXHIBIT_COLLIDER_RADIUS;
          return gap >= 2 * VEHICLE_RADIUS ? [] : [`${district}[${i}]–[${i + 1 + k}] pedestal gap ${fmt(gap)} < ${2 * VEHICLE_RADIUS}`];
        }),
      );
    });
    expect(problems).toEqual([]);
  });

  it('pads do not overlap colliders other than their own pedestal', () => {
    const problems = EXHIBIT_DISTRICTS.flatMap((district) =>
      EXHIBIT_SLOTS[district].flatMap((slot, i) => {
        const own = (c: Collider) => c.kind === 'circle' && Math.abs(c.x - slot.x) < EPS && Math.abs(c.z - slot.z) < EPS;
        const pad: Circle = { x: slot.pad.x, z: slot.pad.z, r: slot.pad.radius };
        return colliders
          .filter((c) => !own(c) && circleOverlapsCollider(pad, c))
          .map((c) => `${district}[${i}] pad overlaps ${c.id}`);
      }),
    );
    expect(problems).toEqual([]);
  });
});

describe('portals', () => {
  it('ids are unique, routes are real pages, and every top-level page has a door', () => {
    expect(new Set(PORTALS.map((p) => p.id)).size).toBe(PORTALS.length);
    for (const portal of PORTALS) expect(ROUTES.has(portal.route), `${portal.id} → ${portal.route}`).toBe(true);
    const reachable = new Set(PORTALS.map((p) => p.route));
    const missing = (Object.values(paths) as string[]).filter((path) => path !== paths.home && !reachable.has(path));
    expect(missing).toEqual([]);
  });

  it('doors sit on their landmark front face and turn +Z outward toward their trigger', () => {
    const problems = PORTALS.flatMap((portal) => {
      const landmark = LANDMARKS[portal.district];
      const out: string[] = [];
      const onFace =
        landmark.front === 'east' || landmark.front === 'west'
          ? Math.abs(portal.x - (landmark.front === 'east' ? landmark.maxX : landmark.minX)) < EPS &&
            portal.z >= landmark.minZ &&
            portal.z <= landmark.maxZ
          : Math.abs(portal.z - (landmark.front === 'south' ? landmark.maxZ : landmark.minZ)) < EPS &&
            portal.x >= landmark.minX &&
            portal.x <= landmark.maxX;
      if (!onFace) out.push(`${portal.id} door ${at(portal.x, portal.z)} not on the ${landmark.front} face`);
      const dx = portal.trigger.x - portal.x;
      const dz = portal.trigger.z - portal.z;
      const facing = (Math.sin(portal.rotationY) * dx + Math.cos(portal.rotationY) * dz) / Math.hypot(dx, dz);
      if (facing < 0.99) out.push(`${portal.id} door +Z does not face its trigger (cos ${fmt(facing)})`);
      return out;
    });
    expect(problems).toEqual([]);
  });

  it('triggers are on the island, on pavement, reachable by the vehicle and do not overlap', () => {
    const problems = PORTALS.flatMap((portal, i) => {
      const { trigger } = portal;
      const out: string[] = [];
      if (!insideIsland(trigger.x, trigger.z, ISLAND.driveMargin + VEHICLE_RADIUS)) out.push(`${portal.id} trigger off the island`);
      if (!onPavement(trigger.x, trigger.z)) out.push(`${portal.id} trigger off the roads/plazas`);
      blockers(trigger.x, trigger.z).forEach((id) => out.push(`${portal.id} trigger centre blocked by ${id}`));
      PORTALS.slice(i + 1).forEach((other) => {
        const gap = Math.hypot(trigger.x - other.trigger.x, trigger.z - other.trigger.z) - trigger.radius - other.trigger.radius;
        if (gap < 0) out.push(`${portal.id} and ${other.id} triggers overlap`);
      });
      return out;
    });
    expect(problems).toEqual([]);
  });
});

describe('gaming spots and the hub server', () => {
  const ownCollider = (id: string) => (c: Collider) => c.id === `spot:${id}`;

  it('ids are the agreed interactable ids, unique, and do not clash with other interactables', () => {
    expect(INTERACTIVE_SPOTS.map((s) => s.id).sort()).toEqual(['arcade:catgpt', 'arcade:pacman', 'arcade:tetris', 'pc:rig', 'server:ram']);
    const others = new Set([...PORTALS.map((p) => p.id), ...WORLD_EXHIBITS.map((e) => e.id)]);
    expect(INTERACTIVE_SPOTS.filter((s) => others.has(s.id)).map((s) => s.id)).toEqual([]);
  });

  it('arcade cabinets and the PC stand in the Gaming plaza, facing their pads', () => {
    const plaza = PLAZAS.find((p) => p.id === 'gaming');
    const problems = Object.values(GAMING_SPOTS).flatMap((spot) => {
      const out: string[] = [];
      if (!plaza || Math.hypot(spot.x - plaza.x, spot.z - plaza.z) + spot.radius > plaza.r) out.push(`${spot.id} outside the gaming plaza`);
      if (districtAt(spot.pad.x, spot.pad.z) !== 'gaming') out.push(`${spot.id} pad outside the gaming zone`);
      const dx = spot.pad.x - spot.x;
      const dz = spot.pad.z - spot.z;
      const facing = (Math.sin(spot.rotationY) * dx + Math.cos(spot.rotationY) * dz) / Math.hypot(dx, dz);
      if (facing < 0.99) out.push(`${spot.id} front does not face its pad (cos ${fmt(facing)})`);
      return out;
    });
    expect(problems).toEqual([]);
  });

  it('the data server stands on the hub roundabout rim, faces the tower and keeps clear of signposts and labels', () => {
    const { server, centre, radius, innerRadius, serverRackSpot } = TOWER_ROUNDABOUT;
    expect(serverRackSpot).toEqual({ x: server.x, z: server.z, rotationY: server.rotationY });
    expect(centre).toEqual({ x: HUB_PROPS.monolith.x, z: HUB_PROPS.monolith.z });
    expect(innerRadius).toBe(HUB_PROPS.monolith.r);
    const d = Math.hypot(server.x - centre.x, server.z - centre.z);
    expect(d).toBeGreaterThan(innerRadius + 2 * VEHICLE_RADIUS);
    expect(d).toBeLessThanOrEqual(radius);
    const toCentre = Math.atan2(centre.x - server.x, centre.z - server.z);
    expect(Math.cos(server.rotationY - toCentre)).toBeGreaterThan(0.99);
    // Off the avenue mouths (|lateral| > 4) so the roads stay open.
    expect(Math.min(Math.abs(server.x), Math.abs(server.z)) - server.radius).toBeGreaterThan(AVENUES[0].maxX - 0.5);
  });

  it('props sit on the island and do not overlap any other collider', () => {
    const problems = INTERACTIVE_SPOTS.flatMap((spot) => {
      const out: string[] = [];
      if (!insideIsland(spot.x, spot.z, ISLAND.driveMargin + spot.radius)) out.push(`${spot.id} off the island`);
      colliders
        .filter((c) => !ownCollider(spot.id)(c) && circleOverlapsCollider({ x: spot.x, z: spot.z, r: spot.radius }, c))
        .forEach((c) => out.push(`${spot.id} overlaps ${c.id}`));
      return out;
    });
    expect(problems).toEqual([]);
  });

  it('pads are on the island, clear for the vehicle and do not overlap each other, exhibit pads or door triggers', () => {
    const others = [...padTargets, ...portalTargets];
    const problems = INTERACTIVE_SPOTS.flatMap((spot, i) => {
      const { pad } = spot;
      const out: string[] = [];
      if (!insideIsland(pad.x, pad.z, ISLAND.driveMargin + VEHICLE_RADIUS)) out.push(`${spot.id} pad off the island`);
      blockers(pad.x, pad.z).forEach((id) => out.push(`${spot.id} pad centre blocked by ${id}`));
      colliders
        .filter((c) => !ownCollider(spot.id)(c) && circleOverlapsCollider({ x: pad.x, z: pad.z, r: pad.radius }, c))
        .forEach((c) => out.push(`${spot.id} pad overlaps ${c.id}`));
      INTERACTIVE_SPOTS.slice(i + 1).forEach((other) => {
        if (Math.hypot(pad.x - other.pad.x, pad.z - other.pad.z) < pad.radius + other.pad.radius) out.push(`${spot.id} and ${other.id} pads overlap`);
      });
      others.forEach((t) => {
        if (Math.hypot(pad.x - t.x, pad.z - t.z) < pad.radius + t.radius) out.push(`${spot.id} pad overlaps ${t.label}`);
      });
      return out;
    });
    expect(problems).toEqual([]);
  });
});

describe('car-soccer arena', () => {
  const { pitch, walls, goals, entrances, wallThickness } = ARENA;
  const wallColliders = colliders.filter((c) => c.id.startsWith('arena:'));
  const covered = (x: number, z: number) =>
    wallColliders.some((c) => c.kind === 'box' && x >= c.minX - EPS && x <= c.maxX + EPS && z >= c.minZ - EPS && z <= c.maxZ + EPS);

  it('every wall is a registered box collider with a unique id, on the island', () => {
    expect(new Set(walls.map((w) => w.id)).size).toBe(walls.length);
    for (const wall of walls) {
      expect(wallColliders.find((c) => c.id === wall.id)?.kind, wall.id).toBe('box');
      rectCorners(wall).forEach(([x, z]) => expect(insideIsland(x, z, ISLAND.driveMargin), `${wall.id} corner ${at(x, z)}`).toBe(true));
    }
  });

  it('the pitch is clear of every other collider and of the city', () => {
    const intruders = colliders.filter((c) => !c.id.startsWith('arena:')).filter((c) => (c.kind === 'box' ? rectsOverlap(c, pitch) : distToRect(c.x, c.z, pitch) < c.r));
    expect(intruders.map((c) => c.id)).toEqual([]);
    const pitchWalls = walls.filter((w) => rectsOverlap(w, pitch));
    expect(pitchWalls.map((w) => w.id)).toEqual([]);
  });

  it('the pitch boundary is walled everywhere except the goal mouths and the entrances', () => {
    const t = wallThickness / 2;
    const openings = [
      ...Object.values(goals).map((g) => ({ z: g.z, minX: g.x - g.width / 2, maxX: g.x + g.width / 2, what: `${g.id} goal` })),
      ...entrances.map((e) => ({ z: e.z, minX: e.minX, maxX: e.maxX, what: e.id })),
    ];
    const problems: string[] = [];
    const sample = (x: number, z: number, ox: number, oz: number) => {
      // A point just outside the pitch edge, inside the wall band.
      const px = x + ox * t;
      const pz = z + oz * t;
      const open = openings.find((o) => Math.abs(o.z - z) < EPS && x > o.minX + EPS && x < o.maxX - EPS);
      const wall = covered(px, pz);
      if (open && wall) problems.push(`${open.what} is blocked at ${at(x, z)}`);
      if (!open && !wall) problems.push(`gap in the wall at ${at(x, z)}`);
    };
    for (let x = pitch.minX; x <= pitch.maxX + EPS; x += 0.25) {
      sample(x, pitch.minZ, 0, -1);
      sample(x, pitch.maxZ, 0, 1);
    }
    for (let z = pitch.minZ; z <= pitch.maxZ + EPS; z += 0.25) {
      sample(pitch.minX, z, -1, 0);
      sample(pitch.maxX, z, 1, 0);
    }
    expect(problems).toEqual([]);
  });

  it('goals are closed at the back and sides, open to the pitch, and big enough for the ball', () => {
    const problems: string[] = [];
    for (const g of Object.values(goals)) {
      const { area } = g;
      if (g.width < 2 * ARENA.ballRadius + 2 || g.depth < 2 * ARENA.ballRadius) problems.push(`${g.id} goal too small for the ball`);
      if (Math.abs(g.z - (g.id === 'north' ? pitch.minZ : pitch.maxZ)) > EPS) problems.push(`${g.id} mouth not on the pitch edge`);
      const backZ = g.inward < 0 ? area.minZ : area.maxZ;
      for (let x = area.minX; x <= area.maxX + EPS; x += 0.25) if (!covered(x, backZ + g.inward * wallThickness * 0.5)) problems.push(`${g.id} back open at x ${fmt(x)}`);
      for (let z = area.minZ; z <= area.maxZ + EPS; z += 0.25) {
        if (!covered(area.minX - wallThickness * 0.5, z)) problems.push(`${g.id} west side open at z ${fmt(z)}`);
        if (!covered(area.maxX + wallThickness * 0.5, z)) problems.push(`${g.id} east side open at z ${fmt(z)}`);
      }
      // Nothing inside the goal itself.
      wallColliders.filter((c) => c.kind === 'box' && rectsOverlap(c, area)).forEach((c) => problems.push(`${c.id} inside the ${g.id} goal`));
      rectCorners(area).forEach(([x, z]) => insideIsland(x, z, ISLAND.driveMargin) || problems.push(`${g.id} goal corner off the island`));
    }
    expect(problems).toEqual([]);
  });

  it('the ball spawn and kick-off spot are on the pitch and clear', () => {
    for (const p of [ARENA.ballSpawn, ARENA.carKickoff]) {
      expect(distToRect(p.x, p.z, { minX: pitch.minX + 2, maxX: pitch.maxX - 2, minZ: pitch.minZ + 2, maxZ: pitch.maxZ - 2 })).toBe(0);
      expect(blockers(p.x, p.z)).toEqual([]);
    }
    const toBall = [ARENA.ballSpawn.x - ARENA.carKickoff.x, ARENA.ballSpawn.z - ARENA.carKickoff.z];
    const forward = [-Math.sin(ARENA.carKickoff.heading), -Math.cos(ARENA.carKickoff.heading)];
    expect(forward[0] * toBall[0] + forward[1] * toBall[1]).toBeGreaterThan(0);
  });

  it('entrances are wide enough for the vehicle and connect to an access road', () => {
    for (const e of entrances) {
      expect(e.maxX - e.minX, e.id).toBeGreaterThan(2 * VEHICLE_RADIUS + 1);
      const road = ARENA.accessRoads.find((r) => r.minX <= e.minX + EPS && r.maxX >= e.maxX - EPS && Math.abs(r.maxZ - e.z) < EPS);
      expect(road, `${e.id} access road`).toBeDefined();
    }
    const problems = ARENA.accessRoads.flatMap((road, i) => [
      ...BUILDING_LOTS.filter((lot) => rectsOverlap(lot, road)).map((lot) => `road ${i} overlaps ${lot.id}`),
      ...Object.entries(LANDMARKS)
        .filter(([, l]) => rectsOverlap(l, road))
        .map(([id]) => `road ${i} overlaps landmark ${id}`),
    ]);
    expect(problems).toEqual([]);
  });
});

describe('time trial', () => {
  it('gate ids are unique and the lap runs the outer border strip in order', () => {
    expect(new Set(raceGates.map((g) => g.id)).size).toBe(raceGates.length);
    const byId = (id: string) => raceGates.find((g) => g.id === id) as (typeof raceGates)[number];
    // West strip passes behind (west of) the Engineering Lab, north strip behind the Archive, east strip behind the Creative Studio.
    expect(byId('gate-west-engineering').x).toBeLessThan(LANDMARKS.engineering.minX);
    expect(byId('gate-north-archive').z).toBeLessThan(LANDMARKS.about.minZ);
    expect(byId('gate-east-creative').x).toBeGreaterThan(LANDMARKS.creative.maxX);
    // Angle around the hub advances monotonically (one clockwise-on-screen lap: west → north → east → south).
    const angles = RACE.checkpoints.slice(0, 9).map((g) => Math.atan2(g.z, g.x));
    const unwrapped = angles.map((a, i) => {
      let v = a;
      if (i > 0) while (v < angles[0]) v += 2 * Math.PI;
      return v;
    });
    unwrapped.slice(1).forEach((a, i) => expect(a, RACE.checkpoints[i + 1].id).toBeGreaterThan(unwrapped[i]));
    expect(districtAt(RACE.start.x, RACE.start.z)).toBe('gaming');
    expect(districtAt(RACE.finish.x, RACE.finish.z)).toBe('hub');
  });

  it('every gate line lies on the island and clear of colliders, and the vehicle fits through', () => {
    const problems = raceGates.flatMap((gate) => {
      const out: string[] = [];
      const [[ax, az], [bx, bz]] = gateEnds(gate);
      for (let k = 0; k <= 20; k++) {
        const x = ax + ((bx - ax) * k) / 20;
        const z = az + ((bz - az) * k) / 20;
        if (!insideIsland(x, z, ISLAND.driveMargin)) out.push(`${gate.id} line leaves the island at ${at(x, z)}`);
        colliders.filter((c) => clearance(x, z, c) < 0).forEach((c) => out.push(`${gate.id} line crosses ${c.id} at ${at(x, z)}`));
      }
      blockers(gate.x, gate.z).forEach((id) => out.push(`${gate.id} centre blocked by ${id}`));
      if (gate.width < 2 * VEHICLE_RADIUS + 1.5) out.push(`${gate.id} too narrow`);
      // The gate line runs across the travel direction.
      const along = [bx - ax, bz - az];
      const forward = [-Math.sin(gate.rotationY), -Math.cos(gate.rotationY)];
      if (Math.abs(along[0] * forward[0] + along[1] * forward[1]) > 1e-6) out.push(`${gate.id} line is not perpendicular to travel`);
      return out;
    });
    const start = RACE.start;
    if (!insideIsland(start.x, start.z, ISLAND.driveMargin + VEHICLE_RADIUS)) problems.push('start off the island');
    blockers(start.x, start.z).forEach((id) => problems.push(`start blocked by ${id}`));
    expect(problems).toEqual([]);
  });

  it('each gate faces roughly toward the next one', () => {
    const route = [{ id: 'start', x: RACE.start.x, z: RACE.start.z, rotationY: RACE.start.heading }, ...raceGates];
    const problems = route.slice(0, -1).flatMap((gate, i) => {
      const next = route[i + 1];
      const forward = [-Math.sin(gate.rotationY), -Math.cos(gate.rotationY)];
      const toward = [next.x - gate.x, next.z - gate.z];
      const cos = (forward[0] * toward[0] + forward[1] * toward[1]) / Math.hypot(toward[0], toward[1]);
      return cos > -0.2 ? [] : [`${gate.id} points away from ${next.id} (cos ${fmt(cos)})`];
    });
    expect(problems).toEqual([]);
  });
});

describe('colliders', () => {
  it('ids are unique and shapes are valid', () => {
    expect(colliders.length).toBeGreaterThan(0);
    const ids = colliders.map((c) => c.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    const problems = colliders.flatMap((c) => {
      if (c.kind === 'circle') return Number.isFinite(c.r) && c.r > 0 ? [] : [`${c.id} radius ${c.r}`];
      return c.maxX > c.minX && c.maxZ > c.minZ ? [] : [`${c.id} has no area`];
    });
    expect(problems).toEqual([]);
  });

  it('includes every lot, landmark, hub prop, exhibit pedestal and decor collider', () => {
    const ids = new Set(colliders.map((c) => c.id));
    const expected = [
      ...BUILDING_LOTS.map((lot) => lot.id),
      ...Object.keys(LANDMARKS).map((id) => `landmark:${id}`),
      'hub:monolith',
      ...HUB_PROPS.signposts.map((_, i) => `hub:signpost-${i}`),
      ...ARENA.walls.map((wall) => wall.id),
      ...INTERACTIVE_SPOTS.map((spot) => `spot:${spot.id}`),
      ...WORLD_EXHIBITS.map((exhibit) => `pedestal:${exhibit.id}`),
      ...DECOR_COLLIDERS.map((c) => c.id),
    ];
    expect(expected.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('decor colliders sit on the island and never cover spawns, pads or triggers', () => {
    const targets = [...spawnTargets, ...padTargets, ...portalTargets, ...spotTargets, ...raceTargets, ...arenaTargets];
    const problems = DECOR_COLLIDERS.flatMap((c) => [
      ...(insideIsland(c.x, c.z) ? [] : [`${c.id} at ${at(c.x, c.z)} is off the island`]),
      ...targets
        .filter((t) => Math.hypot(t.x - c.x, t.z - c.z) < c.r + Math.max(t.radius, VEHICLE_RADIUS))
        .map((t) => `${c.id} intrudes on ${t.label}`),
    ]);
    expect(problems).toEqual([]);
  });
});

describe('drivability', () => {
  // Breadth-first search over a 0.5-unit grid for a vehicle-sized circle,
  // starting at the hub spawn. Diagonal steps require both orthogonal
  // neighbours to be free, so the search cannot squeeze through corners.
  const STEP = 0.5;
  const N = Math.round(Math.max(ISLAND.maxX - ISLAND.minX, ISLAND.maxZ - ISLAND.minZ) / STEP) + 1;
  const toX = (i: number) => ISLAND.minX + i * STEP;
  const toZ = (j: number) => ISLAND.minZ + j * STEP;
  const toIndexX = (v: number) => Math.round((v - ISLAND.minX) / STEP);
  const toIndexZ = (v: number) => Math.round((v - ISLAND.minZ) / STEP);

  const free = new Uint8Array(N * N);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = toX(i);
      const z = toZ(j);
      free[i * N + j] = insideIsland(x, z, ISLAND.driveMargin) && blockers(x, z).length === 0 ? 1 : 0;
    }
  }

  const reached = new Uint8Array(N * N);
  const start = DISTRICTS.hub.spawn;
  const queue: number[] = [toIndexX(start.x) * N + toIndexZ(start.z)];
  reached[queue[0]] = 1;
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    const i = Math.floor(cell / N);
    const j = cell % N;
    for (const [di, dj] of [
      [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
    ]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= N || nj >= N) continue;
      const next = ni * N + nj;
      if (!free[next] || reached[next]) continue;
      if (di !== 0 && dj !== 0 && (!free[(i + di) * N + j] || !free[i * N + (j + dj)])) continue;
      reached[next] = 1;
      queue.push(next);
    }
  }

  function reachable(target: Target): boolean {
    const r = Math.max(target.radius, STEP * 0.75);
    for (let i = toIndexX(target.x - r); i <= toIndexX(target.x + r); i++) {
      for (let j = toIndexZ(target.z - r); j <= toIndexZ(target.z + r); j++) {
        if (i < 0 || j < 0 || i >= N || j >= N) continue;
        if (reached[i * N + j] && Math.hypot(toX(i) - target.x, toZ(j) - target.z) <= r) return true;
      }
    }
    return false;
  }

  it('the hub spawn itself is drivable', () => {
    expect(free[queue[0]]).toBe(1);
  });

  it('every district spawn, exhibit pad, portal trigger, gaming pad, race gate and arena spot can be reached from the hub', () => {
    const unreachable = [...spawnTargets, ...padTargets, ...portalTargets, ...spotTargets, ...raceTargets, ...arenaTargets]
      .filter((t) => !reachable(t))
      .map((t) => t.label);
    expect(unreachable).toEqual([]);
  });

  it('most of the island stays drivable (props have not boxed the roads in)', () => {
    const roadCells = [] as number[];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) if (free[i * N + j] && onPavement(toX(i), toZ(j))) roadCells.push(i * N + j);
    }
    const reachedRoad = roadCells.filter((cell) => reached[cell]).length;
    expect(reachedRoad / roadCells.length).toBeGreaterThan(0.95);
  });
});

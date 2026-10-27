// Scene queries used by gameplay: where a click lands on drivable ground, and
// how tall the buildings on each lot actually are (measured from whatever the
// city art renders, so camera occlusion avoidance needs no hard-coded heights).

import {
  AdditiveBlending,
  BackSide,
  Vector3,
  type Intersection,
  type Material,
  type Mesh,
  type Object3D,
  type Ray,
  Raycaster,
} from 'three';
import { BUILDING_LOTS, HUB_PROPS, ISLAND, LANDMARKS, RACE, gateEnds, type Rect } from '../config/layout';
import { FINISH_PYLON, GATE_POST, START_GANTRY } from '../city/gamingLayout';

function visibleInScene(object: Object3D): boolean {
  for (let node: Object3D | null = object; node; node = node.parent) if (!node.visible) return false;
  return true;
}

/** Opaque, visible geometry that should block a click or a camera ray. */
function isSolid(hit: Intersection): boolean {
  const mesh = hit.object as Mesh;
  if (!mesh.isMesh) return false;
  const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as Material | undefined;
  if (!material) return false;
  if (material.side === BackSide || material.blending === AdditiveBlending || !material.depthWrite) return false;
  if (material.transparent && material.opacity < 0.4) return false;
  return visibleInScene(mesh);
}

const pickRaycaster = new Raycaster();

/** First solid surface along `ray` that lies over the island, as a ground position. */
export function pickDrivePoint(ray: Ray, scene: Object3D): { x: number; z: number } | null {
  pickRaycaster.ray.copy(ray);
  pickRaycaster.near = 0;
  pickRaycaster.far = 600;
  const hits = pickRaycaster.intersectObject(scene, true);
  const pad = 4;
  for (const hit of hits) {
    if (!isSolid(hit)) continue;
    const { x, z } = hit.point;
    if (x < ISLAND.minX - pad || x > ISLAND.maxX + pad || z < ISLAND.minZ - pad || z > ISLAND.maxZ + pad) continue;
    return { x: hit.point.x, z: hit.point.z };
  }
  return null;
}

export interface Occluder extends Rect {
  height: number;
}

const down = new Vector3(0, -1, 0);
const origin = new Vector3();

function roofHeight(scene: Object3D, x: number, z: number): number {
  origin.set(x, 120, z);
  pickRaycaster.set(origin, down);
  pickRaycaster.near = 0;
  pickRaycaster.far = 130;
  for (const hit of pickRaycaster.intersectObject(scene, true)) {
    if (isSolid(hit)) return hit.point.y;
  }
  return 0;
}

/** Measure the buildings standing on each lot, landmark and the hub monolith. */
export function measureOccluders(scene: Object3D): Occluder[] {
  scene.updateMatrixWorld(true);
  const { monolith } = HUB_PROPS;
  const rects: Rect[] = [
    ...BUILDING_LOTS,
    ...Object.values(LANDMARKS),
    { minX: monolith.x - monolith.r * 0.7, maxX: monolith.x + monolith.r * 0.7, minZ: monolith.z - monolith.r * 0.7, maxZ: monolith.z + monolith.r * 0.7 },
  ];
  const result: Occluder[] = [];
  for (const rect of rects) {
    let height = 0;
    for (const [u, v] of [
      [0.5, 0.5],
      [0.25, 0.25],
      [0.75, 0.25],
      [0.25, 0.75],
      [0.75, 0.75],
    ]) {
      height = Math.max(height, roofHeight(scene, rect.minX + (rect.maxX - rect.minX) * u, rect.minZ + (rect.maxZ - rect.minZ) * v));
    }
    if (height > 1.5) result.push({ minX: rect.minX, maxX: rect.maxX, minZ: rect.minZ, maxZ: rect.maxZ, height });
  }
  return [...result, ...overheadOccluders()];
}

/**
 * Race overheads (gate light bars, the start gantry, the finish banner): thin
 * slabs across the road. Treating them as solid lets the follow camera lift
 * briefly instead of hiding the car behind a beam as it passes under.
 */
function overheadOccluders(): Occluder[] {
  const slab = (ax: number, az: number, bx: number, bz: number, height: number): Occluder => {
    const pad = 0.35;
    return { minX: Math.min(ax, bx) - pad, maxX: Math.max(ax, bx) + pad, minZ: Math.min(az, bz) - pad, maxZ: Math.max(az, bz) + pad, height };
  };
  const gates = [...RACE.checkpoints, RACE.finish].map((gate) => {
    const [[ax, az], [bx, bz]] = gateEnds(gate);
    return slab(ax, az, bx, bz, gate.id === RACE.finish.id ? FINISH_PYLON.height : GATE_POST.height);
  });
  const [x0, x1] = START_GANTRY.xs;
  return [...gates, slab(x0, START_GANTRY.z, x1, START_GANTRY.z, START_GANTRY.height)];
}

/** Slab test: does the segment a→b pass through the box (rect × [0, height])? */
function segmentHitsBox(ax: number, ay: number, az: number, bx: number, by: number, bz: number, box: Occluder): boolean {
  let t0 = 0;
  let t1 = 1;
  const axes: Array<[number, number, number, number]> = [
    [ax, bx - ax, box.minX, box.maxX],
    [ay, by - ay, 0, box.height],
    [az, bz - az, box.minZ, box.maxZ],
  ];
  for (const [start, dir, min, max] of axes) {
    if (Math.abs(dir) < 1e-9) {
      if (start < min || start > max) return false;
      continue;
    }
    let near = (min - start) / dir;
    let far = (max - start) / dir;
    if (near > far) [near, far] = [far, near];
    t0 = Math.max(t0, near);
    t1 = Math.min(t1, far);
    if (t0 > t1) return false;
  }
  return true;
}

export function segmentOccluded(
  occluders: readonly Occluder[],
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
): boolean {
  const minX = Math.min(ax, bx);
  const maxX = Math.max(ax, bx);
  const minZ = Math.min(az, bz);
  const maxZ = Math.max(az, bz);
  for (const box of occluders) {
    if (box.maxX < minX || box.minX > maxX || box.maxZ < minZ || box.minZ > maxZ) continue;
    if (segmentHitsBox(ax, ay, az, bx, by, bz, box)) return true;
  }
  return false;
}

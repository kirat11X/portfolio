// Static collision shapes for the vehicle, assembled from the shared layout:
// lots, landmarks, arena walls/goals (boxes); hub props, exhibit pedestals,
// interactive spots (`spot:<id>`) and city-art decor (circles).

import { ARENA, BUILDING_LOTS, HUB_PROPS, INTERACTIVE_SPOTS, LANDMARKS, type Rect } from './layout';
import { WORLD_EXHIBITS } from './exhibits';
import { DECOR_COLLIDERS } from './decorColliders';

export interface BoxCollider extends Rect {
  kind: 'box';
  id: string;
}

export interface CircleCollider {
  kind: 'circle';
  id: string;
  x: number;
  z: number;
  r: number;
}

export type Collider = BoxCollider | CircleCollider;

/** Radius kept clear around each exhibit pedestal. */
export const EXHIBIT_COLLIDER_RADIUS = 1.3;

export function getStaticColliders(): Collider[] {
  const boxes: BoxCollider[] = [
    ...BUILDING_LOTS.map((lot) => ({ kind: 'box' as const, ...lot })),
    ...Object.entries(LANDMARKS).map(([id, rect]) => ({
      kind: 'box' as const,
      id: `landmark:${id}`,
      minX: rect.minX,
      maxX: rect.maxX,
      minZ: rect.minZ,
      maxZ: rect.maxZ,
    })),
    ...ARENA.walls.map((wall) => ({ kind: 'box' as const, ...wall })),
  ];
  const circles: CircleCollider[] = [
    { kind: 'circle', id: 'hub:monolith', ...HUB_PROPS.monolith },
    ...HUB_PROPS.signposts.map((post, i) => ({ kind: 'circle' as const, id: `hub:signpost-${i}`, ...post })),
    ...WORLD_EXHIBITS.map((exhibit) => ({
      kind: 'circle' as const,
      id: `pedestal:${exhibit.id}`,
      x: exhibit.slot.x,
      z: exhibit.slot.z,
      r: EXHIBIT_COLLIDER_RADIUS,
    })),
    ...INTERACTIVE_SPOTS.map((spot) => ({ kind: 'circle' as const, id: `spot:${spot.id}`, x: spot.x, z: spot.z, r: spot.radius })),
    ...DECOR_COLLIDERS,
  ];
  return [...boxes, ...circles];
}

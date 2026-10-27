// Colliders for decorative props placed by the city-art code (lamps, benches,
// trees, kiosks, the radio mast...). Anything taller than ~0.3 units that sits
// where the vehicle can drive must be listed here so gameplay can collide with
// it. Owned by the city-art specialist.
//
// Positions come from src/world/city/propLayout.ts, the same data the art
// renders from. Trees, rooftop clutter and the radio mast stand inside lot or
// landmark colliders, and bollards/kerbs are below 0.3 units, so they need no
// entry here. Gaming Zone, arena, race-gate and border-strip props come from
// src/world/city/gamingLayout.ts.

import type { CircleCollider } from './colliders';
import { DECOR_PROPS } from '../city/propLayout';
import { GAMING_DECOR } from '../city/gamingLayout';

export const DECOR_COLLIDERS: CircleCollider[] = [...DECOR_PROPS, ...GAMING_DECOR].map((prop) => ({
  kind: 'circle',
  id: `decor:${prop.id}`,
  x: prop.x,
  z: prop.z,
  r: prop.r,
}));

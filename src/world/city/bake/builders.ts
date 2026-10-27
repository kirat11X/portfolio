// The set of merged-geometry buckets the static city is baked into. Each
// bucket becomes exactly one mesh (one draw call) with one shared material.

import { CylinderGeometry, type BufferGeometry } from 'three';
import { GeometryBuilder } from '../lib/GeometryBuilder';
import type { BeaconSpec } from '../buildingPlan';

export interface Builders {
  /** Island top and raised sidewalks (tile texture × vertex colour). */
  ground: GeometryBuilder;
  /** Island side walls and underside. */
  island: GeometryBuilder;
  asphalt: GeometryBuilder;
  plaza: GeometryBuilder;
  markings: GeometryBuilder;
  /** Buildings, landmark bodies and roof clutter (window atlas). */
  facade: GeometryBuilder;
  /** Dark reflective glass (Engineering Lab, monolith). */
  glass: GeometryBuilder;
  /** Poles, frames, posts, pedestals, mast. */
  metal: GeometryBuilder;
  /** Static HDR neon lines and lamp heads. */
  neon: GeometryBuilder;
  /** Additive light pools on the ground. */
  decals: GeometryBuilder;
  /** Server-rack planes behind the Engineering Lab arcade. */
  racks: GeometryBuilder;
  /** Creative Studio light boxes (gradient shader). */
  lightboxes: GeometryBuilder;
  /** Signpost labels (canvas atlas × accent vertex colour). */
  labels: GeometryBuilder;
  /** Baked signage from the shared sign atlas (tinted by vertex colour). */
  signs: GeometryBuilder;
  /** Gaming Zone, arena, race and Archive signage from the zone atlas. */
  zone: GeometryBuilder;
  beacons: BeaconSpec[];
}

export function createBuilders(): Builders {
  return {
    ground: new GeometryBuilder(),
    island: new GeometryBuilder(),
    asphalt: new GeometryBuilder(),
    plaza: new GeometryBuilder(),
    markings: new GeometryBuilder(),
    facade: new GeometryBuilder({ windows: true }),
    glass: new GeometryBuilder(),
    metal: new GeometryBuilder(),
    neon: new GeometryBuilder(),
    decals: new GeometryBuilder(),
    racks: new GeometryBuilder(),
    lightboxes: new GeometryBuilder(),
    labels: new GeometryBuilder(),
    signs: new GeometryBuilder(),
    zone: new GeometryBuilder(),
    beacons: [],
  };
}

// CPU-side templates (never rendered directly, so never uploaded or disposed).
const templates = new Map<string, BufferGeometry>();

/** Unit-height cylinder template, centred on the origin. */
export function cylinder(segments = 12, top = 1, bottom = 1): BufferGeometry {
  const key = `cyl:${segments}:${top}:${bottom}`;
  let g = templates.get(key);
  if (!g) {
    g = new CylinderGeometry(top, bottom, 1, segments, 1, false).toNonIndexed();
    templates.set(key, g);
  }
  return g;
}

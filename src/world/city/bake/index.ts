import type { BufferGeometry } from 'three';
import { createBuilders } from './builders';
import { bakeIsland } from './island';
import { bakeStreets } from './streets';
import { bakeBuildings } from './buildings';
import { bakeLandmarks } from './landmarks';
import { bakeHub } from './hub';
import { bakeEnrichment } from './enrich';
import { bakeGaming } from './gaming';
import { bakeArena } from './arena';
import { bakeRace } from './race';
import { bakeBorder } from './border';
import type { BeaconSpec } from '../buildingPlan';

export interface BakedCity {
  ground: BufferGeometry;
  island: BufferGeometry;
  asphalt: BufferGeometry;
  plaza: BufferGeometry;
  markings: BufferGeometry;
  facade: BufferGeometry;
  glass: BufferGeometry;
  metal: BufferGeometry;
  neon: BufferGeometry;
  decals: BufferGeometry;
  racks: BufferGeometry;
  lightboxes: BufferGeometry;
  labels: BufferGeometry;
  signs: BufferGeometry;
  zone: BufferGeometry;
  beacons: BeaconSpec[];
}

/** Builds every static mesh of the city (pure, deterministic). */
export function bakeCity(): BakedCity {
  const b = createBuilders();
  bakeIsland(b);
  bakeStreets(b);
  bakeBuildings(b);
  bakeLandmarks(b);
  bakeHub(b);
  bakeEnrichment(b);
  bakeGaming(b);
  bakeArena(b);
  bakeRace(b);
  bakeBorder(b);
  return {
    ground: b.ground.build(),
    island: b.island.build(),
    asphalt: b.asphalt.build(),
    plaza: b.plaza.build(),
    markings: b.markings.build(),
    facade: b.facade.build(),
    glass: b.glass.build(),
    metal: b.metal.build(),
    neon: b.neon.build(),
    decals: b.decals.build(),
    racks: b.racks.build(),
    lightboxes: b.lightboxes.build(),
    labels: b.labels.build(),
    signs: b.signs.build(),
    zone: b.zone.build(),
    beacons: b.beacons,
  };
}

export const GEOMETRY_KEYS = [
  'ground',
  'island',
  'asphalt',
  'plaza',
  'markings',
  'facade',
  'glass',
  'metal',
  'neon',
  'decals',
  'racks',
  'lightboxes',
  'labels',
  'signs',
  'zone',
] as const;

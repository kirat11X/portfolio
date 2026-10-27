import { describe, expect, it } from 'vitest';
import { CAR_ORDER, CARS, carStats } from '../../game/cars';
import { VEHICLE } from '../tuning';
import { createVehicleShape, disposeGeometries } from '../vehicleGeometry';
import { DESIGNS } from './designs';

describe('vehicle geometry', () => {
  for (const id of CAR_ORDER) {
    it(`builds ${id} with finite, bounded geometry`, () => {
      const shape = createVehicleShape(id);
      const meshes = Object.values(shape.geometries).filter(Boolean);
      // paint, glass, accent, head, tail, flame, decal + per-car extras (pod: thrusters/antenna; wheeled: wheel + ring).
      expect(meshes.length).toBeLessThanOrEqual(10);
      for (const geometry of meshes) {
        const position = geometry!.getAttribute('position');
        expect(position.count).toBeGreaterThan(0);
        for (let i = 0; i < position.array.length; i++) expect(Number.isFinite(position.array[i])).toBe(true);
      }
      const paint = shape.geometries.paint;
      paint.computeBoundingBox();
      const box = paint.boundingBox!;
      // Footprint stays close to the shared collision circle.
      expect(Math.max(-box.min.x, box.max.x)).toBeLessThan(VEHICLE.radius * 1.15);
      expect(Math.max(-box.min.z, box.max.z)).toBeLessThan(VEHICLE.radius * 1.75);
      expect(shape.wheels.length).toBe(DESIGNS[id].wheels.length);
      disposeGeometries(shape.geometries);
    });
  }

  it('derives picker stats in 0..1 that rank the cars as their handling says', () => {
    const stats = Object.fromEntries(CAR_ORDER.map((id) => [id, carStats(CARS[id])]));
    for (const s of Object.values(stats)) {
      for (const v of Object.values(s)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    expect(stats.stingray.speed).toBeGreaterThan(stats.pod.speed);
    expect(stats.kestrel.acceleration).toBeGreaterThan(stats.pod.acceleration);
    expect(stats.kestrel.turning).toBeGreaterThan(stats.stingray.turning);
  });
});

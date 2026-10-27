import { describe, expect, it } from 'vitest';
import { getStaticColliders } from '../config/colliders';
import { ARENA, INTERACTIVE_SPOTS, RACE } from '../config/layout';
import { pushOutOfColliders } from '../scene/physics';
import { VEHICLE } from '../scene/tuning';
import { BALL } from './ballPhysics';

const colliders = getStaticColliders();

function clear(x: number, z: number, r: number): boolean {
  const [px, pz] = pushOutOfColliders(x, z, r, colliders);
  return Math.hypot(px - x, pz - z) < 1e-6;
}

describe('gameplay spots are clear of colliders (incl. city decor)', () => {
  it('race start and the soccer kick-off', () => {
    expect(clear(RACE.start.x, RACE.start.z, VEHICLE.radius)).toBe(true);
    expect(clear(ARENA.carKickoff.x, ARENA.carKickoff.z, VEHICLE.radius)).toBe(true);
  });

  it('the ball spawn has room for the ball', () => {
    expect(clear(ARENA.ballSpawn.x, ARENA.ballSpawn.z, BALL.radius)).toBe(true);
  });

  it('every interactive pad centre fits the car', () => {
    for (const spot of INTERACTIVE_SPOTS) expect(clear(spot.pad.x, spot.pad.z, VEHICLE.radius), spot.id).toBe(true);
  });

  it('every race gate centre fits the car', () => {
    for (const gate of [...RACE.checkpoints, RACE.finish]) expect(clear(gate.x, gate.z, VEHICLE.radius), gate.id).toBe(true);
  });
});

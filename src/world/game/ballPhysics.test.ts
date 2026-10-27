import { describe, expect, it } from 'vitest';
import { ARENA } from '../config/layout';
import { BALL, BALL_BARRIERS, createBall, goalScored, kickBall, onPitch, stepBall, type Ball, type CarBody } from './ballPhysics';

function run(ball: Ball, seconds: number, dt = 1 / 120) {
  for (let t = 0; t < seconds; t += dt) stepBall(ball, dt);
}

describe('stepBall', () => {
  it('rolls to a stop on its own', () => {
    const ball = createBall();
    ball.vx = 6;
    run(ball, 12);
    expect(ball.vx).toBe(0);
    expect(ball.vz).toBe(0);
    expect(onPitch(ball.x, ball.z)).toBe(true);
  });

  it('bounces off the side wall and keeps most of its speed', () => {
    const ball: Ball = { ...createBall(), x: ARENA.pitch.maxX - BALL.radius - 0.2, vx: 10 };
    stepBall(ball, 1 / 30);
    stepBall(ball, 1 / 30);
    expect(ball.vx).toBeLessThan(0);
    expect(Math.abs(ball.vx)).toBeGreaterThan(5);
    expect(ball.x).toBeLessThanOrEqual(ARENA.pitch.maxX - BALL.radius + 1e-6);
  });

  it('never leaves through the entrances in the north wall', () => {
    const entrance = ARENA.entrances[0];
    const ball: Ball = { ...createBall(), x: (entrance.minX + entrance.maxX) / 2, z: ARENA.pitch.minZ + 3, vz: -25 };
    run(ball, 2);
    expect(ball.z).toBeGreaterThanOrEqual(ARENA.pitch.minZ + BALL.radius - 1e-6);
    expect(BALL_BARRIERS).toHaveLength(2);
  });

  it('settles back on the ground after a hop', () => {
    const ball: Ball = { ...createBall(), vy: 6 };
    run(ball, 3);
    expect(ball.y).toBe(0);
    expect(ball.vy).toBe(0);
  });
});

describe('kickBall', () => {
  const car = (overrides: Partial<CarBody> = {}): CarBody => ({ x: 0, z: 0, vx: 0, vz: -10, heading: 0, radius: 0.95, ...overrides });

  it('sends the ball along the car’s path, faster than the car', () => {
    const ball: Ball = { ...createBall(), x: 0, z: -1.9 };
    const body = car();
    const kick = kickBall(ball, body);
    expect(kick).toBeGreaterThan(0);
    expect(ball.vz).toBeLessThan(-10);
    expect(Math.abs(ball.vx)).toBeLessThan(1e-6);
    expect(ball.vy).toBeGreaterThan(0);
    // The car loses a little speed.
    expect(body.vz).toBeGreaterThan(-10);
  });

  it('separates overlapping bodies without a kick when moving apart', () => {
    const ball: Ball = { ...createBall(), x: 0, z: -1.5, vz: -20 };
    const kick = kickBall(ball, car({ vz: -5 }));
    expect(kick).toBe(0);
    expect(Math.hypot(ball.x, ball.z)).toBeCloseTo(BALL.radius + 0.95, 5);
  });

  it('ignores a ball out of reach', () => {
    const ball: Ball = { ...createBall(), x: 0, z: -5 };
    expect(kickBall(ball, car())).toBe(0);
    expect(ball.vz).toBe(0);
  });
});

describe('goalScored', () => {
  it('detects the ball centre inside either net', () => {
    const north = ARENA.goals.north.area;
    const south = ARENA.goals.south.area;
    expect(goalScored({ x: 0, z: (north.minZ + north.maxZ) / 2 })?.id).toBe('north');
    expect(goalScored({ x: 0, z: (south.minZ + south.maxZ) / 2 })?.id).toBe('south');
    expect(goalScored({ x: 0, z: ARENA.center.z })).toBeNull();
  });

  it('a straight shot at the south goal ends up scored', () => {
    const ball: Ball = { ...createBall(), x: 0, z: ARENA.pitch.maxZ - 6, vz: 14 };
    let scored = null;
    for (let i = 0; i < 240 && !scored; i++) {
      stepBall(ball, 1 / 120);
      scored = goalScored(ball);
    }
    expect(scored?.id).toBe('south');
  });
});

// Car-soccer ball: simple 2D physics on the pitch (x/z) plus a purely visual
// hop (y). Pure functions over plain objects so they can be unit tested.

import { ARENA, type GoalDef, type Rect } from '../config/layout';

export interface Ball {
  x: number;
  z: number;
  vx: number;
  vz: number;
  /** Height of the ball's lowest point above the ground (visual only). */
  y: number;
  vy: number;
}

export interface CarBody {
  x: number;
  z: number;
  vx: number;
  vz: number;
  heading: number;
  radius: number;
  boosting?: boolean;
}

export const BALL = {
  radius: ARENA.ballRadius,
  /** Fraction of speed lost per second while rolling. */
  rollDrag: 0.55,
  /** Constant rolling resistance (u/s²). */
  rollFriction: 1.1,
  /** Bounce off walls and posts. */
  restitution: 0.78,
  /** How much of the car's closing speed becomes ball speed (1 + e). */
  kick: 1.65,
  /** Extra push along the car's heading, scaled by its speed. */
  drive: 0.22,
  boostKick: 1.18,
  maxSpeed: 30,
  /** Visual hop: lift per unit of kick speed, gravity and ground bounce. */
  liftPerSpeed: 0.32,
  maxLift: 7,
  gravity: 24,
  groundBounce: 0.42,
} as const;

/** Ball-only barriers across the entrances in the north wall, so the ball cannot roll into the city. */
export const BALL_BARRIERS: Rect[] = ARENA.entrances.map((e) => ({
  minX: e.minX,
  maxX: e.maxX,
  minZ: e.z - ARENA.wallThickness,
  maxZ: e.z,
}));

/** Everything the ball bounces off: pitch walls, goal backs/sides (posts) and the entrance barriers. */
export const BALL_WALLS: Rect[] = [...ARENA.walls, ...BALL_BARRIERS];

export function createBall(): Ball {
  return { x: ARENA.ballSpawn.x, z: ARENA.ballSpawn.z, vx: 0, vz: 0, y: 0, vy: 0 };
}

export function resetBall(ball: Ball): void {
  Object.assign(ball, createBall());
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Push the ball out of a box and reflect its velocity. Returns the impact speed (0 when no contact). */
function bounceBox(ball: Ball, box: Rect, r: number, e: number): number {
  if (ball.x < box.minX - r || ball.x > box.maxX + r || ball.z < box.minZ - r || ball.z > box.maxZ + r) return 0;
  const px = clamp(ball.x, box.minX, box.maxX);
  const pz = clamp(ball.z, box.minZ, box.maxZ);
  const dx = ball.x - px;
  const dz = ball.z - pz;
  const d2 = dx * dx + dz * dz;
  let nx = 0;
  let nz = 0;
  let depth = 0;
  if (d2 >= r * r) return 0;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    nx = dx / d;
    nz = dz / d;
    depth = r - d;
  } else {
    // Centre inside the box: leave through the nearest face.
    const left = ball.x - box.minX;
    const right = box.maxX - ball.x;
    const top = ball.z - box.minZ;
    const bottom = box.maxZ - ball.z;
    const m = Math.min(left, right, top, bottom);
    if (m === left) [nx, depth] = [-1, left + r];
    else if (m === right) [nx, depth] = [1, right + r];
    else if (m === top) [nz, depth] = [-1, top + r];
    else [nz, depth] = [1, bottom + r];
  }
  ball.x += nx * depth;
  ball.z += nz * depth;
  const vn = ball.vx * nx + ball.vz * nz;
  if (vn >= 0) return 0;
  ball.vx -= (1 + e) * vn * nx;
  ball.vz -= (1 + e) * vn * nz;
  return -vn;
}

/**
 * Car → ball contact. The car is treated as much heavier than the ball: the
 * ball takes the closing speed (with bounce), plus a push along the car's
 * nose so driving straight through it is a satisfying shot. Moves the ball out
 * of the car and slows the car a touch. Returns the kick speed (0 if no touch).
 */
export function kickBall(ball: Ball, car: CarBody): number {
  const r = BALL.radius + car.radius;
  const dx = ball.x - car.x;
  const dz = ball.z - car.z;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return 0;
  const d = Math.sqrt(d2) || 1e-6;
  const nx = d2 > 1e-10 ? dx / d : -Math.sin(car.heading);
  const nz = d2 > 1e-10 ? dz / d : -Math.cos(car.heading);
  // Separate: the ball moves out of the car.
  const depth = r - d;
  ball.x += nx * depth;
  ball.z += nz * depth;
  const closing = (car.vx - ball.vx) * nx + (car.vz - ball.vz) * nz;
  if (closing <= 0) return 0;
  const fx = -Math.sin(car.heading);
  const fz = -Math.cos(car.heading);
  const carSpeed = Math.hypot(car.vx, car.vz);
  const along = Math.max(0, fx * nx + fz * nz);
  const boost = car.boosting ? BALL.boostKick : 1;
  const kvx = nx * closing * BALL.kick * boost + fx * carSpeed * BALL.drive * along;
  const kvz = nz * closing * BALL.kick * boost + fz * carSpeed * BALL.drive * along;
  ball.vx += kvx;
  ball.vz += kvz;
  const speed = Math.hypot(ball.vx, ball.vz);
  if (speed > BALL.maxSpeed) {
    ball.vx *= BALL.maxSpeed / speed;
    ball.vz *= BALL.maxSpeed / speed;
  }
  // A little hop on hard hits (visual).
  ball.vy = Math.max(ball.vy, Math.min(BALL.maxLift, closing * BALL.liftPerSpeed));
  // Recoil: the car loses a little of its closing speed.
  car.vx -= nx * closing * 0.12;
  car.vz -= nz * closing * 0.12;
  return closing;
}

/** Advance the ball by `dt`: roll drag, walls (any height), hop. Returns the strongest wall impact. */
export function stepBall(ball: Ball, dt: number, walls: readonly Rect[] = BALL_WALLS): number {
  ball.x += ball.vx * dt;
  ball.z += ball.vz * dt;
  // Rolling resistance (less while airborne).
  const speed = Math.hypot(ball.vx, ball.vz);
  if (speed > 0) {
    const airborne = ball.y > 0.05;
    const drag = airborne ? BALL.rollDrag * 0.25 : BALL.rollDrag;
    const friction = airborne ? 0 : BALL.rollFriction;
    const next = Math.max(0, speed * Math.exp(-drag * dt) - friction * dt);
    const k = speed > 1e-6 ? next / speed : 0;
    ball.vx *= k;
    ball.vz *= k;
    if (next < 0.04) ball.vx = ball.vz = 0;
  }
  let impact = 0;
  for (let i = 0; i < 2; i++) {
    for (const wall of walls) impact = Math.max(impact, bounceBox(ball, wall, BALL.radius, BALL.restitution));
  }
  // Safety net: never leave the pitch (or the goals).
  const { pitch } = ARENA;
  const inGoal = goalScored(ball) !== null;
  if (!inGoal) {
    const r = BALL.radius;
    if (ball.x < pitch.minX + r) [ball.x, ball.vx] = [pitch.minX + r, Math.abs(ball.vx) * BALL.restitution];
    if (ball.x > pitch.maxX - r) [ball.x, ball.vx] = [pitch.maxX - r, -Math.abs(ball.vx) * BALL.restitution];
    const outsideMouth = Math.abs(ball.x) > ARENA.goals.north.width / 2;
    if (outsideMouth && ball.z < pitch.minZ + r) [ball.z, ball.vz] = [pitch.minZ + r, Math.abs(ball.vz) * BALL.restitution];
    if (outsideMouth && ball.z > pitch.maxZ - r) [ball.z, ball.vz] = [pitch.maxZ - r, -Math.abs(ball.vz) * BALL.restitution];
  }
  // Visual hop.
  if (ball.y > 0 || ball.vy > 0) {
    ball.vy -= BALL.gravity * dt;
    ball.y += ball.vy * dt;
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = ball.vy < -2 ? -ball.vy * BALL.groundBounce : 0;
    }
  }
  return impact;
}

/** The goal whose net the ball's centre is in, or null. */
export function goalScored(ball: Pick<Ball, 'x' | 'z'>): GoalDef | null {
  for (const goal of [ARENA.goals.north, ARENA.goals.south]) {
    const a = goal.area;
    if (ball.x >= a.minX && ball.x <= a.maxX && ball.z >= a.minZ && ball.z <= a.maxZ) return goal;
  }
  return null;
}

/** True when (x, z) is on the pitch (inside the walls). */
export function onPitch(x: number, z: number, margin = 0): boolean {
  const p = ARENA.pitch;
  return x >= p.minX - margin && x <= p.maxX + margin && z >= p.minZ - margin && z <= p.maxZ + margin;
}

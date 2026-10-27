// Arcade vehicle model: a velocity vector with strong lateral grip (so it
// steers like a toy car but can slide a little), speed-scaled steering, boost,
// brake/reverse, drag, and circle-vs-collider push-out with wall sliding.
// Pure functions over plain objects so they are easy to reason about and test.

import type { Collider } from '../config/colliders';
import { clampToIsland } from '../config/layout';
import type { CarState } from './runtime';
import { VEHICLE } from './tuning';

/** Per-car handling (same keys as VEHICLE). */
export type Tuning = { readonly [K in keyof typeof VEHICLE]: number };

export interface DriveControls {
  /** -1 (reverse/brake) … 1 (accelerate). */
  throttle: number;
  /** -1 (right) … 1 (left). */
  steer: number;
  boost: boolean;
  brake: boolean;
}

export const clamp = (value: number, min: number, max: number) => (value < min ? min : value > max ? max : value);
const clamp01 = (value: number) => clamp(value, 0, 1);

function approach(value: number, target: number, maxDelta: number): number {
  return value < target ? Math.min(value + maxDelta, target) : Math.max(value - maxDelta, target);
}

/** Wrap an angle to (-π, π]. */
export function wrapAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  let a = (angle + Math.PI) % twoPi;
  if (a < 0) a += twoPi;
  return a - Math.PI;
}

/** Heading (three.js rotation.y) that faces from (x, z) toward (tx, tz). */
export function headingTo(x: number, z: number, tx: number, tz: number): number {
  return Math.atan2(-(tx - x), -(tz - z));
}

/** Advance the car by one (small) time step. Does not resolve collisions. */
export function stepCar(car: CarState, ctl: DriveControls, dt: number, V: Tuning = VEHICLE): void {
  const sinH = Math.sin(car.heading);
  const cosH = Math.cos(car.heading);
  const fx = -sinH;
  const fz = -cosH;
  const rx = cosH;
  const rz = -sinH;
  let vf = car.vx * fx + car.vz * fz;
  let vr = car.vx * rx + car.vz * rz;

  // Steering input eases in, and snaps back a little faster when released.
  const steerTarget = clamp(ctl.steer, -1, 1);
  const releasing = steerTarget === 0 || Math.sign(steerTarget) !== Math.sign(car.steer);
  car.steer = approach(car.steer, steerTarget, (releasing ? V.steerOut : V.steerIn) * dt);

  // Longitudinal force.
  const t = clamp(ctl.throttle, -1, 1);
  const boosting = ctl.boost && t > 0.1 && vf > -0.5;
  const cap = boosting ? V.boostSpeed : V.maxSpeed;
  let a = 0;
  let braking = false;
  let stopAtZero = false;

  if (ctl.brake) {
    a = -Math.sign(vf) * V.handbrake;
    braking = Math.abs(vf) > 0.3;
    stopAtZero = true;
  } else if (t > 0.01) {
    if (vf < -0.3) {
      a = V.brake * t;
      braking = true;
      stopAtZero = true;
    } else if (vf < cap) {
      const headroom = clamp01((cap - vf) / (cap * 0.42));
      a = (boosting ? V.boostAccel : V.accel) * t * Math.max(0.12, headroom);
    } else {
      a = -V.overspeedDrag;
    }
  } else if (t < -0.01) {
    if (vf > 0.3) {
      a = V.brake * t;
      braking = true;
      stopAtZero = true;
    } else if (vf > -V.maxReverse) {
      const headroom = clamp01((vf + V.maxReverse) / (V.maxReverse * 0.42));
      a = V.reverseAccel * t * Math.max(0.12, headroom);
    }
  } else {
    a = -Math.sign(vf) * (V.coastDrag + V.linearDrag * Math.abs(vf));
    stopAtZero = true;
  }

  let next = vf + a * dt;
  if (stopAtZero && vf !== 0 && Math.sign(next) !== Math.sign(vf)) next = 0;
  if (t > 0 && vf <= cap && next > cap) next = cap;
  if (next < -V.maxReverse) next = Math.max(next, Math.min(vf, -V.maxReverse));
  car.accel = (next - vf) / dt;
  vf = next;

  // Lateral grip pulls the velocity back in line with the heading.
  const grip = ctl.brake ? V.handbrakeGrip : V.grip;
  vr *= Math.max(0, 1 - grip * dt);

  // Yaw: speed-scaled steering, softened at boost speed, plus a slow pivot near standstill.
  const speedAbs = Math.abs(vf);
  const falloff =
    1 - V.highSpeedSteerFalloff * clamp01((speedAbs - V.maxSpeed * 0.6) / (V.boostSpeed - V.maxSpeed * 0.6));
  const authority = Math.min(1, speedAbs / V.steerFullSpeed) * falloff;
  const direction = vf < -0.05 ? -1 : 1;
  let yawRate = car.steer * V.steerRate * authority * direction;
  yawRate += (1 - Math.min(1, speedAbs / 2.5)) * car.steer * V.pivotRate * direction;
  if (ctl.brake && speedAbs > 3) yawRate *= 1.25;
  car.yawRate = yawRate;
  car.heading = wrapAngle(car.heading + yawRate * dt);

  // Recompose with the previous basis: the velocity lags the new heading slightly (drift).
  car.vx = fx * vf + rx * vr;
  car.vz = fz * vf + rz * vr;
  car.x += car.vx * dt;
  car.z += car.vz * dt;

  car.throttle = t;
  car.boosting = boosting;
  car.braking = braking;
  car.reversing = vf < -0.3 && t < -0.01;
}

/** Signed speed along the current heading. */
export function forwardSpeedOf(car: CarState): number {
  return car.vx * -Math.sin(car.heading) + car.vz * -Math.cos(car.heading);
}

function applyContact(car: CarState, nx: number, nz: number, dt: number): number {
  const vn = car.vx * nx + car.vz * nz;
  if (vn >= 0) return 0;
  // Remove the into-wall component (a small bounce on hard head-on hits) and scrape.
  const restitution = -vn > 6 ? 0.2 : 0;
  car.vx -= (1 + restitution) * vn * nx;
  car.vz -= (1 + restitution) * vn * nz;
  const keep = Math.max(0, 1 - VEHICLE.wallFriction * dt);
  car.vx *= keep;
  car.vz *= keep;
  return -vn;
}

/**
 * Push the car's collision circle out of every collider and the island edge.
 * Returns the strongest impact speed of this step (0 when nothing was hit).
 */
export function resolveCollisions(car: CarState, colliders: readonly Collider[], dt: number): number {
  const r = VEHICLE.radius;
  let impact = 0;
  for (let iteration = 0; iteration < 3; iteration++) {
    let touched = false;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      let nx = 0;
      let nz = 0;
      let depth = 0;
      if (c.kind === 'box') {
        if (car.x < c.minX - r || car.x > c.maxX + r || car.z < c.minZ - r || car.z > c.maxZ + r) continue;
        const px = clamp(car.x, c.minX, c.maxX);
        const pz = clamp(car.z, c.minZ, c.maxZ);
        const dx = car.x - px;
        const dz = car.z - pz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-10) {
          const d = Math.sqrt(d2);
          nx = dx / d;
          nz = dz / d;
          depth = r - d;
        } else {
          // Centre inside the box: leave through the nearest face.
          const left = car.x - c.minX;
          const right = c.maxX - car.x;
          const top = car.z - c.minZ;
          const bottom = c.maxZ - car.z;
          const m = Math.min(left, right, top, bottom);
          if (m === left) [nx, depth] = [-1, left + r];
          else if (m === right) [nx, depth] = [1, right + r];
          else if (m === top) [nz, depth] = [-1, top + r];
          else [nz, depth] = [1, bottom + r];
        }
      } else {
        const dx = car.x - c.x;
        const dz = car.z - c.z;
        const reach = r + c.r;
        const d2 = dx * dx + dz * dz;
        if (d2 >= reach * reach) continue;
        if (d2 > 1e-10) {
          const d = Math.sqrt(d2);
          nx = dx / d;
          nz = dz / d;
          depth = reach - d;
        } else {
          nz = 1;
          depth = reach;
        }
      }
      car.x += nx * depth;
      car.z += nz * depth;
      impact = Math.max(impact, applyContact(car, nx, nz, dt));
      touched = true;
    }

    const [cx, cz] = clampToIsland(car.x, car.z);
    if (cx !== car.x || cz !== car.z) {
      const dx = cx - car.x;
      const dz = cz - car.z;
      const d = Math.hypot(dx, dz);
      car.x = cx;
      car.z = cz;
      if (d > 1e-10) impact = Math.max(impact, applyContact(car, dx / d, dz / d, dt));
      touched = true;
    }
    if (!touched) break;
  }
  car.forwardSpeed = forwardSpeedOf(car);
  return impact;
}

/** Nearest point to (x, z) where a circle of radius `r` overlaps no collider and stays on the island. */
export function pushOutOfColliders(x: number, z: number, r: number, colliders: readonly Collider[]): [number, number] {
  let px = x;
  let pz = z;
  for (let iteration = 0; iteration < 6; iteration++) {
    let moved = false;
    for (const c of colliders) {
      if (c.kind === 'box') {
        const qx = clamp(px, c.minX, c.maxX);
        const qz = clamp(pz, c.minZ, c.maxZ);
        const dx = px - qx;
        const dz = pz - qz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-10) {
          const d = Math.sqrt(d2);
          px = qx + (dx / d) * r;
          pz = qz + (dz / d) * r;
        } else {
          const left = px - c.minX;
          const right = c.maxX - px;
          const top = pz - c.minZ;
          const bottom = c.maxZ - pz;
          const m = Math.min(left, right, top, bottom);
          if (m === left) px = c.minX - r;
          else if (m === right) px = c.maxX + r;
          else if (m === top) pz = c.minZ - r;
          else pz = c.maxZ + r;
        }
        moved = true;
      } else {
        const dx = px - c.x;
        const dz = pz - c.z;
        const reach = r + c.r;
        const d2 = dx * dx + dz * dz;
        if (d2 >= reach * reach) continue;
        const d = Math.sqrt(d2) || 1e-6;
        px = c.x + (dx / d) * reach;
        pz = c.z + (dz / d) * reach;
        moved = true;
      }
    }
    const [cx, cz] = clampToIsland(px, pz);
    if (cx !== px || cz !== pz) moved = true;
    px = cx;
    pz = cz;
    if (!moved) break;
  }
  return [px, pz];
}

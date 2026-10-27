// Click/tap-to-drive: turns the planned route into throttle and steering,
// slowing for corners and the final stop, and giving up gracefully when stuck.

import type { Collider } from '../config/colliders';
import { buildNavGrid, findPath, nearestDrivable, type NavGrid } from './navigation';
import { clamp, headingTo, pushOutOfColliders, wrapAngle, type DriveControls } from './physics';
import { runtime, type Waypoint } from './runtime';
import { AUTOPILOT, VEHICLE } from './tuning';

let grid: NavGrid | null = null;

function navGrid(colliders: readonly Collider[]): NavGrid {
  if (!grid || grid.colliders !== colliders) grid = buildNavGrid(colliders, VEHICLE.radius + 0.12);
  return grid;
}

/** Free point near (x, z) where the vehicle fits, or null when nothing is reachable. */
export function snapTarget(x: number, z: number, colliders: readonly Collider[]): [number, number] | null {
  const [px, pz] = pushOutOfColliders(x, z, VEHICLE.radius + 0.15, colliders);
  return nearestDrivable(navGrid(colliders), px, pz);
}

/** Plan a route to (x, z) and engage the autopilot. Returns false when no target is reachable. */
export function engageAutopilot(x: number, z: number, colliders: readonly Collider[]): boolean {
  const snapped = snapTarget(x, z, colliders);
  if (!snapped) return false;
  const [tx, tz] = snapped;
  const car = runtime.car;
  const path = findPath(navGrid(colliders), car.x, car.z, tx, tz) ?? [{ x: tx, z: tz }];
  const ap = runtime.autopilot;
  ap.active = true;
  ap.path = path;
  ap.index = 0;
  ap.targetX = tx;
  ap.targetZ = tz;
  ap.best = Infinity;
  ap.lastProgress = runtime.time;
  const marker = runtime.marker;
  marker.visible = true;
  marker.x = tx;
  marker.z = tz;
  marker.serial++;
  return true;
}

function remainingDistance(x: number, z: number, path: Waypoint[], index: number): number {
  let total = Math.hypot(path[index].x - x, path[index].z - z);
  for (let i = index + 1; i < path.length; i++) total += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
  return total;
}

/**
 * Fill `out` with autopilot controls. Returns false (and disengages) when the
 * target was reached or the route is blocked.
 */
export function autopilotControls(out: DriveControls): boolean {
  const ap = runtime.autopilot;
  const car = runtime.car;
  if (!ap.active || ap.path.length === 0) return false;

  let wp = ap.path[ap.index];
  let dist = Math.hypot(wp.x - car.x, wp.z - car.z);
  while (ap.index < ap.path.length - 1 && dist < AUTOPILOT.waypointRadius) {
    ap.index++;
    wp = ap.path[ap.index];
    dist = Math.hypot(wp.x - car.x, wp.z - car.z);
  }
  const last = ap.index === ap.path.length - 1;
  const remaining = remainingDistance(car.x, car.z, ap.path, ap.index);

  if (last && (dist < AUTOPILOT.arriveRadius || (dist < 1.3 && Math.abs(car.forwardSpeed) < 0.6))) {
    ap.active = false;
    runtime.marker.visible = false;
    return false;
  }

  if (remaining < ap.best - 0.25) {
    ap.best = remaining;
    ap.lastProgress = runtime.time;
  } else if (runtime.time - ap.lastProgress > AUTOPILOT.stuckSeconds) {
    ap.active = false;
    runtime.marker.visible = false;
    return false;
  }

  const diff = wrapAngle(headingTo(car.x, car.z, wp.x, wp.z) - car.heading);
  let target = Math.min(AUTOPILOT.maxSpeed, Math.sqrt(2 * AUTOPILOT.arriveDecel * Math.max(0, remaining - 0.35)));
  if (!last) {
    const next = ap.path[ap.index + 1];
    const legIn = Math.atan2(wp.z - car.z, wp.x - car.x);
    const legOut = Math.atan2(next.z - wp.z, next.x - wp.x);
    const turn = Math.abs(wrapAngle(legOut - legIn));
    const cornerSpeed = AUTOPILOT.maxSpeed + (3.6 - AUTOPILOT.maxSpeed) * clamp(turn / 1.7, 0, 1);
    target = Math.min(target, Math.sqrt(cornerSpeed * cornerSpeed + 2 * AUTOPILOT.arriveDecel * dist));
  }
  target *= clamp(1.2 - Math.abs(diff) / 1.5, 0.2, 1);

  out.steer = clamp(diff * AUTOPILOT.steerGain, -1, 1);
  out.throttle = clamp((target - car.forwardSpeed) * 0.55, -1, 1);
  out.boost = false;
  out.brake = false;
  return true;
}

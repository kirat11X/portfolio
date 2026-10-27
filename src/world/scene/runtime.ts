// Mutable per-frame gameplay state shared by the input handlers, the
// simulation, the vehicle visuals and the camera rig. Kept outside React so
// nothing here ever triggers a re-render. Reset whenever a world instance mounts.

import { DISTRICTS, type DistrictId } from '../config/layout';
import { vehiclePose } from '../state/worldStore';

export interface DriveKeys {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  boost: boolean;
  brake: boolean;
}

export interface CarState {
  x: number;
  z: number;
  heading: number;
  /** World-space velocity. */
  vx: number;
  vz: number;
  /** Signed speed along the heading. */
  forwardSpeed: number;
  /** Smoothed steering input, -1 (right) .. 1 (left). */
  steer: number;
  yawRate: number;
  /** Longitudinal acceleration of the last step (u/s²), for body pitch. */
  accel: number;
  braking: boolean;
  reversing: boolean;
  boosting: boolean;
  throttle: number;
  /** Strength of the most recent impact (u/s), decays over time. */
  impact: number;
}

export interface Waypoint {
  x: number;
  z: number;
}

export type TravelPhase = 'idle' | 'out' | 'in';

function freshCar(): CarState {
  const { x, z, heading } = DISTRICTS.hub.spawn;
  return {
    x,
    z,
    heading,
    vx: 0,
    vz: 0,
    forwardSpeed: 0,
    steer: 0,
    yawRate: 0,
    accel: 0,
    braking: false,
    reversing: false,
    boosting: false,
    throttle: 0,
    impact: 0,
  };
}

export const runtime = {
  keys: { forward: false, backward: false, left: false, right: false, boost: false, brake: false } as DriveKeys,
  car: freshCar(),
  /** Simulation clock (seconds), advances only while frames render. */
  time: 0,
  autopilot: {
    active: false,
    path: [] as Waypoint[],
    index: 0,
    targetX: 0,
    targetZ: 0,
    best: Infinity,
    lastProgress: 0,
  },
  marker: {
    /** 0 hidden … 1 fully shown; animated by the marker itself. */
    visible: false,
    x: 0,
    z: 0,
    /** Bumped on every new target so the marker can replay its intro. */
    serial: 0,
    /** Spawn pulse after quick travel. */
    burstSerial: 0,
    burstX: 0,
    burstZ: 0,
  },
  camera: {
    orbit: 0,
    pitchOffset: 0,
    zoom: 1,
    dragging: false,
    /** Jump straight to the goal pose on the next frame (teleports, reduced-motion cuts). */
    snap: false,
    /** Idle showcase: the camera revolves around the whole city; the vehicle holds still. */
    showcase: false,
    /** Current camera mode, for QA ('orbit' | 'intro' | 'follow' | 'showcase'). */
    mode: 'orbit' as string,
    /** Camera position of the last frame (QA). */
    eye: { x: 0, y: 0, z: 0 },
    /** After quick travel: face the district's landmark until the visitor drives away. */
    arrival: { active: false, azimuth: 0, x: 0, z: 0 },
    /**
     * Close-up on a prop (the gaming PC monitor): looks at `look` from along the
     * prop's front normal (nx, nz), far enough to fit `fitWidth` × `fitHeight`
     * on screen. Esc or driving returns.
     */
    closeup: { active: false, id: '', look: { x: 0, y: 0, z: 0 }, nx: 0, nz: 1, fitWidth: 2.4, fitHeight: 1.4 },
    /** Screen area (px) covered by the exhibit panel, so framing can avoid it. */
    insetRight: 0,
    insetBottom: 0,
  },
  travel: {
    phase: 'idle' as TravelPhase,
    t: 0,
    district: 'hub' as DistrictId,
    /** Fade-travel to a spot that is not a district spawn (arena kick-off, race start). */
    spot: null as { x: number; z: number; heading: number } | null,
  },
  pointer: {
    /** Mouse is over the canvas (for hover refresh while the camera moves). */
    inside: false,
  },
  /** Last district toast shown, so HUD remounts do not repeat it. */
  lastToast: null as { id: DistrictId; at: number } | null,
};

export function resetRuntime(): void {
  const keys = runtime.keys;
  keys.forward = keys.backward = keys.left = keys.right = keys.boost = keys.brake = false;
  runtime.car = freshCar();
  runtime.time = 0;
  Object.assign(runtime.autopilot, { active: false, path: [], index: 0, best: Infinity, lastProgress: 0 });
  runtime.marker.visible = false;
  Object.assign(runtime.camera, { orbit: 0, pitchOffset: 0, zoom: 1, dragging: false, snap: false, insetRight: 0, insetBottom: 0 });
  runtime.camera.arrival = { active: false, azimuth: 0, x: 0, z: 0 };
  runtime.camera.showcase = false;
  runtime.camera.closeup.active = false;
  runtime.camera.mode = 'orbit';
  Object.assign(runtime.travel, { phase: 'idle', t: 0, district: 'hub', spot: null });
  runtime.lastToast = null;
  syncPose();
}

export function clearKeys(): void {
  const keys = runtime.keys;
  keys.forward = keys.backward = keys.left = keys.right = keys.boost = keys.brake = false;
}

export function anyDriveKey(): boolean {
  const k = runtime.keys;
  return k.forward || k.backward || k.left || k.right;
}

/** Copy the simulated car into the shared `vehiclePose` read by the HUD and city art. */
export function syncPose(): void {
  const car = runtime.car;
  vehiclePose.x = car.x;
  vehiclePose.z = car.z;
  vehiclePose.heading = car.heading;
  vehiclePose.speed = car.forwardSpeed;
}

export function cancelAutopilot(): void {
  const ap = runtime.autopilot;
  if (!ap.active) return;
  ap.active = false;
  ap.path = [];
  runtime.marker.visible = false;
}

/** Place the vehicle at rest. */
export function placeCar(x: number, z: number, heading: number): void {
  const car = runtime.car;
  car.x = x;
  car.z = z;
  car.heading = heading;
  car.vx = car.vz = car.forwardSpeed = 0;
  car.steer = car.yawRate = car.accel = car.throttle = 0;
  car.braking = car.reversing = car.boosting = false;
  syncPose();
}

export function resetCameraControls(): void {
  runtime.camera.orbit = 0;
  runtime.camera.pitchOffset = 0;
  runtime.camera.zoom = 1;
}

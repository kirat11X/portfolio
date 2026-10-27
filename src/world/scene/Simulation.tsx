import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { useLoadingStore } from '@/lib/loadingStore';
import { getReducedMotion } from '@/lib/motion';
import type { Collider } from '../config/colliders';
import { WORLD_EXHIBITS } from '../config/exhibits';
import { DISTRICTS, INTERACTIVE_SPOTS, PORTALS, districtAt, type DistrictId } from '../config/layout';
import { isArcadeOpen } from '../arcade/arcadeStore';
import { currentTuning } from '../game/cars';
import { isRacing, raceHoldsCar, updateRace, useRaceStore } from '../game/raceStore';
import { stepSoccer, updateSoccerFrame } from '../game/soccerStore';
import { useWorldStore } from '../state/worldStore';
import { autopilotControls } from './autopilot';
import { resolveCollisions, stepCar, type DriveControls } from './physics';
import { cancelAutopilot, placeCar, runtime, syncPose } from './runtime';
import { stopShowcase } from './showcase';
import { TRAVEL } from './tuning';

const MAX_FRAME = 0.1;
const SUBSTEP = 1 / 60;

function teleport(district: DistrictId) {
  const spot = runtime.travel.spot;
  const { x, z, heading } = spot ?? DISTRICTS[district].spawn;
  runtime.travel.spot = null;
  runtime.camera.closeup.active = false;
  placeCar(x, z, heading);
  runtime.camera.snap = true;
  // Spawns face their district, so looking along the spawn heading frames its sign and doors.
  runtime.camera.arrival = { active: !spot && district !== 'hub', azimuth: heading, x, z };
  runtime.camera.orbit = 0;
  const marker = runtime.marker;
  marker.burstX = x;
  marker.burstZ = z;
  marker.burstSerial++;
}

/** A spot travel is fading out (so it is not restarted every frame). */
let spotPending = false;

/** Consume quick-travel requests and run the short dip-to-dark transition. */
function updateTravel(dt: number, fade: HTMLDivElement | null) {
  const store = useWorldStore.getState();
  const travel = runtime.travel;
  const request = store.travel;
  // A spot request (arena, race start) arrives through runtime.travel.spot.
  const spotRequest = !request && runtime.travel.spot !== null && travel.phase === 'idle' && !spotPending;
  if (request && isRacing()) {
    // No shortcuts during the time trial.
    store.clearTravel();
    useRaceStore.getState().say('Quick travel is off during the race. Press Esc to quit the race.');
    return;
  }
  if (request || spotRequest) {
    if (request) {
      store.clearTravel();
      runtime.travel.spot = null;
      travel.district = request.district;
    }
    spotPending = spotRequest;
    stopShowcase();
    cancelAutopilot();
    if (getReducedMotion()) {
      teleport(travel.district);
      spotPending = false;
      travel.phase = 'idle';
      if (fade) fade.style.opacity = '0';
      return;
    }
    if (travel.phase === 'in') {
      // Restart the fade from the current darkness so there is no flash.
      travel.t = (1 - travel.t / TRAVEL.fadeIn) * TRAVEL.fadeOut;
    } else if (travel.phase === 'idle') {
      travel.t = 0;
    }
    travel.phase = 'out';
  }

  if (travel.phase === 'out') {
    travel.t += dt;
    const k = Math.min(1, travel.t / TRAVEL.fadeOut);
    if (fade) fade.style.opacity = String(k);
    if (k >= 1) {
      teleport(travel.district);
      spotPending = false;
      travel.phase = 'in';
      travel.t = 0;
    }
  } else if (travel.phase === 'in') {
    travel.t += dt;
    const k = Math.min(1, travel.t / TRAVEL.fadeIn);
    if (fade) fade.style.opacity = String(1 - k * k);
    if (k >= 1) {
      travel.phase = 'idle';
      if (fade) fade.style.opacity = '0';
    }
  }
}

/** Focus the exhibit pad or door trigger the vehicle is on, and track the district. */
function updateProximity(x: number, z: number) {
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const exhibit of WORLD_EXHIBITS) {
    const pad = exhibit.slot.pad;
    const d = Math.hypot(x - pad.x, z - pad.z);
    if (d < pad.radius && d < bestDistance) {
      best = exhibit.id;
      bestDistance = d;
    }
  }
  for (const portal of PORTALS) {
    const trigger = portal.trigger;
    const d = Math.hypot(x - trigger.x, z - trigger.z);
    if (d < trigger.radius && d < bestDistance) {
      best = portal.id;
      bestDistance = d;
    }
  }
  for (const spot of INTERACTIVE_SPOTS) {
    const pad = spot.pad;
    const d = Math.hypot(x - pad.x, z - pad.z);
    if (d < pad.radius && d < bestDistance) {
      best = spot.id;
      bestDistance = d;
    }
  }
  const store = useWorldStore.getState();
  store.setFocused(best);
  store.setActiveDistrict(districtAt(x, z));
}

interface SimulationProps {
  colliders: readonly Collider[];
  fadeRef: RefObject<HTMLDivElement | null>;
}

/** Runs first every frame: input → autopilot → physics → pose → proximity → travel. */
export function Simulation({ colliders, fadeRef }: SimulationProps) {
  const controlsRef = useRef<DriveControls>({ throttle: 0, steer: 0, boost: false, brake: false });

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const frame = Math.min(delta, MAX_FRAME);
    runtime.time += frame;
    updateTravel(frame, fadeRef.current);

    const entered = useLoadingStore.getState().entered;
    const keys = runtime.keys;
    // The vehicle holds still while the showcase camera revolves.
    const canDrive =
      entered && runtime.travel.phase !== 'out' && !runtime.camera.showcase && !raceHoldsCar() && !isArcadeOpen() && !runtime.camera.closeup.active;
    controls.throttle = 0;
    controls.steer = 0;
    controls.boost = false;
    controls.brake = false;
    if (canDrive) {
      if (runtime.autopilot.active) {
        autopilotControls(controls);
      } else {
        controls.throttle = (keys.forward ? 1 : 0) - (keys.backward ? 1 : 0);
        controls.steer = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
        controls.boost = keys.boost;
        controls.brake = keys.brake;
      }
    }

    const car = runtime.car;
    const steps = Math.max(1, Math.ceil(frame / SUBSTEP - 1e-6));
    const h = frame / steps;
    const tuning = currentTuning();
    let impact = 0;
    for (let i = 0; i < steps; i++) {
      stepCar(car, controls, h, tuning);
      impact = Math.max(impact, resolveCollisions(car, colliders, h));
      stepSoccer(h);
    }
    car.impact = impact;
    updateSoccerFrame();
    if (entered) updateRace(frame);
    syncPose();
    if (entered) updateProximity(car.x, car.z);
  }, -3);

  return null;
}

// The camera director behind <CameraRig>: a slow establishing orbit behind the
// loader, a cinematic glide on enter, then a damped follow camera (fixed
// north-facing diorama view plus the visitor's orbit/zoom) that lifts itself
// over buildings hiding the vehicle, and frames exhibits when one is selected.
// A plain class so all per-frame mutation stays outside React.

import type { RootState } from '@react-three/fiber';
import { damp, damp3, dampAngle } from 'maath/easing';
import { Vector3, type Object3D, type PerspectiveCamera } from 'three';
import { useLoadingStore } from '@/lib/loadingStore';
import { getReducedMotion } from '@/lib/motion';
import { getExhibit } from '../config/exhibits';
import { ISLAND_CENTER } from '../config/layout';
import { isRacing } from '../game/raceStore';
import { useSoccerStore } from '../game/soccerStore';
import { useWorldStore } from '../state/worldStore';
import { clamp, wrapAngle } from './physics';
import { measureOccluders, segmentOccluded, type Occluder } from './picking';
import { runtime } from './runtime';
import { CAMERA, VEHICLE } from './tuning';

type Mode = 'orbit' | 'intro' | 'follow' | 'showcase';

/** Assumed exhibit panel footprint used to fit it on screen (world units, with margin). */
const PANEL_FIT = { width: 3.8 * 1.2, height: 3.2 * 1.25 };

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function offsetFor(out: Vector3, distance: number, azimuth: number, pitch: number) {
  const flat = Math.cos(pitch) * distance;
  return out.set(Math.sin(azimuth) * flat, Math.sin(pitch) * distance, Math.cos(azimuth) * flat);
}

function navHeightPx(): number {
  if (typeof window === 'undefined') return 72;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;height:var(--nav-h)';
  document.body.appendChild(probe);
  const height = probe.getBoundingClientRect().height || 72;
  probe.remove();
  return height;
}

export class CameraDirector {
  private mode: Mode = 'orbit';
  private pos = new Vector3();
  private look = new Vector3();
  private goalPos = new Vector3();
  private goalLook = new Vector3();
  private lookAhead = new Vector3();
  private tmp = new Vector3();
  private offset = new Vector3();
  private baseAzimuth = { value: 0 };
  private showcaseAngle = 0;
  private showcaseSpin = 0;
  private pitch = { value: CAMERA.pitch as number };
  private fov = { value: CAMERA.fov as number };
  private orbitAngle = 0.55;
  private introStart = 0;
  private introDuration: number = CAMERA.introSeconds;
  private from = { look: new Vector3(), radius: 0, azimuth: 0, pitch: 0 };
  private focusId: string | null = null;
  private transition = 0;
  private shake = 0;
  private hoverClock = 0;
  private lastPos = new Vector3();
  private occluders: Occluder[] = [];
  private navHeight = 72;
  private initialized = false;
  private returningVisitor = false;
  /** Viewport width / height, for aspect-aware arrival framing. */
  private aspect = 1.6;

  /** Read layout facts from the page and measure the city's buildings. */
  measure(scene: Object3D): void {
    this.navHeight = navHeightPx();
    this.occluders = measureOccluders(scene);
  }

  /** Lowest pitch ≥ `base` from which the vehicle is not hidden by a building. */
  private clearPitch(base: number, distance: number, azimuth: number, lookX: number, lookZ: number): number {
    if (this.occluders.length === 0) return base;
    const car = runtime.car;
    for (let pitch = base; pitch < CAMERA.maxPitch; pitch += 0.07) {
      offsetFor(this.offset, distance, azimuth, pitch);
      if (!segmentOccluded(this.occluders, car.x, 0.9, car.z, lookX + this.offset.x, 0.6 + this.offset.y, lookZ + this.offset.z)) return pitch;
    }
    return CAMERA.maxPitch;
  }

  private computeFollow(dt: number) {
    const car = runtime.car;
    const control = runtime.camera;
    const ahead = clamp(car.forwardSpeed * CAMERA.lookAheadPerSpeed, -2.5, CAMERA.maxLookAhead);
    this.tmp.set(-Math.sin(car.heading) * ahead, 0, -Math.cos(car.heading) * ahead);
    damp3(this.lookAhead, this.tmp, 0.45, dt);
    // Arrival framing ends once the visitor drives away from the spawn point.
    const arrival = control.arrival;
    if (arrival.active && Math.hypot(car.x - arrival.x, car.z - arrival.z) > 6) arrival.active = false;
    // During the time trial and on the soccer pitch the camera chases from behind
    // the car (so "forward" is always up the screen); otherwise the diorama faces north.
    const racing = isRacing();
    const chase = racing || useSoccerStore.getState().inArena;
    const baseGoal = arrival.active ? arrival.azimuth : chase ? car.heading : 0;
    if (control.snap) this.baseAzimuth.value = baseGoal;
    else dampAngle(this.baseAzimuth, 'value', baseGoal, racing ? 0.45 : chase ? 0.6 : 0.9, dt);
    const azimuth = this.baseAzimuth.value + control.orbit;
    const bias = arrival.active ? CAMERA.arrivalBias : CAMERA.lookBias;
    // Portrait screens show less width and the HUD toolbar sits lower: lift the
    // arrival look point and pull back a little so the landmark sign stays clear.
    const portrait = clamp(1.25 - this.aspect, 0, 0.8);
    this.goalLook.set(
      car.x + this.lookAhead.x - Math.sin(azimuth) * bias,
      0.6 + (arrival.active ? portrait * 4.5 : 0),
      car.z + this.lookAhead.z - Math.cos(azimuth) * bias,
    );
    const distance = CAMERA.distance * control.zoom * (arrival.active ? CAMERA.arrivalZoom * (1 + portrait * 0.18) : 1);
    const base = clamp((arrival.active ? CAMERA.arrivalPitch : CAMERA.pitch) + control.pitchOffset, 0.45, CAMERA.maxPitch);
    const needed = this.clearPitch(base, distance, azimuth, this.goalLook.x, this.goalLook.z);
    damp(this.pitch, 'value', needed, needed > this.pitch.value ? 0.22 : 0.6, dt);
    offsetFor(this.offset, distance, azimuth, this.pitch.value);
    this.goalPos.copy(this.goalLook).add(this.offset);
    return { distance, azimuth, pitch: this.pitch.value };
  }

  private computeFocus(camera: PerspectiveCamera, id: string, width: number, height: number): boolean {
    const exhibit = getExhibit(id);
    if (!exhibit) return false;
    const { x, z, rotationY } = exhibit.slot;
    const nx = Math.sin(rotationY);
    const nz = Math.cos(rotationY);
    // Fit the panel inside the part of the screen the HUD leaves free.
    const tanHalf = Math.tan(((camera.fov * Math.PI) / 180) / 2);
    const freeLeft = 0;
    const freeTop = this.navHeight;
    const freeWidth = Math.max(160, width - runtime.camera.insetRight);
    const freeHeight = Math.max(160, height - runtime.camera.insetBottom - freeTop);
    const distance = Math.max(
      CAMERA.focusDistance,
      (PANEL_FIT.width * height) / (2 * tanHalf * freeWidth),
      (PANEL_FIT.height * height) / (2 * tanHalf * freeHeight),
    );
    const worldPerPx = (2 * distance * tanHalf) / height;
    const offsetX = (freeLeft + freeWidth / 2 - width / 2) * worldPerPx;
    const offsetY = (freeTop + freeHeight / 2 - height / 2) * worldPerPx;
    // Farther shots (narrow screens) rise so they look over the exhibits across the plaza.
    const elevation =
      Math.atan2(CAMERA.focusHeight, CAMERA.focusDistance) + 0.32 * clamp((distance - CAMERA.focusDistance) / 8, 0, 1);
    const sinE = Math.sin(elevation);
    const cosE = Math.cos(elevation);
    // Shift the look point so the panel lands in the centre of the free area:
    // camera right is (nz, 0, -nx); camera up is (-nx·sinE, cosE, -nz·sinE).
    this.goalLook.set(
      x - nz * offsetX - nx * sinE * offsetY,
      CAMERA.panelCenterY + cosE * offsetY,
      z + nx * offsetX - nz * sinE * offsetY,
    );
    this.goalPos.set(
      this.goalLook.x + nx * cosE * distance,
      this.goalLook.y + sinE * distance,
      this.goalLook.z + nz * cosE * distance,
    );
    return true;
  }

  update(state: RootState, delta: number): void {
    const camera = state.camera as PerspectiveCamera;
    const dt = Math.min(delta, 0.1);
    const reduced = getReducedMotion();
    const loading = useLoadingStore.getState();
    const now = state.clock.elapsedTime;

    // 1. Behind the loader: slow establishing orbit around the island.
    if (!loading.entered) {
      this.mode = 'orbit';
      // enter() marks the session as returning, so remember the state from before it.
      this.returningVisitor = loading.returning;
      if (!reduced) this.orbitAngle += dt * CAMERA.orbitSpeed;
      this.pos.set(ISLAND_CENTER.x + Math.sin(this.orbitAngle) * CAMERA.orbitRadius, CAMERA.orbitHeight, ISLAND_CENTER.z + Math.cos(this.orbitAngle) * CAMERA.orbitRadius);
      this.look.set(ISLAND_CENTER.x, 0, ISLAND_CENTER.z);
      camera.position.copy(this.pos);
      camera.lookAt(this.look);
      this.initialized = true;
      return;
    }

    const selected = useWorldStore.getState().selectedExhibitId;
    const { width, height } = state.size;
    this.aspect = width / Math.max(1, height);

    // 2. Entering: glide from the establishing shot down to the follow camera.
    if (this.mode === 'orbit') {
      // Measured once behind the loader (CameraRig); re-measuring here would put
      // ~130 whole-scene raycasts on the first frame of the enter glide.
      if (this.occluders.length === 0) this.occluders = measureOccluders(state.scene);
      this.introStart = now;
      this.introDuration = this.returningVisitor ? CAMERA.introSecondsReturning : CAMERA.introSeconds;
      this.from.look.copy(this.look);
      this.tmp.copy(this.pos).sub(this.look);
      this.from.radius = this.tmp.length();
      this.from.azimuth = Math.atan2(this.tmp.x, this.tmp.z);
      this.from.pitch = Math.asin(clamp(this.tmp.y / Math.max(this.from.radius, 1e-6), -1, 1));
      this.mode = reduced ? 'follow' : 'intro';
      if (reduced) runtime.camera.snap = true;
      // Pre-settle the follow helpers so the glide ends exactly on the follow pose.
      this.lookAhead.set(0, 0, 0);
    }

    let focusing = false;
    if (this.mode === 'intro') {
      const goal = this.computeFollow(dt);
      const t = clamp((now - this.introStart) / this.introDuration, 0, 1);
      const e = easeInOutCubic(t);
      this.look.lerpVectors(this.from.look, this.goalLook, e);
      const radius = this.from.radius + (goal.distance - this.from.radius) * e;
      const azimuth = this.from.azimuth + wrapAngle(goal.azimuth - this.from.azimuth) * e;
      const pitch = this.from.pitch + (goal.pitch - this.from.pitch) * e;
      offsetFor(this.offset, radius, azimuth, pitch);
      this.pos.copy(this.look).add(this.offset);
      if (t >= 1 || selected || runtime.camera.showcase) this.mode = 'follow';
    } else if (runtime.camera.showcase) {
      // Idle showcase: rise to a cinematic orbit around the island and keep revolving.
      if (this.mode !== 'showcase') {
        this.mode = 'showcase';
        this.showcaseAngle = Math.atan2(this.pos.x - ISLAND_CENTER.x, this.pos.z - ISLAND_CENTER.z);
        this.showcaseSpin = reduced ? 1 : 0;
        if (reduced) runtime.camera.snap = true;
      }
      this.showcaseSpin = Math.min(1, this.showcaseSpin + dt / 3);
      const period = reduced ? CAMERA.showcaseSecondsPerTurnReduced : CAMERA.showcaseSecondsPerTurn;
      this.showcaseAngle += ((Math.PI * 2) / period) * this.showcaseSpin * dt;
      this.goalPos.set(
        ISLAND_CENTER.x + Math.sin(this.showcaseAngle) * CAMERA.showcaseRadius,
        CAMERA.showcaseHeight,
        ISLAND_CENTER.z + Math.cos(this.showcaseAngle) * CAMERA.showcaseRadius,
      );
      this.goalLook.set(ISLAND_CENTER.x, 0, ISLAND_CENTER.z);
      if (runtime.camera.snap) {
        runtime.camera.snap = false;
        this.pos.copy(this.goalPos);
        this.look.copy(this.goalLook);
      } else {
        damp3(this.pos, this.goalPos, 1.3, dt);
        damp3(this.look, this.goalLook, 0.9, dt);
      }
    } else {
      if (this.mode === 'showcase') {
        // Ease back to the follow pose the visitor left (a cut with reduced motion).
        this.mode = 'follow';
        this.transition = 1;
        if (reduced) runtime.camera.snap = true;
      }
      const closeup = runtime.camera.closeup;
      if (closeup.active) {
        // Fit the prop in the free screen area below the navbar, seen slightly from above.
        const tanHalf = Math.tan(((camera.fov * Math.PI) / 180) / 2);
        const freeHeight = Math.max(160, height - this.navHeight);
        const distance = Math.max(
          2.4,
          (closeup.fitWidth * height) / (2 * tanHalf * width),
          (closeup.fitHeight * height) / (2 * tanHalf * freeHeight),
        );
        const elevation = 0.16;
        // Lift the look point so the prop sits in the middle of the area under the navbar.
        const worldPerPx = (2 * distance * tanHalf) / height;
        const lift = (this.navHeight / 2) * worldPerPx;
        this.goalLook.set(closeup.look.x, closeup.look.y + lift, closeup.look.z);
        this.goalPos.set(
          closeup.look.x + closeup.nx * Math.cos(elevation) * distance,
          closeup.look.y + lift + Math.sin(elevation) * distance,
          closeup.look.z + closeup.nz * Math.cos(elevation) * distance,
        );
        focusing = true;
      } else {
        focusing = Boolean(selected) && this.computeFocus(camera, selected as string, width, height);
        if (!focusing) this.computeFollow(dt);
      }
      const focusId = closeup.active ? `closeup:${closeup.id}` : focusing ? selected : null;
      if (focusId !== this.focusId) {
        this.focusId = focusId;
        this.transition = 1;
        if (reduced) runtime.camera.snap = true;
      }
      this.transition = Math.max(0, this.transition - dt / 1.1);
      if (runtime.camera.snap) {
        runtime.camera.snap = false;
        this.pos.copy(this.goalPos);
        this.look.copy(this.goalLook);
        this.lookAhead.set(0, 0, 0);
      } else {
        const smooth = focusing ? CAMERA.focusSmooth : CAMERA.followSmooth + (CAMERA.focusSmooth - CAMERA.followSmooth) * this.transition;
        const lookSmooth = focusing ? CAMERA.focusSmooth * 0.8 : CAMERA.lookSmooth + (CAMERA.focusSmooth - CAMERA.lookSmooth) * this.transition;
        damp3(this.pos, this.goalPos, smooth, dt);
        damp3(this.look, this.goalLook, lookSmooth, dt);
      }
    }

    runtime.camera.mode = this.mode;
    runtime.camera.eye.x = this.pos.x;
    runtime.camera.eye.y = this.pos.y;
    runtime.camera.eye.z = this.pos.z;

    // Impact shake and boost FOV kick (both off with reduced motion).
    const car = runtime.car;
    if (!reduced && car.impact > 4) this.shake = Math.max(this.shake, Math.min(1, car.impact / 14));
    this.shake *= Math.exp(-dt * 7);
    camera.position.copy(this.pos);
    if (this.shake > 0.002 && !reduced) {
      camera.position.x += Math.sin(now * 53) * 0.14 * this.shake;
      camera.position.y += Math.sin(now * 41 + 1) * 0.09 * this.shake;
      camera.position.z += Math.cos(now * 47) * 0.14 * this.shake;
    }
    camera.lookAt(this.look);

    const overspeed = clamp((car.forwardSpeed - VEHICLE.maxSpeed * 0.92) / (VEHICLE.boostSpeed - VEHICLE.maxSpeed * 0.92), 0, 1);
    const fovGoal = CAMERA.fov + (reduced || focusing ? 0 : CAMERA.boostFovKick * overspeed);
    damp(this.fov, 'value', fovGoal, 0.35, dt);
    if (Math.abs(camera.fov - this.fov.value) > 0.01) {
      camera.fov = this.fov.value;
      camera.updateProjectionMatrix();
    }

    // The camera moves under a still mouse: refresh hover so the cursor stays truthful.
    this.hoverClock += dt;
    if (this.hoverClock > 0.2) {
      this.hoverClock = 0;
      if (runtime.pointer.inside && !runtime.camera.dragging && this.lastPos.distanceToSquared(camera.position) > 0.0025) {
        state.events.update?.();
      }
      this.lastPos.copy(camera.position);
    }
  }
}

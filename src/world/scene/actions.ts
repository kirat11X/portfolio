// Gameplay actions shared by the keyboard handler, the HUD and the dev handle.

import { getStaticColliders, type Collider } from '../config/colliders';
import { getExhibit } from '../config/exhibits';
import { ARENA, DISTRICTS, DISTRICT_ORDER, INTERACTIVE_SPOTS, PORTALS, type DistrictId, type InteractiveSpot } from '../config/layout';
import { useArcadeStore } from '../arcade/arcadeStore';
import { useConsentStore } from '../game/consentStore';
import { isRacing, useRaceStore } from '../game/raceStore';
import { useWorldStore } from '../state/worldStore';
import { portalDetail, SPOT_PROMPTS } from './destinations';
import { cancelAutopilot, clearKeys, placeCar, resetCameraControls, runtime } from './runtime';
import { useHudStore } from './uiState';

let colliderCache: Collider[] | null = null;

/** Static colliders for this page load (city decor included). */
export function worldColliders(): Collider[] {
  colliderCache ??= getStaticColliders();
  return colliderCache;
}

export interface InteractableInfo {
  kind: 'exhibit' | 'portal' | 'spot';
  /** What the visitor sees: project title or door label. */
  name: string;
  /** "view" for exhibits, "open" for doors, "play" / "chat with" / … for Gaming Zone props. */
  verb: string;
  accent: string;
  /** What is behind a door, e.g. "Email, GitHub, LinkedIn". */
  detail: string | null;
}

export function describeInteractable(id: string | null): InteractableInfo | null {
  if (!id) return null;
  const exhibit = getExhibit(id);
  if (exhibit) return { kind: 'exhibit', name: exhibit.project.title, verb: 'view', accent: DISTRICTS[exhibit.district].accent, detail: null };
  const portal = PORTALS.find((p) => p.id === id);
  if (portal) return { kind: 'portal', name: portal.label, verb: 'open', accent: DISTRICTS[portal.district].accent, detail: portalDetail(portal.id) };
  const spot = spotById(id);
  if (spot) {
    const prompt = SPOT_PROMPTS[spot.id];
    return { kind: 'spot', name: prompt.name, verb: prompt.verb, accent: prompt.accent, detail: prompt.detail };
  }
  return null;
}

export function spotById(id: string | null): InteractiveSpot | null {
  return (id && INTERACTIVE_SPOTS.find((spot) => spot.id === id)) || null;
}

/** Frame the gaming PC's monitor up close (Esc, a drive key or "Back to driving" returns). */
export function openCloseup(spot: InteractiveSpot): void {
  cancelAutopilot();
  clearKeys();
  const nx = Math.sin(spot.rotationY);
  const nz = Math.cos(spot.rotationY);
  const closeup = runtime.camera.closeup;
  closeup.active = true;
  closeup.id = spot.id;
  // The rig's monitor (city art): centre 2.12 up, 0.3 behind the prop centre, 2.0 wide.
  closeup.look.x = spot.x - nx * 0.3;
  closeup.look.y = 2.12;
  closeup.look.z = spot.z - nz * 0.3;
  closeup.nx = nx;
  closeup.nz = nz;
  closeup.fitWidth = 2.9;
  closeup.fitHeight = 1.7;
  useWorldStore.getState().selectExhibit(null);
  useHudStore.getState().setCloseup(spot.id);
}

/** Leave the close-up; returns true when one was showing. */
export function closeCloseup(): boolean {
  if (!runtime.camera.closeup.active) return false;
  runtime.camera.closeup.active = false;
  useHudStore.getState().setCloseup(null);
  return true;
}

/** Fade-travel to an arbitrary spot (arena kick-off). Ignored during a race. */
export function travelToSpot(x: number, z: number, heading: number): boolean {
  if (isRacing()) {
    useRaceStore.getState().say('Quick travel is off during the race. Press Esc to quit the race.');
    return false;
  }
  closeCloseup();
  runtime.travel.spot = { x, z, heading };
  return true;
}

export function goToArena(): boolean {
  const { x, z, heading } = ARENA.carKickoff;
  return travelToSpot(x, z, heading);
}

/** Drive to the race start: the countdown begins on arrival. */
export function goToRaceStart(): void {
  useRaceStore.getState().start();
}

/** Act on an interactable: open an exhibit's panel or go through a door. */
export function interact(id: string | null, navigate: (to: string) => void): boolean {
  if (!id) return false;
  const store = useWorldStore.getState();
  const exhibit = getExhibit(id);
  if (exhibit) {
    if (store.selectedExhibitId !== exhibit.id) store.selectExhibit(exhibit.id);
    cancelAutopilot();
    return true;
  }
  const portal = PORTALS.find((p) => p.id === id);
  if (portal) {
    cancelAutopilot();
    navigate(portal.route);
    return true;
  }
  const spot = spotById(id);
  if (spot) {
    cancelAutopilot();
    if (spot.id === 'server:ram') {
      useConsentStore.getState().openCard();
    } else if (spot.id === 'pc:rig') {
      openCloseup(spot);
    } else {
      clearKeys();
      const game = spot.id === 'arcade:tetris' ? 'tetris' : spot.id === 'arcade:pacman' ? 'pacman' : 'catgpt';
      useArcadeStore.getState().openGame(game);
    }
    return true;
  }
  return false;
}

export function nearestDistrict(x: number, z: number): DistrictId {
  let best: DistrictId = 'hub';
  let bestDistance = Infinity;
  for (const id of DISTRICT_ORDER) {
    const [cx, cz] = DISTRICTS[id].center;
    const d = Math.hypot(x - cx, z - cz);
    if (d < bestDistance) {
      best = id;
      bestDistance = d;
    }
  }
  return best;
}

/** "R": back to the start of the nearest district, camera straightened. */
export function returnToNearestDistrict(): void {
  resetCameraControls();
  useWorldStore.getState().requestTravel(nearestDistrict(runtime.car.x, runtime.car.z));
}

/**
 * After visiting a page through a door, put the vehicle just outside that
 * door, facing back into the plaza, so the prompt does not reappear at once.
 */
export function stepOutOfPortal(): void {
  const car = runtime.car;
  for (const portal of PORTALS) {
    const { trigger } = portal;
    if (Math.hypot(car.x - trigger.x, car.z - trigger.z) > trigger.radius + 0.5) continue;
    const nx = Math.sin(portal.rotationY);
    const nz = Math.cos(portal.rotationY);
    cancelAutopilot();
    placeCar(portal.x + nx * 4.9, portal.z + nz * 4.9, portal.rotationY + Math.PI);
    return;
  }
}

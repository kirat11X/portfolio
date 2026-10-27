// Development-only QA handle so tests can drive the world without pixel hunting:
//   window.__world.travel('engineering'); window.__world.select('some-slug'); window.__world.state()

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoadingStore } from '@/lib/loadingStore';
import { getExhibit, WORLD_EXHIBITS } from '../config/exhibits';
import { DISTRICTS, INTERACTIVE_SPOTS, PORTALS, type DistrictId } from '../config/layout';
import { useArcadeStore } from '../arcade/arcadeStore';
import { CARS, useCarStore, type CarId } from '../game/cars';
import { useConsentStore } from '../game/consentStore';
import { RACE_GATES } from '../game/raceLogic';
import { raceClock, useRaceStore } from '../game/raceStore';
import { kickoff, soccer, useSoccerStore } from '../game/soccerStore';
import { CONSENT_KEY, resetConsentForTests } from '../game/storage';
import { useHudStore } from './uiState';
import { useWorldStore, vehiclePose, type QualityTier } from '../state/worldStore';
import { interact, worldColliders } from './actions';
import { engageAutopilot } from './autopilot';
import { headingTo } from './physics';
import { placeCar, runtime } from './runtime';
import { startShowcase, stopShowcase } from './showcase';
import { perfSample, type PerfSample } from './perfSample';

export interface WorldDevHandle {
  travel(district: DistrictId): void;
  select(slug: string | null): void;
  state(): Record<string, unknown>;
  teleport(x: number, z: number, heading?: number): void;
  driveTo(x: number, z: number): boolean;
  interact(): boolean;
  interactables(): Array<{ id: string; x: number; z: number; radius: number }>;
  camera(options: { orbit?: number; zoom?: number; pitchOffset?: number }): void;
  quality(tier: QualityTier): void;
  orbit(on: boolean): void;
  soccer: {
    state(): Record<string, unknown>;
    /** Put the ball at (x, z) with velocity (vx, vz). */
    ball(x: number, z: number, vx?: number, vz?: number): void;
    kickoff(): void;
    reset(): void;
  };
  race: {
    start(): void;
    cancel(): void;
    state(): Record<string, unknown>;
    /** Carry the car across the next gate (as if it drove through). */
    passNext(): void;
    /** Pass every remaining gate after `seconds` of race time. */
    finish(seconds?: number): void;
  };
  /** Pick a car ('pod' | 'kestrel' | 'stingray'); returns the current id. */
  car(id?: CarId): CarId;
  /** true = give RAM, false = keep it starving, null = forget the answer and show the card. */
  consent(value: boolean | null): string;
  /** Open the car picker menu. */
  carMenu(open: boolean): void;
  /** Park on an interactive spot's pad (e.g. 'arcade:tetris', 'pc:rig', 'server:ram'), facing the prop. */
  spot(id: string): void;
  /** Latest averaged render sample (draw calls, triangles, frame / CPU ms). */
  perf(): PerfSample;
}

declare global {
  interface Window {
    __world?: WorldDevHandle;
  }
}

export function useDevHandle(): void {
  const navigate = useNavigate();
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handle: WorldDevHandle = {
      travel(district) {
        if (!DISTRICTS[district]) throw new Error(`Unknown district: ${district}`);
        useWorldStore.getState().requestTravel(district);
      },
      select(slug) {
        const id = slug == null ? null : slug.startsWith('exhibit:') ? slug : `exhibit:${slug}`;
        if (id && !getExhibit(id)) throw new Error(`No exhibit for ${slug}`);
        useWorldStore.getState().selectExhibit(id);
      },
      state() {
        const world = useWorldStore.getState();
        const loading = useLoadingStore.getState();
        return {
          pose: { ...vehiclePose },
          activeDistrict: world.activeDistrict,
          focusedId: world.focusedId,
          hoveredId: world.hoveredId,
          selectedExhibitId: world.selectedExhibitId,
          helpOpen: world.helpOpen,
          quality: world.quality,
          entered: loading.entered,
          status: loading.status,
          stages: { ...loading.stages },
          autopilot: { active: runtime.autopilot.active, x: runtime.autopilot.targetX, z: runtime.autopilot.targetZ },
          travelPhase: runtime.travel.phase,
          car: useCarStore.getState().carId,
          consent: useConsentStore.getState().status,
          arcade: useArcadeStore.getState().open,
          closeup: runtime.camera.closeup.active,
          camera: { mode: runtime.camera.mode, eye: { ...runtime.camera.eye }, showcase: runtime.camera.showcase, orbit: runtime.camera.orbit, pitchOffset: runtime.camera.pitchOffset, zoom: runtime.camera.zoom },
        };
      },
      teleport(x, z, heading = 0) {
        placeCar(x, z, heading);
        runtime.camera.snap = true;
      },
      driveTo: (x, z) => engageAutopilot(x, z, worldColliders()),
      interact: () => interact(useWorldStore.getState().focusedId, navigate),
      interactables: () => [
        ...WORLD_EXHIBITS.map((e) => ({ id: e.id, ...e.slot.pad })),
        ...PORTALS.map((p) => ({ id: p.id, ...p.trigger })),
        ...INTERACTIVE_SPOTS.map((s) => ({ id: s.id, ...s.pad })),
      ],
      camera(options) {
        Object.assign(runtime.camera, options);
      },
      orbit(on) {
        if (on) startShowcase();
        else stopShowcase();
      },
      quality(tier) {
        useWorldStore.getState().setQuality(tier);
      },
      soccer: {
        state: () => ({ ...useSoccerStore.getState(), ball: { ...soccer.ball } }),
        ball(x, z, vx = 0, vz = 0) {
          Object.assign(soccer.ball, { x, z, vx, vz, y: 0, vy: 0 });
        },
        kickoff,
        reset: () => useSoccerStore.getState().resetBall(),
      },
      race: {
        start: () => useRaceStore.getState().start(),
        cancel: () => useRaceStore.getState().cancel(),
        state: () => {
          const race = useRaceStore.getState();
          return { phase: race.phase, next: race.next, count: race.count, elapsed: raceClock.elapsed, board: race.board, result: race.result };
        },
        passNext() {
          const gate = RACE_GATES[useRaceStore.getState().next];
          if (!gate) return;
          const fx = -Math.sin(gate.rotationY);
          const fz = -Math.cos(gate.rotationY);
          raceClock.prevX = gate.x - fx * 1.5;
          raceClock.prevZ = gate.z - fz * 1.5;
          placeCar(gate.x + fx * 0.6, gate.z + fz * 0.6, gate.rotationY);
          runtime.camera.snap = true;
        },
        finish(seconds = 72.5) {
          const race = useRaceStore.getState();
          if (race.phase === 'countdown') raceClock.countdown = 0;
          raceClock.elapsed = seconds;
          // Gates are crossed one per frame by the simulation.
          let left = RACE_GATES.length - race.next;
          const step = () => {
            if (left-- <= 0 || useRaceStore.getState().phase === 'idle') return;
            if (useRaceStore.getState().phase === 'running') {
              raceClock.elapsed = Math.max(raceClock.elapsed, seconds);
              handle.race.passNext();
            } else left++;
            requestAnimationFrame(() => requestAnimationFrame(step));
          };
          step();
        },
      },
      car(id) {
        if (id) {
          if (!CARS[id]) throw new Error(`Unknown car: ${id}`);
          useCarStore.getState().setCar(id);
        }
        return useCarStore.getState().carId;
      },
      consent(value) {
        const store = useConsentStore.getState();
        if (value === true) store.accept();
        else if (value === false) store.decline();
        else {
          try {
            window.localStorage.removeItem(CONSENT_KEY);
          } catch {
            /* ignore */
          }
          resetConsentForTests('unknown');
          useConsentStore.setState({ status: 'unknown', cardOpen: true, notice: null });
        }
        return useConsentStore.getState().status;
      },
      carMenu(open) {
        useHudStore.getState().setCarMenuOpen(open);
      },
      spot(id) {
        const spot = INTERACTIVE_SPOTS.find((s) => s.id === id);
        if (!spot) throw new Error(`Unknown spot: ${id}`);
        placeCar(spot.pad.x, spot.pad.z, headingTo(spot.pad.x, spot.pad.z, spot.x, spot.z));
        runtime.camera.snap = true;
      },
      perf: () => ({ ...perfSample }),
    };
    window.__world = handle;
    return () => {
      if (window.__world === handle) delete window.__world;
    };
  }, [navigate]);
}

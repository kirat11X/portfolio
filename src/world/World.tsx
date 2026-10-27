// The 3D world: Canvas, quality tier, truthful loading stages, context-loss
// handling, the drivable game scene and the HTML HUD. Mounted by WorldHost.
import { Suspense, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { Canvas } from '@react-three/fiber';
import { useLoadingStore } from '@/lib/loadingStore';
import { ArcadeOverlay } from './arcade/ArcadeOverlay';
import { useArcadeStore } from './arcade/arcadeStore';
import { CityScene } from './city/CityScene';
import { ISLAND_CENTER } from './config/layout';
import { WorldEffects } from './city/WorldEffects';
import { useWorldStore, type QualityTier } from './state/worldStore';
import { useRaceStore } from './game/raceStore';
import { useSoccerStore } from './game/soccerStore';
import { useGameArtBridge } from './scene/gameArtBridge';
import { Hud } from './hud/Hud';
import { useDevHandle } from './scene/devHandle';
import { useFontStage } from './scene/fontStage';
import { stepOutOfPortal } from './scene/actions';
import { GameScene } from './scene/GameScene';
import { PointerControls } from './scene/PointerControls';
import { clearKeys, resetRuntime } from './scene/runtime';
import { ContextLossGuard, QualityMonitor, StageReporter } from './scene/StageReporter';
import { CAMERA } from './scene/tuning';
import { useKeyboardControls } from './scene/useKeyboardControls';
import { useHudStore } from './scene/uiState';
import { PerfOverlay, PerfProbe } from './scene/PerfProbe';

const PERF_PARAM = import.meta.env.DEV && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('perf') : null;
const PERF_OVERLAY = PERF_PARAM !== null;
/** `?perf=pin` (dev) keeps the quality tier fixed so each tier can be profiled. */
const PERF_PIN = PERF_PARAM === 'pin';

export interface WorldProps {
  /** False while another route is showing: stop rendering and ignore input. */
  active: boolean;
  /** Switch the home page to the classic 2D overview. */
  onRequestClassic: () => void;
}

const DPR: Record<QualityTier, number | [number, number]> = {
  high: [1, 1.75],
  medium: [1, 1.25],
  low: 1,
};

const GL_OPTIONS = { antialias: true, powerPreference: 'high-performance' } as const;
const CAMERA_OPTIONS = {
  fov: CAMERA.fov,
  near: CAMERA.near,
  far: CAMERA.far,
  position: [ISLAND_CENTER.x + 36, CAMERA.orbitHeight, ISLAND_CENTER.z + 70] as [number, number, number],
};

/** Hidden tabs stop the render loop outright (not just rAF throttling). */
function subscribeVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}
const pageVisible = () => document.visibilityState !== 'hidden';
const serverVisible = () => true;

export default function World({ active, onRequestClassic }: WorldProps) {
  const quality = useWorldStore((s) => s.quality);
  const entered = useLoadingStore((s) => s.entered);
  const visible = useSyncExternalStore(subscribeVisibility, pageVisible, serverVisible);
  const stageRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);

  // Every world instance starts fresh at the hub.
  useLayoutEffect(() => {
    resetRuntime();
    const world = useWorldStore.getState();
    world.selectExhibit(null);
    world.setFocused(null);
    world.setHovered(null);
    world.clearTravel();
    world.setHelpOpen(false);
    world.setActiveDistrict('hub');
    useRaceStore.getState().exit();
    useSoccerStore.getState().resetBall();
    useHudStore.getState().setCloseup(null);
  }, []);

  useFontStage();
  useKeyboardControls(active && entered);
  useDevHandle();
  useGameArtBridge();

  const wasActive = useRef(active);
  useEffect(() => {
    if (active) {
      // Back from a page reached through a door: step out of that building.
      if (!wasActive.current) stepOutOfPortal();
    } else {
      clearKeys();
      const world = useWorldStore.getState();
      world.setHelpOpen(false);
      world.setHovered(null);
      useHudStore.getState().setMapOpen(false);
      useHudStore.getState().setCarMenuOpen(false);
      useArcadeStore.getState().close();
    }
    wasActive.current = active;
  }, [active]);

  return (
    <div className="absolute inset-0 overflow-hidden" data-theme="dark">
      <div ref={stageRef} className="absolute inset-0 touch-none select-none" aria-hidden="true">
        <Canvas frameloop={active && visible ? 'always' : 'never'} dpr={DPR[quality]} gl={GL_OPTIONS} camera={CAMERA_OPTIONS}>
          <ContextLossGuard />
          {import.meta.env.DEV && <PerfProbe />}
          <Suspense fallback={null}>
            <CityScene />
            <WorldEffects />
            <GameScene fadeRef={fadeRef} />
            <StageReporter />
          </Suspense>
          {active && entered && !PERF_PIN && <QualityMonitor />}
        </Canvas>
      </div>
      <PointerControls active={active} stageRef={stageRef} />
      <div ref={fadeRef} className="pointer-events-none absolute inset-0 z-[5] bg-void opacity-0" aria-hidden="true" />
      {active && entered && <Hud onRequestClassic={onRequestClassic} />}
      {active && entered && <ArcadeOverlay />}
      {PERF_OVERLAY && <PerfOverlay />}
    </div>
  );
}

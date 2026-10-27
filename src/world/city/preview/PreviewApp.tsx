// Dev-only harness for the city art (mounted by preview/main.tsx, served at
// /dev/city-preview.html). Renders CityScene + WorldEffects with orbit
// controls, camera presets and a draw-call readout. Not imported by the app.

import { Suspense, useEffect, useRef } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useWorldStore, type QualityTier } from '@/world/state/worldStore';
import { useMotionStore } from '@/lib/motion';
import { CityScene } from '../CityScene';
import { useGamingArtStore } from '../gamingArtStore';
import { WorldEffects } from '../WorldEffects';
import { checkGroundLabels, groundLabelLayout } from '../groundLabels';

type V3 = [number, number, number];

const PRESETS: Record<string, { pos: V3; target: V3 }> = {
  overview: { pos: [0, 92, 132], target: [0, -2, 22] },
  hub: { pos: [0, 6.5, 19], target: [0, 3.4, 0] },
  // Gameplay follow camera at spawn: 19 units at 0.85 rad pitch behind the car.
  street: { pos: [0, 19 * Math.sin(0.85), 9 + 19 * Math.cos(0.85)], target: [0, 0.6, 9] },
  engineering: { pos: [-11, 8, 8], target: [-30, 4, 0] },
  creative: { pos: [11, 8, -8], target: [30, 4, 0] },
  about: { pos: [8, 8, -12], target: [0, 4, -30] },
  // Quick-travel arrival view of the Gaming Zone (distance 19 × 1.95, pitch 0.62, look 11 ahead).
  gaming: { pos: [0, 21.5, -6], target: [0, 0.6, 24] },
  // Follow camera at the Gaming spawn (car facing south).
  gates: { pos: [-30, 26, 58], target: [-30, 0, 18] },
  gamingStreet: { pos: [0, 19 * Math.sin(0.85), 13 - 19 * Math.cos(0.85)], target: [0, 0.6, 14.6] },
  plaza: { pos: [-7, 7, 15], target: [1, 1.4, 29] },
  pc: { pos: [3.4, 2.7, 24.4], target: [7.2, 1.45, 24] },
  server: { pos: [4.6, 3.2, -2.3], target: [8.3, 2.1, -4.4] },
  arena: { pos: [0, 34, 26], target: [0, 0, 60] },
  // Follow camera at the car-soccer kick-off spot (facing south).
  arenaStreet: { pos: [0, 19 * Math.sin(0.85), 52 - 19 * Math.cos(0.85)], target: [0, 0.6, 53.6] },
  scoreboard: { pos: [0, 8, 60], target: [0, 5.5, 79] },
  race: { pos: [-78, 62, 52], target: [-8, 0, 8] },
  finish: { pos: [0, 7, 22], target: [0, 4, 6] },
  monolith: { pos: [0, 3.6, 8], target: [0, 3.4, 0] },
  exhibit: { pos: [-23.5, 3.2, -1], target: [-21.2, 2.4, -5.7] },
  signs: { pos: [10, 12, 16], target: [-4, 6, -10] },
  skyline: { pos: [0, 10, 38], target: [0, 4, -80] },
};

const params = new URLSearchParams(window.location.search);
const parseV3 = (v: string | null): V3 | null => {
  if (!v) return null;
  const parts = v.split(',').map(Number);
  return parts.length === 3 && parts.every(Number.isFinite) ? (parts as V3) : null;
};
const preset = PRESETS[params.get('cam') ?? 'overview'] ?? PRESETS.overview;
const camPos = parseV3(params.get('pos')) ?? preset.pos;
const camTarget = parseV3(params.get('target')) ?? preset.target;
const quality = (['high', 'medium', 'low'].includes(params.get('quality') ?? '') ? params.get('quality') : 'high') as QualityTier;
const fov = Number(params.get('fov') ?? 42);

useWorldStore.setState({ quality, hoveredId: params.get('hover'), focusedId: params.get('focus') });
if (params.get('reduced') === '1') useMotionStore.setState({ user: true });
// Gaming hooks: ?gate=<index>&ram=1&score=<home>,<away>
{
  const art = useGamingArtStore.getState();
  if (params.has('gate')) art.setRaceActiveGate(Number(params.get('gate')));
  if (params.get('ram') === '1') art.setRamInserted(true);
  const score = params.get('score')?.split(',').map(Number);
  if (score?.length === 2 && score.every(Number.isFinite)) art.setArenaScore({ home: score[0], away: score[1] });
}

interface Stats {
  calls: number;
  triangles: number;
  points: number;
  lines: number;
  frames: number;
  texts: number;
  geometries: number;
  textures: number;
  programs: number;
}

declare global {
  interface Window {
    __cityStats?: Stats;
    __cityBreakdown?: () => Record<string, number>;
    __cityScene?: unknown;
    __cityGroundLabels?: () => { layout: unknown; issues: string[] };
  }
}

const stats: Stats = { calls: 0, triangles: 0, points: 0, lines: 0, frames: 0, texts: 0, geometries: 0, textures: 0, programs: 0 };
window.__cityStats = stats;

/** `?still=N` stops the render loop after N frames so headless screenshots are quick. */
const stillAfter = Number(params.get('still') ?? 0);

function StatsProbe() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    window.__cityScene = scene;
    window.__cityGroundLabels = () => ({
      layout: groundLabelLayout().map((l) => ({ id: l.id, word: l.word.rect, arrow: l.arrow.rect })),
      issues: checkGroundLabels(),
    });
    // Visible renderables per top-level group (debug aid for the draw-call budget).
    window.__cityBreakdown = () => {
      const out: Record<string, number> = {};
      scene.traverseVisible((o) => {
        const r = o as unknown as { isMesh?: boolean; isPoints?: boolean; material?: { visible?: boolean } };
        if (!(r.isMesh || r.isPoints) || r.material?.visible === false) return;
        let top = o;
        while (top.parent && top.parent !== scene) top = top.parent;
        const key = top.name || top.type;
        out[key] = (out[key] ?? 0) + 1;
      });
      return out;
    };
  }, [scene]);
  // Priority 0: runs before rendering, so it reads the previous frame's total
  // (scene + post-processing passes) and resets for the next one.
  useFrame(() => {
    const r = gl.info.render;
    stats.calls = r.calls;
    stats.triangles = r.triangles;
    stats.points = r.points;
    stats.lines = r.lines;
    stats.frames++;
    stats.geometries = gl.info.memory.geometries;
    stats.textures = gl.info.memory.textures;
    stats.programs = gl.info.programs?.length ?? 0;
    if (stats.frames % 30 === 1) {
      let texts = 0;
      scene.traverse((o) => {
        if ((o as unknown as { material?: { isTroikaTextMaterial?: boolean } }).material?.isTroikaTextMaterial) texts++;
      });
      stats.texts = texts;
    }
    gl.info.reset();
    if (stillAfter > 0 && stats.frames === stillAfter) setFrameloop('never');
  });
  return null;
}

function StandInCar() {
  return (
    <group position={[0, 0, 9]}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.5, 0.7, 2.6]} />
        <meshStandardMaterial color="#d9dde8" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}

function Readout() {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (ref.current) {
        ref.current.textContent = `calls ${stats.calls}  tris ${stats.triangles}  pts ${stats.points}\ntext ${stats.texts}  geo ${stats.geometries}  tex ${stats.textures}  prog ${stats.programs}\nquality ${quality}  frames ${stats.frames}`;
      }
    }, 400);
    return () => window.clearInterval(id);
  }, []);
  if (params.get('stats') === '0') return null;
  return (
    <pre
      ref={ref}
      style={{ position: 'fixed', top: 8, left: 8, margin: 0, padding: '6px 8px', font: '11px/1.4 JetBrains Mono, monospace', color: '#a9aec0', background: 'rgba(4,5,10,0.7)', borderRadius: 6, pointerEvents: 'none' }}
    />
  );
}

export function PreviewApp() {
  return (
    <MemoryRouter>
      <Canvas
        camera={{ position: camPos, fov, near: 0.5, far: 230 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={(state) => {
          // Accumulate render info across all passes of a frame (StatsProbe resets it).
          state.gl.info.autoReset = false;
        }}
      >
        <Suspense fallback={null}>
          <CityScene />
          <WorldEffects />
          {/* Inside Suspense so frame counts start once the city has loaded. */}
          <StatsProbe />
        </Suspense>
        {params.get('car') !== '0' && params.get('cam') === 'street' ? <StandInCar /> : null}
        {params.get('orbit') !== '0' ? <OrbitControls makeDefault target={camTarget} enableDamping /> : null}
        <CameraAim />
      </Canvas>
      <Readout />
    </MemoryRouter>
  );
}

function CameraAim() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.lookAt(...camTarget);
  }, [camera]);
  return null;
}


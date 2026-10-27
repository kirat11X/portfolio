// Animated parts of the Gaming Zone, arena and time trial. Each is one draw
// call (two text meshes for the score). Static parts are baked in StaticCity.
//
// Gameplay hooks (also documented in gamingArtStore.ts):
//   <RaceGates activeIndex={i | null} />    highlight RACE_GATES[i] (next gate)
//   <DataServer ramInserted={bool} />       seat the floating RAM stick
//   <ArenaScoreboard score={{home, away}} /> live score on the stadium board
// Without props they read useGamingArtStore, so gameplay can simply call
// useGamingArtStore.getState().setRaceActiveGate(i) / setRamInserted(true) /
// setArenaScore({home, away}) and leave <CityScene /> as is.

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, Color, LinearFilter, MeshBasicMaterial, SRGBColorSpace, type BufferGeometry, type Mesh, type ShaderMaterial } from 'three';
import { neon } from '@/styles/tokens';
import { useReducedMotion } from '@/lib/motion';
import { useWorldStore } from '../state/worldStore';
import { Y } from './constants';
import { GeometryBuilder, rgb } from './lib/GeometryBuilder';
import { FX, FxBuilder, createFxMaterial, type FxUniforms } from './lib/fx';
import { SCREEN_H, SCREEN_W, SCREEN_IDS, drawArcadeScreens, screenUv } from './lib/arcadeScreens';
import { useDisposable } from './lib/useDisposable';
import { canvasFontsReady } from './lib/canvasFonts';
import { CAB, CABINETS, cabinetFrame, panelPoint } from './bake/gaming';
import { buildPcFx } from './bake/pcRig';
import { buildServerFx } from './bake/server';
import { buildGateFx } from './bake/race';
import { BOOST_PADS, TEAM } from './bake/arena';
import { ARENA, LANDMARKS } from '../config/layout';
import { SCOREBOARD_ANCHOR } from './gamingLayout';
import { NeonText } from './NeonText';
import { useGamingArtStore, type ArenaScore } from './gamingArtStore';

// ---------------------------------------------------------------- shared FX (PC, cabinets, pads, hall)

function buildZoneFx(fx: FxBuilder): void {
  buildPcFx(fx);
  // Cabinet buttons blink in turn.
  CABINETS.forEach((def, ci) => {
    const f = cabinetFrame(def);
    const [z, y] = panelPoint(0.5);
    const colors = [neon.magenta, neon.cyan, neon.amber];
    colors.forEach((c, i) => {
      fx.set({ mode: FX.blink, a: i * 0.33 + ci * 0.2, b: 1.2, c: 0.35 });
      f.box(fx, 0.02 + i * 0.11, y + 0.018, z, 0.06, 0.03, 0.06, rgb(c, 2.4), -0.32);
    });
  });
  // Boost pads pulse.
  BOOST_PADS.forEach((pad, i) => {
    const color = pad.z < ARENA.center.z ? TEAM.home : TEAM.away;
    fx.set({ mode: FX.pulse, a: i * 0.7, b: 3.2, c: 0.35 });
    fx.flatRing(pad.x, pad.z, pad.r * 0.42, pad.r * 0.84, Y.inlay + 0.004, rgb(color, 1.3), 28);
    fx.set({ mode: FX.pulse, a: i * 0.7 + 1.2, b: 3.2, c: 0.2 });
    fx.flatRing(pad.x, pad.z, pad.r * 0.62, 0.05, Y.inlay + 0.006, rgb(neon.amber, 2), 28);
  });
  // Chase lights round the ARCADE marquee.
  const f = LANDMARKS.gaming.minZ - 0.24;
  const x0 = -3.45;
  const x1 = 3.45;
  const y0 = 3.95;
  const y1 = 5.2;
  const pts: Array<[number, number]> = [];
  for (let x = x0; x <= x1 + 1e-6; x += 0.3) pts.push([x, y1]);
  for (let y = y1 - 0.3; y >= y0 - 1e-6; y -= 0.3) pts.push([x1, y]);
  for (let x = x1 - 0.3; x >= x0 - 1e-6; x -= 0.3) pts.push([x, y0]);
  for (let y = y0 + 0.3; y <= y1 - 0.3 + 1e-6; y += 0.3) pts.push([x0, y]);
  pts.forEach(([x, y], i) => {
    fx.set({ mode: FX.blink, a: (i % 4) * 0.25, b: 2.2, c: 0.18 });
    fx.box(x - 0.06, y - 0.06, f - 0.03, x + 0.06, y + 0.06, f, { color: rgb(neon.amber, 2.6) });
  });
}

type FxMesh = Mesh<BufferGeometry, ShaderMaterial & { uniforms: FxUniforms }>;

function useFxMesh(build: (fx: FxBuilder) => void) {
  return useDisposable(
    () => {
      const fx = new FxBuilder();
      build(fx);
      return { geometry: fx.build(), material: createFxMaterial() };
    },
    [],
    (r) => [r.geometry, r.material],
  );
}

/** PC RGB and fans, cabinet buttons, boost pads and the arcade chase lights. */
export function GamingFx() {
  const { geometry, material } = useFxMesh(buildZoneFx);
  return <mesh name="gaming-fx" geometry={geometry} material={material} matrixAutoUpdate={false} renderOrder={1} />;
}

// ---------------------------------------------------------------- race gates

export interface RaceGatesProps {
  /**
   * Index into RACE_GATES (gamingLayout.ts) of the next gate to pass; that
   * gate pulses brightly and the others dim. null = no lap running (all gates
   * at normal brightness). Omit to read useGamingArtStore.
   */
  activeIndex?: number | null;
}

export function RaceGates({ activeIndex }: RaceGatesProps) {
  const fromStore = useGamingArtStore((s) => s.raceActiveGate);
  const active = activeIndex === undefined ? fromStore : activeIndex;
  const { geometry, material } = useFxMesh(buildGateFx);
  const mesh = useRef<FxMesh>(null);
  useEffect(() => {
    const m = mesh.current;
    if (m) m.material.uniforms.uActive.value = active ?? -1;
  }, [active, material]);
  return <mesh ref={mesh} name="race-gates" geometry={geometry} material={material} matrixAutoUpdate={false} />;
}

// ---------------------------------------------------------------- data server

export interface DataServerProps {
  /** True once the visitor has fed the server: the floating stick slides into its slot and the bay turns green. Omit to read the store. */
  ramInserted?: boolean;
}

export function DataServer({ ramInserted }: DataServerProps) {
  const fromStore = useGamingArtStore((s) => s.ramInserted);
  const inserted = ramInserted ?? fromStore;
  const reduced = useReducedMotion();
  const { geometry, material } = useFxMesh(buildServerFx);
  const mesh = useRef<FxMesh>(null);
  const target = inserted ? 1 : 0;
  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const u = m.material.uniforms.uRam;
    if (u.value === target) return;
    if (reduced) {
      u.value = target;
      return;
    }
    // Ease in over ~0.9 s (out faster).
    const step = Math.min(delta, 0.1) * (target > u.value ? 1.1 : 2.5);
    u.value = target > u.value ? Math.min(target, u.value + step) : Math.max(target, u.value - step);
  });
  return <mesh ref={mesh} name="data-server" geometry={geometry} material={material} matrixAutoUpdate={false} />;
}

// ---------------------------------------------------------------- arcade screens

const FPS = { high: 10, medium: 6, low: 0 } as const;

/** Attract-mode screens of the three cabinets (one canvas texture, redrawn at a low rate). */
export function ArcadeScreens() {
  const quality = useWorldStore((s) => s.quality);
  const reduced = useReducedMotion();
  const res = useDisposable(
    () => {
      const canvas = document.createElement('canvas');
      canvas.width = SCREEN_W * SCREEN_IDS.length;
      canvas.height = SCREEN_H;
      drawArcadeScreens(canvas, 3);
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
      texture.generateMipmaps = false;
      const g = new GeometryBuilder();
      for (const def of CABINETS) {
        const f = cabinetFrame(def);
        const s = CAB.screen;
        f.quad(g, 0, s.y, s.z, s.w, s.h, new Color(1, 1, 1), screenUv(def.screen), s.rx);
      }
      const material = new MeshBasicMaterial({ map: texture, color: new Color(1.45, 1.45, 1.45), toneMapped: false });
      return { texture, geometry: g.build(), material };
    },
    [],
    (r) => [r.texture, r.geometry, r.material],
  );
  const mesh = useRef<Mesh<BufferGeometry, MeshBasicMaterial>>(null);
  const clock = useRef({ t: 3, acc: 0 });
  const fps = reduced ? 0 : FPS[quality];
  const redraw = (t: number) => {
    const map = mesh.current?.material.map;
    if (!map) return;
    drawArcadeScreens(map.image as HTMLCanvasElement, t);
    map.needsUpdate = true;
  };
  useEffect(() => {
    // Static frame (with the cat's "meow?" showing) when not animating; redraw once the canvas fonts load.
    if (fps !== 0) return;
    redraw(3);
    let live = true;
    canvasFontsReady().then(() => {
      if (live) redraw(3);
    });
    return () => {
      live = false;
    };
  });
  useFrame((_, delta) => {
    if (fps === 0) return;
    const c = clock.current;
    c.t += Math.min(delta, 0.1);
    c.acc += delta;
    if (c.acc < 1 / fps) return;
    c.acc = 0;
    redraw(c.t);
  });
  return <mesh ref={mesh} name="arcade-screens" geometry={res.geometry} material={res.material} matrixAutoUpdate={false} />;
}

// ---------------------------------------------------------------- scoreboard

export interface ArenaScoreboardProps {
  /** home = team cyan (north goal), away = team orange (south goal). Omit to read the store. */
  score?: ArenaScore;
}

export function ArenaScoreboard({ score }: ArenaScoreboardProps) {
  const fromStore = useGamingArtStore((s) => s.arenaScore);
  const s = score ?? fromStore;
  const a = SCOREBOARD_ANCHOR;
  return (
    <group name="arena-scoreboard">
      <NeonText color={neon.cyan} intensity={2.6} font="displayBold" fontSize={a.digitSize} position={a.home} rotation={[0, a.rotationY, 0]} renderOrder={5}>
        {String(Math.max(0, Math.floor(s.home)))}
      </NeonText>
      <NeonText color={neon.orange} intensity={2.6} font="displayBold" fontSize={a.digitSize} position={a.away} rotation={[0, a.rotationY, 0]} renderOrder={5}>
        {String(Math.max(0, Math.floor(s.away)))}
      </NeonText>
    </group>
  );
}

/** Everything animated in the new zones, wired to the store. Rendered by CityScene. */
export function GamingZone() {
  return (
    <group name="gaming-zone">
      <GamingFx />
      <ArcadeScreens />
      <RaceGates />
      <DataServer />
      <ArenaScoreboard />
    </group>
  );
}


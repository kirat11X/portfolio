// Time-trial state. Phase changes go through the zustand store (HUD re-renders
// a handful of times per race); the running clock lives in `raceClock` and is
// read by the HUD with requestAnimationFrame.

import { create } from 'zustand';
import { RACE } from '../config/layout';
import { cancelAutopilot, clearKeys, placeCar, runtime } from '../scene/runtime';
import { cleanName, crossedGate, DEFAULT_RACER, spokenRaceTime, insertLap, isRaceRecord, RACE_GATES, RACE_START_PAD, type LapEntry } from './raceLogic';
import { readGameJson, writeGame } from './storage';

export type RacePhase = 'idle' | 'countdown' | 'running' | 'finished';

export const COUNTDOWN_SECONDS = 3;

export interface RaceResult {
  time: number;
  /** Place on the board (0-based) or null. */
  rank: number | null;
  /** Previous best before this lap (null on the first lap). */
  previousBest: number | null;
  /** The entry on the board, so the visitor can rename it. */
  entry: LapEntry | null;
}

interface RaceState {
  phase: RacePhase;
  /** Index into RACE_GATES of the next gate to pass. */
  next: number;
  /** 3, 2, 1 during the countdown. */
  count: number;
  /** "GO!" is showing (the first moments of the run). */
  showGo: boolean;
  board: LapEntry[];
  result: RaceResult | null;
  /** Short status for the HUD and screen readers ("Checkpoint 3 of 11", "Quick travel is off…"). */
  notice: { text: string; serial: number } | null;
  start: () => void;
  cancel: () => void;
  exit: () => void;
  rename: (name: string) => void;
  say: (text: string) => void;
  reload: () => void;
}

/** Mutable per-frame race data (no React). */
export const raceClock = {
  /** Seconds since GO (running) or the final time (finished). */
  elapsed: 0,
  /** Seconds left in the countdown. */
  countdown: 0,
  prevX: 0,
  prevZ: 0,
  /** Car was on the start pad last frame (so the pad triggers on entry only). */
  onPad: false,
  /** No auto-start from the pad before this sim time (after cancel/finish). */
  padCooldownUntil: 0,
};

function loadBoard(): LapEntry[] {
  return readGameJson('kirat:race', { board: [] }, isRaceRecord).board;
}

let noticeSerial = 0;

export const useRaceStore = create<RaceState>((set, get) => ({
  phase: 'idle',
  next: 0,
  count: COUNTDOWN_SECONDS,
  showGo: false,
  board: loadBoard(),
  result: null,
  notice: null,
  start: () => {
    cancelAutopilot();
    clearKeys();
    runtime.camera.closeup.active = false;
    const { x, z, heading } = RACE.start;
    placeCar(x, z, heading);
    runtime.camera.snap = true;
    runtime.camera.arrival.active = false;
    runtime.camera.orbit = 0;
    raceClock.elapsed = 0;
    raceClock.countdown = COUNTDOWN_SECONDS;
    raceClock.prevX = x;
    raceClock.prevZ = z;
    raceClock.onPad = true;
    set({ phase: 'countdown', next: 0, count: COUNTDOWN_SECONDS, result: null, notice: { text: 'Time trial: get ready', serial: ++noticeSerial } });
  },
  cancel: () => {
    if (get().phase === 'idle') return;
    raceClock.padCooldownUntil = runtime.time + 4;
    set({ phase: 'idle', next: 0, result: null, showGo: false, notice: { text: 'Race cancelled', serial: ++noticeSerial } });
  },
  exit: () => {
    raceClock.padCooldownUntil = runtime.time + 4;
    set({ phase: 'idle', next: 0, result: null, showGo: false });
  },
  rename: (name) => {
    const { result, board } = get();
    if (!result?.entry) return;
    const entry = result.entry;
    const renamed: LapEntry = { ...entry, name: cleanName(name) };
    const nextBoard = board.map((e) => (e === entry ? renamed : e));
    writeGame('kirat:race', JSON.stringify({ board: nextBoard }));
    set({ board: nextBoard, result: { ...result, entry: renamed } });
  },
  say: (text) => set({ notice: { text, serial: ++noticeSerial } }),
  reload: () => set({ board: loadBoard() }),
}));

export function isRacing(): boolean {
  const phase = useRaceStore.getState().phase;
  return phase === 'countdown' || phase === 'running';
}

function finish(time: number) {
  const store = useRaceStore.getState();
  const previousBest = store.board.length ? Math.min(...store.board.map((e) => e.time)) : null;
  const entry: LapEntry = { name: DEFAULT_RACER, time, at: Date.now() };
  const { board, rank } = insertLap(store.board, entry);
  writeGame('kirat:race', JSON.stringify({ board }));
  raceClock.padCooldownUntil = runtime.time + 6;
  useRaceStore.setState({
    phase: 'finished',
    showGo: false,
    notice: { text: `Lap finished in ${spokenRaceTime(time)}`, serial: ++noticeSerial },
    board,
    result: { time, rank, previousBest, entry: rank === null ? null : entry },
  });
}

/**
 * Per-frame race update, after the physics step. Returns true while the car
 * must hold still (countdown).
 */
export function updateRace(dt: number): void {
  const store = useRaceStore.getState();
  const car = runtime.car;
  const { phase } = store;

  if (phase === 'idle') {
    const onPad = Math.hypot(car.x - RACE_START_PAD.x, car.z - RACE_START_PAD.z) < RACE_START_PAD.radius;
    if (onPad && !raceClock.onPad && runtime.time >= raceClock.padCooldownUntil && !runtime.autopilot.active) {
      raceClock.onPad = true;
      store.start();
      return;
    }
    raceClock.onPad = onPad;
    return;
  }

  if (phase === 'countdown') {
    raceClock.countdown -= dt;
    const count = Math.max(1, Math.ceil(raceClock.countdown));
    if (raceClock.countdown <= 0) {
      raceClock.elapsed = 0;
      raceClock.prevX = car.x;
      raceClock.prevZ = car.z;
      useRaceStore.setState({ phase: 'running', count: 0, showGo: true, notice: { text: 'Go!', serial: ++noticeSerial } });
    } else if (count !== store.count) {
      useRaceStore.setState({ count });
    }
    return;
  }

  if (phase === 'running') {
    raceClock.elapsed += dt;
    if (store.showGo && raceClock.elapsed > 0.8) useRaceStore.setState({ showGo: false });
    const gate = RACE_GATES[store.next];
    if (gate && crossedGate(gate, raceClock.prevX, raceClock.prevZ, car.x, car.z)) {
      const next = store.next + 1;
      if (next >= RACE_GATES.length) {
        finish(raceClock.elapsed);
      } else {
        const remaining = RACE_GATES.length - next;
        const text = next === RACE_GATES.length - 1 ? 'Last checkpoint! Finish on the hub roundabout' : `Checkpoint ${next} of ${RACE_GATES.length - 1} · ${remaining} to go`;
        useRaceStore.setState({ next, notice: { text, serial: ++noticeSerial } });
      }
    }
    raceClock.prevX = car.x;
    raceClock.prevZ = car.z;
  }
}

/** Car must not move (countdown). */
export function raceHoldsCar(): boolean {
  return useRaceStore.getState().phase === 'countdown';
}

import { create } from 'zustand';

// Truthful loading state for the 3D world. Each stage completes only when its
// real event fires (module downloaded, fonts parsed, scene mounted, shaders
// compiled, first frame drawn). Nothing here advances on a timer.

export type LoadStageId = 'engine' | 'fonts' | 'world' | 'shaders' | 'frame';
export type StageStatus = 'pending' | 'active' | 'done' | 'error';
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LoadStage {
  id: LoadStageId;
  label: string;
  weight: number;
}

export const LOAD_STAGES: readonly LoadStage[] = [
  { id: 'engine', label: 'Loading the 3D engine', weight: 0.35 },
  { id: 'fonts', label: 'Loading typefaces', weight: 0.15 },
  { id: 'world', label: 'Building the district', weight: 0.2 },
  { id: 'shaders', label: 'Compiling shaders', weight: 0.2 },
  { id: 'frame', label: 'First light', weight: 0.1 },
];

const INTRO_KEY = 'kirat:intro-seen';

function readIntroSeen(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

function freshStages(): Record<LoadStageId, StageStatus> {
  return { engine: 'pending', fonts: 'pending', world: 'pending', shaders: 'pending', frame: 'pending' };
}

interface LoadingState {
  stages: Record<LoadStageId, StageStatus>;
  /** Optional 0..1 progress inside a stage, only when a real measure exists. */
  sub: Partial<Record<LoadStageId, number>>;
  status: LoadStatus;
  error: string | null;
  startedAt: number | null;
  /** The intro was already completed earlier in this browser session. */
  returning: boolean;
  /** The visitor has passed the intro and the world is interactive. */
  entered: boolean;

  start: (stage: LoadStageId) => void;
  complete: (stage: LoadStageId) => void;
  fail: (stage: LoadStageId, message: string) => void;
  setSub: (stage: LoadStageId, value: number) => void;
  enter: () => void;
  /** Called when a new world instance mounts. Keeps `returning`. */
  resetForMount: () => void;
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  stages: freshStages(),
  sub: {},
  status: 'idle',
  error: null,
  startedAt: null,
  returning: typeof window !== 'undefined' && readIntroSeen(),
  entered: false,

  start: (stage) => {
    const state = get();
    if (state.stages[stage] === 'done' || state.status === 'error') return;
    set({
      stages: { ...state.stages, [stage]: 'active' },
      status: 'loading',
      startedAt: state.startedAt ?? performance.now(),
    });
  },

  complete: (stage) => {
    const state = get();
    if (state.stages[stage] === 'done' || state.status === 'error') return;
    const stages = { ...state.stages, [stage]: 'done' as const };
    const allDone = LOAD_STAGES.every(({ id }) => stages[id] === 'done');
    set({
      stages,
      sub: { ...state.sub, [stage]: 1 },
      status: allDone ? 'ready' : 'loading',
      startedAt: state.startedAt ?? performance.now(),
    });
  },

  fail: (stage, message) => {
    const state = get();
    set({ stages: { ...state.stages, [stage]: 'error' }, status: 'error', error: message });
  },

  setSub: (stage, value) => {
    const state = get();
    if (state.stages[stage] === 'done') return;
    // Progress never moves backwards, even if a source reports a lower value later.
    const next = Math.max(state.sub[stage] ?? 0, Math.min(1, Math.max(0, value)));
    set({ sub: { ...state.sub, [stage]: next } });
  },

  enter: () => {
    try {
      window.sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* Session storage unavailable: the intro may show again next visit. */
    }
    set({ entered: true, returning: true });
  },

  resetForMount: () =>
    set({ stages: freshStages(), sub: {}, status: 'idle', error: null, startedAt: null, entered: false }),
}));

/** Weighted 0..1 progress from completed stages plus any measured sub-progress. */
export function selectProgress(state: Pick<LoadingState, 'stages' | 'sub'>): number {
  // Exactly 1 when finished (summing float weights would give 0.9999…).
  if (LOAD_STAGES.every(({ id }) => state.stages[id] === 'done')) return 1;
  let total = 0;
  for (const { id, weight } of LOAD_STAGES) {
    if (state.stages[id] === 'done') total += weight;
    else total += weight * (state.sub[id] ?? 0);
  }
  return Math.min(1, total);
}

/** The first stage that is not finished, used for the status label. */
export function selectCurrentStage(state: Pick<LoadingState, 'stages'>): LoadStage | null {
  return LOAD_STAGES.find(({ id }) => state.stages[id] !== 'done') ?? null;
}

export function selectCompletedCount(state: Pick<LoadingState, 'stages'>): number {
  return LOAD_STAGES.filter(({ id }) => state.stages[id] === 'done').length;
}

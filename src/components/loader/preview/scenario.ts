// Dev-only: turns the preview URL query into loading-store state, and a timed
// "simulated run" for eyeballing the ignition sequence. The product itself
// never advances progress on a timer — only this harness does.
import { LOAD_STAGES, selectCurrentStage, useLoadingStore, type LoadStageId, type StageStatus } from '@/lib/loadingStore';

export const params = new URLSearchParams(window.location.search);
export const flag = (name: string) => ['1', 'true', 'yes'].includes(params.get(name) ?? '');
export const DEFAULT_ERROR = 'The 3D engine could not be downloaded. Check your connection or use the classic view.';

export type HostStatus = 'loading' | 'ready' | 'error';

interface Scenario {
  status: HostStatus;
  stage: number | null;
  progress: number | null;
  error: string | null;
}

export function readScenario(): Scenario {
  const rawStatus = params.get('status');
  const status: HostStatus = rawStatus === 'ready' || rawStatus === 'error' ? rawStatus : 'loading';
  const rawStage = params.get('stage');
  let stage: number | null = null;
  if (rawStage) {
    const byId = LOAD_STAGES.findIndex(
      ({ id, label }) => id === rawStage || label.toLowerCase() === rawStage.toLowerCase(),
    );
    const byNumber = Number(rawStage);
    if (byId >= 0) stage = byId;
    else if (Number.isInteger(byNumber) && byNumber >= 1 && byNumber <= LOAD_STAGES.length) stage = byNumber - 1;
  }
  const rawProgress = params.get('progress');
  const progress =
    rawProgress === null || Number.isNaN(Number(rawProgress)) ? null : Math.min(1, Math.max(0, Number(rawProgress)));
  return { status, stage, progress, error: params.get('error') };
}

function freshStages(): Record<LoadStageId, StageStatus> {
  return { engine: 'pending', fonts: 'pending', world: 'pending', shaders: 'pending', frame: 'pending' };
}

/** Puts the store into the described state: stages before the active one done, measured sub-progress if given. */
export function applyScenario({ status, stage, progress, error }: Scenario = readScenario()) {
  cancelSimulation();
  const stages = freshStages();
  const sub: Partial<Record<LoadStageId, number>> = {};

  if (status === 'ready') {
    for (const { id } of LOAD_STAGES) {
      stages[id] = 'done';
      sub[id] = 1;
    }
  } else {
    let active = stage ?? 0;
    let doneWeight = 0;
    if (stage === null && progress !== null) {
      active = LOAD_STAGES.length - 1;
      for (let i = 0; i < LOAD_STAGES.length; i++) {
        if (doneWeight + LOAD_STAGES[i].weight > progress + 1e-6) {
          active = i;
          break;
        }
        doneWeight += LOAD_STAGES[i].weight;
      }
    } else {
      doneWeight = LOAD_STAGES.slice(0, active).reduce((sum, { weight }) => sum + weight, 0);
    }
    LOAD_STAGES.forEach(({ id }, i) => {
      if (i < active) {
        stages[id] = 'done';
        sub[id] = 1;
      } else if (i === active) {
        stages[id] = status === 'error' ? 'error' : 'active';
      }
    });
    const activeStage = LOAD_STAGES[active];
    if (progress !== null && activeStage) {
      const within = (progress - doneWeight) / activeStage.weight;
      if (within > 0) sub[activeStage.id] = Math.min(0.999, within);
    }
  }

  useLoadingStore.setState({
    stages,
    sub,
    status: status === 'ready' ? 'ready' : status === 'error' ? 'error' : 'loading',
    error: status === 'error' ? (error ?? DEFAULT_ERROR) : null,
    startedAt: performance.now(),
    entered: false,
  });
}

const SIMULATED_RUN: ReadonlyArray<readonly [LoadStageId, number]> = [
  ['engine', 1500],
  ['fonts', 700],
  ['world', 900],
  ['shaders', 1400],
  ['frame', 400],
];

let timers: number[] = [];

export function cancelSimulation() {
  for (const timer of timers) window.clearTimeout(timer);
  timers = [];
}

/** Replays a plausible load from scratch with real store calls on timers (preview only). */
export function startSimulation() {
  cancelSimulation();
  const store = useLoadingStore.getState();
  store.resetForMount();
  let at = 250;
  for (const [id, duration] of SIMULATED_RUN) {
    timers.push(window.setTimeout(() => useLoadingStore.getState().start(id), at));
    if (id === 'fonts') {
      for (const step of [0.35, 0.7]) {
        timers.push(window.setTimeout(() => useLoadingStore.getState().setSub(id, step), at + duration * step));
      }
    }
    at += duration;
    timers.push(window.setTimeout(() => useLoadingStore.getState().complete(id), at));
  }
}

export function completeCurrentStage() {
  const current = selectCurrentStage(useLoadingStore.getState());
  if (!current) return;
  useLoadingStore.getState().complete(current.id);
  const following = selectCurrentStage(useLoadingStore.getState());
  if (following) useLoadingStore.getState().start(following.id);
}

export function setCurrentSub(value: number) {
  const current = selectCurrentStage(useLoadingStore.getState());
  if (current) useLoadingStore.getState().setSub(current.id, value);
}

export function completeAll() {
  cancelSimulation();
  for (const { id } of LOAD_STAGES) useLoadingStore.getState().complete(id);
}

export function failCurrent(message: string = DEFAULT_ERROR) {
  cancelSimulation();
  const current = selectCurrentStage(useLoadingStore.getState());
  useLoadingStore.getState().fail(current?.id ?? 'world', message);
}

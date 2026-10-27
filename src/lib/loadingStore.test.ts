// The world loader must be truthful: progress moves only on real events, the
// status machine is idle → loading → ready | error, and a failure freezes it.

import { beforeEach, describe, expect, it } from 'vitest';
import {
  LOAD_STAGES,
  selectCompletedCount,
  selectCurrentStage,
  selectProgress,
  useLoadingStore,
  type LoadStatus,
} from './loadingStore';

const store = useLoadingStore;
const progress = () => selectProgress(store.getState());
const weight = (id: string) => LOAD_STAGES.find((stage) => stage.id === id)?.weight ?? Number.NaN;
const ids = LOAD_STAGES.map((stage) => stage.id);

/** Records every status change while `run` executes. */
function statusTrail(run: () => void): LoadStatus[] {
  const trail: LoadStatus[] = [];
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.status !== previous.status) trail.push(state.status);
  });
  try {
    run();
  } finally {
    unsubscribe();
  }
  return trail;
}

beforeEach(() => {
  store.getState().resetForMount();
  store.setState({ returning: false });
});

describe('stages', () => {
  it('are the contracted five, in order, with weights summing to 1', () => {
    expect(ids).toEqual(['engine', 'fonts', 'world', 'shaders', 'frame']);
    expect(LOAD_STAGES.reduce((sum, stage) => sum + stage.weight, 0)).toBeCloseTo(1, 10);
    for (const stage of LOAD_STAGES) {
      expect(stage.weight, stage.id).toBeGreaterThan(0);
      expect(stage.label.trim(), stage.id).not.toBe('');
    }
  });
});

describe('initial state', () => {
  it('is idle at zero progress with the engine stage current', () => {
    const state = store.getState();
    expect(state.status).toBe('idle');
    expect(progress()).toBe(0);
    expect(selectCurrentStage(state)?.id).toBe('engine');
    expect(selectCompletedCount(state)).toBe(0);
    expect(state.error).toBeNull();
    expect(state.entered).toBe(false);
    expect(state.startedAt).toBeNull();
  });

  it('is not "returning" outside a browser session', () => {
    // In Node there is no sessionStorage; the jsdom suite covers the browser path.
    expect(store.getInitialState().returning).toBe(false);
  });
});

describe('progress', () => {
  it('does not advance when a stage merely starts', () => {
    store.getState().start('engine');
    expect(store.getState().stages.engine).toBe('active');
    expect(store.getState().status).toBe('loading');
    expect(store.getState().startedAt).toEqual(expect.any(Number));
    expect(progress()).toBe(0);
  });

  it('increases by exactly the stage weight on each completion, and never decreases', () => {
    let previous = progress();
    for (const id of ids) {
      store.getState().start(id);
      expect(progress(), `start(${id})`).toBe(previous);
      store.getState().complete(id);
      expect(progress(), `complete(${id})`).toBeCloseTo(previous + weight(id), 10);
      expect(progress()).toBeGreaterThan(previous);
      previous = progress();
    }
    expect(progress()).toBeCloseTo(1, 10);
  });

  // Regression for QA-U2 (fixed): the float weights sum to 0.9999999999999999,
  // so without the explicit "all done" case a `progress >= 1` check never fired.
  it('is exactly 1 when every stage is done', () => {
    for (const id of ids) store.getState().complete(id);
    expect(progress()).toBe(1);
  });

  it('counts a repeated completion once', () => {
    store.getState().complete('engine');
    store.getState().complete('engine');
    expect(progress()).toBeCloseTo(weight('engine'), 10);
    expect(selectCompletedCount(store.getState())).toBe(1);
  });

  it('includes measured sub-progress, clamped to the stage', () => {
    store.getState().setSub('engine', 0.5);
    expect(progress()).toBeCloseTo(weight('engine') * 0.5, 10);
    store.getState().setSub('engine', 7);
    expect(progress()).toBeCloseTo(weight('engine'), 10);
    expect(store.getState().status).toBe('idle');
  });

  it('ignores sub-progress for a finished stage and never exceeds 1', () => {
    for (const id of ids) store.getState().complete(id);
    store.getState().setSub('frame', 0.2);
    for (const id of ids) store.getState().setSub(id, 1);
    expect(progress()).toBeCloseTo(1, 10);
    expect(progress()).toBeLessThanOrEqual(1);
  });

  // Regression for QA-U1 (fixed): setSub used to store the latest value, so a
  // smaller report moved the bar backwards.
  it('never moves backwards when a stage reports lower sub-progress', () => {
    store.getState().setSub('engine', 0.8);
    const before = progress();
    store.getState().setSub('engine', 0.3);
    expect(progress()).toBeCloseTo(before, 10);
    store.getState().setSub('engine', -1);
    expect(progress()).toBeCloseTo(before, 10);
  });
});

describe('status machine', () => {
  it('goes idle → loading → ready, and ready only once every stage is done', () => {
    const trail = statusTrail(() => {
      for (const id of ids) {
        store.getState().start(id);
        store.getState().complete(id);
        if (id !== 'frame') expect(store.getState().status).toBe('loading');
      }
    });
    expect(trail).toEqual(['loading', 'ready']);
    expect(store.getState().status).toBe('ready');
    expect(selectCurrentStage(store.getState())).toBeNull();
    expect(selectCompletedCount(store.getState())).toBe(ids.length);
  });

  it('reaches ready regardless of completion order', () => {
    for (const id of [...ids].reverse()) {
      expect(store.getState().status).not.toBe('ready');
      store.getState().complete(id);
    }
    expect(store.getState().status).toBe('ready');
    expect(progress()).toBeCloseTo(1, 10);
  });

  it('goes idle → loading → error on failure and records the message', () => {
    const trail = statusTrail(() => {
      store.getState().start('engine');
      store.getState().fail('engine', 'The 3D engine could not be downloaded.');
    });
    expect(trail).toEqual(['loading', 'error']);
    expect(store.getState().error).toBe('The 3D engine could not be downloaded.');
    expect(store.getState().stages.engine).toBe('error');
  });

  it('freezes after an error: later start/complete calls change nothing', () => {
    store.getState().complete('engine');
    store.getState().fail('fonts', 'boom');
    const frozen = progress();
    store.getState().start('world');
    store.getState().complete('fonts');
    store.getState().complete('world');
    expect(store.getState().status).toBe('error');
    expect(store.getState().stages.world).toBe('pending');
    expect(progress()).toBe(frozen);
  });

  it('does not reopen a completed stage', () => {
    store.getState().complete('engine');
    store.getState().start('engine');
    expect(store.getState().stages.engine).toBe('done');
  });
});

describe('selectCurrentStage', () => {
  it('is the first unfinished stage in contract order', () => {
    store.getState().complete('fonts');
    store.getState().complete('world');
    expect(selectCurrentStage(store.getState())?.id).toBe('engine');
    store.getState().complete('engine');
    expect(selectCurrentStage(store.getState())?.id).toBe('shaders');
    store.getState().complete('shaders');
    expect(selectCurrentStage(store.getState())?.id).toBe('frame');
  });
});

describe('enter and remount', () => {
  it('enter() marks the visitor as entered and the intro as seen', () => {
    store.getState().enter();
    expect(store.getState().entered).toBe(true);
    expect(store.getState().returning).toBe(true);
  });

  it('resetForMount() starts a fresh run but remembers the intro was seen', () => {
    for (const id of ids) store.getState().complete(id);
    store.getState().enter();
    store.getState().resetForMount();
    const state = store.getState();
    expect(state.status).toBe('idle');
    expect(progress()).toBe(0);
    expect(state.error).toBeNull();
    expect(state.entered).toBe(false);
    expect(state.startedAt).toBeNull();
    expect(state.returning).toBe(true);
    expect(Object.values(state.stages).every((status) => status === 'pending')).toBe(true);
  });
});

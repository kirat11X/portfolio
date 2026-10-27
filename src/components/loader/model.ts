import { LOAD_STAGES, type LoadStageId, type StageStatus } from '@/lib/loadingStore';

// Pure helpers for the neon-ignition loader: per-stage view model, the
// letter ↔ stage mapping and the live-region copy. No React, no DOM.

export type LoaderStatus = 'loading' | 'ready' | 'error';

/** Which screen the loader shows. */
export type LoaderView = 'loading' | 'slow' | 'ready' | 'error';

/** Visual state of one neon letter. */
export type LetterState = 'off' | 'striking' | 'on' | 'error';

export interface StageView {
  id: LoadStageId;
  label: string;
  weight: number;
  status: StageStatus;
  /** Truthful 0..1 fill of this stage's bar segment: 1 when done, measured sub-progress otherwise. */
  fill: number;
  /** The first unfinished stage — the one named by the status label. */
  current: boolean;
}

export interface LetterSlot {
  char: string;
  /** Indices into LOAD_STAGES that this letter represents. Empty for spaces. */
  stages: number[];
}

/** Exit choreography (ms). flare + iris stays under the 900 ms budget. */
export const EXIT_TIMING = {
  flare: 240,
  iris: 620,
  flareQuick: 110,
  irisQuick: 460,
  fade: 200,
} as const;

const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

export function viewFor(status: LoaderStatus, slow: boolean): LoaderView {
  if (status === 'error') return 'error';
  if (status === 'ready') return 'ready';
  return slow ? 'slow' : 'loading';
}

/**
 * Per-stage detail for the letters and the segmented bar. Prefers the loading
 * store (the only source of per-stage truth). When the store holds no data —
 * the loader rendered outside the world host, e.g. in a test — it rebuilds the
 * stages from the weighted `progress` prop, assuming in-order completion.
 * Either way a segment is only ever filled by completed or measured work.
 */
export function deriveStages(
  stages: Readonly<Record<LoadStageId, StageStatus>>,
  sub: Readonly<Partial<Record<LoadStageId, number>>>,
  progress: number,
  status: LoaderStatus,
): StageView[] {
  let statuses: StageStatus[];
  let fills: number[];

  if (status === 'ready') {
    statuses = LOAD_STAGES.map(() => 'done');
    fills = LOAD_STAGES.map(() => 1);
  } else if (LOAD_STAGES.some(({ id }) => stages[id] !== 'pending')) {
    statuses = LOAD_STAGES.map(({ id }) => stages[id]);
    fills = LOAD_STAGES.map(({ id }, i) => (statuses[i] === 'done' ? 1 : clamp01(sub[id] ?? 0)));
  } else {
    statuses = [];
    fills = [];
    let rest = clamp01(progress);
    let open = false;
    for (const { weight } of LOAD_STAGES) {
      if (!open && rest >= weight - 1e-6) {
        statuses.push('done');
        fills.push(1);
        rest -= weight;
      } else {
        statuses.push(open ? 'pending' : 'active');
        fills.push(open ? 0 : clamp01(rest / weight));
        open = true;
        rest = 0;
      }
    }
    if (status === 'error') {
      const failed = statuses.findIndex((s) => s !== 'done');
      if (failed >= 0) statuses[failed] = 'error';
    }
  }

  const current = statuses.findIndex((s) => s !== 'done');
  return LOAD_STAGES.map((stage, i) => ({ ...stage, status: statuses[i], fill: fills[i], current: i === current }));
}

/**
 * Splits the stages across the letters of `word` in order. With as many
 * letters as stages each letter is one stage; longer words share a stage
 * between neighbouring letters, shorter words give a letter several stages.
 * Whitespace gets no stage (it renders as a gap).
 */
export function mapLetters(word: string, stageCount: number = LOAD_STAGES.length): LetterSlot[] {
  const chars = Array.from(word);
  const letterCount = chars.filter((char) => char.trim() !== '').length;
  let index = 0;
  return chars.map((char) => {
    if (char.trim() === '' || stageCount <= 0 || letterCount === 0) return { char, stages: [] };
    const from = Math.floor((index * stageCount) / letterCount);
    const to = Math.max(from + 1, Math.floor(((index + 1) * stageCount) / letterCount));
    index += 1;
    return { char, stages: Array.from({ length: to - from }, (_, k) => from + k) };
  });
}

/**
 * Lit when every stage behind the letter is done, striking while one of them
 * is in progress (or is the stage the label names), unlit before that.
 * `halted` (an error stopped loading) turns striking letters off: nothing is
 * progressing, so nothing should look like it is.
 */
export function letterState(slot: LetterSlot, stages: readonly StageView[], halted: boolean): LetterState {
  const own = slot.stages.map((i) => stages[i]).filter((stage): stage is StageView => Boolean(stage));
  if (own.length === 0) return 'off';
  if (own.some((stage) => stage.status === 'error')) return 'error';
  if (own.every((stage) => stage.status === 'done')) return 'on';
  if (halted) return 'off';
  if (own.some((stage) => stage.status === 'active' || stage.status === 'done' || stage.current)) return 'striking';
  return 'off';
}

/** Whole-percent value that never exceeds the real progress. */
export function percentOf(progress: number): number {
  return Math.round(clamp01(progress) * 100);
}

interface MessageInput {
  view: LoaderView;
  returning: boolean;
  stageLabel: string;
  stageNumber: number;
  stageCount: number;
  error: string | null;
}

/**
 * Copy for the single polite live region: changes on stage changes, readiness,
 * slowness and errors — never on every percent. Deliberately avoids the words
 * of the enter button so text selectors only ever match the button itself.
 */
export function statusMessage({ view, returning, stageLabel, stageNumber, stageCount, error }: MessageInput): string {
  if (view === 'error') return `Loading stopped. ${error ?? 'The 3D world could not start.'}`;
  if (view === 'ready') return returning ? 'Ready. Opening the district.' : 'Ready. The 3D district has loaded.';
  const step = stageNumber > 0 ? `${stageLabel}, step ${stageNumber} of ${stageCount}.` : `${stageLabel}.`;
  if (view === 'slow') {
    return `${step} Still loading — the 3D world is taking longer than usual on this device. The classic view is available.`;
  }
  return step;
}

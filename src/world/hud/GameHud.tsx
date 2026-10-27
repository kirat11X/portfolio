import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Flag, Monitor, RotateCcw, Trophy, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useReducedMotion } from '@/lib/motion';
import { neon } from '@/styles/tokens';
import { formatRaceTime, RACE_GATES } from '../game/raceLogic';
import { raceClock, useRaceStore } from '../game/raceStore';
import { useSoccerStore } from '../game/soccerStore';
import { closeCloseup, goToArena } from '../scene/actions';
import { runtime } from '../scene/runtime';
import { useHudStore } from '../scene/uiState';
import { useWorldStore } from '../state/worldStore';
import { Kbd } from './Kbd';
import { useIsTouch } from './useMedia';

const chip = 'glass-strong pointer-events-auto flex items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 shadow-panel animate-rise';

function bestTime(board: ReadonlyArray<{ time: number }>): number | null {
  return board.length ? Math.min(...board.map((e) => e.time)) : null;
}

/** Live timer + next-gate compass, updated with rAF (no React re-render per frame). */
function RaceTicker() {
  const timeRef = useRef<HTMLSpanElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const distRef = useRef<HTMLSpanElement>(null);
  const next = useRaceStore((s) => s.next);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      if (timeRef.current) timeRef.current.textContent = formatRaceTime(raceClock.elapsed);
      const gate = RACE_GATES[useRaceStore.getState().next];
      const car = runtime.car;
      if (gate) {
        // Screen-space direction: camera forward (eye → car) is "up".
        const eye = runtime.camera.eye;
        let fx = car.x - eye.x;
        let fz = car.z - eye.z;
        const fl = Math.hypot(fx, fz) || 1;
        fx /= fl;
        fz /= fl;
        const dx = gate.x - car.x;
        const dz = gate.z - car.z;
        const right = dx * -fz + dz * fx;
        const up = dx * fx + dz * fz;
        if (arrowRef.current) arrowRef.current.style.transform = `rotate(${Math.atan2(right, up)}rad)`;
        if (distRef.current) distRef.current.textContent = `${Math.round(Math.hypot(dx, dz))} m`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const isFinish = next === RACE_GATES.length - 1;
  return (
    <>
      <span className="font-mono text-[20px] font-semibold tabular-nums tracking-tight text-fg" aria-hidden="true">
        <span ref={timeRef}>0:00.00</span>
      </span>
      <span className="h-6 w-px bg-line" aria-hidden="true" />
      <span className="flex items-center gap-2 text-[12.5px] text-fg-muted">
        <span
          ref={arrowRef}
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full"
          style={{ backgroundColor: `${neon.orange}26`, color: neon.orange }}
        >
          <ArrowUp className="h-4 w-4" />
        </span>
        <span>
          <span className="text-fg">{isFinish ? 'Finish' : `Gate ${next + 1}/${RACE_GATES.length - 1}`}</span>
          <span className="hidden sm:inline" aria-hidden="true">
            {' · '}
            <span ref={distRef} />
          </span>
        </span>
      </span>
    </>
  );
}

function RaceChip() {
  const phase = useRaceStore((s) => s.phase);
  const board = useRaceStore((s) => s.board);
  const cancel = useRaceStore((s) => s.cancel);
  const touch = useIsTouch();
  if (phase !== 'running' && phase !== 'countdown') return null;
  const best = bestTime(board);
  return (
    <div className={chip} role="group" aria-label="Time trial">
      <Flag className="h-4 w-4 shrink-0" style={{ color: neon.orange }} aria-hidden="true" />
      <RaceTicker />
      {best !== null && <span className="hidden font-mono text-[11.5px] text-fg-subtle md:inline">best {formatRaceTime(best)}</span>}
      <button
        type="button"
        onClick={cancel}
        className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
      >
        <X className="h-4 w-4" aria-hidden="true" />
        Quit
        {!touch && <Kbd decorative className="ml-0.5 hidden md:inline-flex">Esc</Kbd>}
      </button>
    </div>
  );
}

/** Big 3 · 2 · 1 · GO in the middle of the screen. */
function Countdown() {
  const phase = useRaceStore((s) => s.phase);
  const count = useRaceStore((s) => s.count);
  const showGo = useRaceStore((s) => s.showGo);
  const reduced = useReducedMotion();
  const text = phase === 'countdown' ? String(count) : showGo ? 'GO!' : null;
  if (!text) return null;
  const color = text === 'GO!' ? neon.emerald : neon.orange;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span
        key={text}
        className={cn('font-display text-[96px] font-bold leading-none tracking-tight sm:text-[140px]', !reduced && 'animate-rise')}
        style={{ color, textShadow: `0 0 32px ${color}` }}
      >
        {text}
      </span>
    </div>
  );
}

function SoccerChip() {
  const inArena = useSoccerStore((s) => s.inArena);
  const goals = useSoccerStore((s) => s.goals);
  const best = useSoccerStore((s) => s.best);
  const resetBall = useSoccerStore((s) => s.resetBall);
  const racing = useRaceStore((s) => s.phase !== 'idle');
  const touch = useIsTouch();
  if (!inArena || racing) return null;
  return (
    <div className={chip} role="group" aria-label="Car soccer">
      <Trophy className="h-4 w-4 shrink-0" style={{ color: neon.orange }} aria-hidden="true" />
      <span className="text-[12.5px] text-fg-muted">
        <span className="font-mono text-[18px] font-semibold tabular-nums text-fg">{goals}</span> goal{goals === 1 ? '' : 's'}
        <span className="text-fg-subtle"> · best {best}</span>
      </span>
      <button
        type="button"
        onClick={resetBall}
        className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Reset ball
        {!touch && <Kbd decorative className="ml-0.5 hidden md:inline-flex">B</Kbd>}
      </button>
    </div>
  );
}

function CloseupChip() {
  const closeup = useHudStore((s) => s.closeup);
  const touch = useIsTouch();
  if (!closeup) return null;
  return (
    <div className={chip}>
      <Monitor className="h-4 w-4 shrink-0" style={{ color: neon.orange }} aria-hidden="true" />
      <span className="text-[13px] text-fg-muted">The gaming rig</span>
      <button
        type="button"
        onClick={() => closeCloseup()}
        className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-fg transition-colors hover:bg-white/[0.06]"
      >
        Back to driving
        {!touch && <Kbd decorative className="ml-0.5 hidden md:inline-flex">Esc</Kbd>}
      </button>
    </div>
  );
}

/** Race notices ("Checkpoint 3 of 11") as a short visual toast + polite live region. */
function RaceNotice() {
  const notice = useRaceStore((s) => s.notice);
  const [expired, setExpired] = useState(0);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setExpired(notice.serial), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);
  const finished = useRaceStore((s) => s.phase === 'finished');
  const visible = notice && notice.serial !== expired && !finished ? notice : null;
  return (
    <>
      <p className="sr-only" aria-live="polite">
        {notice?.text ?? ''}
      </p>
      {visible && (
        <p
          key={visible.serial}
          aria-hidden="true"
          className="rounded-full border border-line-strong bg-ink-900/90 px-3 py-1 text-[12.5px] font-medium text-fg shadow-panel animate-rise"
        >
          {visible.text}
        </p>
      )}
    </>
  );
}

/** Top-centre game status: race timer, soccer score, close-up exit. */
export function GameStatus() {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-4 top-[4.25rem] flex flex-col items-center gap-2 md:top-3">
        <RaceChip />
        <SoccerChip />
        <CloseupChip />
        <RaceNotice />
      </div>
      <Countdown />
    </>
  );
}

/** Gaming Zone shortcuts above the dock: start the time trial, go to the arena. */
export function GamingActions() {
  const district = useWorldStore((s) => s.activeDistrict);
  const phase = useRaceStore((s) => s.phase);
  const start = useRaceStore((s) => s.start);
  const inArena = useSoccerStore((s) => s.inArena);
  const panelOpen = useWorldStore((s) => s.selectedExhibitId !== null);
  const showcase = useHudStore((s) => s.showcase);
  const closeup = useHudStore((s) => s.closeup);
  if (district !== 'gaming' || phase !== 'idle' || panelOpen || showcase || closeup) return null;
  const pill =
    'glass pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-fg-muted shadow-panel transition-colors hover:border-line-strong hover:text-fg';
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" onClick={start} className={pill}>
        <Flag className="h-4 w-4" style={{ color: neon.orange }} aria-hidden="true" />
        Start time trial
      </button>
      {!inArena && (
        <button type="button" onClick={() => goToArena()} className={pill}>
          <Trophy className="h-4 w-4" style={{ color: neon.orange }} aria-hidden="true" />
          Car soccer
        </button>
      )}
    </div>
  );
}

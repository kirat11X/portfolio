import { useEffect, useId, useRef, useState } from 'react';
import { Flag, RotateCcw, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { neon } from '@/styles/tokens';
import { useConsentStore } from '../game/consentStore';
import { DEFAULT_RACER, formatRaceTime, spokenRaceTime } from '../game/raceLogic';
import { useRaceStore, type RaceResult } from '../game/raceStore';

/** Results card after the finish line: time, best, top five, optional name, race again / exit. */
export function RaceResults() {
  const phase = useRaceStore((s) => s.phase);
  const result = useRaceStore((s) => s.result);
  if (phase !== 'finished' || !result) return null;
  return <ResultsCard key={`${result.time}-${result.entry?.at ?? 0}`} result={result} />;
}

function ResultsCard({ result }: { result: RaceResult }) {
  const board = useRaceStore((s) => s.board);
  const start = useRaceStore((s) => s.start);
  const exit = useRaceStore((s) => s.exit);
  const rename = useRaceStore((s) => s.rename);
  const consent = useConsentStore((s) => s.status);
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [name, setName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const { time, rank, previousBest, entry } = result;
  const newBest = previousBest === null || time < previousBest;
  const best = Math.min(time, previousBest ?? time);

  return (
    <section
      aria-labelledby={titleId}
      className="glass-strong pointer-events-auto absolute left-1/2 top-1/2 z-20 max-h-[calc(100dvh-var(--nav-h)-2rem)] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel p-5 shadow-panel animate-rise"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow" style={{ color: neon.orange }}>
            <Flag className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
            Time trial
          </p>
          <h2 id={titleId} ref={headingRef} tabIndex={-1} className="mt-1 font-display text-[2rem] font-semibold tabular-nums leading-tight text-fg outline-none">
            <span aria-hidden="true">{formatRaceTime(time)}</span>
            <span className="sr-only">Lap finished in {spokenRaceTime(time)}</span>
          </h2>
          <p className="mt-1 text-[13.5px] text-fg-muted">
            {newBest ? (
              <span style={{ color: neon.emerald }}>{previousBest === null ? 'First lap on the board!' : 'New best lap!'}</span>
            ) : (
              <>
                Best <span className="font-mono text-fg">{formatRaceTime(best)}</span> · +{(time - best).toFixed(2)}s
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={exit}
          aria-label="Close results"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <h3 className="eyebrow mt-5 text-fg-subtle">Top five on this device</h3>
      <ol className="mt-2 divide-y divide-line rounded-xl border border-line">
        {board.map((lap, index) => {
          const mine = entry !== null && lap === entry;
          return (
            <li key={`${lap.at}-${index}`} className={cn('flex items-center gap-3 px-3 py-2 text-[13.5px]', mine && 'bg-white/[0.06]')}>
              <span className="w-4 font-mono text-[11px] text-fg-subtle">{index + 1}</span>
              <span className={cn('min-w-0 flex-1 truncate', mine ? 'font-semibold text-fg' : 'text-fg-muted')}>
                {lap.name}
                {mine && <span className="sr-only"> (this lap)</span>}
              </span>
              <span className="font-mono tabular-nums text-fg">{formatRaceTime(lap.time)}</span>
            </li>
          );
        })}
      </ol>
      {rank === null && <p className="mt-2 text-[12.5px] text-fg-subtle">Not in the top five this time.</p>}

      {entry && (
        <form
          className="mt-4 flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            rename(name);
            setSaved(true);
          }}
        >
          <label className="min-w-0 flex-1 text-[12px] text-fg-subtle">
            Name on the board (optional)
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSaved(false);
              }}
              maxLength={16}
              placeholder={DEFAULT_RACER}
              autoComplete="nickname"
              className="mt-1 block h-11 w-full rounded-xl border border-line-strong bg-white/[0.03] px-3 text-[14px] text-fg placeholder:text-fg-subtle focus-visible:outline-2"
            />
          </label>
          <button type="submit" className="inline-flex h-11 items-center rounded-full border border-line-strong px-4 text-[13px] font-medium text-fg transition-colors hover:bg-white/5">
            {saved ? 'Saved' : 'Save'}
          </button>
        </form>
      )}
      <p className="mt-2 text-[11.5px] leading-snug text-fg-subtle" aria-live="polite">
        {consent === 'granted' ? 'Times are kept in this browser only.' : 'Times last for this visit only. Feed the data server RAM to keep them.'}
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={start}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-[14px] font-semibold text-void transition-opacity hover:opacity-90"
          style={{ backgroundColor: neon.orange }}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Race again
        </button>
        <button
          type="button"
          onClick={exit}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-line-strong text-[14px] font-medium text-fg transition-colors hover:bg-white/5"
        >
          Exit
        </button>
      </div>
    </section>
  );
}

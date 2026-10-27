import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, RotateCcw, TriangleAlert } from 'lucide-react';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { profileData } from '@/data/profile';
import { cn } from '@/lib/cn';
import { LOAD_STAGES, useLoadingStore } from '@/lib/loadingStore';
import { ControlHints } from './ControlHints';
import { Horizon } from './Horizon';
import { NeonWordmark } from './NeonWordmark';
import { StageMeter } from './StageMeter';
import { useFontReady, useMediaQuery, usePressedKeys } from './hooks';
import { deriveStages, statusMessage, viewFor } from './model';
import { useExitSequence } from './useExitSequence';
import './loader.css';

export interface PortfolioLoaderProps {
  /** 0..1 weighted progress from real loading events (never simulated). */
  progress: number;
  /** Human-readable label of the stage in progress. */
  stageLabel: string;
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  /** Loading has taken unusually long; offer the classic view. */
  slow: boolean;
  /** The intro was already seen this session: be brief and enter automatically when ready. */
  returning: boolean;
  reducedMotion: boolean;
  /** The visitor chose to enter (or auto-enter fired). The world starts its intro now. */
  onEnterStart: () => void;
  /** The exit transition finished; the host unmounts the loader. */
  onExited: () => void;
  onSkipToClassic: () => void;
  onRetry: () => void;
}

const WORDMARK = profileData.name.toUpperCase();
const DISPLAY_FONT = '600 1em "Unbounded"';
/** Debounce for the live region so a burst of stage completions is announced once. */
const ANNOUNCE_DELAY_MS = 350;

/**
 * "Neon ignition": the name is a neon sign whose letters strike one by one as
 * the real loading stages complete, over a quiet night-district horizon. When
 * ready, a start screen with control hints; on entering, the sign flares and an
 * aperture opens through it onto the world.
 *
 * Mounted by WorldHost as a z-40 overlay (below the z-50 navbar, which stays
 * usable). The classic view is always one button away.
 */
export function PortfolioLoader({
  progress,
  stageLabel,
  status,
  error,
  slow,
  returning,
  reducedMotion,
  onEnterStart,
  onExited,
  onSkipToClassic,
  onRetry,
}: PortfolioLoaderProps) {
  const storeStages = useLoadingStore((s) => s.stages);
  const storeSub = useLoadingStore((s) => s.sub);
  const stages = useMemo(
    () => deriveStages(storeStages, storeSub, progress, status),
    [storeStages, storeSub, progress, status],
  );

  const view = viewFor(status, slow);
  // Latched at mount: the store flips `returning` to true the moment the visitor enters, and the
  // layout must not switch to the compact version in the middle of the exit transition.
  const [compact] = useState(returning);
  const currentIndex = stages.findIndex((stage) => stage.current);
  const label =
    status === 'ready' ? stageLabel || 'Ready' : stageLabel || stages[currentIndex]?.label || 'Loading';

  const rootRef = useRef<HTMLElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);

  const { phase, commit } = useExitSequence({
    reducedMotion,
    quick: compact,
    curtainRef,
    ringRef,
    originRef: wordmarkRef,
    onEnterStart,
    onExited,
  });
  const exiting = phase !== 'idle';

  const fontReady = useFontReady(DISPLAY_FONT);
  const coarse = useMediaQuery('(pointer: coarse)');
  const startScreen = view === 'ready' && !compact;
  const pressed = usePressedKeys(startScreen && !coarse && !exiting);

  // Returning visitors skip the start screen: enter as soon as the world is ready (commit() fires once).
  useEffect(() => {
    if (compact && status === 'ready') commit();
  }, [compact, status, commit]);

  // Ready: put focus on the way in — unless the visitor is busy elsewhere (e.g. the navbar).
  useEffect(() => {
    if (!startScreen || exiting) return;
    const button = enterRef.current;
    const root = rootRef.current;
    if (!button || !root) return;
    const active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement || root.contains(active)) {
      button.focus({ preventScroll: true });
    }
  }, [startScreen, exiting]);

  // Enter from anywhere that is not another control.
  useEffect(() => {
    if (!startScreen || exiting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat || event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target === document.body || event.target === document.documentElement) {
        event.preventDefault();
        commit();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [startScreen, exiting, commit]);

  const message = statusMessage({
    view,
    returning: compact,
    stageLabel: label,
    stageNumber: currentIndex + 1,
    stageCount: LOAD_STAGES.length,
    error,
  });
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnounced(message), ANNOUNCE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [message]);

  const prominentClassic = view === 'slow' || view === 'error';

  return (
    <section
      ref={rootRef}
      className="ldr-root"
      data-phase={phase}
      data-view={view}
      data-compact={compact ? '' : undefined}
      data-reduced={reducedMotion ? '' : undefined}
      style={{ '--ldr-count': Math.max(1, Array.from(WORDMARK).length) } as CSSProperties}
      aria-label="Loading screen"
    >
      <div ref={curtainRef} className="ldr-curtain" inert={exiting}>
        <div className="ldr-sky" aria-hidden="true" />
        <div className="ldr-scroll">
          <div className="ldr-layout">
            <div className="ldr-sign">
              <Horizon />
              {!compact && <p className="ldr-eyebrow eyebrow">Engineering &amp; creative portfolio</p>}
              <NeonWordmark
                ref={wordmarkRef}
                word={WORDMARK}
                stages={stages}
                halted={view === 'error'}
                fontReady={fontReady}
              />
            </div>

            <div className="ldr-console">
              {view === 'error' ? (
                <div className="ldr-error">
                  <p className="ldr-error-title">
                    <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-signal" />
                    The district couldn’t load
                  </p>
                  <p className="ldr-error-text">{error ?? 'Something went wrong while starting the 3D world.'}</p>
                </div>
              ) : (
                <StageMeter stages={stages} progress={progress} label={label} reducedMotion={reducedMotion} />
              )}

              {view === 'slow' && (
                <p className="ldr-note">Still loading — the 3D world is taking longer than usual on this device.</p>
              )}

              <div className="ldr-actions">
                {startScreen && (
                  <button
                    ref={enterRef}
                    type="button"
                    onClick={commit}
                    className={cn(buttonClasses({ variant: 'primary', tone: 'eng', size: 'lg' }), 'ldr-enter px-7')}
                  >
                    Enter the district
                    <ArrowRight aria-hidden="true" className="-mr-1 size-4" />
                  </button>
                )}
                {view === 'error' && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className={buttonClasses({ variant: 'outline', tone: 'eng', size: 'md' })}
                  >
                    <RotateCcw aria-hidden="true" className="-ml-0.5 size-4" />
                    Try again
                  </button>
                )}
                <button
                  type="button"
                  onClick={onSkipToClassic}
                  className={
                    prominentClassic
                      ? buttonClasses({ variant: 'secondary', tone: 'neutral', size: 'md' })
                      : buttonClasses({ variant: 'ghost', tone: 'neutral', size: 'md', className: 'text-[13px]' })
                  }
                >
                  Use the classic view
                </button>
              </div>

              {startScreen && !coarse && (
                <p className="ldr-keyhint" aria-hidden="true">
                  or press<kbd>Enter ↵</kbd>
                </p>
              )}
              {startScreen && <ControlHints coarse={coarse} pressed={pressed} />}
            </div>
          </div>
        </div>
      </div>
      <div ref={ringRef} className="ldr-ring" aria-hidden="true" />
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announced}
      </p>
    </section>
  );
}

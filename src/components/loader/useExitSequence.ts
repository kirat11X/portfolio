import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { EXIT_TIMING } from './model';

/**
 * idle → (commit) → flare → iris → done      full motion
 * idle → (commit) → fade → done              reduced motion
 */
export type ExitPhase = 'idle' | 'flare' | 'iris' | 'fade' | 'done';

interface ExitOptions {
  reducedMotion: boolean;
  /** Returning visitors: a shorter version of the same sequence. */
  quick: boolean;
  /** The opaque layer that covers the world; it is masked open by the iris. */
  curtainRef: RefObject<HTMLElement | null>;
  /** Neon rim that rides the edge of the aperture. */
  ringRef: RefObject<HTMLElement | null>;
  /** The iris opens from the centre of this element (the wordmark). */
  originRef: RefObject<HTMLElement | null>;
  onEnterStart: () => void;
  onExited: () => void;
}

/** Fraction of the iris mask radius that is fully open; the remainder feathers into the rim. */
const IRIS_OPEN = 0.84;
const IRIS_EASING = 'cubic-bezier(0.65, 0, 0.25, 1)';

type Frame = Record<string, string | number>;

const withPrefix = (frame: Frame): Frame => ({
  ...frame,
  webkitMaskSize: frame.maskSize,
  webkitMaskPosition: frame.maskPosition,
});

// Web Animations are used for the exit (rather than CSS transitions) because the
// site's global reduced-motion rule zeroes CSS durations, and because their
// `finished` promise tells us exactly when to hand control back to the host.
function openIris(
  curtain: HTMLElement | null,
  ring: HTMLElement | null,
  origin: HTMLElement | null,
  duration: number,
): Animation[] {
  if (!curtain || typeof curtain.animate !== 'function') return [];
  const width = window.innerWidth;
  const height = window.innerHeight;
  const rect = origin?.getBoundingClientRect();
  const x = rect && rect.width > 0 ? rect.left + rect.width / 2 : width / 2;
  const y = rect && rect.height > 0 ? rect.top + rect.height / 2 : height / 2;
  const reach = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
  const size = Math.ceil((2 * reach) / IRIS_OPEN) + 4;
  const timing: KeyframeAnimationOptions = { duration, easing: IRIS_EASING, fill: 'forwards' };

  const animations = [
    curtain.animate(
      [
        withPrefix({ maskSize: '100% 100%, 0px 0px', maskPosition: `0px 0px, ${x}px ${y}px` }),
        withPrefix({
          maskSize: `100% 100%, ${size}px ${size}px`,
          maskPosition: `0px 0px, ${x - size / 2}px ${y - size / 2}px`,
        }),
      ],
      timing,
    ),
  ];

  if (ring) {
    // Sits in the middle of the feathered edge and scales with the same easing as the mask.
    const ringSize = (size * (1 + IRIS_OPEN)) / 2;
    ring.style.width = `${ringSize}px`;
    ring.style.height = `${ringSize}px`;
    ring.style.left = `${x - ringSize / 2}px`;
    ring.style.top = `${y - ringSize / 2}px`;
    animations.push(
      ring.animate(
        [
          { transform: 'scale(0)', opacity: 0 },
          { opacity: 1, offset: 0.1 },
          { opacity: 0.85, offset: 0.5 },
          { transform: 'scale(1)', opacity: 0 },
        ],
        timing,
      ),
    );
  }
  return animations;
}

function fadeOut(curtain: HTMLElement | null, duration: number): Animation[] {
  if (!curtain || typeof curtain.animate !== 'function') return [];
  return [curtain.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: 'ease-out', fill: 'forwards' })];
}

/**
 * Runs the exit once the visitor commits. Guarantees `onEnterStart` and
 * `onExited` each fire exactly once, even under StrictMode's double effects,
 * and finishes on a timer if an animation never reports back.
 */
export function useExitSequence(options: ExitOptions): { phase: ExitPhase; commit: () => void } {
  const [phase, setPhase] = useState<ExitPhase>('idle');
  const committed = useRef(false);
  const exited = useRef(false);
  const latest = useRef(options);

  useLayoutEffect(() => {
    latest.current = options;
  });

  const commit = useCallback(() => {
    if (committed.current) return;
    committed.current = true;
    latest.current.onEnterStart();
    setPhase(latest.current.reducedMotion ? 'fade' : 'flare');
  }, []);

  useEffect(() => {
    const { quick, curtainRef, ringRef, originRef } = latest.current;

    if (phase === 'flare') {
      const timer = window.setTimeout(() => setPhase('iris'), quick ? EXIT_TIMING.flareQuick : EXIT_TIMING.flare);
      return () => window.clearTimeout(timer);
    }

    if (phase === 'iris' || phase === 'fade') {
      const duration = phase === 'fade' ? EXIT_TIMING.fade : quick ? EXIT_TIMING.irisQuick : EXIT_TIMING.iris;
      const animations =
        phase === 'fade'
          ? fadeOut(curtainRef.current, duration)
          : openIris(curtainRef.current, ringRef.current, originRef.current, duration);
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        setPhase('done');
      };
      Promise.all(animations.map((animation) => animation.finished)).then(finish, () => undefined);
      const safety = window.setTimeout(finish, duration + 300);
      return () => {
        window.clearTimeout(safety);
        if (!settled) {
          // Interrupted (StrictMode re-run or unmount): drop the half-played animation.
          settled = true;
          for (const animation of animations) animation.cancel();
        }
      };
    }

    if (phase === 'done' && !exited.current) {
      exited.current = true;
      latest.current.onExited();
    }
    return undefined;
  }, [phase]);

  return { phase, commit };
}

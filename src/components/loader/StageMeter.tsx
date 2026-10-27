import { useLayoutEffect, useRef } from 'react';
import { percentOf, type StageView } from './model';

interface StageMeterProps {
  stages: readonly StageView[];
  /** Real 0..1 weighted progress. */
  progress: number;
  label: string;
  reducedMotion: boolean;
}

/**
 * Stage label, percentage and a bar with one segment per loading stage, each
 * as wide as the stage's weight. Displayed values only ever catch up with the
 * real ones: they ease upward from below and snap (never glide) downward.
 */
export function StageMeter({ stages, progress, label, reducedMotion }: StageMeterProps) {
  const percent = percentOf(progress);

  return (
    <div className="ldr-meter">
      <div className="ldr-meter-row">
        <span className="ldr-meter-label">{label}</span>
        <span className="ldr-meter-value" aria-hidden="true">
          <EasedPercent value={percent} reducedMotion={reducedMotion} />%
        </span>
      </div>
      <div
        className="ldr-bar"
        role="progressbar"
        aria-label="Loading the 3D district"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${label}, ${percent}%`}
      >
        {stages.map((stage) => (
          <Segment key={stage.id} stage={stage} />
        ))}
      </div>
    </div>
  );
}

function Segment({ stage }: { stage: StageView }) {
  const fillRef = useRef<HTMLSpanElement>(null);
  const shown = useRef<number | null>(null);

  useLayoutEffect(() => {
    const fill = fillRef.current;
    if (!fill) return;
    const previous = shown.current;
    shown.current = stage.fill;
    fill.style.transform = `scaleX(${stage.fill})`;
    if (previous !== null && stage.fill < previous) {
      // A reset must not animate: gliding down would briefly show more than is real.
      fill.style.transition = 'none';
      void fill.offsetWidth;
      fill.style.transition = '';
    }
  }, [stage.fill]);

  return (
    <span
      className="ldr-seg"
      style={{ flexGrow: stage.weight }}
      data-status={stage.status}
      data-current={stage.current ? '' : undefined}
    >
      <span ref={fillRef} className="ldr-seg-fill" />
    </span>
  );
}

/** Counts up toward `value` (a whole percent) without ever passing it. */
function EasedPercent({ value, reducedMotion }: { value: number; reducedMotion: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const write = (n: number) => {
      element.textContent = String(n);
    };
    if (reducedMotion || value <= shown.current) {
      shown.current = value;
      write(value);
      return;
    }
    let current = shown.current;
    let last = performance.now();
    let frame = 0;
    write(Math.floor(current));
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      current += (value - current) * (1 - Math.exp(-dt * 7));
      if (value - current < 0.4) current = value;
      shown.current = current;
      write(Math.min(value, Math.floor(current)));
      if (current < value) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reducedMotion]);

  return <span ref={ref} />;
}

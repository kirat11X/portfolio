import { useMemo, type CSSProperties, type Ref } from 'react';
import { letterState, mapLetters, type StageView } from './model';

interface NeonWordmarkProps {
  word: string;
  stages: readonly StageView[];
  /** Loading stopped (error): in-progress letters go dark instead of flickering. */
  halted: boolean;
  /** Hide until the display face is ready so the tubes never swap fonts mid-ignition. */
  fontReady: boolean;
  ref?: Ref<HTMLDivElement>;
}

/**
 * The name as outline-neon tubes. Each letter stands for one (or a share of
 * one) real loading stage: unlit glass → striking flicker → steadily lit.
 * Decorative: the live region and the progress bar carry the information.
 */
export function NeonWordmark({ word, stages, halted, fontReady, ref }: NeonWordmarkProps) {
  const slots = useMemo(() => mapLetters(word, stages.length), [word, stages.length]);

  return (
    <div ref={ref} className="ldr-wordmark" data-font={fontReady ? 'ready' : 'pending'} aria-hidden="true">
      <span className="ldr-flash" />
      {slots.map((slot, index) => {
        const key = `${index}:${slot.char}`;
        if (slot.stages.length === 0) return <span key={key} className="ldr-gap" />;
        return (
          <span
            key={key}
            className="ldr-letter"
            data-state={letterState(slot, stages, halted)}
            style={{ '--ldr-i': index } as CSSProperties}
          >
            <span className="ldr-glass">{slot.char}</span>
            <span className="ldr-power">
              <span className="ldr-bloom">{slot.char}</span>
              <span className="ldr-lit">{slot.char}</span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

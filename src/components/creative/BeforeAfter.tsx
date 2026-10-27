import { useCallback, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { ChevronsLeftRight } from 'lucide-react';
import type { MediaItem } from '@/types';
import { cn } from '@/lib/cn';

interface BeforeAfterProps {
  /** The unedited original (left of the divider). */
  before: MediaItem;
  /** The finished edit (right of the divider). */
  after: MediaItem;
  /** Accessible name of the slider. */
  label?: string;
  beforeLabel?: string;
  afterLabel?: string;
  /** Width ÷ height. Defaults to the "after" image's dimensions, else 4:3. */
  ratio?: number;
  /** Initial divider position, 0–100. */
  initial?: number;
  /** Extra classes for the "before" image, e.g. a filter that mutes placeholder artwork. */
  beforeClassName?: string;
  /** Rendered over the top-left corner (e.g. a Placeholder label). */
  badge?: ReactNode;
  className?: string;
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));

/**
 * Before/after comparison. A native range input (arrow keys, Page Up/Down,
 * Home/End, screen-reader adjustable) controls how much of the "after" image is
 * revealed; dragging or tapping anywhere on the image moves the same value.
 */
export function BeforeAfter({
  before,
  after,
  label = 'Compare before and after',
  beforeLabel = 'Before',
  afterLabel = 'After',
  ratio,
  initial = 50,
  beforeClassName,
  badge,
  className,
}: BeforeAfterProps) {
  const id = useId();
  const [position, setPosition] = useState(() => clamp(initial));
  const areaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ pointerId: number; startX: number; moved: boolean } | null>(null);
  const aspect = ratio ?? (after.width && after.height ? after.width / after.height : 4 / 3);

  const moveTo = useCallback((clientX: number) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setPosition(Math.round(clamp(((clientX - rect.left) / rect.width) * 100)));
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, startX: event.clientX, moved: false };
    // Mouse and pen jump straight to the pointer; touch waits for a horizontal drag or a tap, so scrolling still works.
    if (event.pointerType !== 'touch') {
      event.currentTarget.setPointerCapture(event.pointerId);
      moveTo(event.clientX);
    }
    // Ready for arrow keys without showing the keyboard focus ring after a click or tap.
    inputRef.current?.focus({ preventScroll: true, focusVisible: false });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (!state.moved && Math.abs(event.clientX - state.startX) > 3) {
      state.moved = true;
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (state.moved || event.pointerType !== 'touch') moveTo(event.clientX);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (event.pointerType === 'touch' && !state.moved) moveTo(event.clientX); // a tap
    drag.current = null;
  };

  const onPointerCancel = () => {
    drag.current = null;
  };

  return (
    <figure className={cn('relative', className)}>
      <div
        ref={areaRef}
        className="relative cursor-ew-resize touch-pan-y select-none overflow-hidden rounded-card bg-ink-900"
        style={{ aspectRatio: aspect }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        // Keep focus on the range input (moved there on pointer down) instead of letting the click blur it.
        onMouseDown={(event) => event.preventDefault()}
      >
        <img
          src={before.src}
          alt={before.alt}
          width={before.width}
          height={before.height}
          draggable={false}
          decoding="async"
          className={cn('absolute inset-0 h-full w-full object-cover', beforeClassName)}
        />
        <img
          src={after.src}
          alt={after.alt}
          width={after.width}
          height={after.height}
          draggable={false}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        />

        <input
          ref={inputRef}
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={position}
          onChange={(event) => setPosition(clamp(Number(event.target.value)))}
          aria-valuetext={`${position}% before, ${100 - position}% after`}
          className="peer sr-only"
        />
        <label htmlFor={id} className="sr-only">
          {label}
        </label>

        {/* Divider and handle: visual only, the range input above carries the semantics. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0" style={{ left: `${position}%` }}>
          <div className="absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_14px_rgb(0_0_0/0.6)]" />
        </div>
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full',
            'glass-strong text-fg shadow-panel',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-eng peer-focus-visible:outline-solid',
          )}
          style={{ left: `${position}%` }}
        >
          <ChevronsLeftRight className="h-5 w-5" />
        </div>

        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute bottom-3 left-3 rounded-full bg-ink-950/75 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg transition-opacity duration-200',
            position < 18 && 'opacity-0',
          )}
        >
          {beforeLabel}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute bottom-3 right-3 rounded-full bg-ink-950/75 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-cre transition-opacity duration-200',
            position > 82 && 'opacity-0',
          )}
        >
          {afterLabel}
        </span>

        {badge && <div className="pointer-events-none absolute left-3 top-3">{badge}</div>}
      </div>
      <figcaption className="sr-only">
        {beforeLabel} and {afterLabel.toLowerCase()} comparison. Use the slider to reveal more of either image.
      </figcaption>
    </figure>
  );
}

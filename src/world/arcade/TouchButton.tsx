import { useEffect, useRef, type ReactNode } from 'react';
import { useLatest } from './shared';
import { cn } from '@/lib/cn';

interface TouchButtonProps {
  label: string;
  onPress: () => void;
  /** Repeat while held (movement / soft drop). */
  repeat?: boolean;
  children: ReactNode;
  className?: string;
  pressed?: boolean;
}

/**
 * On-screen game control. Fires on pointer-down (no 300 ms click lag) and can
 * auto-repeat while held; keyboard activation still works through onClick.
 */
export function TouchButton({ label, onPress, repeat = false, children, className, pressed }: TouchButtonProps) {
  const timers = useRef<{ timeout: number; interval: number }>({ timeout: 0, interval: 0 });
  const action = useLatest(onPress);
  const pointerFired = useRef(false);

  const stop = () => {
    window.clearTimeout(timers.current.timeout);
    window.clearInterval(timers.current.interval);
  };
  useEffect(() => stop, []);

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        'grid h-12 min-w-12 touch-none select-none place-items-center rounded-xl border border-line-strong bg-contrast/[0.04] px-3 font-mono text-xs text-fg transition-colors active:bg-[rgb(var(--arcade-rgb)/0.22)] active:text-contrast',
        className,
      )}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.preventDefault();
        pointerFired.current = true;
        stop();
        action.current();
        if (repeat) {
          timers.current.timeout = window.setTimeout(() => {
            timers.current.interval = window.setInterval(() => action.current(), 55);
          }, 170);
        }
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(event) => event.preventDefault()}
      onClick={() => {
        // Pointer presses already fired; this path is keyboard / assistive tech activation.
        if (pointerFired.current) {
          pointerFired.current = false;
          return;
        }
        action.current();
      }}
    >
      {children}
    </button>
  );
}

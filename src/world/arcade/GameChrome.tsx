import { useEffect, useRef } from 'react';

export function HudStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-line bg-contrast/[0.03] px-3 py-2">
      <dt className="eyebrow text-[0.62rem] text-fg-subtle">{label}</dt>
      <dd className="font-mono text-lg leading-tight tabular-nums text-fg">{value}</dd>
    </div>
  );
}

interface GameOverlayCardProps {
  title: string;
  body?: string;
  actionLabel: string;
  onAction: () => void;
  /** Focus the action button when the card appears (default true). */
  autoFocus?: boolean;
}

/** Centered state card over a playfield: ready / paused / game over. */
export function GameOverlayCard({ title, body, actionLabel, onAction, autoFocus = true }: GameOverlayCardProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (autoFocus) buttonRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);
  return (
    <div className="absolute inset-0 grid place-items-center rounded-md bg-void/70 p-4 backdrop-blur-[2px]">
      <div className="flex max-w-[16rem] flex-col items-center gap-3 text-center">
        <p className="font-display text-xl text-[rgb(var(--arcade-rgb))] [text-shadow:0_0_14px_rgb(var(--arcade-rgb)/0.7)]">{title}</p>
        {body && <p className="text-sm text-fg-muted">{body}</p>}
        <button
          ref={buttonRef}
          type="button"
          onClick={onAction}
          className="rounded-full border border-[rgb(var(--arcade-rgb)/0.6)] bg-[rgb(var(--arcade-rgb)/0.14)] px-5 py-2 font-mono text-xs uppercase tracking-[0.16em] text-contrast transition-colors hover:bg-[rgb(var(--arcade-rgb)/0.28)]"
        >
          {actionLabel}
        </button>
        <p className="font-mono text-[0.65rem] text-fg-subtle">or press Enter</p>
      </div>
    </div>
  );
}

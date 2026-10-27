import { Kbd } from './Kbd';
import { useIsTouch } from './useMedia';

/** Compact reminder of the main controls (bottom-left on desktop, one line on touch). */
export function ControlsHint({ compact }: { compact?: boolean }) {
  const touch = useIsTouch();
  if (touch) {
    if (!compact) return null;
    return <p className="text-center text-[12px] text-fg-subtle">Tap to drive · Drag to look · Pinch to zoom</p>;
  }
  if (compact) return null;
  return (
    <div className="glass absolute bottom-[5.5rem] left-6 hidden w-[15.5rem] rounded-card px-4 py-3 text-[12px] leading-relaxed text-fg-muted shadow-panel lg:block">
      <p className="eyebrow text-fg-subtle">Controls</p>
      <ul className="mt-2 space-y-1.5">
        <li className="flex items-center justify-between gap-3">
          <span>Drive</span>
          <span className="flex gap-1">
            <Kbd>W</Kbd>
            <Kbd>A</Kbd>
            <Kbd>S</Kbd>
            <Kbd>D</Kbd>
          </span>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span>Boost · brake</span>
          <span className="flex gap-1">
            <Kbd>Shift</Kbd>
            <Kbd>Space</Kbd>
          </span>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span>View / open</span>
          <Kbd>E</Kbd>
        </li>
        <li className="pt-0.5 text-fg-subtle">Click the ground to drive there · drag to look · scroll to zoom</li>
      </ul>
    </div>
  );
}

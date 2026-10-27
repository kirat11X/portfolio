import type { ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, DoorOpen, MousePointerClick, Pointer } from 'lucide-react';

type Area = 'up' | 'left' | 'down' | 'right';

interface KeySpec {
  code: string;
  area: Area;
  content: ReactNode;
}

const iconProps = { size: 13, strokeWidth: 2.25, 'aria-hidden': true } as const;

const WASD: KeySpec[] = [
  { code: 'KeyW', area: 'up', content: 'W' },
  { code: 'KeyA', area: 'left', content: 'A' },
  { code: 'KeyS', area: 'down', content: 'S' },
  { code: 'KeyD', area: 'right', content: 'D' },
];

const ARROWS: KeySpec[] = [
  { code: 'ArrowUp', area: 'up', content: <ArrowUp {...iconProps} /> },
  { code: 'ArrowLeft', area: 'left', content: <ArrowLeft {...iconProps} /> },
  { code: 'ArrowDown', area: 'down', content: <ArrowDown {...iconProps} /> },
  { code: 'ArrowRight', area: 'right', content: <ArrowRight {...iconProps} /> },
];

function KeyCluster({ keys, pressed }: { keys: KeySpec[]; pressed: ReadonlySet<string> }) {
  return (
    <span className="ldr-cluster">
      {keys.map((key) => (
        <kbd key={key.code} className="ldr-key" data-area={key.area} data-pressed={pressed.has(key.code) ? '' : undefined}>
          {key.content}
        </kbd>
      ))}
    </span>
  );
}

interface ControlHintsProps {
  /** Touch-first device: show tap hints instead of keys. */
  coarse: boolean;
  /** Keys currently held, to light up their keycaps. */
  pressed: ReadonlySet<string>;
}

/** How to get around once inside, shown on the start screen. Visuals are hidden from assistive tech; the text says it all. */
export function ControlHints({ coarse, pressed }: ControlHintsProps) {
  if (coarse) {
    return (
      <ul className="ldr-hints" aria-label="Touch controls">
        <li className="ldr-hint">
          <span className="ldr-hint-visual" aria-hidden="true">
            <span className="ldr-glyph">
              <Pointer size={22} strokeWidth={1.75} />
            </span>
          </span>
          <span className="ldr-hint-text">Tap to move</span>
        </li>
        <li className="ldr-hint">
          <span className="ldr-hint-visual" aria-hidden="true">
            <span className="ldr-glyph">
              <DoorOpen size={22} strokeWidth={1.75} />
            </span>
          </span>
          <span className="ldr-hint-text">Tap a panel or door to open it</span>
        </li>
      </ul>
    );
  }

  return (
    <ul className="ldr-hints" aria-label="Controls">
      <li className="ldr-hint">
        <span className="ldr-hint-visual" aria-hidden="true">
          <KeyCluster keys={WASD} pressed={pressed} />
          <span className="ldr-or">or</span>
          <KeyCluster keys={ARROWS} pressed={pressed} />
        </span>
        <span className="ldr-hint-text">
          Drive<span className="sr-only"> with W, A, S and D or the arrow keys</span>
        </span>
      </li>
      <li className="ldr-hint">
        <span className="ldr-hint-visual" aria-hidden="true">
          <span className="ldr-glyph">
            <MousePointerClick size={22} strokeWidth={1.75} />
          </span>
        </span>
        <span className="ldr-hint-text">Click or tap to move</span>
      </li>
      <li className="ldr-hint">
        <span className="ldr-hint-visual" aria-hidden="true">
          <kbd className="ldr-key ldr-key--solo" data-pressed={pressed.has('KeyE') ? '' : undefined}>
            E
          </kbd>
        </span>
        <span className="ldr-hint-text">
          <span className="sr-only">Press E </span>
          <span aria-hidden="true">E </span>to interact
        </span>
      </li>
    </ul>
  );
}

import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { useArcadeStore, type ArcadeGameId } from './arcadeStore';
import { ARCADE_GAMES } from './games';
import { ArcadeKeyContext, type ArcadeKey, type ArcadeKeyHandler, type ArcadeKeyRegistry } from './shared';

// Each cabinet's game is its own chunk, fetched the first time it is opened.
const GAMES: Record<ArcadeGameId, React.LazyExoticComponent<() => React.JSX.Element>> = {
  tetris: lazy(() => import('./BlocksGame')),
  pacman: lazy(() => import('./PacMazeGame')),
  catgpt: lazy(() => import('./CatGptGame')),
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isEditable(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'button'))
  );
}

function toArcadeKey(event: KeyboardEvent): ArcadeKey {
  return { key: event.key, code: event.code, repeat: event.repeat, shiftKey: event.shiftKey };
}

/**
 * Modal arcade cabinet for the Gaming Zone. Renders nothing while no game is
 * open. Keyboard events never leave the dialog, so the 3D world's driving
 * controls stay still (gameplay can also check `isArcadeOpen()`).
 */
export function ArcadeOverlay() {
  const open = useArcadeStore((s) => s.open);
  if (!open) return null;
  return <ArcadeDialog key={open} id={open} />;
}

function ArcadeDialog({ id }: { id: ArcadeGameId }) {
  const close = useArcadeStore((s) => s.close);
  const reduced = useReducedMotion();
  const meta = ARCADE_GAMES[id];
  const Game = GAMES[id];
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const handlerRef = useRef<ArcadeKeyHandler | null>(null);
  const handledDown = useRef(new Set<string>());
  // A dedicated portal host: stopping propagation here keeps keys from reaching body/document/window.
  const [host] = useState(() => {
    const element = document.createElement('div');
    element.dataset.arcadeHost = '';
    return element;
  });

  const registry = useMemo<ArcadeKeyRegistry>(
    () => ({
      register: (handler) => {
        handlerRef.current = handler;
      },
    }),
    [],
  );

  useEffect(() => {
    document.body.appendChild(host);
    return () => host.remove();
  }, [host]);

  // Focus in, scroll lock, focus restore.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.contains(document.activeElement)) {
        // Prefer the game surface; games may also focus their own control.
        (dialog.querySelector<HTMLElement>('[data-arcade-autofocus], [role="application"], textarea') ?? closeRef.current)?.focus({ preventScroll: true });
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  /** Shared key routing for events inside the dialog and strays (focus lost to <body>). */
  const route = useCallback(
    (event: KeyboardEvent, phase: 'down' | 'up', alreadyHandled: boolean) => {
      if (phase === 'down' && event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (phase === 'down' && event.key === 'Tab') {
        const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
          (node) => node.getClientRects().length > 0,
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement;
        const inside = Boolean(active && dialogRef.current?.contains(active));
        if (!inside) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && (active === first || active === dialogRef.current)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (phase === 'up') {
        // A key the game consumed must not activate whatever gained focus meanwhile (e.g. "Play again").
        if (handledDown.current.delete(event.code)) {
          event.preventDefault();
          handlerRef.current?.(toArcadeKey(event), 'up');
        }
        return;
      }
      if (alreadyHandled || event.metaKey || event.altKey) return;
      if (event.ctrlKey && event.code !== 'ControlLeft' && event.code !== 'ControlRight') return;
      if (isEditable(event.target)) return;
      // Buttons keep their native Enter / Space activation.
      if (event.target instanceof HTMLButtonElement && ['Enter', 'NumpadEnter', 'Space'].includes(event.code)) return;
      if (handlerRef.current?.(toArcadeKey(event), 'down')) {
        event.preventDefault();
        handledDown.current.add(event.code);
      }
    },
    [close],
  );

  // Strays: if focus fell to <body> (e.g. a clicked overlay card unmounted), still route and
  // swallow keys at the window's capture phase before the world's listeners can see them.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (dialogRef.current?.contains(event.target as Node)) return;
      event.stopPropagation();
      route(event, event.type === 'keydown' ? 'down' : 'up', false);
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
    };
  }, [route]);

  const accentStyle = { '--arcade-rgb': meta.accentRgb } as CSSProperties;

  return createPortal(
    <div
      data-theme="dark"
      className={cn('fixed inset-0 z-[70] flex items-stretch justify-center bg-void/80 backdrop-blur-sm sm:items-center sm:p-6', !reduced && 'animate-fade')}
      style={accentStyle}
      onMouseDown={(event) => {
        // Clicking the dim backdrop doesn't close (avoids losing a run); keep focus inside.
        if (event.target === event.currentTarget) event.preventDefault();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        onKeyDown={(event) => {
          event.stopPropagation();
          route(event.nativeEvent, 'down', event.defaultPrevented);
        }}
        onKeyUp={(event) => {
          event.stopPropagation();
          route(event.nativeEvent, 'up', event.defaultPrevented);
        }}
        className={cn(
          'relative flex h-full w-full flex-col overflow-hidden bg-ink-950 text-fg outline-none sm:h-[min(100%,56rem)] sm:max-w-5xl sm:rounded-panel',
          'border-[rgb(var(--arcade-rgb)/0.55)] sm:border-2',
          'shadow-[0_0_0_1px_rgb(var(--arcade-rgb)/0.2),0_0_60px_-10px_rgb(var(--arcade-rgb)/0.55),inset_0_0_40px_-20px_rgb(var(--arcade-rgb)/0.5)]',
          !reduced && 'animate-rise',
        )}
      >
        {/* Marquee */}
        <header className="relative flex shrink-0 items-center gap-3 border-b border-[rgb(var(--arcade-rgb)/0.35)] bg-[linear-gradient(180deg,rgb(var(--arcade-rgb)/0.14),transparent)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="eyebrow text-fg-subtle">Arcade · Gaming Zone</p>
            <h2
              id={titleId}
              className="truncate font-display text-xl text-[rgb(var(--arcade-rgb))] [text-shadow:0_0_18px_rgb(var(--arcade-rgb)/0.75)] sm:text-2xl"
            >
              {meta.title}
            </h2>
            <p id={descId} className="sr-only">
              {meta.tagline}. Press Escape or the Close button to return to the city.
            </p>
          </div>
          <p className="hidden font-mono text-xs text-fg-subtle md:block" aria-hidden="true">
            {meta.tagline}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-contrast/[0.04] px-3.5 py-2 font-mono text-xs text-fg-muted transition-colors hover:border-[rgb(var(--arcade-rgb)/0.6)] hover:text-contrast"
          >
            <X className="size-4" aria-hidden="true" />
            Close
            <kbd className="ml-1 hidden rounded border border-line px-1 text-[0.6rem] text-fg-subtle sm:inline">Esc</kbd>
          </button>
        </header>

        {/* Screen */}
        <div className="relative min-h-0 flex-1 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
          <ArcadeKeyContext.Provider value={registry}>
            <Suspense
              fallback={
                <div className="grid h-full place-items-center font-mono text-xs text-fg-subtle" role="status">
                  Loading {meta.title}…
                </div>
              }
            >
              <Game />
            </Suspense>
          </ArcadeKeyContext.Provider>
        </div>

        {/* Scanlines: decorative cabinet glass. */}
        {!reduced && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(180deg,rgb(255_255_255/0.018)_0_1px,transparent_1px_3px)]"
          />
        )}
      </div>
    </div>,
    host,
  );
}

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

/** Live `matchMedia` result. False where media queries are unavailable. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}

const WATCHED_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Enter']);

/**
 * Codes of the control keys currently held, so the keycap hints can light up
 * under the visitor's fingers. Purely visual; it never prevents defaults.
 */
export function usePressedKeys(enabled: boolean): ReadonlySet<string> {
  const [pressed, setPressed] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (!enabled) return;
    const update = (code: string, down: boolean) =>
      setPressed((previous) => {
        if (previous.has(code) === down) return previous;
        const next = new Set(previous);
        if (down) next.add(code);
        else next.delete(code);
        return next;
      });
    const onDown = (event: KeyboardEvent) => {
      if (WATCHED_KEYS.has(event.code)) update(event.code, true);
    };
    const onUp = (event: KeyboardEvent) => {
      if (WATCHED_KEYS.has(event.code)) update(event.code, false);
    };
    const clear = () => setPressed((previous) => (previous.size ? new Set() : previous));
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', clear);
      clear();
    };
  }, [enabled]);

  return pressed;
}

/**
 * True once the given face is usable, or after `timeoutMs` at the latest, so
 * the wordmark never flashes in a fallback font but is never held back either.
 */
export function useFontReady(font: string, timeoutMs = 1200): boolean {
  const [ready, setReady] = useState(() => {
    if (typeof document === 'undefined' || !document.fonts) return true;
    try {
      return document.fonts.check(font);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (ready) return;
    let alive = true;
    const done = () => {
      if (alive) setReady(true);
    };
    document.fonts.load(font).then(done, done);
    const timer = window.setTimeout(done, timeoutMs);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [ready, font, timeoutMs]);

  return ready;
}

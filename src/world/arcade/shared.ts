// Small helpers shared by the arcade games: high scores, the overlay's key
// routing context, a pausable animation loop and canvas sizing.
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Keeps a ref pointing at the latest value without touching it during render. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

export function readHighScore(key: string): number {
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

export function writeHighScore(key: string, score: number): void {
  try {
    window.localStorage.setItem(key, String(Math.floor(score)));
  } catch {
    /* Storage can be unavailable (private mode); the score still shows this visit. */
  }
}

/** A key event as the overlay forwards it to the active game. */
export interface ArcadeKey {
  key: string;
  code: string;
  repeat: boolean;
  shiftKey: boolean;
}

/** Return true when the game handled the key (the overlay then prevents its default). */
export type ArcadeKeyHandler = (key: ArcadeKey, phase: 'down' | 'up') => boolean;

export interface ArcadeKeyRegistry {
  register(handler: ArcadeKeyHandler | null): void;
}

export const ArcadeKeyContext = createContext<ArcadeKeyRegistry | null>(null);

/** Receive the overlay's key events while this game is mounted. */
export function useArcadeKeys(handler: ArcadeKeyHandler): void {
  const registry = useContext(ArcadeKeyContext);
  const ref = useLatest(handler);
  useEffect(() => {
    if (!registry) return;
    registry.register((key, phase) => ref.current(key, phase));
    return () => registry.register(null);
  }, [registry, ref]);
}

/** Calls `onHidden` whenever the tab becomes hidden. */
export function useOnTabHidden(onHidden: () => void): void {
  const ref = useLatest(onHidden);
  useEffect(() => {
    const listener = () => {
      if (document.hidden) ref.current();
    };
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  }, [ref]);
}

/**
 * requestAnimationFrame loop with a clamped delta (seconds). Stops while the
 * tab is hidden and on unmount.
 */
export function useAnimationLoop(frame: (dt: number, now: number) => void): void {
  const ref = useLatest(frame);
  useEffect(() => {
    let id = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = last === 0 ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      ref.current(dt, now);
      id = requestAnimationFrame(tick);
    };
    const start = () => {
      cancelAnimationFrame(id);
      last = 0;
      id = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(id);
      else start();
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ref]);
}

/** Largest integer cell size so a cols×rows grid fits the observed element. */
export function useFitCell(cols: number, rows: number, min = 8, max = 48) {
  const ref = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      const size = Math.floor(Math.min(width / cols, height / rows));
      setCell(Math.max(min, Math.min(max, size)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [cols, rows, min, max]);
  return { ref, cell };
}

/** Sizes a canvas's backing store for the device pixel ratio and returns its 2D context. */
export function prepareCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(width * dpr);
  const h = Math.round(height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  const ctx = canvas.getContext('2d');
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const listener = () => setMatches(list.matches);
    listener();
    list.addEventListener('change', listener);
    return () => list.removeEventListener('change', listener);
  }, [query]);
  return matches;
}

/** Touch controls are shown on coarse pointers and narrow screens. */
export function useTouchControls(): boolean {
  return useMediaQuery('(pointer: coarse), (max-width: 767px)');
}

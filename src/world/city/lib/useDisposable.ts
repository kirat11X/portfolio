import { useEffect, useMemo, type DependencyList } from 'react';

export interface Disposable {
  dispose(): void;
}

/**
 * Creates a GPU resource (or a bag of them) once and disposes it on unmount.
 * `collect` lists what to dispose when the value is not itself disposable.
 * three.js re-uploads disposed resources lazily, so React StrictMode's
 * mount → unmount → mount cycle in development stays safe.
 */
export function useDisposable<T>(factory: () => T, deps: DependencyList, collect?: (value: T) => Disposable[]): T {
  const [value, items] = useMemo(() => {
    const v = factory();
    return [v, collect ? collect(v) : [v as unknown as Disposable]] as const;
    // The factory and collector are intentionally captured once per deps change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(
    () => () => {
      for (const item of items) item?.dispose();
    },
    [items],
  );
  return value;
}

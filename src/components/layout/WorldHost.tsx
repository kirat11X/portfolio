import { Component, lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { PortfolioLoader } from '@/components/loader/PortfolioLoader';
import { selectCurrentStage, selectProgress, useLoadingStore } from '@/lib/loadingStore';
import { useReducedMotion } from '@/lib/motion';
import { useViewStore } from '@/lib/viewMode';

// The 3D world is mounted the first time the home route shows it and then kept
// alive while the visitor browses other routes (rendering paused), so coming
// back is instant and the intro never replays. Switching to the classic view
// unmounts it and frees the GPU.

type WorldModule = typeof import('@/world/World');

let worldImport: Promise<WorldModule> | null = null;
function importWorld(): Promise<WorldModule> {
  worldImport ??= import('@/world/World').catch((error: unknown) => {
    worldImport = null;
    throw error;
  });
  return worldImport;
}

const World = lazy(importWorld);

/** If loading has not finished after this long, offer the classic view. */
const PATIENCE_MS = 12_000;

const FAILURE_NOTICE = 'The 3D world stopped unexpectedly, so the classic view is shown instead.';

class WorldErrorBoundary extends Component<{ children: ReactNode; onError: (error: unknown) => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function WorldHost({ visible }: { visible: boolean }) {
  const mode = useViewStore((s) => s.mode);
  const setMode = useViewStore((s) => s.setMode);
  const reducedMotion = useReducedMotion();

  const status = useLoadingStore((s) => s.status);
  const entered = useLoadingStore((s) => s.entered);
  const returning = useLoadingStore((s) => s.returning);
  const error = useLoadingStore((s) => s.error);
  const progress = useLoadingStore(selectProgress);
  const stage = useLoadingStore(selectCurrentStage);

  // Mount on first visit to the world, unmount when the classic view is chosen.
  const [activated, setActivated] = useState(false);
  const [loaderMounted, setLoaderMounted] = useState(true);
  const [slow, setSlow] = useState(false);
  if (visible && !activated) {
    setActivated(true);
    setLoaderMounted(true);
    setSlow(false);
  }
  if (mode !== 'world' && activated) setActivated(false);

  // Engine stage: the world's code chunk. Reset all stages when the world unmounts.
  useEffect(() => {
    if (!activated) return;
    const { start, complete, fail } = useLoadingStore.getState();
    let alive = true;
    start('engine');
    importWorld().then(
      () => alive && complete('engine'),
      () => alive && fail('engine', 'The 3D engine could not be downloaded. Check your connection or use the classic view.'),
    );
    const timer = window.setTimeout(() => {
      if (alive && useLoadingStore.getState().status !== 'ready') setSlow(true);
    }, PATIENCE_MS);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      useLoadingStore.getState().resetForMount();
    };
  }, [activated]);

  // Lock page scroll while the full-screen world is showing.
  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous;
    };
  }, [visible]);

  // A failure after the visitor entered (e.g. lost WebGL context) falls back to the classic view.
  useEffect(() => {
    if (entered && status === 'error') setMode('classic', { persist: false, notice: FAILURE_NOTICE });
  }, [entered, status, setMode]);

  const handleWorldError = useCallback(
    (cause: unknown) => {
      const message = cause instanceof Error ? cause.message : String(cause);
      const store = useLoadingStore.getState();
      if (store.entered) setMode('classic', { persist: false, notice: FAILURE_NOTICE });
      else store.fail('world', `The 3D world could not start (${message}).`);
    },
    [setMode],
  );

  const showClassic = useCallback(() => setMode('classic'), [setMode]);
  const enter = useCallback(() => useLoadingStore.getState().enter(), []);
  const exited = useCallback(() => setLoaderMounted(false), []);
  const retry = useCallback(() => window.location.reload(), []);

  if (!activated) return null;

  return (
    // data-theme="dark": the world, its HUD and the loader never follow the light theme.
    <div
      data-theme="dark"
      className={visible ? 'fixed inset-0 z-0 bg-void' : 'hidden'}
      aria-hidden={visible ? undefined : true}
    >
      <WorldErrorBoundary onError={handleWorldError}>
        <Suspense fallback={null}>
          <World active={visible} onRequestClassic={showClassic} />
        </Suspense>
      </WorldErrorBoundary>
      {visible && loaderMounted && (
        <PortfolioLoader
          progress={progress}
          stageLabel={stage?.label ?? 'Ready'}
          status={status === 'error' ? 'error' : status === 'ready' ? 'ready' : 'loading'}
          error={error}
          slow={slow}
          returning={returning}
          reducedMotion={reducedMotion}
          onEnterStart={enter}
          onExited={exited}
          onSkipToClassic={showClassic}
          onRetry={retry}
        />
      )}
    </div>
  );
}

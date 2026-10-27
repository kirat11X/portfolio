// Dev-only harness UI for the loader (see dev/loader-preview.html).
import { useEffect, useRef, useState } from 'react';
import { selectCurrentStage, selectProgress, useLoadingStore } from '@/lib/loadingStore';
import { useMotionStore } from '@/lib/motion';
import { PortfolioLoader } from '../PortfolioLoader';
import {
  applyScenario,
  completeAll,
  completeCurrentStage,
  failCurrent,
  flag,
  params,
  setCurrentSub,
  startSimulation,
  type HostStatus,
} from './scenario';

interface Counts {
  enterStart: number;
  exited: number;
  classic: number;
  retry: number;
}

declare global {
  interface Window {
    /** Hooks for screenshot steps, e.g. {"eval":"window.__loader.next()"}. */
    __loader?: {
      next: () => void;
      sub: (value: number) => void;
      ready: () => void;
      fail: (message?: string) => void;
      replay: () => void;
      simulate: () => void;
      setSlow: (value: boolean) => void;
      counts: () => Counts;
    };
  }
}

const panelButton = 'rounded-md border border-line-strong px-1.5 py-1 text-fg hover:border-eng/60';

export function Harness() {
  const status = useLoadingStore((s) => s.status);
  const error = useLoadingStore((s) => s.error);
  const subs = useLoadingStore((s) => s.sub);
  const progress = useLoadingStore(selectProgress);
  const stage = useLoadingStore(selectCurrentStage);

  const [slow, setSlow] = useState(flag('slow'));
  const [returning, setReturning] = useState(flag('returning'));
  const [reduced, setReduced] = useState(
    flag('reduced') || Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );
  const [generation, setGeneration] = useState(0);
  const [mounted, setMounted] = useState(true);
  const [entered, setEntered] = useState(false);
  const [counts, setCounts] = useState<Counts>({ enterStart: 0, exited: 0, classic: 0, retry: 0 });
  const [panelOpen, setPanelOpen] = useState(params.get('panel') !== '0');
  const countsRef = useRef(counts);

  // Mirror the reduced-motion choice onto <html data-motion>, like the in-app toggle (not persisted).
  useEffect(() => {
    useMotionStore.setState({ user: reduced });
  }, [reduced]);

  const bump = (key: keyof Counts) => {
    countsRef.current = { ...countsRef.current, [key]: countsRef.current[key] + 1 };
    setCounts(countsRef.current);
  };

  const remount = () => {
    setEntered(false);
    setMounted(true);
    setGeneration((g) => g + 1);
  };
  const replay = () => {
    useLoadingStore.getState().resetForMount();
    applyScenario();
    remount();
  };
  const simulate = () => {
    startSimulation();
    remount();
  };

  const latest = useRef({ replay, simulate });
  useEffect(() => {
    latest.current = { replay, simulate };
  });
  useEffect(() => {
    window.__loader = {
      next: completeCurrentStage,
      sub: setCurrentSub,
      ready: completeAll,
      fail: failCurrent,
      replay: () => latest.current.replay(),
      simulate: () => latest.current.simulate(),
      setSlow,
      counts: () => countsRef.current,
    };
  }, []);

  const hostStatus: HostStatus = status === 'error' ? 'error' : status === 'ready' ? 'ready' : 'loading';
  const currentSub = stage ? (subs[stage.id] ?? 0) : 0;

  return (
    <>
      {params.get('world') !== '0' && <FakeWorld entered={entered} />}
      <FakeNav />
      {mounted && (
        <PortfolioLoader
          key={generation}
          progress={progress}
          stageLabel={stage?.label ?? 'Ready'}
          status={hostStatus}
          error={error}
          slow={slow}
          returning={returning}
          reducedMotion={reduced}
          onEnterStart={() => {
            bump('enterStart');
            setEntered(true);
          }}
          onExited={() => {
            bump('exited');
            setMounted(false);
          }}
          onSkipToClassic={() => bump('classic')}
          onRetry={() => {
            bump('retry');
            replay();
          }}
        />
      )}

      {panelOpen ? (
        <aside
          aria-label="Loader preview controls"
          className="glass-strong fixed bottom-3 left-3 z-[60] w-[17.5rem] rounded-2xl p-3 font-mono text-[11px] text-fg-muted"
        >
          <div className="mb-2 flex items-center justify-between">
            <strong className="text-fg">Loader preview</strong>
            <button type="button" className="rounded px-1.5 hover:text-fg" onClick={() => setPanelOpen(false)}>
              hide
            </button>
          </div>
          <p>
            status <span className="text-fg">{hostStatus}</span> · {Math.round(progress * 100)}% ·{' '}
            <span className="text-fg">{stage?.id ?? '—'}</span>
            {stage ? ` (sub ${Math.round(currentSub * 100)}%)` : ''}
          </p>
          <p className="mb-2">
            enterStart {counts.enterStart} · exited {counts.exited} · classic {counts.classic} · retry {counts.retry}
          </p>
          <div className="grid grid-cols-3 gap-1">
            <button type="button" className={panelButton} onClick={completeCurrentStage}>
              next stage
            </button>
            <button type="button" className={panelButton} onClick={() => setCurrentSub(Math.min(1, currentSub + 0.25))}>
              +25% sub
            </button>
            <button type="button" className={panelButton} onClick={completeAll}>
              ready
            </button>
            <button type="button" className={panelButton} onClick={() => failCurrent()}>
              fail
            </button>
            <button type="button" className={panelButton} onClick={simulate}>
              simulate
            </button>
            <button type="button" className={panelButton} onClick={replay}>
              replay
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={slow} onChange={(event) => setSlow(event.target.checked)} />
              slow
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={returning} onChange={(event) => setReturning(event.target.checked)} />
              returning
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={reduced} onChange={(event) => setReduced(event.target.checked)} />
              reduced
            </label>
          </div>
          {!mounted && <p className="mt-2 text-eng">Loader exited (host unmounted it). Press replay.</p>}
        </aside>
      ) : (
        params.get('panel') !== '0' && (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="glass-strong fixed bottom-3 left-3 z-[60] rounded-full px-3 py-1.5 font-mono text-[11px] text-fg"
          >
            controls
          </button>
        )
      )}
    </>
  );
}

/** A loud stand-in for the 3D world so the iris reveal is obvious in screenshots. */
export function FakeWorld({ entered }: { entered: boolean }) {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#070b1c]">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 45%, rgb(255 79 216 / 0.35), transparent 70%), radial-gradient(40% 40% at 25% 70%, rgb(255 181 71 / 0.35), transparent 70%), radial-gradient(40% 40% at 78% 65%, rgb(62 224 255 / 0.4), transparent 70%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            'repeating-linear-gradient(90deg, rgb(255 255 255 / 0.12) 0 2px, transparent 2px 90px), repeating-linear-gradient(0deg, rgb(255 255 255 / 0.1) 0 2px, transparent 2px 70px)',
        }}
      />
      <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-display text-xl font-semibold tracking-widest text-white/85">
        3D WORLD STAND-IN
        <span className="mt-2 block font-mono text-xs font-normal tracking-normal text-white/60">
          {entered ? 'onEnterStart fired — the world intro would run now' : 'waiting behind the loader'}
        </span>
      </p>
    </div>
  );
}

/** Mimics the transparent overlay navbar so the clear top band can be checked. */
export function FakeNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-(--nav-h)">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="font-display text-sm font-semibold tracking-[0.2em]">KIRAT</span>
        <nav aria-label="Primary (preview)" className="hidden gap-4 text-sm text-fg-muted sm:flex">
          <span className="text-fg">Home</span>
          <span>Engineering</span>
          <span>Creative</span>
          <span>About</span>
          <span>Resume</span>
          <span>Contact</span>
        </nav>
      </div>
    </header>
  );
}

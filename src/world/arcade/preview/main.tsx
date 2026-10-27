// Entry for the dev-only arcade preview (/dev/arcade-preview.html).
import '@/index.css';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { useMotionStore } from '@/lib/motion';
import { ArcadeOverlay } from '../ArcadeOverlay';
import { useArcadeStore, type ArcadeGameId } from '../arcadeStore';
import { ARCADE_GAMES } from '../games';

declare global {
  interface Window {
    __leakedKeys: number;
  }
}

const params = new URLSearchParams(window.location.search);
if (params.get('reduced') === '1') useMotionStore.getState().setUserReduced(true);
const initial = params.get('game');
if (initial && initial in ARCADE_GAMES) useArcadeStore.getState().openGame(initial as ArcadeGameId);

// Stand-in for the world's window-level driving listener.
window.__leakedKeys = 0;
window.addEventListener('keydown', () => {
  if (useArcadeStore.getState().open) window.__leakedKeys++;
});

// oxlint-disable-next-line react/only-export-components -- dev-only entry, never hot-swapped as a module
function PreviewApp() {
  const openGame = useArcadeStore((s) => s.openGame);
  useEffect(() => {
    document.title = 'Arcade preview (dev only)';
  }, []);
  return (
    <div
      data-theme="dark"
      className="relative grid min-h-dvh place-items-center overflow-hidden bg-void p-6"
      style={{
        backgroundImage:
          'radial-gradient(60% 50% at 20% 30%, rgb(62 224 255 / 0.18), transparent), radial-gradient(50% 40% at 80% 70%, rgb(180 140 255 / 0.2), transparent)',
      }}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="eyebrow text-fg-subtle">Gaming Zone · dev harness</p>
        <div className="flex flex-wrap justify-center gap-3">
          {Object.values(ARCADE_GAMES).map((game) => (
            <button
              key={game.id}
              type="button"
              onClick={() => openGame(game.id)}
              className="rounded-card border border-line-strong px-5 py-3 font-display text-sm hover:text-contrast"
            >
              {game.title}
            </button>
          ))}
        </div>
      </div>
      <ArcadeOverlay />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreviewApp />
  </StrictMode>,
);

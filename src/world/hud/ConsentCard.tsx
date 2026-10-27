import { useEffect, useId, useRef } from 'react';
import { MemoryStick, X } from 'lucide-react';
import { neon } from '@/styles/tokens';
import { useCarStore } from '../game/cars';
import { useConsentStore } from '../game/consentStore';
import { useRaceStore } from '../game/raceStore';
import { useSoccerStore } from '../game/soccerStore';
import { useArcadeStore } from '../arcade/arcadeStore';
import { useHudStore } from '../scene/uiState';
import { useWorldStore } from '../state/worldStore';

/** Another HUD overlay owns the screen: the card (and its notice) step aside until it closes. */
function useOtherOverlayOpen(): boolean {
  const hud = useHudStore((s) => s.carMenuOpen || s.mapOpen);
  const world = useWorldStore((s) => s.helpOpen || s.selectedExhibitId !== null);
  const arcade = useArcadeStore((s) => s.open !== null);
  return hud || world || arcade;
}

/**
 * "Feed the data server RAM": the storage choice, told as a small story. The
 * site sets no cookies; accepting only lets the world keep the visitor's car
 * and scores in this browser's localStorage.
 */
export function ConsentCard() {
  const covered = useOtherOverlayOpen();
  // The choice stays pending (cardOpen) while covered; it simply is not drawn.
  const open = useConsentStore((s) => s.cardOpen) && !covered;
  const status = useConsentStore((s) => s.status);
  const notice = useConsentStore((s) => s.notice);
  const accept = useConsentStore((s) => s.accept);
  const decline = useConsentStore((s) => s.decline);
  const closeCard = useConsentStore((s) => s.closeCard);
  const clearNotice = useConsentStore((s) => s.clearNotice);
  const titleId = useId();
  const cardRef = useRef<HTMLElement>(null);

  // Opened on purpose (E at the server): move focus in. The first-visit card does not steal focus.
  const purposeful = status !== 'unknown';
  useEffect(() => {
    if (open && purposeful) cardRef.current?.querySelector<HTMLElement>('button[data-primary]')?.focus({ preventScroll: true });
  }, [open, purposeful]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(clearNotice, 4200);
    return () => window.clearTimeout(timer);
  }, [notice, clearNotice]);

  const reloadStores = () => {
    useCarStore.getState().reload();
    useRaceStore.getState().reload();
    useSoccerStore.getState().reload();
  };

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {notice ?? ''}
      </p>
      {notice && !open && !covered && (
        <p aria-hidden="true" className="glass rounded-full px-4 py-2 text-center text-[12.5px] text-fg-muted shadow-panel animate-rise">
          {notice}
        </p>
      )}
      {open && (
        <section
          ref={cardRef}
          aria-labelledby={titleId}
          className="glass-strong pointer-events-auto relative w-[min(26rem,100%)] rounded-card px-3.5 py-3 shadow-panel animate-rise lg:absolute lg:bottom-[5.5rem] lg:right-6 lg:w-[22rem]"
          style={{ borderColor: `${neon.emerald}55`, boxShadow: `0 0 0 1px ${neon.emerald}22, 0 18px 40px -18px ${neon.emerald}55` }}
        >
          <button
            type="button"
            onClick={closeCard}
            aria-label="Close"
            className="absolute right-1.5 top-1.5 inline-flex h-11 w-11 items-center justify-center rounded-full text-fg-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="flex gap-3 pr-8">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${neon.emerald}1f`, color: neon.emerald }}
            >
              <MemoryStick className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-[13.5px] font-semibold leading-snug text-fg">
                {status === 'granted' ? 'The data server is fed' : 'The data server at the tower is hungry. Feed it RAM?'}
              </h2>
              <p className="mt-1 text-[12px] leading-snug text-fg-muted">
                {status === 'granted'
                  ? 'It keeps your car and scores in this browser (localStorage). Take the RAM back to forget them; nothing ever leaves your device.'
                  : 'It only saves your car choice and race & soccer scores in this browser — no cookies, no tracking.'}
              </p>
              {status === 'declined' && (
                <p className="mt-1 text-[11.5px] text-fg-subtle">Right now it is starving: car and scores last until you close this tab.</p>
              )}
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap justify-end gap-2">
            {status === 'granted' ? (
              <button
                type="button"
                data-primary=""
                onClick={() => {
                  decline();
                  reloadStores();
                }}
                className="inline-flex h-11 items-center rounded-full border border-line-strong px-4 text-[13px] font-medium text-fg transition-colors hover:bg-white/5"
              >
                Take the RAM back
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    decline();
                    reloadStores();
                  }}
                  className="inline-flex h-11 items-center rounded-full border border-line-strong px-4 text-[13px] font-medium text-fg-muted transition-colors hover:bg-white/5 hover:text-fg"
                >
                  Keep it starving
                </button>
                <button
                  type="button"
                  data-primary=""
                  onClick={() => {
                    accept();
                    reloadStores();
                  }}
                  className="inline-flex h-11 items-center rounded-full px-4 text-[13px] font-semibold text-void transition-opacity hover:opacity-90"
                  style={{ backgroundColor: neon.emerald }}
                >
                  Give it RAM
                </button>
              </>
            )}
          </div>
        </section>
      )}
    </>
  );
}

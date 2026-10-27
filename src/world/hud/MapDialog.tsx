import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Navigation, X } from 'lucide-react';
import { DISTRICTS, DISTRICT_ORDER, PORTALS, type DistrictId } from '../config/layout';
import { engageAutopilot } from '../scene/autopilot';
import { worldColliders } from '../scene/actions';
import { DISTRICT_INFO, portalDetail } from '../scene/destinations';
import { useHudStore } from '../scene/uiState';
import { useWorldStore } from '../state/worldStore';
import { GamingList } from './GamingList';
import { MapGraphic } from './MapGraphic';

const TITLE_ID = 'world-map-title';

/** Full, labelled map of the district with a real button for every destination. */
export function MapDialog() {
  const open = useHudStore((s) => s.mapOpen);
  const setMapOpen = useHudStore((s) => s.setMapOpen);
  const activeDistrict = useWorldStore((s) => s.activeDistrict);
  const requestTravel = useWorldStore((s) => s.requestTravel);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const active = document.activeElement;
      returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => () => useHudStore.getState().setMapOpen(false), []);

  const close = () => dialogRef.current?.close();
  const travel = (id: DistrictId) => {
    requestTravel(id);
    close();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      onClose={() => {
        setMapOpen(false);
        const target = returnFocus.current;
        returnFocus.current = null;
        if (target?.isConnected) target.focus({ preventScroll: true });
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="glass-strong pointer-events-auto m-auto max-h-[min(92dvh,56rem)] w-[min(68rem,calc(100vw-1.5rem))] overflow-hidden rounded-panel p-0 text-fg shadow-panel backdrop:bg-void/75 backdrop:backdrop-blur-sm open:animate-rise"
    >
      <div className="flex max-h-[min(92dvh,56rem)] flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 sm:px-6">
          <div>
            <p className="eyebrow text-eng">Where to?</p>
            <h2 id={TITLE_ID} className="mt-1 font-display text-xl font-semibold text-fg">
              District map
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close map"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto overscroll-contain md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="border-b border-line p-3 sm:p-5 md:border-b-0 md:border-r">
            <MapGraphic
              detailed
              className="mx-auto w-full max-w-[28rem] cursor-crosshair select-none"
              onDistrict={travel}
              onGround={(x, z) => {
                if (engageAutopilot(x, z, worldColliders())) close();
              }}
            />
            <p className="mt-2 text-center text-[12px] text-fg-subtle">
              North is up. Click a plaza to travel there, or anywhere else to drive.
            </p>
          </div>

          <div className="px-5 py-5 sm:px-6">
            <h3 className="eyebrow text-fg-subtle">Districts</h3>
            <ul className="mt-2 space-y-1.5">
              {DISTRICT_ORDER.map((id, index) => {
                const district = DISTRICTS[id];
                const here = activeDistrict === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => travel(id)}
                      aria-describedby={`map-district-${id}`}
                      className="group flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-line hover:bg-white/[0.04]"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: district.accent, boxShadow: `0 0 10px ${district.accent}` }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-[15px] font-semibold text-fg">Travel to {district.label}</span>
                          <span aria-hidden="true" className="font-mono text-[11px] text-fg-subtle">
                            {index + 1}
                          </span>
                        </span>
                        <span id={`map-district-${id}`} className="mt-0.5 block text-[13px] leading-snug text-fg-muted">
                          <span style={{ color: district.accent }}>{DISTRICT_INFO[id].subtitle}</span>
                          {here ? ' · you are here' : ''} — {DISTRICT_INFO[id].detail}
                        </span>
                      </span>
                      <Navigation className="mt-1 h-4 w-4 shrink-0 text-fg-subtle group-hover:text-fg" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>

            <h3 className="eyebrow mt-6 text-fg-subtle">Gaming Zone</h3>
            <div className="mt-2 px-3">
              <GamingList done={close} />
            </div>

            <h3 className="eyebrow mt-6 text-fg-subtle">Doors</h3>
            <ul className="mt-2 space-y-1">
              {PORTALS.map((portal) => (
                <li key={portal.id}>
                  <Link
                    to={portal.route}
                    onClick={() => setMapOpen(false)}
                    className="group flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-white/[0.04]"
                  >
                    <span>
                      <span className="font-medium text-fg">{portal.label}</span>
                      <span className="block text-[12.5px] text-fg-subtle">
                        {DISTRICTS[portal.district].label} · {portalDetail(portal.id)}
                      </span>
                    </span>
                    <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </dialog>
  );
}

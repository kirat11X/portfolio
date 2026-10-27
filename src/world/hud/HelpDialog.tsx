import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, X } from 'lucide-react';
import { Tag } from '@/components/ui/Tag';
import { getCategory } from '@/data/categories';
import { projectPath } from '@/lib/routes';
import { exhibitsIn } from '../config/exhibits';
import { DISTRICTS, DISTRICT_ORDER, PORTALS } from '../config/layout';
import { DISTRICT_INFO, portalDetail } from '../scene/destinations';
import { useWorldStore } from '../state/worldStore';
import { GamingList } from './GamingList';
import { Kbd } from './Kbd';

const TITLE_ID = 'world-help-title';

function Row({ keys, children }: { keys: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-fg-muted">{children}</dt>
      <dd className="flex shrink-0 flex-wrap justify-end gap-1 text-right text-[12px] text-fg-subtle">{keys}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7 first:mt-0">
      <h3 className="eyebrow text-fg-subtle">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/**
 * Modal help: every control for keyboard, mouse and touch, plus links to every
 * exhibit and door — a complete path through the world without the 3D view.
 * Uses a native modal <dialog> (focus trapped, Esc closes, focus restored).
 */
export function HelpDialog({ onRequestClassic }: { onRequestClassic: () => void }) {
  const open = useWorldStore((s) => s.helpOpen);
  const setHelpOpen = useWorldStore((s) => s.setHelpOpen);
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

  // Closing on unmount (e.g. a link navigated away) keeps the store in sync.
  useEffect(() => () => useWorldStore.getState().setHelpOpen(false), []);

  const close = () => dialogRef.current?.close();
  const onClose = () => {
    setHelpOpen(false);
    const target = returnFocus.current;
    returnFocus.current = null;
    if (target?.isConnected) target.focus({ preventScroll: true });
  };
  const leave = () => setHelpOpen(false);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="glass-strong pointer-events-auto m-auto max-h-[min(88dvh,48rem)] w-[min(42rem,calc(100vw-2rem))] overflow-hidden rounded-panel p-0 text-fg shadow-panel backdrop:bg-void/70 backdrop:backdrop-blur-sm open:animate-rise"
    >
      <div className="flex max-h-[min(88dvh,48rem)] flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <p className="eyebrow text-eng">The district</p>
            <h2 id={TITLE_ID} className="mt-1 font-display text-xl font-semibold text-fg">
              Controls and help
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close help"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="overflow-y-auto overscroll-contain px-6 py-6">
          <div className="grid gap-x-10 md:grid-cols-2">
            <Section title="Keyboard">
              <dl className="divide-y divide-line">
                <Row keys={<><Kbd>W</Kbd><Kbd><ArrowUp className="h-3 w-3" aria-label="Up arrow" /></Kbd></>}>Accelerate</Row>
                <Row keys={<><Kbd>S</Kbd><Kbd><ArrowDown className="h-3 w-3" aria-label="Down arrow" /></Kbd></>}>Brake, then reverse</Row>
                <Row keys={<><Kbd>A</Kbd><Kbd>D</Kbd><Kbd><ArrowLeft className="h-3 w-3" aria-label="Left arrow" /></Kbd><Kbd><ArrowRight className="h-3 w-3" aria-label="Right arrow" /></Kbd></>}>Steer</Row>
                <Row keys={<Kbd>Shift</Kbd>}>Boost</Row>
                <Row keys={<Kbd>Space</Kbd>}>Brake</Row>
                <Row keys={<><Kbd>E</Kbd> or <Kbd>Enter</Kbd></>}>View the exhibit, open the door or use the arcade, PC or server you are parked at</Row>
                <Row keys={<Kbd>Esc</Kbd>}>Close the exhibit panel, leave the PC close-up or quit the race</Row>
                <Row keys={<Kbd>B</Kbd>}>Reset the ball (in the soccer arena)</Row>
                <Row keys={<><Kbd>1</Kbd> to <Kbd>5</Kbd></>}>Quick travel to a district</Row>
                <Row keys={<Kbd>R</Kbd>}>Back to the nearest district start</Row>
                <Row keys={<Kbd>M</Kbd>}>Open the district map</Row>
                <Row keys={<><Kbd>H</Kbd> or <Kbd>?</Kbd></>}>Open this help</Row>
              </dl>
            </Section>
            <div className="mt-7 md:mt-0">
              <Section title="Mouse">
                <dl className="divide-y divide-line">
                  <Row keys="Click">Drive to a spot on the ground</Row>
                  <Row keys="Click">Open an exhibit, a door, a cabinet or the server</Row>
                  <Row keys="Drag">Look around</Row>
                  <Row keys="Scroll">Zoom</Row>
                  <Row keys="Car button">Pick a car from the garage</Row>
                  <Row keys="Camera button">Orbit the city; any key, click or tap returns</Row>
                </dl>
              </Section>
              <Section title="Touch">
                <dl className="divide-y divide-line">
                  <Row keys="Tap">Drive to a spot on the ground</Row>
                  <Row keys="Tap">Open an exhibit or a door</Row>
                  <Row keys="Drag">Look around</Row>
                  <Row keys="Pinch">Zoom</Row>
                </dl>
              </Section>
            </div>
          </div>

          <Section title="Districts">
            <ol className="grid gap-x-6 gap-y-1 text-sm text-fg-muted sm:grid-cols-2">
              {DISTRICT_ORDER.map((id, index) => (
                <li key={id} className="flex items-center gap-2.5 py-1">
                  <span className="font-mono text-[11px] text-fg-subtle">{index + 1}</span>
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: DISTRICTS[id].accent }} />
                  <span className="text-fg">{DISTRICTS[id].label}</span>
                  <span className="text-fg-subtle">· {DISTRICT_INFO[id].subtitle}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Gaming Zone">
            <p className="mb-2 text-[13px] leading-relaxed text-fg-muted">
              Drive onto the orange start ring (or press Start time trial) for a timed lap: pass the gates in order and finish on the hub
              roundabout. Quick travel is off during a race. In the arena, drive into the ball to score in either net.
            </p>
            <GamingList done={() => dialogRef.current?.close()} />
          </Section>

          <Section title="Exhibits">
            <div className="grid gap-6 sm:grid-cols-2">
              {(['engineering', 'creative'] as const).map((district) => {
                const exhibits = exhibitsIn(district);
                return (
                  <div key={district}>
                    <h4 className="text-sm font-medium text-fg">{DISTRICTS[district].label}</h4>
                    {exhibits.length === 0 ? (
                      <p className="mt-2 text-sm text-fg-subtle">No exhibits yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-1">
                        {exhibits.map(({ id, project }) => (
                          <li key={id}>
                            <Link
                              to={projectPath(project)}
                              onClick={leave}
                              className="group flex items-start justify-between gap-3 rounded-lg px-2 py-2 -mx-2 text-sm text-fg-muted transition-colors hover:bg-white/[0.04] hover:text-fg"
                            >
                              <span>
                                <span className="text-fg">{project.title}</span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-fg-subtle">
                                  {getCategory(project.category).label}
                                  {project.placeholder && <Tag tone="signal">Placeholder</Tag>}
                                </span>
                              </span>
                              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100" aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Doors">
            <ul className="grid gap-x-6 sm:grid-cols-2">
              {PORTALS.map((portal) => (
                <li key={portal.id}>
                  <Link
                    to={portal.route}
                    onClick={leave}
                    className="group -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-white/[0.04]"
                  >
                    <span>
                      <span className="text-fg">{portal.label}</span>
                      <span className="block text-[12.5px] text-fg-subtle">
                        {DISTRICTS[portal.district].label} · {portalDetail(portal.id)}
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-fg-muted opacity-60 group-hover:opacity-100" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white/[0.02] px-4 py-3">
            <p className="text-sm text-fg-muted">Prefer a regular page? Everything here is also in the classic view.</p>
            <button
              type="button"
              onClick={() => {
                close();
                onRequestClassic();
              }}
              className="inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-[13px] font-medium text-fg transition-colors hover:border-fg/40 hover:bg-white/5"
            >
              Switch to the classic view
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

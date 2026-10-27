import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProjectCover } from '@/components/ui/ProjectCover';
import { Tag } from '@/components/ui/Tag';
import { getCategory } from '@/data/categories';
import { projectPath } from '@/lib/routes';
import type { ProjectStatus } from '@/types';
import { getExhibit, WORLD_EXHIBITS } from '../config/exhibits';
import { DISTRICTS } from '../config/layout';
import { runtime } from '../scene/runtime';
import { useWorldStore } from '../state/worldStore';

const STATUS_LABEL: Record<ProjectStatus, string> = {
  shipped: 'Shipped',
  prototype: 'Prototype',
  'in-progress': 'In progress',
  research: 'Research',
  coursework: 'Coursework',
  competition: 'Competition',
  archived: 'Archived',
};

const TITLE_ID = 'world-exhibit-title';
const SHEET_QUERY = '(max-width: 767px)';

/** Detail panel for the selected exhibit: right-hand panel on desktop, bottom sheet on phones. */
export function ExhibitPanel() {
  const selectedId = useWorldStore((s) => s.selectedExhibitId);
  const selectExhibit = useWorldStore((s) => s.selectExhibit);
  const exhibit = getExhibit(selectedId);
  const open = Boolean(exhibit);
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Exhibit changes made with previous/next are announced (focus stays on the button).
  const [announcement, setAnnouncement] = useState<{ id: string; text: string } | null>(null);

  // Focus the heading on open; give focus back on close.
  useLayoutEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const returnTo = previous instanceof HTMLElement && previous !== document.body ? previous : null;
    const panel = panelRef.current;
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      const active = document.activeElement;
      const focusInside = !active || active === document.body || !active.isConnected || Boolean(panel?.contains(active));
      if (returnTo?.isConnected && focusInside) returnTo.focus({ preventScroll: true });
    };
  }, [open]);

  // Tell the camera which part of the screen the panel covers.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    const sheet = window.matchMedia(SHEET_QUERY);
    const update = () => {
      const rect = panel.getBoundingClientRect();
      runtime.camera.insetRight = sheet.matches ? 0 : Math.max(0, window.innerWidth - rect.left);
      runtime.camera.insetBottom = sheet.matches ? Math.max(0, window.innerHeight - rect.top) : 0;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      runtime.camera.insetRight = 0;
      runtime.camera.insetBottom = 0;
    };
  }, [open]);

  const liveRegion = (
    <p className="sr-only" aria-live="polite">
      {announcement && announcement.id === selectedId ? announcement.text : ''}
    </p>
  );
  if (!exhibit) return <>{liveRegion}</>;

  const { project } = exhibit;
  const tone = project.discipline === 'engineering' ? 'eng' : 'cre';
  const index = WORLD_EXHIBITS.findIndex((e) => e.id === exhibit.id);
  const count = WORLD_EXHIBITS.length;
  const step = (delta: number) => {
    const next = WORLD_EXHIBITS[(index + delta + count) % count];
    setAnnouncement({ id: next.id, text: `Exhibit ${WORLD_EXHIBITS.indexOf(next) + 1} of ${count}: ${next.project.title}` });
    selectExhibit(next.id);
  };
  const facts = [project.status ? STATUS_LABEL[project.status] : null, project.year ?? null].filter(Boolean) as string[];

  return (
    <>
      {liveRegion}
      <aside
        ref={panelRef}
        aria-labelledby={TITLE_ID}
        data-world-panel=""
        className={[
          'glass-strong pointer-events-auto absolute flex flex-col overflow-hidden shadow-panel animate-rise',
          'inset-x-0 bottom-0 max-h-[64dvh] rounded-t-panel border-b-0',
          'md:inset-x-auto md:bottom-28 md:right-4 md:top-[4.25rem] md:max-h-none md:w-[min(25rem,calc(100vw-2rem))] md:rounded-card md:border-b',
          'lg:right-6',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Tag tone={tone} dot>
              {getCategory(project.category).shortLabel}
            </Tag>
            {project.placeholder && <Tag tone="signal">Placeholder</Tag>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="mr-1 font-mono text-[11px] text-fg-subtle" aria-hidden="true">
              {index + 1} / {count}
            </span>
            {count > 1 && (
              <>
                <IconButton label="Previous exhibit" onClick={() => step(-1)}>
                  <ChevronLeft className="h-[18px] w-[18px]" />
                </IconButton>
                <IconButton label="Next exhibit" onClick={() => step(1)}>
                  <ChevronRight className="h-[18px] w-[18px]" />
                </IconButton>
              </>
            )}
            <IconButton label="Close exhibit" onClick={() => selectExhibit(null)}>
              <X className="h-[18px] w-[18px]" />
            </IconButton>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-5">
          <ProjectCover project={project} aspect="landscape" className="mb-5 hidden rounded-xl md:block" showPlaceholderLabel={false} />
          <p className={tone === 'eng' ? 'eyebrow text-eng' : 'eyebrow text-cre'}>{DISTRICTS[exhibit.district].label}</p>
          <h2
            id={TITLE_ID}
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 font-display text-[1.35rem] leading-tight font-semibold text-fg outline-none focus-visible:outline-2"
          >
            {project.title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-fg">{project.tagline}</p>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">{project.summary}</p>
          {facts.length > 0 && <p className="mt-4 font-mono text-xs text-fg-subtle">{facts.join(' · ')}</p>}
          {project.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">
              {project.tags.slice(0, 5).map((tag) => (
                <li key={tag}>
                  <Tag casing="plain">{tag}</Tag>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-line px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4">
          <Button to={projectPath(project)} tone={tone} iconRight={<ArrowRight className="h-4 w-4" />} className="w-full">
            Open case study
          </Button>
        </div>
      </aside>
    </>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-fg-muted transition-colors duration-200 hover:bg-white/[0.06] hover:text-fg"
    >
      <span aria-hidden="true" className="flex">
        {children}
      </span>
    </button>
  );
}

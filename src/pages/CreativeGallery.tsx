import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, ImageOff } from 'lucide-react';
import type { CreativeCategory, CreativeProject, MediaItem } from '@/types';
import { creativeCategories, getCategory } from '@/data/categories';
import { countByCategory, getProjects } from '@/lib/projects';
import { paths } from '@/lib/routes';
import { usePageTitle } from '@/lib/usePageTitle';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { FilterBar, type FilterOption } from '@/components/ui/FilterBar';
import { Lightbox } from '@/components/ui/Lightbox';
import { PageHeader } from '@/components/ui/PageHeader';
import { CreativeTile } from '@/components/creative/CreativeTile';
import { Masonry } from '@/components/creative/Masonry';
import { canQuickView, coverMedia, forViewer, isPlaceholder, tileRatio } from '@/components/creative/media';

type Filter = 'all' | CreativeCategory;

const projects = getProjects('creative');
const counts = countByCategory('creative');
const categoryIds = new Set<string>(creativeCategories.map((category) => category.id));

function parseFilter(value: string | null): Filter {
  return value !== null && categoryIds.has(value) ? (value as CreativeCategory) : 'all';
}

const getSlug = (project: CreativeProject) => project.slug;

export default function CreativeGallery() {
  usePageTitle('Creative Studio');
  const [searchParams, setSearchParams] = useSearchParams();
  const active = parseFilter(searchParams.get('category'));
  const activeCategory = active === 'all' ? null : getCategory(active);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const visible = useMemo(() => (active === 'all' ? projects : projects.filter((p) => p.category === active)), [active]);
  // Quick view steps through the visible image and design entries, in gallery order.
  const previewable = useMemo(() => visible.filter(canQuickView), [visible]);
  const viewerItems = useMemo<MediaItem[]>(() => previewable.map((project) => forViewer(coverMedia(project))), [previewable]);

  const options = useMemo<FilterOption<Filter>[]>(
    () => [
      { id: 'all', label: 'All', count: projects.length },
      ...creativeCategories
        .filter((category) => counts.has(category.id) || category.id === active)
        .map((category) => ({ id: category.id, label: category.shortLabel, count: counts.get(category.id) ?? 0 })),
    ],
    [active],
  );

  const setFilter = useCallback(
    (next: Filter) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (next === 'all') params.delete('category');
          else params.set('category', next);
          return params;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [setSearchParams],
  );

  const openQuickView = useCallback(
    (project: CreativeProject) => {
      const index = previewable.findIndex((candidate) => candidate.slug === project.slug);
      if (index !== -1) setViewerIndex(index);
    },
    [previewable],
  );
  const closeViewer = useCallback(() => setViewerIndex(null), []);

  const placeholderCount = projects.filter(isPlaceholder).length;

  return (
    <div className="relative isolate">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-(--nav-h) -z-10 h-[36rem] bg-[radial-gradient(50%_60%_at_80%_0%,rgb(var(--cre-rgb)/0.13),transparent_72%)]"
      />
      <Container>
        <PageHeader
          eyebrow="Creative"
          tone="cre"
          title="Frames, cuts and interfaces"
          lede={
            <>
              <p>Photography, retouching, video, motion and interface design: the visual half of my work.</p>
              {placeholderCount > 0 && (
                <p className="mt-3 text-base text-fg-subtle">
                  {placeholderCount === projects.length
                    ? 'The studio is still being curated. Every tile below is a labelled placeholder slot, showing abstract artwork until the original piece is added.'
                    : 'The studio is still being curated. Tiles marked “Placeholder” show abstract artwork until the original piece is added.'}
                </p>
              )}
            </>
          }
        />

        <div className="flex flex-col gap-4 border-t border-line pt-6 lg:flex-row lg:items-center lg:justify-between">
          <FilterBar options={options} value={active} onChange={setFilter} label="Filter creative work by discipline" tone="cre" />
          <p className="shrink-0 font-mono text-xs text-fg-subtle" aria-live="polite">
            Showing {visible.length} of {projects.length}
            {activeCategory && <span className="text-fg-muted"> · {activeCategory.label}</span>}
          </p>
        </div>
        {activeCategory && <p className="mt-4 max-w-2xl text-sm text-fg-muted">{activeCategory.description}</p>}

        <div className="mt-8 sm:mt-10">
          {visible.length > 0 ? (
            <Masonry
              items={visible}
              getKey={getSlug}
              getRatio={tileRatio}
              label={activeCategory ? `${activeCategory.label} work` : 'Creative work'}
              renderItem={(project, index) => (
                <CreativeTile project={project} onQuickView={openQuickView} priority={index < 3} />
              )}
            />
          ) : (
            <EmptyState label={activeCategory?.label} onReset={() => setFilter('all')} hasAny={projects.length > 0} />
          )}
        </div>

        {placeholderCount > 0 && (
        <aside
          aria-label="About this studio"
          className="mb-20 mt-16 flex flex-col gap-6 rounded-panel border border-line bg-ink-900/60 p-6 sm:mt-20 sm:p-8 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="max-w-2xl">
            <p className="eyebrow text-cre">Work in progress</p>
            <p className="mt-3 text-base leading-relaxed text-fg-muted">
              Original photographs, edits and designs are being selected and exported for the web. The engineering side
              is documented in full in the meantime.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button to={paths.engineering} variant="secondary" tone="neutral" iconRight={<ArrowRight className="h-4 w-4" />}>
              Engineering projects
            </Button>
            <Button to={paths.contact} variant="ghost" tone="cre">
              Get in touch
            </Button>
          </div>
        </aside>
        )}
        {placeholderCount === 0 && <div className="pb-20" />}
      </Container>

      <Lightbox items={viewerItems} index={viewerIndex} onClose={closeViewer} onIndexChange={setViewerIndex} label="Quick view" />
    </div>
  );
}

interface EmptyStateProps {
  label?: string;
  hasAny: boolean;
  onReset: () => void;
}

function EmptyState({ label, hasAny, onReset }: EmptyStateProps) {
  return (
    <div className="rounded-panel border border-dashed border-line-strong px-6 py-16 text-center sm:py-20">
      <ImageOff className="mx-auto h-8 w-8 text-cre" aria-hidden="true" />
      <h2 className="mt-5 text-lg font-semibold text-fg">{label ? `No ${label.toLowerCase()} work yet` : 'Nothing here yet'}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
        {hasAny
          ? 'This discipline doesn’t have any entries yet. The rest of the studio is a click away.'
          : 'The studio is being curated. Check back soon.'}
      </p>
      {hasAny && (
        <Button onClick={onReset} variant="secondary" tone="cre" className="mt-6">
          Show all work
        </Button>
      )}
    </div>
  );
}

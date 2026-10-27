import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import type { EngineeringCategory } from '@/types';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { FilterBar, type FilterOption } from '@/components/ui/FilterBar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/gallery/EmptyState';
import { FeaturedProject } from '@/components/gallery/FeaturedProject';
import { ProjectGrid } from '@/components/gallery/ProjectGrid';
import { ProjectSearch } from '@/components/gallery/ProjectSearch';
import { matchesQuery, plural } from '@/components/gallery/projectMeta';
import { engineeringCategories } from '@/data/categories';
import { countByCategory, getFeatured, getProjects } from '@/lib/projects';
import { usePageTitle } from '@/lib/usePageTitle';
import { cn } from '@/lib/cn';

type Filter = 'all' | EngineeringCategory;

const projects = getProjects('engineering');
const counts = countByCategory('engineering');
/** Only areas that actually have projects become filters. */
const areas = engineeringCategories.filter((category) => (counts.get(category.id) ?? 0) > 0);
const filterOptions: FilterOption<Filter>[] = [
  { id: 'all', label: 'All', count: projects.length },
  ...areas.map((category) => ({ id: category.id, label: category.shortLabel, count: counts.get(category.id) ?? 0 })),
];

/**
 * The spotlight repeats one project from the collection below, which only reads
 * well once the collection is large enough. Small collections go straight to the grid.
 */
const SPOTLIGHT_MIN_PROJECTS = 4;
const spotlight = projects.length >= SPOTLIGHT_MIN_PROJECTS ? getFeatured('engineering', 1)[0] : undefined;

function parseArea(value: string | null): Filter {
  return areas.find((category) => category.id === value)?.id ?? 'all';
}

function describeResults(count: number, areaLabel: string | undefined, query: string): string {
  const total = projects.length;
  if (!areaLabel && !query) return total === 1 ? 'Showing 1 project' : `Showing all ${total} projects`;
  const where = areaLabel ? ` in ${areaLabel}` : '';
  const matching = query ? ` matching “${query}”` : '';
  if (count === 0) return `No projects${where}${query ? ` match “${query}”` : ''}`;
  return `Showing ${count} of ${plural(total, 'project')}${where}${matching}`;
}

export default function EngineeringGallery() {
  usePageTitle('Engineering');

  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigationType = useNavigationType();
  const searchRef = useRef<HTMLInputElement>(null);

  const rawArea = params.get('category');
  const area = parseArea(rawArea);
  const urlQuery = params.get('q') ?? '';
  const [query, setQuery] = useState(urlQuery);

  // The search box is local state (so typing never waits on navigation) mirrored into ?q=.
  // When the URL changes from outside — a link or back/forward, not our own replace-writes — adopt it.
  const [locationKey, setLocationKey] = useState(location.key);
  if (location.key !== locationKey) {
    setLocationKey(location.key);
    if (navigationType !== 'REPLACE' && urlQuery !== query.trim()) setQuery(urlQuery);
  }

  const writeParams = useCallback(
    (patch: { area?: Filter; query?: string }) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (patch.area !== undefined) {
            if (patch.area === 'all') next.delete('category');
            else next.set('category', patch.area);
          }
          if (patch.query !== undefined) {
            const trimmed = patch.query.trim();
            if (trimmed) next.set('q', trimmed);
            else next.delete('q');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  // Unknown or empty areas fall back to All; tidy the URL so it can be shared as-is.
  useEffect(() => {
    if (rawArea !== null && area === 'all') writeParams({ area: 'all' });
  }, [rawArea, area, writeParams]);

  const trimmedQuery = query.trim();
  const results = useMemo(
    () => projects.filter((project) => (area === 'all' || project.category === area) && matchesQuery(project, trimmedQuery)),
    [area, trimmedQuery],
  );

  const activeArea = areas.find((category) => category.id === area);
  const filtered = area !== 'all' || trimmedQuery !== '';

  const changeQuery = (value: string) => {
    setQuery(value);
    writeParams({ query: value });
  };

  const reset = () => {
    setQuery('');
    writeParams({ area: 'all', query: '' });
    searchRef.current?.focus();
  };

  return (
    <div className="relative isolate">
      {/* A faint wash of engineering cyan at the top of the wall. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-(--nav-h) -z-10 h-[38rem] bg-[radial-gradient(50%_60%_at_10%_0%,rgb(var(--eng-rgb)/0.07),transparent_70%)]"
      />
      <Container>
        <PageHeader
          eyebrow="Engineering"
          tone="eng"
          title={
            <>
              What I build, <span className="text-fg-muted sm:block">and how it works.</span>
            </>
          }
          lede={
            <p>
              Software systems, machine learning, computer vision and algorithms — each one written up so you can see what it
              does and how it&rsquo;s built.
            </p>
          }
        />

        {spotlight && <FeaturedProject project={spotlight} className="pb-20 sm:pb-24" />}

        <section
          aria-labelledby="all-projects-heading"
          className={cn('pb-24 sm:pb-32', spotlight && 'border-t border-line pt-14 sm:pt-16')}
        >
          <h2 id="all-projects-heading" className="text-2xl font-semibold tracking-tight text-fg sm:text-[1.75rem]">
            All projects
          </h2>

          {projects.length === 0 ? (
            <EmptyState
              className="mt-8"
              title="Write-ups are on their way"
              description="Engineering projects will appear here as their case studies are finished."
            />
          ) : (
            <>
              <div className="mt-7 grid grid-cols-1 gap-x-10 gap-y-7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
                {areas.length > 1 && (
                  <div className="min-w-0">
                    <p aria-hidden="true" className="eyebrow text-fg-subtle">
                      Filter by area
                    </p>
                    <FilterBar
                      options={filterOptions}
                      value={area}
                      onChange={(value) => writeParams({ area: value })}
                      label="Filter by area"
                      className="mt-3 [&>button]:h-11"
                    />
                  </div>
                )}
                <ProjectSearch value={query} onChange={changeQuery} inputRef={searchRef} className={cn(areas.length <= 1 && 'lg:col-start-2')} />
              </div>

              <div className="mt-10 flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
                <p role="status" className="text-sm text-fg-muted">
                  {describeResults(results.length, activeArea?.label, trimmedQuery)}
                </p>
                {filtered && results.length > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    className="-mr-3 inline-flex h-11 items-center gap-2 rounded-full px-3 text-sm text-fg-muted transition-colors hover:text-fg"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Clear filters
                  </button>
                )}
              </div>
              {activeArea && results.length > 0 && <p className="mt-4 text-sm text-fg-subtle">{activeArea.description}</p>}

              <ProjectGrid
                projects={results}
                label="Engineering projects"
                className="mt-8"
                emptyState={
                  <EmptyState
                    className="mt-8"
                    title="Nothing matches yet"
                    description={
                      trimmedQuery
                        ? 'Try a broader word — a language, a framework or a topic like “vision” — or show every project.'
                        : 'There are no projects in this area right now.'
                    }
                    action={
                      <Button variant="secondary" tone="neutral" onClick={reset} iconLeft={<RotateCcw className="h-4 w-4" />}>
                        Show all projects
                      </Button>
                    }
                  />
                }
              />
            </>
          )}
        </section>
      </Container>
    </div>
  );
}

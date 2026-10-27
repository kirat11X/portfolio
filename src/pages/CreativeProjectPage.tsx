import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, CircleDashed } from 'lucide-react';
import type { CreativeProject, MediaItem } from '@/types';
import { getCategory } from '@/data/categories';
import { getCreativeExtras } from '@/data/creativeProjects';
import { getCreativeProject } from '@/lib/projects';
import { paths } from '@/lib/routes';
import { usePageTitle } from '@/lib/usePageTitle';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Lightbox } from '@/components/ui/Lightbox';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tag } from '@/components/ui/Tag';
import { Breadcrumbs } from '@/components/creative/Breadcrumbs';
import { CreativeHero } from '@/components/creative/CreativeHero';
import { MediaGallery } from '@/components/creative/MediaGallery';
import { ProjectPager } from '@/components/creative/ProjectPager';
import {
  coverMedia,
  findPlayable,
  forViewer,
  heroRatio,
  isPlaceholder,
  placeholderComparison,
  typeset,
  type HeroKind,
} from '@/components/creative/media';

export default function CreativeProjectPage() {
  const { slug } = useParams();
  const project = getCreativeProject(slug);
  usePageTitle(project ? project.title : 'Creative project not found');

  if (!project) return <CreativeNotFound slug={slug ?? ''} />;
  // Keyed so the viewer and comparison state reset when moving between entries.
  return <CreativeProjectView key={project.slug} project={project} />;
}

const MEDIUM_LABEL: Record<CreativeProject['medium'], string> = {
  image: 'Image',
  video: 'Video',
  design: 'Interface design',
};

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function CreativeProjectView({ project }: { project: CreativeProject }) {
  const category = getCategory(project.category);
  const placeholder = isPlaceholder(project);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const { playable, comparison, kind } = useMemo(() => {
    const extras = getCreativeExtras(project.slug);
    const video = project.medium === 'video' ? findPlayable(project) : undefined;
    // Editing slots without a real pair still get the (clearly labelled) comparison, so the interaction is in place.
    const pair = extras.comparison ?? (project.category === 'editing' && placeholder ? placeholderComparison(project) : undefined);
    const heroKind: HeroKind = pair
      ? 'comparison'
      : project.medium === 'video'
        ? video
          ? 'video'
          : 'video-slot'
        : project.medium === 'design'
          ? 'design'
          : 'image';
    return { playable: video, comparison: pair, kind: heroKind };
  }, [project, placeholder]);

  const tracks = getCreativeExtras(project.slug).captions;
  const ratio = heroRatio(project, kind, playable, comparison);
  const wide = ratio >= 1.2;

  // Viewer order: the cover (when it is the hero), then the gallery without the video already playing above.
  const heroImage = useMemo(() => (kind === 'image' || kind === 'design' ? coverMedia(project) : undefined), [kind, project]);
  const gallery = useMemo<MediaItem[]>(() => (project.gallery ?? []).filter((item) => item !== playable), [project, playable]);
  const viewerItems = useMemo(() => (heroImage ? [heroImage, ...gallery] : gallery).map(forViewer), [heroImage, gallery]);
  const galleryOffset = heroImage ? 1 : 0;

  const openCover = useCallback(() => setViewerIndex(0), []);
  const openGalleryItem = useCallback((index: number) => setViewerIndex(index + galleryOffset), [galleryOffset]);
  const closeViewer = useCallback(() => setViewerIndex(null), []);

  const context = project.context ?? project.summary;

  return (
    <div className="relative isolate">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-(--nav-h) -z-10 h-[40rem] bg-[radial-gradient(55%_55%_at_30%_0%,rgb(var(--cre-rgb)/0.1),transparent_72%)]"
      />
      <Container className="pb-20 sm:pb-24">
        <Breadcrumbs
          className="pt-4 sm:pt-6"
          items={[
            { label: 'Creative', to: paths.creative },
            { label: category.label, to: `${paths.creative}?category=${category.id}` },
            { label: typeset(project.title) },
          ]}
        />

        <div className={cn('mt-3 grid gap-8 sm:mt-4 lg:gap-12', !wide && 'lg:grid-cols-12 lg:items-start')}>
          <div className={cn(!wide && 'lg:col-span-7')}>
            <CreativeHero
              project={project}
              kind={kind}
              playable={playable}
              comparison={comparison}
              tracks={tracks}
              onOpenCover={heroImage ? openCover : undefined}
            />
          </div>

          <div
            className={cn(
              wide ? 'grid gap-8 lg:grid-cols-12 lg:gap-12' : 'flex flex-col gap-8 lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:col-span-5',
            )}
          >
            <header className={cn(wide && 'lg:col-span-7')}>
              <p className="eyebrow flex items-center gap-3 text-cre">
                <span className="h-px w-8 bg-cre" aria-hidden="true" />
                {category.label}
              </p>
              <h1 className="mt-4 font-display text-display-md font-semibold text-fg">{typeset(project.title)}</h1>
              <p className="mt-4 text-base leading-relaxed text-fg-muted sm:text-lg">{project.tagline}</p>
              {project.tags.length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-2" aria-label="Keywords">
                  {project.tags.map((tag) => (
                    <li key={tag}>
                      <Tag casing="plain">{tag}</Tag>
                    </li>
                  ))}
                </ul>
              )}
            </header>

            <div className={cn('flex flex-col gap-6', wide && 'lg:col-span-5')}>
              <ProjectFacts project={project} categoryLabel={category.label} />
              {project.links && project.links.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {project.links.map((link) => (
                    <Button
                      key={link.href}
                      href={link.href}
                      variant="secondary"
                      tone="cre"
                      iconRight={<ArrowUpRight className="h-4 w-4" />}
                    >
                      {link.label}
                    </Button>
                  ))}
                </div>
              )}
              {placeholder && <PlaceholderNote />}
            </div>
          </div>
        </div>

        <section
          aria-labelledby="creative-context"
          className="mt-16 grid gap-4 border-t border-line pt-10 sm:mt-20 lg:grid-cols-12 lg:gap-12"
        >
          <h2 id="creative-context" className="eyebrow text-fg-subtle lg:col-span-3 lg:pt-1.5">
            {placeholder ? 'About this slot' : 'Context'}
          </h2>
          <div className="max-w-2xl space-y-4 text-base leading-relaxed text-fg-muted sm:text-lg lg:col-span-9">
            {paragraphs(context).map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        </section>

        {gallery.length > 0 && (
          <section aria-labelledby="creative-gallery" className="mt-16 border-t border-line pt-10 sm:mt-20">
            <div className="mb-8 flex items-baseline justify-between gap-4">
              <h2 id="creative-gallery" className="eyebrow text-fg-subtle">
                Gallery
              </h2>
              <p className="font-mono text-xs text-fg-subtle">
                {gallery.length} {gallery.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            <MediaGallery items={gallery} onOpen={openGalleryItem} label={`${project.title} gallery`} />
          </section>
        )}

        <ProjectPager project={project} className="mt-16 border-t border-line pt-10 sm:mt-20" />
      </Container>

      <Lightbox
        items={viewerItems}
        index={viewerIndex}
        onClose={closeViewer}
        onIndexChange={setViewerIndex}
        label={project.title}
      />
    </div>
  );
}

function ProjectFacts({ project, categoryLabel }: { project: CreativeProject; categoryLabel: string }) {
  const rows: Array<[term: string, value: ReactNode]> = [
    ['Discipline', categoryLabel],
    ['Medium', MEDIUM_LABEL[project.medium]],
  ];
  if (project.year) rows.push(['Year', project.year]);
  if (project.client) rows.push(['Client', project.client]);
  if (project.tools?.length) {
    rows.push([
      'Tools',
      <span key="tools" className="flex flex-wrap gap-1.5">
        {project.tools.map((tool) => (
          <Tag key={tool} casing="plain" tone="cre">
            {tool}
          </Tag>
        ))}
      </span>,
    ]);
  }

  return (
    <dl className="divide-y divide-line rounded-card border border-line bg-ink-900/50">
      {rows.map(([term, value]) => (
        <div key={term} className="grid grid-cols-[6.5rem_1fr] items-center gap-4 px-4 py-3 sm:px-5">
          <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">{term}</dt>
          <dd className="min-w-0 text-sm text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PlaceholderNote() {
  return (
    <div className="rounded-card border border-signal/25 bg-signal/[0.05] p-4 sm:p-5">
      <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-signal">
        <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />
        Placeholder slot
      </p>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">
        The artwork on this page is abstract and generated. It holds the space until the original work is added; nothing
        here is a finished piece.
      </p>
    </div>
  );
}

function CreativeNotFound({ slug }: { slug: string }) {
  return (
    <div className="relative isolate">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-(--nav-h) -z-10 h-[30rem] bg-[radial-gradient(50%_60%_at_20%_0%,rgb(var(--cre-rgb)/0.1),transparent_72%)]"
      />
      <Container className="pb-24">
        <PageHeader
          eyebrow="Creative"
          tone="cre"
          title="This piece isn’t in the studio"
          lede={
            <p>
              There’s no creative project at{' '}
              <code className="break-all rounded-md bg-contrast/[0.06] px-1.5 py-0.5 font-mono text-[0.88em] text-fg">
                /creative/{slug}
              </code>
              . The link may be mistyped, or the piece may have moved.
            </p>
          }
          actions={
            <>
              <Button to={paths.creative} tone="cre" iconLeft={<ArrowLeft className="h-4 w-4" />}>
                Back to the studio
              </Button>
              <Button to={paths.home} variant="ghost" tone="neutral">
                Go home
              </Button>
            </>
          }
        />
      </Container>
    </div>
  );
}

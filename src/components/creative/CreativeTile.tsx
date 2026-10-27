import { Link } from 'react-router-dom';
import { ArrowUpRight, Expand, Play } from 'lucide-react';
import type { CreativeProject } from '@/types';
import { getCategory } from '@/data/categories';
import { projectPath } from '@/lib/routes';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { ProjectCover } from '@/components/ui/ProjectCover';
import { Tag } from '@/components/ui/Tag';
import { DeviceFrame } from './DeviceFrame';
import { isPlaceholder, projectAspect, typeset } from './media';

interface CreativeTileProps {
  project: CreativeProject;
  /** Opens the lightbox on this entry. No quick-view button is rendered without it (or for video). */
  onQuickView?: (project: CreativeProject) => void;
  headingLevel?: 'h2' | 'h3';
  /** Load the cover eagerly (tiles in the first row). */
  priority?: boolean;
  className?: string;
}

/** Always visible on touch screens; on fine pointers revealed by hover or keyboard focus. */
const REVEAL = 'pointer-fine:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100';

/**
 * A masonry tile for one creative entry: the cover at its own aspect ratio,
 * the title and discipline over a scrim, and badges for placeholders and video.
 * Interface work is presented inside a device frame.
 */
export function CreativeTile({ project, onQuickView, headingLevel: Heading = 'h2', priority, className }: CreativeTileProps) {
  const reduced = useReducedMotion();
  const category = getCategory(project.category);
  const aspect = projectAspect(project);
  const placeholder = isPlaceholder(project);
  const isVideo = project.medium === 'video';
  const loading = priority ? 'eager' : 'lazy';
  const zoom = reduced ? undefined : 'transition-transform duration-700 ease-out-expo group-hover:scale-[1.035]';

  return (
    // Captions sit on the artwork behind a dark scrim, so the tile is dark in both themes.
    <article data-theme="dark" className={cn('group relative', className)}>
      <Link
        to={projectPath(project)}
        className="relative block overflow-hidden rounded-card border border-line bg-ink-900 transition-[border-color,box-shadow] duration-300 ease-out-expo hover:border-cre/45 hover:shadow-glow-cre"
      >
        {project.medium === 'design' ? (
          <DesignStage project={project} portrait={aspect === 'portrait'} loading={loading} zoom={zoom} />
        ) : (
          <ProjectCover project={project} aspect={aspect} loading={loading} showPlaceholderLabel={false} imgClassName={zoom} />
        )}

        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 bg-linear-to-t from-void/90 via-void/30 via-35% to-transparent to-70%',
            'transition-opacity duration-500 ease-out-expo',
            REVEAL,
          )}
        />

        <div
          className={cn(
            'absolute inset-x-0 bottom-0 flex items-end gap-3 p-4 sm:p-5',
            'transition-[opacity,translate] duration-500 ease-out-expo',
            REVEAL,
            'pointer-fine:translate-y-2 group-hover:translate-y-0 group-focus-within:translate-y-0',
          )}
        >
          {/* Title first in the DOM so the link reads "title, discipline"; shown below the discipline. */}
          <div className="flex min-w-0 flex-1 flex-col-reverse gap-1.5">
            <Heading className="text-[15px] font-semibold leading-snug text-fg sm:text-base">{typeset(project.title)}</Heading>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-cre">{category.shortLabel}</p>
          </div>
          <ArrowUpRight className="mb-0.5 h-5 w-5 shrink-0 text-fg" aria-hidden="true" />
        </div>

        {placeholder && (
          <Tag tone="signal" className="absolute left-3 top-3 bg-ink-950/80">
            Placeholder
          </Tag>
        )}
        {isVideo && (
          <span className="glass absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full px-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-fg">
            <Play className="h-3 w-3 fill-current" aria-hidden="true" />
            Video
          </span>
        )}
      </Link>

      {onQuickView && !isVideo && (
        <button
          type="button"
          onClick={() => onQuickView(project)}
          aria-haspopup="dialog"
          aria-label={`Quick view: ${project.title}`}
          className={cn(
            'glass absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full text-fg',
            'transition-[opacity,border-color,color] duration-300 hover:border-cre/50 hover:text-contrast focus-visible:opacity-100',
            REVEAL,
          )}
        >
          <Expand className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </article>
  );
}

interface DesignStageProps {
  project: CreativeProject;
  portrait: boolean;
  loading: 'eager' | 'lazy';
  zoom?: string;
}

/** Interface work sits in a device frame on a dotted "canvas", like a presentation board. */
function DesignStage({ project, portrait, loading, zoom }: DesignStageProps) {
  return (
    <div className={cn('relative grid place-items-center overflow-hidden bg-ink-900', portrait ? 'aspect-[3/4]' : 'aspect-[4/3]')}>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(85%_65%_at_50%_0%,rgb(var(--cre-rgb)/0.2),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(rgb(var(--contrast-rgb)/0.08)_1px,transparent_1px)] bg-size-[18px_18px] opacity-70"
      />
      <DeviceFrame kind={portrait ? 'phone' : 'browser'} className={cn('relative', portrait ? 'w-[46%]' : 'w-[84%]', zoom)}>
        <ProjectCover
          project={project}
          fill
          aspect={portrait ? 'portrait' : 'landscape'}
          loading={loading}
          showPlaceholderLabel={false}
        />
      </DeviceFrame>
    </div>
  );
}

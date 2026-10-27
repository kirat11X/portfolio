import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Project } from '@/types';
import { getCategory } from '@/data/categories';
import { getAdjacent } from '@/lib/projects';
import { projectPath } from '@/lib/routes';
import { cn } from '@/lib/cn';
import { ProjectCover } from '@/components/ui/ProjectCover';
import { typeset } from './media';

interface ProjectPagerProps {
  project: Project;
  className?: string;
}

/** Previous / next entry in the same discipline (wrapping), with small cover thumbnails. */
export function ProjectPager({ project, className }: ProjectPagerProps) {
  const { previous, next } = getAdjacent(project);
  if (!previous && !next) return null;
  // With two entries, previous and next are the same project: show it once.
  const showPrevious = previous !== null && previous.slug !== next?.slug;

  return (
    <nav aria-label="More creative work" className={cn('grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 sm:gap-4', className)}>
      {showPrevious && <PagerLink project={previous} direction="previous" />}
      {next && <PagerLink project={next} direction="next" className={showPrevious ? undefined : 'sm:col-start-2'} />}
    </nav>
  );
}

interface PagerLinkProps {
  project: Project;
  direction: 'previous' | 'next';
  className?: string;
}

function PagerLink({ project, direction, className }: PagerLinkProps) {
  const isNext = direction === 'next';
  const category = getCategory(project.category);
  return (
    <Link
      to={projectPath(project)}
      rel={isNext ? 'next' : 'prev'}
      className={cn(
        'group flex min-h-24 items-center gap-4 rounded-card border border-line bg-ink-900/60 p-3 transition-colors duration-300 hover:border-cre/45 hover:bg-ink-850',
        isNext ? 'pr-5 sm:flex-row-reverse sm:pl-5 sm:pr-3 sm:text-right' : 'pr-5',
        className,
      )}
    >
      <div aria-hidden="true" className="h-16 w-16 shrink-0 overflow-hidden rounded-xl sm:h-[4.5rem] sm:w-[4.5rem]">
        <ProjectCover project={project} aspect="square" fill showPlaceholderLabel={false} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle',
            isNext && 'sm:justify-end',
          )}
        >
          {!isNext && <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden="true" />}
          {isNext ? 'Next' : 'Previous'}
          {isNext && <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />}
        </p>
        <p className="mt-1.5 truncate font-medium text-fg">{typeset(project.title)}</p>
        <p className="mt-0.5 truncate text-xs text-fg-subtle">
          {category.shortLabel}
          {project.placeholder && ' · Placeholder'}
        </p>
      </div>
    </Link>
  );
}

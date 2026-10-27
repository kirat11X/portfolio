import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Project } from '@/types';
import { ProjectCover } from '@/components/ui/ProjectCover';
import { getAdjacent } from '@/lib/projects';
import { projectPath } from '@/lib/routes';
import { cn } from '@/lib/cn';
import { categoryOf } from './projectMeta';

interface ProjectPagerProps {
  project: Project;
  className?: string;
}

/** Previous / next project in the same discipline (wrapping), as two large links. */
export function ProjectPager({ project, className }: ProjectPagerProps) {
  const { previous, next } = getAdjacent(project);
  if (!previous && !next) return null;
  // With two projects both neighbours are the same one; offer it once, as "next".
  const showPrevious = previous !== null && previous.slug !== next?.slug;
  const noun = project.discipline === 'engineering' ? 'engineering projects' : 'creative projects';

  return (
    <nav aria-label={`More ${noun}`} className={cn('border-t border-line pt-10', className)}>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {showPrevious && (
          <li className="flex">
            <PagerLink project={previous} direction="previous" />
          </li>
        )}
        {next && (
          <li className="flex sm:col-start-2">
            <PagerLink project={next} direction="next" />
          </li>
        )}
      </ul>
    </nav>
  );
}

function PagerLink({ project, direction }: { project: Project; direction: 'previous' | 'next' }) {
  const isNext = direction === 'next';
  const arrowClass = cn(
    'h-3.5 w-3.5 shrink-0 transition-[color,translate] duration-300 ease-out-expo group-hover:text-eng',
    isNext ? 'group-hover:translate-x-0.5' : 'group-hover:-translate-x-0.5',
  );
  return (
    <Link
      to={projectPath(project)}
      rel={isNext ? 'next' : 'prev'}
      className={cn(
        'group flex w-full items-center gap-4 rounded-card border border-line bg-ink-900/60 p-3 transition-[border-color,background-color] duration-300',
        'hover:border-line-strong hover:bg-ink-900',
        isNext ? 'flex-row-reverse pl-5 text-right' : 'pr-5',
      )}
    >
      {/* The cover is decorative here; the link is named by its text. It sits on the outer edge. */}
      <span aria-hidden="true" className="w-16 shrink-0 sm:w-20">
        <ProjectCover project={project} aspect="square" showPlaceholderLabel={false} className="rounded-xl" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('eyebrow flex items-center gap-2 text-fg-subtle', isNext && 'justify-end')}>
          {!isNext && <ArrowLeft aria-hidden="true" className={arrowClass} />}
          {isNext ? 'Next' : 'Previous'}
          <span className="sr-only"> project:</span>
          {isNext && <ArrowRight aria-hidden="true" className={arrowClass} />}
        </span>
        <span className="mt-1.5 block text-[15px] font-semibold leading-snug text-fg sm:text-base">{project.title}</span>
        <span className="mt-1 block text-[13px] text-fg-subtle">{categoryOf(project).label}</span>
      </span>
    </Link>
  );
}

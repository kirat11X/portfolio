import type { ReactNode } from 'react';
import type { Project } from '@/types';
import { cn } from '@/lib/cn';
import { ProjectCard, type ProjectCardProps } from './ProjectCard';

interface ProjectGridProps {
  projects: Project[];
  headingLevel?: 'h2' | 'h3';
  /** Card style; 'compact' switches to a denser two-column list. */
  variant?: Exclude<ProjectCardProps['variant'], 'feature'>;
  /** Rendered instead of the grid when there are no projects. */
  emptyState?: ReactNode;
  /** Accessible name for the list, e.g. "Engineering projects". */
  label?: string;
  className?: string;
}

const layout = {
  default: 'grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3',
  compact: 'grid-cols-1 gap-4 md:grid-cols-2',
} as const;

/** A responsive wall of project cards: one column on phones, two on tablets, three on desktops. */
export function ProjectGrid({ projects, headingLevel = 'h3', variant = 'default', emptyState, label, className }: ProjectGridProps) {
  if (projects.length === 0) return emptyState ? <>{emptyState}</> : null;
  return (
    <ul aria-label={label} className={cn('grid', layout[variant], className)}>
      {projects.map((project, index) => (
        <li
          key={project.slug}
          className="flex animate-rise flex-col"
          // A short stagger as cards arrive; capped so long lists don't wait. Reduced motion removes it (index.css).
          style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }}
        >
          <ProjectCard project={project} variant={variant} headingLevel={headingLevel} className="flex-1" />
        </li>
      ))}
    </ul>
  );
}

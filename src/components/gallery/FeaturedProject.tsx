import { useId, type ReactNode } from 'react';
import type { Project } from '@/types';
import { cn } from '@/lib/cn';
import { ProjectCard } from './ProjectCard';

interface FeaturedProjectProps {
  project: Project;
  /** Small label above the exhibit. */
  label?: ReactNode;
  className?: string;
}

/** The gallery's hero exhibit: one project, presented large with its own label. */
export function FeaturedProject({ project, label = 'Featured project', className }: FeaturedProjectProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn(className)}>
      <h2 id={headingId} className="eyebrow flex items-center gap-3 text-fg-muted">
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
        {label}
      </h2>
      <ProjectCard project={project} variant="feature" headingLevel="h3" className="mt-5" />
    </section>
  );
}

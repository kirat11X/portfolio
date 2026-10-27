import type { LinkKind, Project } from '@/types';
import { BookOpen, CirclePlay, FileText, Globe, Link2, MonitorPlay, Palette, PenTool } from 'lucide-react';
import { Tag } from '@/components/ui/Tag';
import { Github, Instagram } from '@/components/ui/Icons';
import { cn } from '@/lib/cn';
import { STATUS_LABEL, accentTone, categoryOf } from './projectMeta';

/** Mono metadata text: museum-label small caps. ≥ 4.5:1 on ink-900 and darker. */
export const metaTextClass = 'font-mono text-[11px] uppercase leading-none tracking-[0.12em] text-fg-subtle';

interface CategoryTagProps {
  project: Pick<Project, 'category' | 'discipline'>;
  /** Short label ("Vision") instead of the full one ("Computer Vision"). */
  short?: boolean;
  className?: string;
}

/** The project's category as a tone-coloured tag with a dot. */
export function CategoryTag({ project, short = true, className }: CategoryTagProps) {
  const category = categoryOf(project);
  return (
    <Tag tone={accentTone(project)} dot className={className}>
      <span className="sr-only">Category: </span>
      {short ? category.shortLabel : category.label}
    </Tag>
  );
}

interface MetaRowProps {
  project: Project;
  /** 'end' pushes the year to the far edge (cards); 'inline' keeps it with the rest (page heroes). */
  yearPlacement?: 'end' | 'inline';
  /** Show an amber "Placeholder" tag (for layouts where the cover label is hidden). */
  showPlaceholder?: boolean;
  /** Full category name ("Computer Vision") instead of the short one ("Vision"). */
  fullCategory?: boolean;
  className?: string;
}

/** Category · status · year — the "wall label" line above a card title. */
export function MetaRow({ project, yearPlacement = 'end', showPlaceholder = false, fullCategory = false, className }: MetaRowProps) {
  const category = categoryOf(project);
  const statusText = project.status ? STATUS_LABEL[project.status] : null;
  // A "Research" status beside the "Research" category says the same thing twice.
  const status = statusText && ![category.label, category.shortLabel].some((label) => label.toLowerCase() === statusText.toLowerCase()) ? statusText : null;
  const year = project.year ?? null;
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-2', className)}>
      <CategoryTag project={project} short={!fullCategory} />
      {showPlaceholder && project.placeholder && <Tag tone="signal">Placeholder</Tag>}
      {status && (
        <span className={metaTextClass}>
          <span className="sr-only">Status: </span>
          {status}
        </span>
      )}
      {year && (
        <span className={cn(metaTextClass, 'tabular-nums', yearPlacement === 'end' && 'ml-auto')}>
          <span className="sr-only">Year: </span>
          {year}
        </span>
      )}
    </div>
  );
}

interface TechListProps {
  tags: string[];
  /** How many tags to show before collapsing the rest into "+N". */
  max?: number;
  className?: string;
  /** Accessible name for the list. */
  label?: string;
}

/** Up to `max` technology chips, then a quiet "+N". */
export function TechList({ tags, max = 3, className, label = 'Built with' }: TechListProps) {
  if (tags.length === 0) return null;
  const visible = tags.slice(0, max);
  const hidden = tags.length - visible.length;
  return (
    <ul aria-label={label} className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {visible.map((tag) => (
        <li key={tag} className="flex">
          <Tag casing="plain">{tag}</Tag>
        </li>
      ))}
      {hidden > 0 && (
        <li className="flex">
          <span className="px-1 font-mono text-[11px] leading-none text-fg-subtle">
            <span aria-hidden="true">+{hidden}</span>
            <span className="sr-only">and {hidden} more</span>
          </span>
        </li>
      )}
    </ul>
  );
}

/** Icon for a project link kind. Decorative: the link text carries the meaning. */
export function LinkIcon({ kind, className = 'h-4 w-4' }: { kind: LinkKind; className?: string }) {
  switch (kind) {
    case 'github':
      return <Github className={className} />;
    case 'demo':
      return <MonitorPlay className={className} aria-hidden="true" />;
    case 'video':
      return <CirclePlay className={className} aria-hidden="true" />;
    case 'paper':
      return <FileText className={className} aria-hidden="true" />;
    case 'article':
      return <BookOpen className={className} aria-hidden="true" />;
    case 'figma':
      return <PenTool className={className} aria-hidden="true" />;
    case 'behance':
    case 'dribbble':
      return <Palette className={className} aria-hidden="true" />;
    case 'instagram':
      return <Instagram className={className} />;
    case 'other':
      return <Link2 className={className} aria-hidden="true" />;
    default:
      return <Globe className={className} aria-hidden="true" />;
  }
}

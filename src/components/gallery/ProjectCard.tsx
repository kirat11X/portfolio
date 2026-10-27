import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { Project } from '@/types';
import { projectPath } from '@/lib/routes';
import { cn } from '@/lib/cn';
import { ProjectCover } from '@/components/ui/ProjectCover';
import { useExhibitHover } from './useExhibitHover';
import { LinkIcon, MetaRow, TechList } from './ProjectMeta';
import { accentTone, anchorProps, isNewTab, openLabel, usableLinks, type AccentTone } from './projectMeta';

export interface ProjectCardProps {
  project: Project;
  /** 'feature' = large horizontal card, 'compact' = small card for dense lists. */
  variant?: 'default' | 'compact' | 'feature';
  headingLevel?: 'h2' | 'h3';
  className?: string;
}

/**
 * A project exhibit: a mounted cover with a wall label beneath it. The whole
 * card is clickable through a stretched title link (one tab stop, announced by
 * the project title); secondary links such as GitHub sit above it.
 * Works for both disciplines (cyan engineering, violet creative).
 */
export function ProjectCard({ project, variant = 'default', headingLevel = 'h3', className }: ProjectCardProps) {
  if (variant === 'feature') return <FeatureCard project={project} heading={headingLevel} className={className} />;
  if (variant === 'compact') return <CompactCard project={project} heading={headingLevel} className={className} />;
  return <DefaultCard project={project} heading={headingLevel} className={className} />;
}

interface VariantProps {
  project: Project;
  heading: 'h2' | 'h3';
  className?: string;
}

type Radius = 'card' | 'panel';

const accentVar: Record<AccentTone, string> = {
  eng: '[--accent-rgb:var(--eng-rgb)]',
  cre: '[--accent-rgb:var(--cre-rgb)]',
};

const radiusClass: Record<Radius, string> = {
  card: 'rounded-card',
  panel: 'rounded-panel',
};

const afterRadiusClass: Record<Radius, string> = {
  card: 'after:rounded-card',
  panel: 'after:rounded-panel',
};

const focusRing: Record<AccentTone, string> = {
  eng: 'focus-visible:after:outline-eng',
  cre: 'focus-visible:after:outline-cre',
};

/** Slow zoom of the cover while the card is hovered (only when the tilt effect is active). */
const coverZoom = 'transition-transform duration-700 ease-out-expo group-data-[fx=on]/card:group-hover/card:scale-[1.035]';

/** Hairline inside the cover so dark artwork still reads as a mounted print. */
const coverEdge = 'outline-1 -outline-offset-1 outline-contrast/[0.07]';

function CardShell({ project, radius = 'card', className, children }: { project: Project; radius?: Radius; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useExhibitHover(ref);
  return (
    <article
      ref={ref}
      className={cn(
        'group/card relative isolate border border-line bg-ink-900 shadow-panel',
        'transition-[transform,translate,box-shadow,border-color] duration-500 ease-out-expo',
        'hover:border-contrast/[0.14]',
        'data-[fx=on]:hover:-translate-y-1',
        'data-[fx=on]:hover:[transform:perspective(1400px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))]',
        'data-[fx=on]:hover:shadow-(--elevation-lift)',
        accentVar[accentTone(project)],
        radiusClass[radius],
        className,
      )}
    >
      {/* Gallery light: a soft pool of the discipline colour that follows the pointer. */}
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-500',
          'bg-[radial-gradient(26rem_circle_at_var(--glow-x,50%)_var(--glow-y,0%),rgb(var(--accent-rgb)/0.09),transparent_65%)]',
          'group-data-[fx=on]/card:group-hover/card:opacity-100',
        )}
      />
      {children}
    </article>
  );
}

/** The title link, stretched over the whole card. Its focus ring outlines the card. */
function CardLink({ project, radius = 'card', children }: { project: Project; radius?: Radius; children: ReactNode }) {
  return (
    <Link
      to={projectPath(project)}
      className={cn(
        'outline-none transition-colors duration-300',
        "after:absolute after:inset-0 after:z-[1] after:content-['']",
        afterRadiusClass[radius],
        'focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-solid',
        focusRing[accentTone(project)],
      )}
    >
      {children}
    </Link>
  );
}

/** GitHub / live-demo shortcuts. They sit above the stretched link. */
function QuickLinks({ project, labelled = false, className }: { project: Project; labelled?: boolean; className?: string }) {
  const links = usableLinks(project)
    .filter((link) => link.kind === 'github' || link.kind === 'demo')
    .slice(0, 2);
  if (links.length === 0) return null;
  return (
    <ul className={cn('relative z-[2] flex shrink-0 flex-wrap items-center gap-1', className)}>
      {links.map((link) => {
        const newTab = isNewTab(link.href);
        return (
          <li key={link.href} className="flex">
            <a
              {...anchorProps(link.href)}
              aria-label={labelled ? undefined : `${link.label}: ${project.title}${newTab ? ' (opens in a new tab)' : ''}`}
              title={labelled ? undefined : link.label}
              className={cn(
                'inline-flex h-11 items-center justify-center gap-2 rounded-full text-fg-muted transition-colors duration-200 hover:bg-contrast/[0.06] hover:text-fg',
                labelled ? 'border border-line px-4 text-sm font-medium hover:border-line-strong' : 'w-11',
              )}
            >
              <LinkIcon kind={link.kind} className="h-[18px] w-[18px] shrink-0" />
              {labelled && (
                <>
                  <span>{link.label}</span>
                  {newTab && <span className="sr-only"> (opens in a new tab)</span>}
                </>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Decorative "open" mark in the corner of a cover; appears on hover and focus. */
function OpenMark() {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'glass absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-fg',
        'opacity-0 transition-[opacity,translate] duration-300 ease-out-expo',
        'group-hover/card:opacity-100 group-has-[a:focus-visible]/card:opacity-100',
        'group-data-[fx=on]/card:translate-y-1 group-data-[fx=on]/card:group-hover/card:translate-y-0',
      )}
    >
      <ArrowUpRight className="h-4 w-4" />
    </span>
  );
}

function DefaultCard({ project, heading: Heading, className }: VariantProps) {
  return (
    <CardShell project={project} className={cn('flex flex-col', className)}>
      {/* Text comes first in the DOM so screen readers meet the title first; the cover is moved above it visually. */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <Heading className="order-2 mt-3.5 text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] text-fg">
          <CardLink project={project}>{project.title}</CardLink>
        </Heading>
        <MetaRow project={project} className="order-1" />
        <p className="order-3 mt-2 line-clamp-3 text-sm leading-relaxed text-fg-muted">{project.summary}</p>
        <div className="order-4 mt-auto flex items-end justify-between gap-3 pt-5">
          <TechList tags={project.tags} max={3} />
          <QuickLinks project={project} className="-mb-2.5 -mr-2.5" />
        </div>
      </div>
      <div className="relative order-first p-2 pb-0">
        <ProjectCover project={project} className={cn('rounded-[0.75rem]', coverEdge)} imgClassName={coverZoom} />
        <OpenMark />
      </div>
    </CardShell>
  );
}

function CompactCard({ project, heading: Heading, className }: VariantProps) {
  return (
    <CardShell project={project} className={cn('flex items-center gap-4 p-2 pr-3 sm:pr-4', className)}>
      <div className="flex min-w-0 flex-1 flex-col py-1.5">
        <Heading className="order-2 mt-2 text-[0.9375rem] font-semibold leading-snug text-fg">
          <CardLink project={project}>{project.title}</CardLink>
        </Heading>
        <MetaRow project={project} showPlaceholder className="order-1" />
        <p className="order-3 mt-1 line-clamp-2 text-[13px] leading-snug text-fg-muted">{project.tagline}</p>
      </div>
      <div className="order-first w-[4.5rem] shrink-0 self-start sm:w-20">
        {/* The placeholder label would cover a thumbnail this small; the meta row shows it instead. */}
        <ProjectCover project={project} aspect="square" showPlaceholderLabel={false} className={cn('rounded-[0.75rem]', coverEdge)} imgClassName={coverZoom} />
      </div>
      <ArrowUpRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 self-start text-fg-subtle transition-[color,translate] duration-300 ease-out-expo group-hover/card:text-fg group-data-[fx=on]/card:group-hover/card:translate-x-0.5 group-data-[fx=on]/card:group-hover/card:-translate-y-0.5"
      />
    </CardShell>
  );
}

const ctaTone: Record<AccentTone, string> = {
  eng: 'border-eng/35 text-eng group-hover/card:border-eng group-hover/card:bg-eng/10',
  cre: 'border-cre/35 text-cre group-hover/card:border-cre group-hover/card:bg-cre/10',
};

function FeatureCard({ project, heading: Heading, className }: VariantProps) {
  const tone = accentTone(project);
  return (
    <CardShell project={project} radius="panel" className={cn('@container', className)}>
      <div className="grid @3xl:grid-cols-12">
        <div className="flex flex-col px-6 pb-6 pt-5 sm:px-8 sm:pb-8 @3xl:col-span-5 @3xl:py-10 @3xl:pl-8 @3xl:pr-10 @5xl:pl-10 @5xl:pr-12">
          <Heading className="order-2 mt-5 font-display text-display-sm font-semibold text-fg">
            <CardLink project={project} radius="panel">
              {project.title}
            </CardLink>
          </Heading>
          <MetaRow project={project} className="order-1" />
          <p className="order-3 mt-4 text-base leading-relaxed text-fg sm:text-[1.0625rem]">{project.tagline}</p>
          <p className="order-4 mt-3 text-[15px] leading-relaxed text-fg-muted">{project.summary}</p>
          <TechList tags={project.tags} max={6} className="order-5 mt-6" />
          <div className="order-6 mt-auto flex flex-wrap items-center gap-3 pt-8">
            {/* Visual call to action only: the stretched title link already makes the whole card clickable. */}
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-medium transition-colors duration-300',
                ctaTone[tone],
              )}
            >
              {openLabel(project)}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 ease-out-expo group-data-[fx=on]/card:group-hover/card:translate-x-0.5" />
            </span>
            <QuickLinks project={project} labelled />
          </div>
        </div>
        <div className="relative order-first p-2 @3xl:col-span-7 @3xl:pr-0">
          <div className="relative aspect-[16/10] overflow-hidden rounded-card @3xl:aspect-auto @3xl:h-full @3xl:min-h-[24rem]">
            <ProjectCover project={project} fill loading="eager" className={cn('absolute inset-0 rounded-card', coverEdge)} imgClassName={coverZoom} />
          </div>
        </div>
      </div>
    </CardShell>
  );
}

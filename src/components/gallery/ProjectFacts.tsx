import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { EngineeringProject } from '@/types';
import { Panel } from '@/components/ui/Panel';
import { paths } from '@/lib/routes';
import { cn } from '@/lib/cn';
import { LinkIcon, TechList, metaTextClass } from './ProjectMeta';
import { STATUS_LABEL, anchorProps, categoryOf, isNewTab, usableLinks } from './projectMeta';

interface ProjectFactsProps {
  project: EngineeringProject;
  /** Hide the links block (e.g. on small screens where the hero already shows them). */
  hideLinksBelowLg?: boolean;
  className?: string;
}

interface Fact {
  label: string;
  value: ReactNode;
}

/** The case study's spec sheet: area, status, year, role, team, stack and links. */
export function ProjectFacts({ project, hideLinksBelowLg = false, className }: ProjectFactsProps) {
  const headingId = useId();
  const category = categoryOf(project);
  const links = usableLinks(project);
  const stack = (project.stack ?? []).filter((group) => group.items.length > 0);

  const facts: Fact[] = [
    {
      label: 'Area',
      value: (
        <Link
          to={`${paths.engineering}?category=${project.category}`}
          className="underline decoration-line-strong underline-offset-4 transition-colors hover:text-eng hover:decoration-eng/60"
        >
          {category.label}
        </Link>
      ),
    },
  ];
  if (project.status) facts.push({ label: 'Status', value: STATUS_LABEL[project.status] });
  if (project.year) facts.push({ label: 'Year', value: project.year });
  if (project.role) facts.push({ label: 'Role', value: project.role });
  if (project.team) facts.push({ label: 'Team', value: project.team });

  return (
    <Panel as="aside" aria-labelledby={headingId} className={cn('p-5 sm:p-6', className)}>
      <h2 id={headingId} className="eyebrow text-fg-muted">
        Project facts
      </h2>

      <dl className="mt-4 divide-y divide-line border-y border-line">
        {facts.map((fact) => (
          <div key={fact.label} className="grid grid-cols-[5rem_minmax(0,1fr)] items-baseline gap-x-4 py-3">
            <dt className={metaTextClass}>{fact.label}</dt>
            <dd className="text-sm leading-snug text-fg">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {stack.length > 0 ? (
        <div className="mt-6">
          <h3 className="eyebrow text-fg-muted">Stack</h3>
          <dl className="mt-3 space-y-4">
            {stack.map((group) => (
              <div key={group.group}>
                <dt className="text-xs font-medium text-fg-subtle">{group.group}</dt>
                <dd className="mt-2">
                  <TechList tags={group.items} max={Number.POSITIVE_INFINITY} label={group.group} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : (
        project.tags.length > 0 && (
          <div className="mt-6">
            <h3 className="eyebrow text-fg-muted">Built with</h3>
            <TechList tags={project.tags} max={Number.POSITIVE_INFINITY} className="mt-3" />
          </div>
        )
      )}

      {links.length > 0 && (
        <div className={cn('mt-6', hideLinksBelowLg && 'max-lg:hidden')}>
          <h3 className="eyebrow text-fg-muted">Links</h3>
          <ul className="-mx-2 mt-2">
            {links.map((link) => {
              const newTab = isNewTab(link.href);
              return (
                <li key={link.href}>
                  <a
                    {...anchorProps(link.href)}
                    className="group flex min-h-11 items-center gap-3 rounded-xl px-2 text-sm text-fg-muted transition-colors hover:bg-contrast/[0.04] hover:text-fg"
                  >
                    <LinkIcon kind={link.kind} className="h-4 w-4 shrink-0 text-fg-subtle transition-colors group-hover:text-eng" />
                    <span className="min-w-0 flex-1 truncate">{link.label}</span>
                    {newTab && (
                      <>
                        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden="true" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Panel>
  );
}

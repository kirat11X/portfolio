import { useId, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Download, ExternalLink, Printer } from 'lucide-react';
import type { Education, EngineeringProject, Experience, LeadershipExperience, Project, ProjectStatus, ResumeTrack } from '@/types';
import { displayUrl, opensNewTab } from '@/components/home/links';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Github, SocialIcon } from '@/components/ui/Icons';
import { profileData } from '@/data/profile';
import { getEngineeringProject, getFeatured } from '@/lib/projects';
import { cn } from '@/lib/cn';
import { paths, projectPath } from '@/lib/routes';
import { usePageTitle } from '@/lib/usePageTitle';

// Role-specific résumés. Each track (profile.resumes) picks its skill groups
// and selected projects and has its own PDF. The selected track lives in
// ?track= so a link can point straight at, say, the ML / CV résumé. The page
// prints cleanly: white paper, black text, no site chrome.

const STATUS_LABEL: Record<ProjectStatus, string> = {
  shipped: 'Shipped',
  prototype: 'Prototype',
  'in-progress': 'In progress',
  research: 'Research',
  coursework: 'Coursework',
  competition: 'Competition',
  archived: 'Archived',
};

// Stand-in entries never appear on a resume.
const selectedCreative = getFeatured('creative').filter((project) => !project.placeholder);

/** Page-level print rules that utilities cannot express: paper margins and a white page. */
// The skip link is fixed-position, so it would otherwise repeat on every printed page.
const PRINT_CSS =
  '@media print { @page { margin: 14mm 15mm; } html, body { background: #fff !important; } a[href="#main"] { display: none !important; } }';

// Shared text colours: dark theme on screen, black on paper.
const ink = 'text-fg print:text-black';
const muted = 'text-fg-muted print:text-neutral-800';
const subtle = 'text-fg-subtle print:text-neutral-600';
const rule = 'border-line print:border-neutral-300';

export default function ResumePage() {
  usePageTitle('Resume');
  const {
    name,
    title,
    status,
    location,
    bio,
    socials,
    skillGroups,
    experience,
    education,
    interests,
    achievements,
    leadership,
    resumes,
  } = profileData;
  const identity = [status, location].filter(Boolean).join(' · ');
  const [searchParams, setSearchParams] = useSearchParams();
  const track = resumes.find((candidate) => candidate.id === searchParams.get('track')) ?? resumes[0];
  const trackSkills = track.skillCategories
    .map((category) => skillGroups.find((group) => group.category === category))
    .filter((group) => group !== undefined);
  const trackProjects = track.projectSlugs
    .map((slug) => getEngineeringProject(slug))
    .filter((project): project is EngineeringProject => Boolean(project && !project.placeholder));
  const summary = track.summary ?? bio;
  const leadershipFirst = track.id === 'creative';
  const selectTrack = (id: ResumeTrack['id']) =>
    setSearchParams(id === resumes[0].id ? {} : { track: id }, { replace: true, preventScrollReset: true });

  const leadershipSection = leadership && leadership.length > 0 && (
    <ResumeSection title="Leadership">
      <ul className="space-y-4">
        {leadership.map((item) => (
          <LeadershipEntry key={`${item.organisation}:${item.role}`} item={item} />
        ))}
      </ul>
    </ResumeSection>
  );

  return (
    <Container size="md" className="pb-24 sm:pb-28 print:-mt-(--nav-h) print:max-w-none print:px-0 print:pb-0">
      <style>{PRINT_CSS}</style>

      <div className="pb-8 pt-10 sm:pt-14 print:hidden">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow flex items-center gap-3 text-fg-muted">
              <span className="h-px w-8 bg-fg-subtle" aria-hidden="true" />
              Resume
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-fg-muted">
              Four versions, each tuned to a kind of role. Pick one to read it here or download the PDF.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {track.pdfUrl && (
              <Button href={track.pdfUrl} download iconLeft={<Download className="h-4 w-4" />}>
                Download {track.shortLabel} PDF
              </Button>
            )}
            <Button
              variant="secondary"
              tone="neutral"
              onClick={() => window.print()}
              iconLeft={<Printer className="h-4 w-4" />}
            >
              Print this page
            </Button>
          </div>
        </div>

        <div role="group" aria-label="Resume version" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {resumes.map((option) => {
            const selected = option.id === track.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => selectTrack(option.id)}
                className={cn(
                  'flex min-h-11 flex-col items-start gap-1 rounded-card border p-4 text-left transition-colors duration-200',
                  selected
                    ? 'border-eng/50 bg-eng/[0.08] shadow-glow-eng'
                    : 'border-line bg-contrast/[0.02] hover:border-line-strong',
                )}
              >
                <span className={cn('font-medium', selected ? 'text-fg' : 'text-fg-muted')}>{option.label}</span>
                <span className="text-xs leading-relaxed text-fg-muted">{option.focus}</span>
              </button>
            );
          })}
        </div>
      </div>

      <article
        aria-labelledby="resume-name"
        className="rounded-panel border border-line bg-ink-900/50 p-6 shadow-panel sm:p-10 lg:p-12 print:rounded-none print:border-0 print:bg-transparent print:p-0 print:shadow-none"
      >
        <header className="pb-8">
          <h1 id="resume-name" className={`font-display text-display-md font-semibold ${ink}`}>
            {name}
          </h1>
          <p className={`mt-3 text-lg ${ink}`}>{track.headline ?? title}</p>
          <p className={`mt-1 font-mono text-xs uppercase tracking-[0.14em] ${subtle}`}>{track.label} resume</p>
          {identity && <p className={`mt-1 ${muted}`}>{identity}</p>}
          {socials.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {socials.map((social) => {
                const newTab = opensNewTab(social.href);
                return (
                  <li key={social.href} className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
                    <SocialIcon kind={social.kind} className={`h-3.5 w-3.5 ${subtle}`} />
                    <span className={subtle}>{social.label}: </span>
                    <a
                      href={social.href}
                      className={`break-all font-mono underline-offset-4 hover:text-eng hover:underline ${muted}`}
                      {...(newTab ? { target: '_blank', rel: 'me noopener noreferrer' } : {})}
                    >
                      {displayUrl(social.href)}
                      {newTab && <span className="sr-only"> (opens in a new tab)</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </header>

        {summary.length > 0 && (
          <ResumeSection title="Profile">
            {summary.map((paragraph) => (
              <p key={paragraph} className={`leading-relaxed ${muted}`}>
                {paragraph}
              </p>
            ))}
          </ResumeSection>
        )}

        {leadershipFirst && leadershipSection}

        {trackSkills.length > 0 && (
          <ResumeSection title="Skills">
            <dl className="space-y-3">
              {trackSkills.map((group) => (
                <div key={group.category} className="grid gap-x-6 gap-y-0.5 sm:grid-cols-[12rem_minmax(0,1fr)]">
                  <dt className={`font-medium ${ink}`}>{group.category}</dt>
                  <dd className={muted}>{group.items.join(', ')}</dd>
                </div>
              ))}
            </dl>
          </ResumeSection>
        )}

        {experience.length > 0 && (
          <ResumeSection title="Experience">
            <ul className="space-y-6">
              {experience.map((item) => (
                <ExperienceEntry key={`${item.organisation}:${item.role}:${item.period}`} item={item} />
              ))}
            </ul>
          </ResumeSection>
        )}

        {education.length > 0 && (
          <ResumeSection title="Education">
            <ul className="space-y-6">
              {education.map((item) => (
                <EducationEntry key={`${item.institution}:${item.degree}:${item.period}`} item={item} />
              ))}
            </ul>
          </ResumeSection>
        )}

        {trackProjects.length > 0 && (
          <ResumeSection title="Selected projects">
            <ul className="space-y-6">
              {trackProjects.map((project) => (
                <ProjectEntry key={project.slug} project={project} />
              ))}
            </ul>
            <p className="pt-1 text-sm print:hidden">
              <Link
                to={paths.engineering}
                className="group inline-flex min-h-11 items-center gap-2 text-eng underline-offset-4 hover:underline"
              >
                All engineering case studies
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </p>
          </ResumeSection>
        )}

        {achievements && achievements.length > 0 && (
          <ResumeSection title="Achievements">
            <ul className={`list-disc space-y-2 pl-5 text-[15px] leading-relaxed marker:text-fg-subtle ${muted}`}>
              {achievements.map((achievement) => (
                <li key={achievement} className="print:break-inside-avoid">
                  {achievement}
                </li>
              ))}
            </ul>
          </ResumeSection>
        )}

        {!leadershipFirst && leadershipSection}

        {selectedCreative.length > 0 && (
          <ResumeSection title="Creative work">
            <ul className="space-y-6">
              {selectedCreative.map((project) => (
                <ProjectEntry key={project.slug} project={project} />
              ))}
            </ul>
          </ResumeSection>
        )}

        {interests.length > 0 && (
          <ResumeSection title="Interests">
            <p className={`leading-relaxed ${muted}`}>{interests.join(', ')}</p>
          </ResumeSection>
        )}
      </article>
    </Container>
  );
}

function ResumeSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={`grid gap-4 border-t py-8 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-8 print:py-5 ${rule}`}
    >
      <h2 id={id} className={`eyebrow pt-1 print:break-after-avoid ${subtle}`}>
        {title}
      </h2>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

function ProjectEntry({ project }: { project: Project }) {
  const meta = [project.status && STATUS_LABEL[project.status], project.year].filter(Boolean).join(' · ');
  return (
    <li className="print:break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className={`font-semibold ${ink}`}>
          <Link to={projectPath(project)} className="underline-offset-4 hover:text-eng hover:underline">
            {project.title}
          </Link>
        </h3>
        {meta && <p className={`font-mono text-xs ${subtle}`}>{meta}</p>}
      </div>
      <p className={`mt-1.5 text-[15px] leading-relaxed ${muted}`}>{project.summary}</p>
      {project.tags.length > 0 && (
        <p className={`mt-2 font-mono text-xs ${subtle}`}>
          <span className="sr-only">Technologies: </span>
          {project.tags.join(' · ')}
        </p>
      )}
      {project.links && project.links.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          {project.links.map((link) => {
            const newTab = opensNewTab(link.href);
            const isGithub = link.kind === 'github' || link.href.includes('github.com');
            return (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-1.5 font-mono text-eng underline-offset-4 hover:underline print:text-neutral-800"
                {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {isGithub ? (
                  <Github className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{link.label}</span>
                <span className="hidden font-mono text-xs text-neutral-600 print:inline">
                  {' '}({displayUrl(link.href)})
                </span>
                {newTab && <span className="sr-only"> (opens in a new tab)</span>}
              </a>
            );
          })}
        </div>
      )}
    </li>
  );
}

function LeadershipEntry({ item }: { item: LeadershipExperience }) {
  return (
    <li className="print:break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className={`font-semibold ${ink}`}>
          {item.role}, {item.organisation}
        </h3>
      </div>
      {item.description && <p className={`mt-1.5 text-[15px] leading-relaxed ${muted}`}>{item.description}</p>}
    </li>
  );
}

function ExperienceEntry({ item }: { item: Experience }) {
  const meta = [item.period, item.location].filter(Boolean).join(' · ');
  return (
    <li className="print:break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className={`font-semibold ${ink}`}>
          {item.role}, {item.organisation}
        </h3>
        {meta && <p className={`font-mono text-xs ${subtle}`}>{meta}</p>}
      </div>
      {item.description && <p className={`mt-1.5 text-[15px] leading-relaxed ${muted}`}>{item.description}</p>}
      {item.highlights.length > 0 && (
        <ul className={`mt-2 list-disc space-y-1 pl-5 text-[15px] leading-relaxed marker:text-fg-subtle ${muted}`}>
          {item.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      )}
      {item.technologies.length > 0 && (
        <p className={`mt-2 font-mono text-xs ${subtle}`}>
          <span className="sr-only">Technologies: </span>
          {item.technologies.join(' · ')}
        </p>
      )}
    </li>
  );
}

function EducationEntry({ item }: { item: Education }) {
  const degree = [item.degree, item.field].filter(Boolean).join(', ');
  return (
    <li className="print:break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className={`font-semibold ${ink}`}>{item.institution}</h3>
        {item.period && <p className={`font-mono text-xs ${subtle}`}>{item.period}</p>}
      </div>
      {degree && <p className={`mt-1.5 text-[15px] ${muted}`}>{degree}</p>}
      {item.grade && <p className={`mt-0.5 text-sm ${subtle}`}>{item.grade}</p>}
      {item.highlights && item.highlights.length > 0 && (
        <ul className={`mt-2 list-disc space-y-1 pl-5 text-[15px] leading-relaxed marker:text-fg-subtle ${muted}`}>
          {item.highlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

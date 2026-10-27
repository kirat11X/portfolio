import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import type { EngineeringProject } from '@/types';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ProjectCover } from '@/components/ui/ProjectCover';
import { Breadcrumbs } from '@/components/gallery/Breadcrumbs';
import { BulletList, CaseStudySection, Prose, ResultList, StepList } from '@/components/gallery/CaseStudySection';
import { MediaGallery } from '@/components/gallery/MediaGallery';
import { PipelineDiagram } from '@/components/gallery/PipelineDiagram';
import { ProjectFacts } from '@/components/gallery/ProjectFacts';
import { ProjectGrid } from '@/components/gallery/ProjectGrid';
import { ProjectPager } from '@/components/gallery/ProjectPager';
import { LinkIcon, MetaRow } from '@/components/gallery/ProjectMeta';
import { categoryOf, usableLinks } from '@/components/gallery/projectMeta';
import { getEngineeringProject, getFeatured } from '@/lib/projects';
import { paths } from '@/lib/routes';
import { usePageTitle } from '@/lib/usePageTitle';

export default function EngineeringProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const project = getEngineeringProject(slug);
  usePageTitle(project ? project.title : 'Project not found');

  if (!project) return <ProjectNotFound slug={slug ?? ''} />;
  // Keyed so local state (e.g. an open lightbox) resets when the pager moves to another project.
  return <CaseStudy key={project.slug} project={project} />;
}

interface Chapter {
  id: string;
  title: string;
  content: ReactNode;
}

const clean = (items: string[] | undefined): string[] => (items ?? []).map((item) => item.trim()).filter(Boolean);

/** Case-study chapters in reading order, each present only when its content exists. */
function chaptersFor(project: EngineeringProject): Chapter[] {
  const chapters: Chapter[] = [];
  const overview = project.overview?.trim();
  const problem = project.problem?.trim();
  const contribution = clean(project.contribution);
  const approach = clean(project.approach);
  const pipeline = (project.pipeline ?? []).filter((step) => step.label.trim());
  const results = clean(project.results);
  const learnings = clean(project.learnings);
  const gallery = (project.gallery ?? []).filter((item) => item.src.trim());

  if (overview) chapters.push({ id: 'overview', title: 'Overview', content: <Prose text={overview} /> });
  if (problem) chapters.push({ id: 'problem', title: 'Problem', content: <Prose text={problem} /> });
  if (contribution.length) chapters.push({ id: 'contribution', title: 'My contribution', content: <BulletList items={contribution} /> });
  if (approach.length) chapters.push({ id: 'approach', title: 'Approach', content: <StepList items={approach} /> });
  if (pipeline.length)
    chapters.push({
      id: 'architecture',
      title: 'Architecture',
      content: <PipelineDiagram steps={pipeline} label={`${project.title}: pipeline stages`} />,
    });
  if (results.length) chapters.push({ id: 'results', title: 'Results', content: <ResultList items={results} /> });
  if (learnings.length) chapters.push({ id: 'learnings', title: 'What I learned', content: <BulletList items={learnings} /> });
  if (gallery.length) chapters.push({ id: 'gallery', title: 'Gallery', content: <MediaGallery items={gallery} title={project.title} /> });
  return chapters;
}

function CaseStudy({ project }: { project: EngineeringProject }) {
  const category = categoryOf(project);
  const links = usableLinks(project);
  const chapters = chaptersFor(project);
  const areaPath = `${paths.engineering}?category=${project.category}`;

  return (
    <div className="relative isolate">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-(--nav-h) -z-10 h-[40rem] bg-[radial-gradient(45%_55%_at_85%_10%,rgb(var(--eng-rgb)/0.07),transparent_70%)]"
      />
      <Container>
        <Breadcrumbs
          className="pt-6 sm:pt-8"
          items={[{ label: 'Engineering', to: paths.engineering }, { label: category.label, to: areaPath }, { label: project.title }]}
        />

        <article aria-labelledby="project-title">
          <header className="grid grid-cols-1 gap-10 pb-14 pt-6 sm:pb-16 sm:pt-8 lg:grid-cols-12 lg:items-center lg:gap-12">
            <div className="lg:col-span-6">
              <MetaRow project={project} yearPlacement="inline" showPlaceholder fullCategory />
              <h1 id="project-title" className="mt-6 font-display text-display-md font-semibold text-fg">
                {project.title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-fg-muted sm:text-xl">{project.tagline}</p>
              {links.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {links.map((link, index) => (
                    <Button
                      key={link.href}
                      href={link.href}
                      variant={index === 0 ? 'primary' : 'secondary'}
                      tone="eng"
                      iconLeft={<LinkIcon kind={link.kind} className="h-4 w-4" />}
                    >
                      {link.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="lg:col-span-6">
              <div className="rounded-panel border border-line bg-ink-900 p-2 shadow-panel">
                <ProjectCover project={project} loading="eager" className="rounded-card outline-1 -outline-offset-1 outline-contrast/[0.07]" />
              </div>
            </div>
          </header>

          {project.placeholder && (
            <p className="mb-10 flex items-start gap-3 rounded-card border border-signal/30 bg-signal/[0.06] px-5 py-4 text-sm leading-relaxed text-signal">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              This entry is a placeholder. Its details are still being written and should not be read as a finished project.
            </p>
          )}

          <div className="grid grid-cols-1 gap-x-12 gap-y-14 border-t border-line pt-12 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-x-16">
            {/* Facts come first in reading order (and on phones); on desktop they sit in a sticky right column. */}
            <div className="lg:col-start-2 lg:row-start-1">
              <div className="space-y-6 lg:sticky lg:top-[calc(var(--nav-h)+2rem)]">
                <ProjectFacts project={project} hideLinksBelowLg />
                {chapters.length >= 3 && <OnThisPage chapters={chapters} />}
              </div>
            </div>

            <div className="min-w-0 space-y-16 sm:space-y-20 lg:col-start-1 lg:row-start-1">
              {chapters.map((chapter) => (
                <CaseStudySection key={chapter.id} id={chapter.id} title={chapter.title}>
                  {chapter.content}
                </CaseStudySection>
              ))}
              {project.sourceNote && <SourceNote note={project.sourceNote} />}
            </div>
          </div>
        </article>

        <ProjectPager project={project} className="mb-24 mt-20 sm:mb-32 sm:mt-28" />
      </Container>
    </div>
  );
}

/** Jump links to each chapter; desktop only, where the sidebar has room. */
function OnThisPage({ chapters }: { chapters: Chapter[] }) {
  return (
    <nav aria-label="On this page" className="hidden px-1 lg:block">
      <p aria-hidden="true" className="eyebrow text-fg-subtle">
        On this page
      </p>
      <ul className="mt-2 border-l border-line">
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <a
              href={`#${chapter.id}`}
              className="-ml-px flex min-h-9 items-center border-l border-transparent pl-4 text-sm text-fg-muted transition-colors hover:border-eng/60 hover:text-fg"
            >
              {chapter.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Where the write-up's facts came from — shown quietly, like a footnote. */
function SourceNote({ note }: { note: string }) {
  return (
    <aside aria-labelledby="source-notes-heading" className="border-t border-line pt-6">
      <h2 id="source-notes-heading" className="eyebrow flex items-center gap-2 text-fg-subtle">
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
        Source notes
      </h2>
      <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-fg-subtle">{note}</p>
    </aside>
  );
}

function ProjectNotFound({ slug }: { slug: string }) {
  const suggestions = getFeatured('engineering', 4);
  return (
    <Container>
      <PageHeader
        eyebrow="Engineering"
        tone="eng"
        title="Project not found"
        lede={
          <p>
            There is no engineering project at{' '}
            <code className="break-all rounded-md bg-contrast/[0.05] px-1.5 py-0.5 font-mono text-[0.85em] text-fg">
              /engineering/{slug}
            </code>
            . The link may be mistyped, or the project may have been renamed. Everything published is in the engineering gallery.
          </p>
        }
        actions={
          <Button to={paths.engineering} iconLeft={<ArrowLeft className="h-4 w-4" />}>
            Browse engineering projects
          </Button>
        }
      />
      {suggestions.length > 0 && (
        <section aria-labelledby="suggestions-heading" className="border-t border-line pb-24 pt-12 sm:pb-32">
          <h2 id="suggestions-heading" className="eyebrow text-fg-muted">
            Featured projects
          </h2>
          <ProjectGrid projects={suggestions} variant="compact" label="Featured engineering projects" className="mt-6" />
        </section>
      )}
    </Container>
  );
}

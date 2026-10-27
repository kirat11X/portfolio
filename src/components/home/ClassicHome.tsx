import { ArrowRight, Box, TriangleAlert, X } from 'lucide-react';
import { ProjectCard } from '@/components/gallery/ProjectCard';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { SocialIcon } from '@/components/ui/Icons';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Tag } from '@/components/ui/Tag';
import { creativeCategories } from '@/data/categories';
import { profileData } from '@/data/profile';
import { cn } from '@/lib/cn';
import { getFeatured } from '@/lib/projects';
import { paths } from '@/lib/routes';
import { useViewStore } from '@/lib/viewMode';
import { DistrictMap } from './DistrictMap';
import { SkillGroups } from './SkillGroups';

// The 2D overview of the portfolio: shown when the visitor picks the classic
// view, and as the fallback when WebGL is unavailable or the world fails.
// Everything here is read from the data files.

const featuredEngineering = getFeatured('engineering', 5);
const featuredCreative = getFeatured('creative', 4);

/** Column classes that keep a row of `count` cards free of orphans. */
function gridColumns(count: number): string {
  if (count >= 4) return 'sm:grid-cols-2 lg:grid-cols-4';
  if (count === 3) return 'md:grid-cols-3';
  if (count === 2) return 'sm:grid-cols-2';
  return 'max-w-md';
}

export function ClassicHome() {
  const notice = useViewStore((s) => s.notice);
  const clearNotice = useViewStore((s) => s.clearNotice);

  return (
    <div className="relative overflow-x-clip">
      <Backdrop />
      {notice && (
        <Container className="relative pt-6">
          <Notice message={notice} onDismiss={clearNotice} />
        </Container>
      )}
      <Hero />
      <FeaturedEngineering />
      <CreativeHighlights />
      <Skills />
      <AboutTeaser />
      <ContactCallout />
    </div>
  );
}

function Backdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 -top-(--nav-h) h-[46rem] overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute -top-64 left-[4%] h-[34rem] w-[34rem] rounded-full bg-[rgb(var(--eng-rgb)/0.07)] blur-[120px]" />
      <div className="absolute -top-48 right-[-6%] h-[30rem] w-[30rem] rounded-full bg-[rgb(var(--cre-rgb)/0.07)] blur-[120px]" />
    </div>
  );
}

function Notice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-card border border-signal/30 bg-signal/[0.07] py-1.5 pl-4 pr-1.5 text-sm text-signal"
    >
      <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1 py-2 leading-snug">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notice"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-signal/80 transition-colors duration-200 hover:bg-signal/10 hover:text-signal"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function Hero() {
  const webgl = useViewStore((s) => s.webgl);
  const setMode = useViewStore((s) => s.setMode);
  const { name, title, tagline, status } = profileData;

  const enterWorld = () => {
    window.scrollTo(0, 0);
    setMode('world');
  };

  return (
    <section aria-labelledby="home-title" className="relative">
      <Container className="pb-20 pt-12 sm:pb-24 sm:pt-16 lg:pb-28 lg:pt-20">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <p className="eyebrow flex items-center gap-3 text-fg-muted">
              <span className="h-px w-8 bg-eng" aria-hidden="true" />
              {status}
            </p>
            <h1 id="home-title" className="mt-6">
              <span className="block font-display text-display-xl font-semibold text-fg">{name}</span>
              <span className="sr-only"> — </span>
              <span className="mt-4 block max-w-xl font-display text-display-sm font-medium text-fg-muted">{title}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg-muted">{tagline}</p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button to={paths.engineering} tone="eng" iconRight={<ArrowRight className="h-4 w-4" />}>
                Engineering work
              </Button>
              <Button to={paths.creative} variant="secondary" tone="cre" iconRight={<ArrowRight className="h-4 w-4" />}>
                Creative studio
              </Button>
              <Button to={paths.resume} variant="ghost" tone="neutral">
                Resume
              </Button>
              <Button to={paths.contact} variant="ghost" tone="neutral">
                Contact
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <DistrictCard webgl={webgl} onEnter={enterWorld} />
          </div>
        </div>
      </Container>
    </section>
  );
}

function DistrictCard({ webgl, onEnter }: { webgl: boolean; onEnter: () => void }) {
  return (
    <div className="glass relative rounded-panel p-4 shadow-panel sm:p-6">
      <h2 className="eyebrow px-1 text-fg-muted">{webgl ? 'Explore in 3D' : 'The 3D district'}</h2>
      <DistrictMap className="mx-auto mt-4 max-w-sm" />
      <p className="mt-5 px-1 text-sm leading-relaxed text-fg-muted">
        {webgl
          ? 'This site is also a small night-time district you can drive around: engineering to the west, the creative studio to the east.'
          : 'This site also has an interactive 3D district, but it needs WebGL, which is not available in this browser. Everything it contains is right here.'}
      </p>
      {webgl && (
        <Button onClick={onEnter} iconLeft={<Box className="h-4 w-4" />} className="mt-5 w-full sm:w-auto">
          Enter the 3D world
        </Button>
      )}
    </div>
  );
}

function FeaturedEngineering() {
  const [lead, ...rest] = featuredEngineering;
  if (!lead) return null;

  return (
    <section aria-labelledby="home-engineering" className="border-t border-line py-20 sm:py-24">
      <Container>
        <SectionHeading
          id="home-engineering"
          eyebrow="Engineering"
          tone="eng"
          title="Selected engineering work"
          description="Software, machine learning, computer vision and research projects, each with a short case study."
          action={
            <Button to={paths.engineering} variant="outline" tone="eng" iconRight={<ArrowRight className="h-4 w-4" />}>
              All engineering
            </Button>
          }
        />
        <ProjectCard project={lead} variant="feature" headingLevel="h3" />
        {rest.length === 1 && <ProjectCard project={rest[0]} variant="feature" headingLevel="h3" className="mt-6" />}
        {rest.length > 1 && (
          <div className={cn('mt-6 grid gap-6', gridColumns(rest.length))}>
            {rest.map((project) => (
              <ProjectCard key={project.slug} project={project} headingLevel="h3" />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

function CreativeHighlights() {
  if (featuredCreative.length === 0) return null;
  const curating = featuredCreative.every((project) => project.placeholder);

  return (
    <section aria-labelledby="home-creative" className="border-t border-line py-20 sm:py-24">
      <Container>
        <SectionHeading
          id="home-creative"
          eyebrow="Creative"
          tone="cre"
          title="The creative studio"
          description={
            curating
              ? 'Photography, photo editing, video, motion graphics and design. The studio is being curated: the entries below are labelled placeholders until the original work is added.'
              : 'Photography, photo editing, video, motion graphics and design.'
          }
          action={
            <Button to={paths.creative} variant="outline" tone="cre" iconRight={<ArrowRight className="h-4 w-4" />}>
              Visit the studio
            </Button>
          }
        />
        <ul aria-label="Creative disciplines" className="-mt-4 mb-10 flex flex-wrap gap-2">
          {creativeCategories.map((category) => (
            <li key={category.id}>
              <Tag tone="neutral" casing="plain" size="md">
                {category.label}
              </Tag>
            </li>
          ))}
        </ul>
        {curating ? (
          // Stand-ins stay compact so they never outweigh real work on this page.
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            {featuredCreative.map((project) => (
              <ProjectCard key={project.slug} project={project} variant="compact" headingLevel="h3" />
            ))}
          </div>
        ) : (
          <div className={cn('grid gap-6', gridColumns(featuredCreative.length))}>
            {featuredCreative.map((project) => (
              <ProjectCard key={project.slug} project={project} headingLevel="h3" />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

function Skills() {
  if (profileData.skillGroups.length === 0) return null;
  return (
    <section aria-labelledby="home-skills" className="border-t border-line py-20 sm:py-24">
      <Container>
        <SectionHeading id="home-skills" eyebrow="Skills" title="What I work on" />
        <SkillGroups />
      </Container>
    </section>
  );
}

function AboutTeaser() {
  const [intro] = profileData.bio;
  if (!intro) return null;
  return (
    <section aria-labelledby="home-about" className="border-t border-line py-20 sm:py-24">
      <Container>
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <p className="eyebrow text-fg-muted">About</p>
            <h2 id="home-about" className="mt-3 font-display text-display-md font-semibold text-fg">
              A little about me
            </h2>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <p className="text-xl leading-relaxed text-fg sm:text-2xl sm:leading-relaxed">{intro}</p>
            <Button
              to={paths.about}
              variant="ghost"
              tone="neutral"
              className="-ml-5 mt-6"
              iconRight={<ArrowRight className="h-4 w-4" />}
            >
              More about me
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}

function ContactCallout() {
  const [primarySocial] = profileData.socials;
  return (
    <section aria-labelledby="home-contact" className="pb-24 sm:pb-28">
      <Container>
        <div className="relative overflow-hidden rounded-panel border border-line bg-ink-900/60 px-6 py-12 shadow-panel sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-[rgb(var(--eng-rgb)/0.08)] blur-3xl" />
            <div className="absolute -bottom-40 right-1/4 h-80 w-80 rounded-full bg-[rgb(var(--cre-rgb)/0.07)] blur-3xl" />
          </div>
          <div className="relative max-w-2xl">
            <p className="eyebrow text-eng">Contact</p>
            <h2 id="home-contact" className="mt-3 font-display text-display-md font-semibold text-fg">
              Let’s work on something together.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-fg-muted">
              I’m open to collaborating on software, machine learning and computer vision projects, and on
              photography, video and design work.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to={paths.contact} iconRight={<ArrowRight className="h-4 w-4" />}>
                Get in touch
              </Button>
              {primarySocial && (
                <Button
                  href={primarySocial.href}
                  variant="secondary"
                  tone="neutral"
                  iconLeft={<SocialIcon kind={primarySocial.kind} className="h-4 w-4" />}
                >
                  {primarySocial.label}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

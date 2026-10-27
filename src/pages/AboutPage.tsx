import { ArrowRight, FileText } from 'lucide-react';
import type { Education, Experience } from '@/types';
import { SkillGroups } from '@/components/home/SkillGroups';
import { SocialLinks } from '@/components/home/SocialLinks';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Tag } from '@/components/ui/Tag';
import { profileData } from '@/data/profile';
import { paths } from '@/lib/routes';
import { usePageTitle } from '@/lib/usePageTitle';

export default function AboutPage() {
  usePageTitle('About');
  const { name, bio, status, location, interests, skillGroups, education, experience, socials } = profileData;
  const [intro, ...story] = bio;

  return (
    <Container>
      <PageHeader eyebrow="About" title={`Hi, I’m ${name}.`} lede={intro} />

      <div className="grid gap-12 border-t border-line pb-20 pt-12 lg:grid-cols-12 lg:gap-16 lg:pt-16">
        <div className="space-y-12 lg:col-span-7">
          {story.length > 0 && (
            <section aria-labelledby="about-background">
              <h2 id="about-background" className="eyebrow text-fg-subtle">
                Background
              </h2>
              <div className="mt-5 space-y-5 text-lg leading-relaxed text-fg-muted">
                {story.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          )}

          {interests.length > 0 && (
            <section aria-labelledby="about-interests">
              <h2 id="about-interests" className="eyebrow text-fg-subtle">
                Interests
              </h2>
              <ul className="mt-5 flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <li key={interest}>
                    <Tag tone="neutral" casing="plain" size="md">
                      {interest}
                    </Tag>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section aria-labelledby="about-glance" className="lg:col-span-4 lg:col-start-9">
          <div className="rounded-card border border-line bg-ink-900/50 p-6 sm:p-7">
            <h2 id="about-glance" className="eyebrow text-fg-subtle">
              At a glance
            </h2>
            <dl className="mt-5 space-y-5">
              <div>
                <dt className="text-sm text-fg-subtle">Status</dt>
                <dd className="mt-1 text-fg">{status}</dd>
              </div>
              {location && (
                <div>
                  <dt className="text-sm text-fg-subtle">Based in</dt>
                  <dd className="mt-1 text-fg">{location}</dd>
                </div>
              )}
              {socials.length > 0 && (
                <div>
                  <dt className="text-sm text-fg-subtle">Elsewhere</dt>
                  <dd className="mt-0.5">
                    <SocialLinks variant="plain" />
                  </dd>
                </div>
              )}
            </dl>
            <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-6">
              <Button to={paths.resume} iconLeft={<FileText className="h-4 w-4" />}>
                Resume
              </Button>
              <Button to={paths.contact} variant="secondary" tone="neutral">
                Contact
              </Button>
            </div>
          </div>
        </section>
      </div>

      {skillGroups.length > 0 && (
        <section aria-labelledby="about-skills" className="border-t border-line py-20">
          <SectionHeading
            id="about-skills"
            eyebrow="Skills"
            title="What I work on"
            description="Grouped by practice. Each project page lists the specific tools it used."
          />
          <SkillGroups />
        </section>
      )}

      {experience.length > 0 && (
        <section aria-labelledby="about-experience" className="border-t border-line py-20">
          <SectionHeading id="about-experience" eyebrow="Experience" title="Where I’ve worked" />
          <ol className="space-y-4">
            {experience.map((item) => (
              <ExperienceItem key={`${item.organisation}:${item.role}:${item.period}`} item={item} />
            ))}
          </ol>
        </section>
      )}

      {education.length > 0 && (
        <section aria-labelledby="about-education" className="border-t border-line py-20">
          <SectionHeading id="about-education" eyebrow="Education" title="Where I’ve studied" />
          <ol className="space-y-4">
            {education.map((item) => (
              <EducationItem key={`${item.institution}:${item.degree}:${item.period}`} item={item} />
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="about-next" className="border-t border-line pb-24 pt-16 sm:pb-28">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 id="about-next" className="font-display text-display-sm font-semibold text-fg">
              Want the short version?
            </h2>
            <p className="mt-3 leading-relaxed text-fg-muted">The resume puts skills and selected projects on one page.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button to={paths.resume} iconRight={<ArrowRight className="h-4 w-4" />}>
              Read the resume
            </Button>
            <Button to={paths.contact} variant="secondary" tone="neutral">
              Get in touch
            </Button>
          </div>
        </div>
      </section>
    </Container>
  );
}

function ExperienceItem({ item }: { item: Experience }) {
  const meta = [item.period, item.location].filter(Boolean).join(' · ');
  return (
    <li className="rounded-card border border-line bg-ink-900/50 p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-lg font-semibold text-fg">
          {item.role} <span className="font-normal text-fg-muted">· {item.organisation}</span>
        </h3>
        {meta && <p className="font-mono text-xs text-fg-subtle">{meta}</p>}
      </div>
      {item.description && <p className="mt-3 leading-relaxed text-fg-muted">{item.description}</p>}
      {item.highlights.length > 0 && (
        <ul className="mt-4 space-y-2">
          {item.highlights.map((highlight) => (
            <li key={highlight} className="flex items-start gap-3 text-[15px] leading-relaxed text-fg-muted">
              <span className="mt-[0.7em] h-1 w-1 shrink-0 rounded-full bg-eng" aria-hidden="true" />
              {highlight}
            </li>
          ))}
        </ul>
      )}
      {item.technologies.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Technologies">
          {item.technologies.map((technology) => (
            <li key={technology}>
              <Tag casing="plain">{technology}</Tag>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function EducationItem({ item }: { item: Education }) {
  const degree = [item.degree, item.field].filter(Boolean).join(', ');
  return (
    <li className="rounded-card border border-line bg-ink-900/50 p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-lg font-semibold text-fg">{item.institution}</h3>
        {item.period && <p className="font-mono text-xs text-fg-subtle">{item.period}</p>}
      </div>
      {degree && <p className="mt-2 text-fg-muted">{degree}</p>}
      {item.grade && <p className="mt-1 text-sm text-fg-subtle">{item.grade}</p>}
      {item.highlights && item.highlights.length > 0 && (
        <ul className="mt-4 space-y-2">
          {item.highlights.map((highlight) => (
            <li key={highlight} className="flex items-start gap-3 text-[15px] leading-relaxed text-fg-muted">
              <span className="mt-[0.7em] h-1 w-1 shrink-0 rounded-full bg-eng" aria-hidden="true" />
              {highlight}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

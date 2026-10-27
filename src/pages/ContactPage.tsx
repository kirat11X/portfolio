import { ArrowUpRight } from 'lucide-react';
import type { SocialLink } from '@/types';
import { displayUrl, opensNewTab } from '@/components/home/links';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { SocialIcon } from '@/components/ui/Icons';
import { PageHeader } from '@/components/ui/PageHeader';
import { profileData } from '@/data/profile';
import { paths } from '@/lib/routes';
import { usePageTitle } from '@/lib/usePageTitle';

// Contact channels come only from profile.socials, so an email address or a
// LinkedIn profile appears here only once it is published there. No form.

const BLURB: Partial<Record<SocialLink['kind'], string>> = {
  email: 'Write to me directly.',
  github: 'Repositories and code.',
  linkedin: 'Professional profile.',
  instagram: 'Photography and visual work.',
  behance: 'Design projects.',
  dribbble: 'Design work.',
};

/** Email first when one is published; otherwise the order in the profile. */
const channels = [...profileData.socials].sort(
  (a, b) => Number(b.kind === 'email') - Number(a.kind === 'email'),
);

export default function ContactPage() {
  usePageTitle('Contact');

  return (
    <Container>
      <PageHeader
        eyebrow="Contact"
        title="Let’s talk."
        lede="I’m happy to hear about collaborations: software, machine learning and computer vision projects, or photography, video and design work."
      />

      {channels.length > 0 && (
        <section aria-labelledby="contact-channels" className="border-t border-line pb-16 pt-12">
          <h2 id="contact-channels" className="eyebrow text-fg-subtle">
            Where to reach me
          </h2>
          <ul className="mt-6 grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-4">
            {channels.map((channel) => (
              <li key={channel.href}>
                <ChannelCard channel={channel} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="contact-context" className="border-t border-line pb-24 pt-12 sm:pb-28">
        <div className="grid gap-6 md:grid-cols-12 md:gap-10">
          <h2
            id="contact-context"
            className="font-display text-display-sm font-semibold text-fg md:col-span-5"
          >
            Want some context first?
          </h2>
          <div className="md:col-span-7">
            <p className="leading-relaxed text-fg-muted">
              The resume is a one-page overview, and each engineering project has a short case study.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button to={paths.resume} variant="secondary" tone="neutral">
                Resume
              </Button>
              <Button to={paths.engineering} variant="outline" tone="eng">
                Engineering
              </Button>
              <Button to={paths.creative} variant="outline" tone="cre">
                Creative
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Container>
  );
}

function ChannelCard({ channel }: { channel: SocialLink }) {
  const newTab = opensNewTab(channel.href);
  const blurb = BLURB[channel.kind];

  return (
    <a
      href={channel.href}
      className="group flex items-center gap-5 rounded-card border border-line bg-ink-900/50 p-5 transition-[border-color,background-color] duration-300 ease-out-expo hover:border-eng/40 hover:bg-ink-900 sm:gap-6 sm:p-7"
      {...(newTab ? { target: '_blank', rel: 'me noopener noreferrer' } : {})}
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-line bg-ink-850 text-fg transition-colors duration-300 group-hover:border-eng/40 group-hover:text-eng sm:h-16 sm:w-16">
        <SocialIcon kind={channel.kind} className="h-6 w-6 sm:h-7 sm:w-7" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-semibold text-fg sm:text-2xl">{channel.label}</span>
        <span className="mt-1 block truncate font-mono text-sm text-fg-muted">{displayUrl(channel.href)}</span>
        {blurb && <span className="mt-2 block text-sm text-fg-subtle">{blurb}</span>}
      </span>
      <ArrowUpRight
        className="h-5 w-5 shrink-0 self-start text-fg-subtle transition-[color,translate] duration-300 ease-out-expo group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-eng sm:h-6 sm:w-6"
        aria-hidden="true"
      />
      {newTab && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

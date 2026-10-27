import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { SocialLinks } from '@/components/home/SocialLinks';
import { Wordmark } from '@/components/home/Wordmark';
import { Container } from '@/components/ui/Container';
import { navItems } from '@/data/navigation';
import { profileData } from '@/data/profile';
import { getReducedMotion } from '@/lib/motion';
import { paths } from '@/lib/routes';

// Computed once per page load, not during render.
const YEAR = new Date().getFullYear();

/** Scrolls to the top (smoothly unless motion is reduced) and moves focus to the main content. */
function backToTop(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: getReducedMotion() ? 'auto' : 'smooth' });
  document.getElementById('main')?.focus({ preventScroll: true });
}

export function Footer() {
  const { name, tagline, status, socials } = profileData;

  return (
    <footer className="border-t border-line print:hidden">
      <Container className="pb-6 pt-14 sm:pt-16">
        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-6">
            <Link to={paths.home} aria-label={`${name}, home`} className="inline-flex h-11 items-center rounded-md">
              <Wordmark />
            </Link>
            <p className="mt-3 max-w-sm text-base leading-relaxed text-fg-muted">{tagline}</p>
            <p className="mt-1.5 text-sm text-fg-subtle">{status}</p>
          </div>

          <nav aria-label="Footer" className="lg:col-span-3">
            <h2 className="eyebrow text-fg-subtle">Pages</h2>
            <ul className="mt-2 grid grid-flow-col grid-cols-2 grid-rows-3 gap-x-6">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="inline-flex min-h-11 items-center text-sm text-fg-muted transition-colors duration-200 hover:text-fg"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {socials.length > 0 && (
            <div className="lg:col-span-3">
              <h2 className="eyebrow text-fg-subtle">Elsewhere</h2>
              <SocialLinks variant="plain" className="mt-2" />
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col-reverse gap-2 border-t border-line pt-3 text-[13px] text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p className="py-2">
            © {YEAR} {name} · Built with React &amp; Three.js
          </p>
          <a
            href="#main"
            onClick={backToTop}
            className="group inline-flex min-h-11 items-center gap-2 self-start text-fg-muted transition-colors duration-200 hover:text-fg sm:self-auto"
          >
            Back to top
            <ArrowUp
              className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </a>
        </div>
      </Container>
    </footer>
  );
}

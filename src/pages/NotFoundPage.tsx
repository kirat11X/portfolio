import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Box } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { navItems } from '@/data/navigation';
import { paths } from '@/lib/routes';
import { usePageTitle } from '@/lib/usePageTitle';
import { useViewStore } from '@/lib/viewMode';

const PRIMARY_PATHS = new Set<string>([paths.home, paths.engineering, paths.creative]);
const otherPages = navItems.filter((item) => !PRIMARY_PATHS.has(item.path));

export default function NotFoundPage() {
  usePageTitle('Page not found');
  const { pathname } = useLocation();
  const webgl = useViewStore((s) => s.webgl);
  const setMode = useViewStore((s) => s.setMode);

  return (
    <Container className="pb-24 sm:pb-28">
      <PageHeader
        eyebrow="404 · Page not found"
        title="Dead end."
        lede={
          <>
            There’s no page at{' '}
            <code className="break-all rounded-md bg-contrast/[0.06] px-1.5 py-0.5 font-mono text-[0.88em] text-fg">
              {pathname}
            </code>
            . It may have moved, or the address may have a typo.
          </>
        }
        actions={
          <>
            {webgl && (
              <Link to={paths.home} onClick={() => setMode('world')} className={buttonClasses({ size: 'lg' })}>
                <span className="-ml-0.5 flex shrink-0" aria-hidden="true">
                  <Box className="h-4 w-4" />
                </span>
                <span>Back to the district</span>
              </Link>
            )}
            <Button to={paths.home} variant={webgl ? 'secondary' : 'primary'} tone="neutral" size="lg">
              Home
            </Button>
            <Button to={paths.engineering} variant="outline" tone="eng" size="lg">
              Engineering
            </Button>
            <Button to={paths.creative} variant="outline" tone="cre" size="lg">
              Creative
            </Button>
          </>
        }
      />

      {otherPages.length > 0 && (
        <nav aria-label="Other pages" className="border-t border-line pt-8">
          <p className="eyebrow text-fg-subtle">Or try</p>
          <ul className="mt-2 flex flex-wrap gap-x-8">
            {otherPages.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className="group inline-flex min-h-11 items-center gap-2 text-fg-muted transition-colors duration-200 hover:text-fg"
                >
                  {item.label}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </Container>
  );
}

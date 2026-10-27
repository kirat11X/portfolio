import { Suspense, useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { forceDarkDocument, syncTheme } from '@/lib/theme';
import { useViewStore } from '@/lib/viewMode';
import { SkipLink } from '@/components/ui/SkipLink';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ScrollToTop } from './ScrollToTop';
import { PageFallback } from './PageFallback';
import { WorldHost } from './WorldHost';

export function Layout() {
  const { pathname } = useLocation();
  const mode = useViewStore((s) => s.mode);
  const worldVisible = pathname === '/' && mode === 'world';

  // The 3D world is always night: while it fills the screen the whole document
  // (navbar overlay, mobile menu, browser chrome) is dark, whatever the theme.
  useLayoutEffect(() => (worldVisible ? forceDarkDocument() : undefined), [worldVisible]);
  useLayoutEffect(syncTheme, []);

  return (
    <div className="relative min-h-dvh">
      <SkipLink />
      <ScrollToTop />
      <Navbar overlay={worldVisible} />
      <WorldHost visible={worldVisible} />
      <main id="main" tabIndex={-1} className={worldVisible ? 'relative outline-none' : 'relative pt-(--nav-h) outline-none'}>
        <Suspense fallback={worldVisible ? null : <PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      {!worldVisible && <Footer />}
    </div>
  );
}

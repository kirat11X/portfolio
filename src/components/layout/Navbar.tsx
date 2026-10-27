import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Wordmark } from '@/components/home/Wordmark';
import { buttonClasses } from '@/components/ui/buttonStyles';
import { navItems } from '@/data/navigation';
import { profileData } from '@/data/profile';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';
import { MobileMenu, type MenuCloseReason } from './MobileMenu';
import { ThemeMenu } from './ThemeToggle';

export interface NavbarProps {
  /** True over the full-screen 3D world: transparent, no layout offset. */
  overlay?: boolean;
}

const MENU_ID = 'site-menu';
/** The navigation item shown as a call-to-action pill on wide screens. */
const CTA_PATH = paths.contact;
/** Scroll distance (px) after which the bar gains its glass background. */
const SCROLL_THRESHOLD = 8;

const linkItems = navItems.filter((item) => item.path !== CTA_PATH);
const ctaItem = navItems.find((item) => item.path === CTA_PATH);

function subscribeToScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
}
const readScrolled = () => window.scrollY > SCROLL_THRESHOLD;
const readScrolledOnServer = () => false;

function desktopLinkClasses(isActive: boolean, path: string) {
  return cn(
    'relative inline-flex h-11 items-center rounded-full px-3 text-[13.5px] font-medium transition-colors duration-200 lg:px-3.5',
    // Active indicator: a short accent bar under the label (violet for Creative, cyan elsewhere).
    'after:absolute after:bottom-1.5 after:left-1/2 after:h-0.5 after:w-4 after:-translate-x-1/2 after:rounded-full after:transition-transform after:duration-300 after:ease-out-expo',
    path === paths.creative ? 'after:bg-cre' : 'after:bg-eng',
    isActive ? 'text-fg after:scale-x-100' : 'text-fg-muted after:scale-x-0 hover:text-fg',
  );
}

function MenuGlyph({ open }: { open: boolean }) {
  const bar = 'absolute left-0 top-1/2 -mt-px h-0.5 w-full rounded-full bg-current transition-transform duration-300 ease-out-expo';
  return (
    <span className="relative block h-3.5 w-[18px]" aria-hidden="true">
      <span className={cn(bar, open ? 'rotate-45' : '-translate-y-[4px]')} />
      <span className={cn(bar, open ? '-rotate-45' : 'translate-y-[4px]')} />
    </span>
  );
}

export function Navbar({ overlay = false }: NavbarProps) {
  const { pathname } = useLocation();
  const scrolled = useSyncExternalStore(subscribeToScroll, readScrolled, readScrolledOnServer);

  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const closeReason = useRef<MenuCloseReason>('dismiss');
  const wasOpen = useRef(false);

  // Any route change (a menu link, the browser's back button…) closes the menu.
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    if (open) setOpen(false);
  }

  const openMenu = () => {
    closeReason.current = 'dismiss';
    setOpen(true);
  };

  const closeMenu = useCallback((reason: MenuCloseReason) => {
    closeReason.current = reason;
    setOpen(false);
  }, []);

  // When the menu closes, put focus somewhere sensible: on the new page after a
  // link was chosen, otherwise back on the toggle.
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    const target = closeReason.current === 'navigate' ? document.getElementById('main') : toggleRef.current;
    target?.focus({ preventScroll: true });
  }, [open]);

  const glassy = !overlay && scrolled && !open;

  return (
    <>
      <header
        ref={headerRef}
        className={cn(
          'fixed inset-x-0 top-0 z-50 h-(--nav-h) border-b print:hidden',
          'transition-[background-color,border-color,backdrop-filter] duration-300 ease-out-expo',
          // Over the 3D world only the controls themselves catch the pointer.
          overlay && 'pointer-events-none',
          // `glass` sets a border on every side; `!` keeps only the bottom hairline.
          glassy ? 'glass border-x-0! border-t-0!' : 'border-transparent',
        )}
      >
        {overlay && !open && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[calc(var(--nav-h)+2.5rem)] bg-linear-to-b from-void/80 via-void/40 to-transparent"
          />
        )}

        <div className="relative mx-auto grid h-full max-w-7xl grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to={paths.home}
            aria-label={`${profileData.name}, home`}
            className="pointer-events-auto inline-flex h-11 items-center justify-self-start rounded-md"
          >
            <Wordmark />
          </Link>

          <nav aria-label="Primary" className="hidden md:col-span-2 md:grid md:grid-cols-subgrid md:items-center">
            <ul className="pointer-events-auto flex items-center gap-0.5">
              {linkItems.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === paths.home}
                    className={({ isActive }) => desktopLinkClasses(isActive, item.path)}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="pointer-events-auto flex items-center gap-1.5 justify-self-end">
              {/* The 3D world is always night, so the theme control only shows on the site pages. */}
              <ThemeMenu className={overlay ? 'pointer-events-auto' : undefined} note={overlay ? 'Applies to the site pages — the 3D district always stays at night.' : undefined} />
              {ctaItem && (
                <NavLink
                  to={ctaItem.path}
                  className={({ isActive }) =>
                    cn(
                      buttonClasses({ variant: 'secondary', tone: 'neutral', size: 'sm' }),
                      // 36 px pill with a 44 px hit area.
                      "relative before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']",
                      isActive && 'border-eng/50! text-fg',
                    )
                  }
                >
                  <span>{ctaItem.label}</span>
                  <ArrowRight className="-mr-0.5 h-3.5 w-3.5" aria-hidden="true" />
                </NavLink>
              )}
            </div>
          </nav>

          <button
            ref={toggleRef}
            type="button"
            className={cn(
              'pointer-events-auto col-start-2 inline-flex h-11 w-11 items-center justify-center justify-self-end rounded-full text-fg transition-colors duration-200 md:hidden',
              open ? 'border border-line-strong bg-contrast/[0.06]' : 'glass hover:border-line-strong',
            )}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls={MENU_ID}
            aria-haspopup="dialog"
            onClick={() => (open ? closeMenu('dismiss') : openMenu())}
          >
            <MenuGlyph open={open} />
          </button>
        </div>
      </header>

      <MobileMenu id={MENU_ID} open={open} overWorld={overlay} headerRef={headerRef} onClose={closeMenu} />
    </>
  );
}

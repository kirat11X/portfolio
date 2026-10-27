import { useEffect, useRef, type RefObject } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, Download } from 'lucide-react';
import { SocialLinks } from '@/components/home/SocialLinks';
import { navItems } from '@/data/navigation';
import { profileData } from '@/data/profile';
import { cn } from '@/lib/cn';
import { paths } from '@/lib/routes';
import { ThemeSwitch } from './ThemeToggle';

/** "navigate": a link in the menu was chosen. "dismiss": Escape, the toggle, or the layout changed. */
export type MenuCloseReason = 'dismiss' | 'navigate';

interface MobileMenuProps {
  id: string;
  open: boolean;
  /** Opened over the always-dark 3D world (the theme then applies to the other pages only). */
  overWorld?: boolean;
  /**
   * The fixed site header. It stays above the sheet, so its controls (brand,
   * the "Close menu" toggle) remain usable and are part of the focus loop.
   */
  headerRef: RefObject<HTMLElement | null>;
  onClose: (reason: MenuCloseReason) => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
/** Tailwind's `md` breakpoint. The sheet is hidden from here up, so it must close. */
const DESKTOP_QUERY = '(min-width: 48rem)';

function focusableIn(...roots: Array<HTMLElement | null>): HTMLElement[] {
  return roots.flatMap((root) =>
    root
      ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((node) => node.getClientRects().length > 0)
      : [],
  );
}

/**
 * Full-screen navigation sheet for small screens. It sits just below the fixed
 * header (z-40 vs z-50) so the header's toggle doubles as the close button.
 *
 * While open: the rest of the page is `inert` and page scroll is locked, focus
 * moves into the sheet and loops through header + sheet, and Escape closes it.
 * It is a labelled dialog without `aria-modal`, because the close control lives
 * in the header; `inert` provides the modality instead.
 */
export function MobileMenu({ id, open, overWorld = false, headerRef, onClose }: MobileMenuProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = `${id}-title`;
  const themeLabelId = `${id}-theme`;
  const hasResumes = profileData.resumes.length > 0;
  const hasExtras = profileData.socials.length > 0 || hasResumes;

  useEffect(() => {
    const sheet = sheetRef.current;
    const header = headerRef.current;
    if (!open || !sheet || !header) return;

    // Lock page scroll on <body>, so it never fights the 3D world's lock on <html>.
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    // Everything except the header and this sheet becomes inert.
    const inerted = Array.from(header.parentElement?.children ?? []).filter(
      (node) => node !== header && node !== sheet && !node.hasAttribute('inert'),
    );
    for (const node of inerted) node.setAttribute('inert', '');

    focusableIn(sheet)[0]?.focus({ preventScroll: true });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose('dismiss');
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusableIn(header, sheet);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const inside = active !== null && nodes.includes(active);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) onClose('dismiss');
    };
    desktop.addEventListener('change', onBreakpoint);

    return () => {
      body.style.overflow = previousOverflow;
      for (const node of inerted) node.removeAttribute('inert');
      document.removeEventListener('keydown', onKeyDown);
      desktop.removeEventListener('change', onBreakpoint);
    };
  }, [open, headerRef, onClose]);

  return (
    <div
      ref={sheetRef}
      id={id}
      role="dialog"
      aria-labelledby={titleId}
      className={cn(
        'fixed inset-0 z-40 flex flex-col bg-ink-950 pt-(--nav-h) md:hidden print:hidden',
        // Opening shows the sheet at once (so focus can move in); closing fades, then hides.
        open
          ? 'visible opacity-100 transition-opacity duration-300 ease-out-expo'
          : 'invisible opacity-0 transition-[opacity,visibility] duration-200',
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 -top-24 h-96 w-96 rounded-full bg-[rgb(var(--eng-rgb)/0.07)] blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[26rem] w-[26rem] rounded-full bg-[rgb(var(--cre-rgb)/0.07)] blur-3xl" />
      </div>

      <div
        className={cn(
          'relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6',
          'transition-transform duration-300 ease-out-expo',
          open ? 'translate-y-0' : '-translate-y-2',
        )}
      >
        <h2 id={titleId} className="eyebrow mt-5 text-fg-subtle">
          Menu
        </h2>

        <nav aria-label="Primary" className="mt-3">
          <ul className="border-t border-line">
            {navItems.map((item) => (
              <li key={item.path} className="border-b border-line">
                <NavLink
                  to={item.path}
                  end={item.path === paths.home}
                  // The description is a description, not part of the link's name.
                  aria-describedby={item.description ? `${id}-desc-${item.path.replace(/\W/g, '') || 'home'}` : undefined}
                  onClick={() => onClose('navigate')}
                  className="group relative flex min-h-16 items-center gap-4 py-3.5 pl-4 pr-1"
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-full',
                          isActive ? (item.path === paths.creative ? 'bg-cre' : 'bg-eng') : 'bg-transparent',
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block text-[1.375rem] font-semibold leading-tight tracking-tight transition-colors',
                            isActive ? 'text-fg' : 'text-fg/85 group-hover:text-fg',
                          )}
                        >
                          {item.label}
                        </span>
                        {item.description && (
                          <span
                            id={`${id}-desc-${item.path.replace(/\W/g, '') || 'home'}`}
                            aria-hidden="true"
                            className="mt-1 block text-sm leading-snug text-fg-subtle"
                          >
                            {item.description}
                          </span>
                        )}
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="h-5 w-5 shrink-0 text-fg-subtle transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-fg"
                      />
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8">
          <p id={themeLabelId} className="eyebrow text-fg-subtle">
            Theme
          </p>
          <ThemeSwitch labelledBy={themeLabelId} className="mt-3" />
          {overWorld && <p className="mt-2 text-sm text-fg-subtle">Applies to the site pages. The 3D district is always at night.</p>}
        </div>

        {hasExtras && (
          <div className="mt-auto pt-10">
            <p className="eyebrow text-fg-subtle">Elsewhere</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SocialLinks />
              {hasResumes && (
                <Link
                  to={paths.resume}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-contrast/[0.02] px-4 text-sm text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Resumes ({profileData.resumes.length} versions)
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

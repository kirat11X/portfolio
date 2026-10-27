// Facts about the app under test, read from its own data modules so the suite
// follows the content as it grows (no hard-coded slugs or labels).

import { expect, type Page } from '@playwright/test';
import { navItems } from '@/data/navigation';
import { profileData } from '@/data/profile';
import { getAdjacent, sortedCreative, sortedEngineering } from '@/lib/projects';
import { paths, projectPath } from '@/lib/routes';

export { navItems, paths, projectPath, profileData, sortedCreative, sortedEngineering, getAdjacent };

export const SITE_NAME = profileData.name;
/** Mirrors usePageTitle(): "<page> · <name>", or the site title on the home page. */
export const HOME_TITLE = `${profileData.name} — Engineering & Creative Portfolio`;
export const pageTitle = (page: string) => `${page} · ${profileData.name}`;

export const firstEngineering = sortedEngineering[0];
export const firstCreative = sortedCreative[0];

export type RouteKind = 'home' | 'page' | 'project' | 'missing';

export interface RouteCase {
  label: string;
  path: string;
  kind: RouteKind;
}

export const ROUTES: RouteCase[] = [
  { label: 'home', path: paths.home, kind: 'home' },
  { label: 'engineering gallery', path: paths.engineering, kind: 'page' },
  { label: 'engineering case study', path: projectPath(firstEngineering), kind: 'project' },
  { label: 'creative gallery', path: paths.creative, kind: 'page' },
  { label: 'creative piece', path: projectPath(firstCreative), kind: 'project' },
  { label: 'about', path: paths.about, kind: 'page' },
  { label: 'résumé', path: paths.resume, kind: 'page' },
  { label: 'contact', path: paths.contact, kind: 'page' },
  { label: 'unknown route', path: '/does-not-exist', kind: 'missing' },
];

/** Inner routes only: no WebGL world, cheap to load. */
export const INNER_ROUTES = ROUTES.filter((route) => route.kind !== 'home');

/** Navigates and waits until the route's lazy page chunk has rendered. */
export async function gotoRoute(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForPage(page);
}

/** The page fallback ("Loading page") is gone and the page's h1 exists. */
export async function waitForPage(page: Page): Promise<void> {
  await expect(page.locator('h1').first()).toBeAttached({ timeout: 60_000 });
  await expect(page.getByText('Loading page', { exact: true })).toHaveCount(0, { timeout: 60_000 });
}

/** Current pathname of the page. */
export function pathname(page: Page): string {
  return new URL(page.url()).pathname;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Accessible-name matcher for a link whose name starts with `label` (menu links also carry a description). */
export const startsWithName = (label: string) => new RegExp(`^${escapeRegExp(label)}(\\s|$)`);

/**
 * Follows a site-navigation link by its label: through the desktop Primary nav,
 * or — on narrow screens, where it is hidden — through the mobile menu.
 */
export async function navigateTo(page: Page, label: string): Promise<void> {
  const toggle = page.getByRole('button', { name: 'Open menu', exact: true });
  if (await toggle.isVisible()) {
    await toggle.click();
    await page.getByRole('dialog').getByRole('link', { name: startsWithName(label) }).click();
  } else {
    await page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('link', { name: label, exact: true }).click();
  }
}

/** A project's link inside a results list (grid cards / masonry tiles), excluding spotlights and heroes. */
export function resultLink(page: Page, path: string) {
  return page.locator(`main :is(li, [role="listitem"]) a[href="${path}"]`);
}

/**
 * Lets late requests and errors surface before a route is judged: inner pages
 * wait for network idle; the home page waits for the world's loader to finish
 * (network idle is meaningless while the 3D world streams in).
 */
export async function settle(page: Page, kind: RouteKind): Promise<void> {
  if (kind === 'home') {
    const enter = page.getByRole('button', { name: 'Enter the district', exact: true });
    const classic = page.getByRole('button', { name: 'Enter the 3D world', exact: true });
    await expect(enter.or(classic)).toBeVisible({ timeout: 150_000 });
    return;
  }
  await page.waitForLoadState('networkidle', { timeout: 90_000 });
}

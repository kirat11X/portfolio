// Every route renders its page: one h1, a document title, and no uncaught
// errors, console errors or failed same-origin requests (diagnostics fixture).

import { test, expect } from './support/test';
import { HOME_TITLE, ROUTES, SITE_NAME, firstCreative, firstEngineering, gotoRoute, pageTitle, settle } from './support/app';

const expectedTitle = (path: string, kind: string): string | RegExp => {
  if (kind === 'home') return HOME_TITLE;
  if (kind === 'missing') return pageTitle('Page not found');
  if (path.endsWith(`/${firstEngineering.slug}`)) return pageTitle(firstEngineering.title);
  if (path.endsWith(`/${firstCreative.slug}`)) return pageTitle(firstCreative.title);
  return new RegExp(`\\S.* · ${SITE_NAME}$`);
};

test.describe('routes render', () => {
  for (const route of ROUTES) {
    test(`${route.label} — ${route.path}`, { tag: '@mobile' }, async ({ page }) => {
      await gotoRoute(page, route.path);
      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
      await expect(h1).not.toHaveText(/^\s*$/);
      await expect(page).toHaveTitle(expectedTitle(route.path, route.kind));
      // Let late requests (images, lazy chunks, the world) settle so diagnostics see their failures.
      if (route.kind === 'home') test.setTimeout(240_000);
      await settle(page, route.kind);
    });
  }
});

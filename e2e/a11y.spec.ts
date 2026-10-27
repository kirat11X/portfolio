import { test, expect } from './support/test';
import { INNER_ROUTES, ROUTES, gotoRoute, paths, settle } from './support/app';
import { structuralProblems } from './support/audit';
import { pending } from './support/pending';

test.describe('structure on every route', () => {
  for (const route of ROUTES) {
    test(`${route.label} — ${route.path}`, { tag: '@mobile' }, async ({ page }) => {
      await gotoRoute(page, route.path);
      if (route.kind === 'home') test.setTimeout(240_000);
      await settle(page, route.kind);
      expect(await structuralProblems(page)).toEqual([]);
    });
  }
});

test.describe('skip link', () => {
  for (const path of [paths.about, paths.home]) {
    test(`"Skip to content" is the first tab stop and focuses #main — ${path}`, async ({ page }) => {
      await gotoRoute(page, path);
      await page.keyboard.press('Tab');
      const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
      await expect(skip).toBeFocused();
      await expect(skip).toBeInViewport();
      await page.keyboard.press('Enter');
      await expect(page.locator('#main')).toBeFocused();
    });
  }
});

test('touch targets in the header are at least 44 px', { tag: '@mobile-only' }, async ({ page }) => {
  pending('mobileMenu');
  for (const route of INNER_ROUTES.slice(0, 3)) {
    await gotoRoute(page, route.path);
    const small = await page.evaluate(() =>
      Array.from(document.querySelectorAll('header a[href], header button'))
        .map((el) => ({ el, rect: el.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44))
        .map(({ el, rect }) => `${el.textContent?.trim() || el.getAttribute('aria-label')}: ${Math.round(rect.width)}×${Math.round(rect.height)}`),
    );
    expect(small, route.path).toEqual([]);
  }
});

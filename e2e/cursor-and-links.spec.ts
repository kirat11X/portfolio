// Cursor follower (decorative, fine pointers only, never with reduced motion),
// the 404 page, and deep links loaded directly (the SPA must answer every route).

import { test, expect } from './support/test';
import { firstCreative, firstEngineering, gotoRoute, pageTitle, paths, projectPath, profileData } from './support/app';

const ring = '.cursor-ring';

test.describe('cursor follower', () => {
  test('follows a mouse on desktop and is hidden from assistive tech', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only');
    await gotoRoute(page, paths.engineering);
    await page.mouse.move(400, 300);
    await page.mouse.move(420, 320);
    const follower = page.locator(ring);
    await expect(follower).toHaveCount(1);
    await expect(follower).toHaveCSS('opacity', '1');
    await expect(page.locator(`[aria-hidden="true"]:has(> ${ring})`)).toHaveCount(1);
    await expect(page.locator(`[aria-hidden="true"]:has(> ${ring})`)).toHaveCSS('pointer-events', 'none');
  });

  test('is absent on touch phones', { tag: '@mobile-only' }, async ({ page }) => {
    await gotoRoute(page, paths.engineering);
    await page.locator('main').tap({ position: { x: 40, y: 40 } }).catch(() => undefined);
    await expect(page.locator(ring)).toHaveCount(0);
    await expect(page.locator('.cursor-dot')).toHaveCount(0);
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('is absent', async ({ page }) => {
      await gotoRoute(page, paths.engineering);
      await page.mouse.move(400, 300);
      await expect(page.locator(ring)).toHaveCount(0);
    });
  });
});

test.describe('404', () => {
  test('an unknown URL shows "Page not found" with the path and ways back', { tag: '@mobile' }, async ({ page }) => {
    await gotoRoute(page, '/no/such/page');
    await expect(page).toHaveTitle(pageTitle('Page not found'));
    await expect(page.getByText('/no/such/page', { exact: true })).toBeVisible();
    const main = page.getByRole('main');
    for (const path of [paths.home, paths.engineering, paths.creative]) {
      await expect(main.locator(`a[href="${path}"]`).first()).toBeVisible();
    }
  });

  test('an unknown case-study slug is handled inside the gallery', async ({ page }) => {
    await gotoRoute(page, `${paths.engineering}/not-a-project`);
    await expect(page.getByRole('main').locator(`a[href="${paths.engineering}"]`).first()).toBeVisible();
  });
});

test.describe('deep links load directly', () => {
  const links = [
    { path: projectPath(firstEngineering), title: pageTitle(firstEngineering.title) },
    { path: projectPath(firstCreative), title: pageTitle(firstCreative.title) },
    { path: `${paths.engineering}?category=${firstEngineering.category}`, title: null },
    { path: `${paths.resume}?track=${profileData.resumes.at(-1)!.id}`, title: null },
    { path: paths.contact, title: null },
  ];
  for (const { path, title } of links) {
    test(path, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBe(200);
      await gotoRoute(page, path);
      await expect(page.locator('h1')).toHaveCount(1);
      if (title) await expect(page).toHaveTitle(title);
      // A reload of a nested route keeps working (no relative asset paths).
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1')).toHaveCount(1, { timeout: 60_000 });
    });
  }
});

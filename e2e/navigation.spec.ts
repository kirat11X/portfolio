import { test, expect } from './support/test';
import { gotoRoute, navItems, navigateTo, pathname, paths, startsWithName, waitForPage } from './support/app';
import { pending } from './support/pending';

test.describe('primary navigation — desktop', () => {
  test('links reach every route and mark the current page', async ({ page }) => {
    await gotoRoute(page, paths.about);
    const nav = page.getByRole('navigation', { name: 'Primary', exact: true });
    const order = [...navItems.filter((item) => item.path !== paths.home), ...navItems.filter((item) => item.path === paths.home)];
    for (const item of order) {
      await nav.getByRole('link', { name: item.label, exact: true }).click();
      await expect.poll(() => pathname(page)).toBe(item.path);
      await waitForPage(page);
      await expect(nav.getByRole('link', { name: item.label, exact: true })).toHaveAttribute('aria-current', 'page');
    }
  });

  test('the brand link goes home', async ({ page }) => {
    await gotoRoute(page, paths.contact);
    await page.getByRole('banner').getByRole('link', { name: /home/i }).first().click();
    await expect.poll(() => pathname(page)).toBe(paths.home);
    await waitForPage(page);
  });

  test('browser back and forward move between routes', async ({ page }) => {
    await gotoRoute(page, paths.engineering);
    await navigateTo(page, 'About');
    await expect.poll(() => pathname(page)).toBe(paths.about);
    await page.goBack();
    await expect.poll(() => pathname(page)).toBe(paths.engineering);
    await waitForPage(page);
    await page.goForward();
    await expect.poll(() => pathname(page)).toBe(paths.about);
    await waitForPage(page);
  });

  test('the 404 page offers a way home', async ({ page }) => {
    pending('notFoundPage');
    await gotoRoute(page, '/does-not-exist');
    await expect(page.getByRole('main').locator(`a[href="${paths.home}"]`).first()).toBeVisible();
  });
});

test.describe('mobile menu', () => {
  const toggleOf = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /^(Open|Close) menu$/ });

  test('opens a dialog with every link; Escape closes it and focus returns to the toggle', { tag: '@mobile-only' }, async ({ page }) => {
    pending('mobileMenu');
    await gotoRoute(page, paths.about);
    const toggle = toggleOf(page);
    await expect(toggle).toHaveAccessibleName('Open menu');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Close menu', exact: true })).toBeVisible();
    for (const item of navItems) {
      // Name = the label; the one-line description is the accessible description.
      const link = dialog.getByRole('link', { name: item.label, exact: true });
      await expect(link).toBeVisible();
      if (item.description) await expect(link).toHaveAccessibleDescription(item.description);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  });

  test('"Close menu" closes it; choosing a link navigates, closes it and focuses the page', { tag: '@mobile-only' }, async ({ page }) => {
    pending('mobileMenu');
    await gotoRoute(page, paths.about);
    const toggle = toggleOf(page);
    await toggle.click();
    await page.getByRole('button', { name: 'Close menu', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await toggle.click();
    await page.getByRole('dialog').getByRole('link', { name: startsWithName('Contact') }).click();
    await expect.poll(() => pathname(page)).toBe(paths.contact);
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('#main')).toBeFocused();
  });

  test('while open, focus stays in the header and menu and the page behind is inert', { tag: '@mobile-only' }, async ({ page }) => {
    pending('mobileMenu');
    await gotoRoute(page, paths.about);
    await toggleOf(page).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => Boolean(document.activeElement?.closest('header, [role="dialog"]')));
      expect(inside, `Tab #${i + 1} left the menu`).toBe(true);
    }
  });
});

// Runs only in the `no-webgl` project (WebGL disabled at launch).
import { test, expect } from './support/test';
import { HOME_TITLE, gotoRoute, paths } from './support/app';
import { structuralProblems } from './support/audit';
import { HomeWorld } from './support/world';

test('without WebGL, / shows the classic home and no loader', async ({ page }) => {
  const world = new HomeWorld(page);
  await gotoRoute(page, paths.home);
  await expect(page).toHaveTitle(HOME_TITLE);
  await expect(page.locator('h1')).toBeVisible();
  await expect(world.loaderActions).toHaveCount(0);
  await expect(world.canvas).toHaveCount(0);
  await expect(world.enter3d).toHaveCount(0);
  expect(await structuralProblems(page)).toEqual([]);
});

test('a stored "world" preference is ignored without WebGL', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('kirat:view', 'world'));
  const world = new HomeWorld(page);
  await gotoRoute(page, paths.home);
  await expect(page.locator('h1')).toBeVisible();
  await expect(world.loaderActions).toHaveCount(0);
  await expect(world.canvas).toHaveCount(0);
});

test('inner pages are unaffected', async ({ page }) => {
  await gotoRoute(page, paths.engineering);
  await expect(page.locator('h1')).toBeVisible();
});

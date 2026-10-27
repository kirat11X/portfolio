// The home route's 3D world, end to end in software WebGL. Each test is a fresh
// browser context, i.e. a first visit unless the test reloads.

import { test, expect } from './support/test';
import { HOME_TITLE, firstEngineering, navigateTo, pathname, paths, projectPath, waitForPage } from './support/app';
import { structuralProblems } from './support/audit';
import { PENDING, pending } from './support/pending';
import { HomeWorld, QUICK_TRAVEL, WORLD_LOAD_TIMEOUT, WORLD_MODULE, WORLD_TEST_TIMEOUT } from './support/world';
import { WORLD_EXHIBITS } from '@/world/config/exhibits';

test.describe.configure({ timeout: WORLD_TEST_TIMEOUT });
// Software WebGL on a busy machine can delay input delivery by 10–25 s while a
// frame renders; actions get a longer budget so this suite tests behaviour, not the rig.
test.use({ actionTimeout: 60_000 });

const hudLanded = () => PENDING.worldHud === null || Boolean(process.env.QA_RUN_PENDING);

test('first visit: loader → "Enter the district" → world; leaving and returning skips the loader; classic ↔ 3D', { tag: ['@world', '@mobile'] }, async ({ page }, testInfo) => {
  const world = new HomeWorld(page);
  await world.goto();
  await expect(page).toHaveTitle(HOME_TITLE);
  await expect(page.locator('h1')).toHaveCount(1);
  await world.expectLoader();
  const loadMs = await world.waitUntilReady();
  testInfo.annotations.push({ type: 'world-load-ms', description: String(loadMs) });
  expect(await structuralProblems(page), 'a11y at loader-ready').toEqual([]);

  await world.enterButton.click();
  await world.expectEntered();
  if (hudLanded()) await expect(world.controls).toBeVisible();
  await expect(world.canvas).toBeVisible();
  expect(await structuralProblems(page), 'a11y in the world').toEqual([]);

  await navigateTo(page, 'About');
  await expect.poll(() => pathname(page)).toBe(paths.about);
  await waitForPage(page);
  await expect(world.canvas).toBeHidden();
  await navigateTo(page, 'Home');
  await expect.poll(() => pathname(page)).toBe(paths.home);
  await expect(world.classicView).toBeVisible();
  await expect(world.loaderActions).toHaveCount(0);

  await world.classicView.click();
  await expect(world.enter3d).toBeVisible();
  await expect(world.canvas).toHaveCount(0);
  await expect(page.locator('h1')).toBeVisible();

  // The intro was seen this session, so the loader enters on its own.
  await world.enter3d.click();
  await world.expectEntered(WORLD_LOAD_TIMEOUT);
});

test('a reload in the same session auto-enters without asking again', { tag: '@world' }, async ({ page }) => {
  const world = new HomeWorld(page);
  await world.goto();
  await world.enter();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await world.expectEntered(WORLD_LOAD_TIMEOUT);
  await expect(world.enterButton).toHaveCount(0);
});

test('HUD: world controls and quick travel', { tag: '@world' }, async ({ page }) => {
  pending('worldHud');
  const world = new HomeWorld(page);
  await world.goto();
  await world.enter();
  await expect(world.controls).toBeVisible();
  await expect(world.quickTravel).toBeVisible();
  for (const { label } of QUICK_TRAVEL) await expect(world.quickTravelButton(label)).toBeVisible();
  expect(await world.hasHandle(), 'window.__world handle (DEV)').toBe(true);

  await world.quickTravelButton('Engineering Lab').click();
  await expect(world.quickTravelButton('Engineering Lab')).toHaveAttribute('aria-pressed', 'true', { timeout: 30_000 });
  for (const { label } of QUICK_TRAVEL.filter((item) => item.district !== 'engineering')) {
    await expect(world.quickTravelButton(label)).not.toHaveAttribute('aria-pressed', 'true');
  }
  await expect.poll(() => world.distanceToSpawn('engineering'), { timeout: 30_000 }).toBeLessThan(3);
});

test('exhibit panel: open, close, and follow "Open case study"', { tag: '@world' }, async ({ page }) => {
  pending('exhibitPanel');
  const exhibit = WORLD_EXHIBITS.find((item) => item.district === 'engineering') ?? WORLD_EXHIBITS[0];
  const world = new HomeWorld(page);
  await world.goto();
  await world.enter();

  await world.select(exhibit.project.slug);
  await expect(world.exhibitPanel).toBeVisible();
  await expect(world.exhibitPanel).toContainText(exhibit.project.title);
  await page.getByRole('button', { name: 'Close exhibit', exact: true }).click();
  await expect(world.exhibitPanel).toBeHidden();

  await world.select(exhibit.project.slug);
  await world.exhibitPanel.getByRole('link', { name: 'Open case study' }).click();
  await expect.poll(() => pathname(page)).toBe(projectPath(exhibit.project));
  await waitForPage(page);
  await navigateTo(page, 'Home');
  await expect(world.classicView).toBeVisible();
  await expect(world.loaderActions).toHaveCount(0);
});

test('"Use the classic view" works while loading, and the choice persists', { tag: '@world' }, async ({ page }) => {
  // Hold the world's code chunk so the loader is guaranteed to still be loading.
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(WORLD_MODULE, async (route) => {
    await held;
    await route.continue().catch(() => undefined);
  });
  const world = new HomeWorld(page);
  await world.goto();
  await expect(world.skipToClassic).toBeVisible({ timeout: 60_000 });
  await world.skipToClassic.click();
  await expect(world.enter3d).toBeVisible();
  await expect(world.loaderActions).toHaveCount(0);
  await expect(world.canvas).toHaveCount(0);
  release();
  await page.unroute(WORLD_MODULE);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(world.enter3d).toBeVisible();
  await expect(world.loaderActions).toHaveCount(0);
  await expect(world.canvas).toHaveCount(0);
});

test('a failed engine download shows an error with "Try again" and the classic view', { tag: '@world' }, async ({ page, diagnostics }) => {
  diagnostics.allow(/dynamically imported module|World\.tsx|error occurred in|net::ERR_FAILED|Failed to fetch/i);
  diagnostics.allowRequests(/\/world\/World\.tsx|\/assets\/World-/);
  await page.route(WORLD_MODULE, (route) => route.abort('failed'));
  const world = new HomeWorld(page);
  await world.goto();
  await expect(world.retryButton).toBeVisible({ timeout: 60_000 });
  await expect(world.skipToClassic).toBeVisible();
  await world.skipToClassic.click();
  await expect(world.enter3d).toBeVisible();
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the world still loads and enters', { tag: '@world' }, async ({ page }) => {
    const world = new HomeWorld(page);
    await world.goto();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await world.enter();
    if (hudLanded()) await expect(world.controls).toBeVisible();
  });
});

test('losing the WebGL context after entering falls back to the classic view with a notice', { tag: '@world' }, async ({ page, diagnostics }) => {
  pending('worldContextLoss');
  diagnostics.allow(/context lost|CONTEXT_LOST/i);
  const world = new HomeWorld(page);
  await world.goto();
  await world.enter();
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = (canvas?.getContext('webgl2') ?? canvas?.getContext('webgl')) as WebGLRenderingContext | null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  });
  await expect(world.enter3d).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/stopped unexpectedly/i)).toBeVisible();
});

// Keep a reference so the import is used even if every world test is filtered out.
void firstEngineering;

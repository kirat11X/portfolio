// Page object for the home route's 3D world: the loader, the HUD, quick travel,
// the exhibit panel, and the DEV-only `window.__world` handle exposed by the
// gameplay layer (state() for the vehicle pose, select(slug) to open an exhibit).

import { expect, type Locator, type Page } from '@playwright/test';
import { DISTRICTS, DISTRICT_ORDER, type DistrictId } from '@/world/config/layout';
// The DEV handle's type (and its `window.__world` declaration) comes from the world itself.
export type { WorldDevHandle } from '@/world/scene/devHandle';

/** Software WebGL is slow: loader completion can take 20–60 s, more on a busy machine. */
export const WORLD_LOAD_TIMEOUT = 150_000;
/** Per-test budget for specs that load the world (sometimes twice). */
export const WORLD_TEST_TIMEOUT = 360_000;

/** Quick-travel buttons, labelled with the district names from the shared layout. */
export const QUICK_TRAVEL: Array<{ district: DistrictId; label: string }> = DISTRICT_ORDER.map((district) => ({
  district,
  label: DISTRICTS[district].label,
}));

/** Requests for the world's code chunk, in dev (/src/world/World.tsx) and in a build (/assets/World-<hash>.js). */
export const WORLD_MODULE = (url: URL) =>
  /\/src\/world\/World\.tsx$/.test(url.pathname) || /\/assets\/World-[^/]+\.js$/.test(url.pathname);

export interface WorldSnapshot {
  /** Vehicle position when state() exposes one (top level or under vehicle/pose). */
  x: number | null;
  z: number | null;
  raw: unknown;
}

export class HomeWorld {
  readonly enterButton: Locator;
  readonly skipToClassic: Locator;
  readonly retryButton: Locator;
  /** Any loader action; present exactly while the loader is on screen. */
  readonly loaderActions: Locator;
  readonly controls: Locator;
  readonly quickTravel: Locator;
  readonly classicView: Locator;
  readonly enter3d: Locator;
  readonly canvas: Locator;
  readonly exhibitPanel: Locator;
  readonly primaryNav: Locator;

  constructor(readonly page: Page) {
    this.enterButton = page.getByRole('button', { name: 'Enter the district', exact: true });
    this.skipToClassic = page.getByRole('button', { name: 'Use the classic view', exact: true });
    this.retryButton = page.getByRole('button', { name: 'Try again', exact: true });
    this.loaderActions = page.getByRole('button', { name: /^(Enter the district|Use the classic view|Try again)$/ });
    this.controls = page.getByRole('region', { name: 'World controls', exact: true });
    this.quickTravel = page.getByRole('navigation', { name: 'Quick travel', exact: true });
    this.classicView = page.getByRole('button', { name: 'Classic view', exact: true });
    this.enter3d = page.getByRole('button', { name: 'Enter the 3D world', exact: true });
    this.canvas = page.locator('canvas');
    this.exhibitPanel = page.locator('aside').filter({ has: page.getByRole('link', { name: 'Open case study' }) });
    this.primaryNav = page.getByRole('navigation', { name: 'Primary', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  /** The loader is showing (any of its actions is visible). */
  async expectLoader(timeout = 60_000): Promise<void> {
    await expect(this.loaderActions.first()).toBeVisible({ timeout });
  }

  /** Waits for real loading to finish: the loader offers "Enter the district". */
  async waitUntilReady(): Promise<number> {
    const started = Date.now();
    await expect(this.enterButton).toBeVisible({ timeout: WORLD_LOAD_TIMEOUT });
    return Date.now() - started;
  }

  /** Waits for the loader, enters, and waits for the loader to leave. Returns the load time in ms. */
  async enter(): Promise<number> {
    const loadMs = await this.waitUntilReady();
    await this.enterButton.click();
    await this.expectEntered();
    return loadMs;
  }

  /** The loader has gone and the world's own controls are on screen. */
  async expectEntered(timeout = 20_000): Promise<void> {
    await expect(this.loaderActions).toHaveCount(0, { timeout });
    await expect(this.classicView).toBeVisible({ timeout });
  }

  quickTravelButton(label: string): Locator {
    return this.quickTravel.getByRole('button', { name: label, exact: true });
  }

  /** The DEV-only gameplay handle, if present. */
  hasHandle(): Promise<boolean> {
    return this.page.evaluate(() => typeof window.__world?.state === 'function');
  }

  async snapshot(): Promise<WorldSnapshot> {
    return this.page.evaluate(() => {
      const raw = window.__world?.state?.() ?? null;
      const record = (value: unknown) => (value && typeof value === 'object' ? (value as Record<string, unknown>) : null);
      const root = record(raw);
      const candidates = [root, record(root?.vehicle), record(root?.pose), record(root?.vehiclePose), record(root?.position)];
      const pose = candidates.find((c) => c && typeof c.x === 'number' && typeof c.z === 'number');
      return { x: (pose?.x as number) ?? null, z: (pose?.z as number) ?? null, raw: JSON.parse(JSON.stringify(raw)) };
    });
  }

  /** Distance from the vehicle to a district's quick-travel spawn (Infinity when unknown). */
  async distanceToSpawn(district: DistrictId): Promise<number> {
    const { x, z } = await this.snapshot();
    if (x === null || z === null) return Number.POSITIVE_INFINITY;
    const { spawn } = DISTRICTS[district];
    return Math.hypot(x - spawn.x, z - spawn.z);
  }

  async select(slug: string): Promise<void> {
    await this.page.evaluate((value) => window.__world?.select?.(value), slug);
  }
}

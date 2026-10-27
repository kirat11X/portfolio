// Gaming Zone and HUD features of the 3D world, driven through the DEV-only
// `window.__world` handle (src/world/scene/devHandle.ts): the storage consent
// card, an arcade cabinet, the race and car soccer, the toolbar (orbit, car
// picker, map). One world load per test keeps the software-WebGL budget sane.

import type { Page } from "@playwright/test";
import { test, expect } from "./support/test";
import { HomeWorld, WORLD_TEST_TIMEOUT } from "./support/world";
import { ARENA } from "@/world/config/layout";

test.describe.configure({ timeout: WORLD_TEST_TIMEOUT });
test.use({ actionTimeout: 60_000 });

const GAME_KEYS = ["kirat:car", "kirat:race", "kirat:soccer"];

interface Storage {
  local: Record<string, string | null>;
  session: Record<string, string | null>;
}

const storageOf = (page: Page) =>
  page.evaluate(
    (keys) => {
      const pick = (area: globalThis.Storage) =>
        Object.fromEntries(keys.map((key) => [key, area.getItem(key)]));
      return {
        local: pick(window.localStorage),
        session: pick(window.sessionStorage),
      } as Storage;
    },
    ["kirat:consent", ...GAME_KEYS],
  );

const pose = (page: Page) =>
  page.evaluate(() => {
    const state = window.__world!.state() as {
      pose: { x: number; z: number; heading: number };
    };
    return state.pose;
  });

async function enterWorld(page: Page): Promise<HomeWorld> {
  const world = new HomeWorld(page);
  await world.goto();
  await world.enter();
  expect(
    await world.hasHandle(),
    "window.__world handle (DEV build only)",
  ).toBe(true);
  return world;
}

test(
  'storage consent: "Give it RAM" persists to localStorage, "Keep it starving" keeps to the session; never a cookie',
  { tag: "@world" },
  async ({ page, context }) => {
    await enterWorld(page);
    const card = page.getByRole("region", { name: /data server/i });
    await expect(card).toBeVisible();
    await expect(card).toContainText(/no cookies/i);
    const before = await storageOf(page);
    expect(before.local["kirat:consent"]).toBeNull();

    // Choose a car before answering: it lives in this session only.
    await page.evaluate(() => window.__world!.car("kestrel"));
    await expect
      .poll(async () => (await storageOf(page)).session["kirat:car"])
      .not.toBeNull();
    expect((await storageOf(page)).local["kirat:car"]).toBeNull();

    await card
      .getByRole("button", { name: "Give it RAM", exact: true })
      .click();
    await expect(card).toBeHidden();
    let storage = await storageOf(page);
    expect(storage.local["kirat:consent"]).toBe("granted");
    expect(
      storage.local["kirat:car"],
      "session values move to localStorage on consent",
    ).not.toBeNull();
    expect(storage.session["kirat:car"]).toBeNull();
    expect(
      await page.evaluate(
        () => (window.__world!.state() as { consent: string }).consent,
      ),
    ).toBe("granted");

    // Forget the answer (dev hook) so the card shows again, then decline.
    await page.evaluate(() => window.__world!.consent(null));
    await expect(card).toBeVisible();
    await card
      .getByRole("button", { name: "Keep it starving", exact: true })
      .click();
    await expect(card).toBeHidden();
    storage = await storageOf(page);
    expect(storage.local["kirat:consent"]).toBe("declined");
    for (const key of GAME_KEYS)
      expect(
        storage.local[key],
        `${key} removed from localStorage on decline`,
      ).toBeNull();

    // The answer survives a reload and the card does not come back.
    await page.reload({ waitUntil: "domcontentloaded" });
    await new HomeWorld(page).expectEntered(150_000);
    await expect(card).toHaveCount(0);

    expect(await context.cookies(), "the site sets no cookies").toEqual([]);
    expect(await page.evaluate(() => document.cookie)).toBe("");
  },
);

test(
  "arcade: a cabinet opens its game in a modal dialog and Escape returns to the car where it was",
  { tag: "@world" },
  async ({ page }) => {
    await enterWorld(page);
    await page.evaluate(() => window.__world!.consent(false));
    await page.evaluate(() => window.__world!.spot("arcade:tetris"));
    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              (window.__world!.state() as { focusedId: string | null })
                .focusedId,
          ),
        { timeout: 30_000 },
      )
      .toBe("arcade:tetris");
    const parked = await pose(page);
    expect(await page.evaluate(() => window.__world!.interact())).toBe(true);

    const dialog = page.getByRole("dialog", { name: "Blocks" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(document.activeElement?.closest('[role="dialog"]')),
        ),
      )
      .toBe(true);
    // Game keys go to the game, not the car.
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(600);
    await page.keyboard.up("ArrowUp");
    // Tab stays inside the dialog.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(() =>
          Boolean(document.activeElement?.closest('[role="dialog"]')),
        ),
        `Tab #${i + 1}`,
      ).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(
      await page.evaluate(
        () => (window.__world!.state() as { arcade: unknown }).arcade,
      ),
    ).toBeNull();
    // Escape (and the arrow key) did not move the car.
    await page.waitForTimeout(800);
    const after = await pose(page);
    expect(Math.hypot(after.x - parked.x, after.z - parked.z)).toBeLessThan(
      0.05,
    );
  },
);

test(
  "race start/cancel and soccer ball reset",
  { tag: "@world" },
  async ({ page }) => {
    await enterWorld(page);
    await page.evaluate(() => window.__world!.consent(false));
    type Race = { phase: string; next: number };
    const race = () =>
      page.evaluate(() => window.__world!.race.state() as unknown as Race);

    await page.evaluate(() => window.__world!.race.start());
    await expect
      .poll(async () => (await race()).phase)
      .toMatch(/^(countdown|running)$/);
    expect((await race()).next).toBe(0);
    await page.evaluate(() => window.__world!.race.cancel());
    await expect.poll(async () => (await race()).phase).toBe("idle");

    type Ball = { ball: { x: number; z: number } };
    const ball = () =>
      page.evaluate(
        () => (window.__world!.soccer.state() as unknown as Ball).ball,
      );
    await page.evaluate(() => window.__world!.soccer.ball(6, 52, 0, 0));
    expect(await ball()).toMatchObject({ x: 6, z: 52 });
    await page.evaluate(() => window.__world!.soccer.reset());
    const spawn = ARENA.ballSpawn;
    await expect
      .poll(async () => {
        const { x, z } = await ball();
        return Math.hypot(x - spawn.x, z - spawn.z);
      })
      .toBeLessThan(0.5);
  },
);

test(
  "toolbar: orbit the city, car picker and the district map",
  { tag: "@world" },
  async ({ page }) => {
    await enterWorld(page);
    await page.evaluate(() => window.__world!.consent(false));
    const controls = page.getByRole("region", {
      name: "World controls",
      exact: true,
    });

    const orbit = controls.getByRole("button", {
      name: "Orbit the city",
      exact: true,
    });
    await expect(orbit).toHaveAttribute("aria-pressed", "false");
    await orbit.click();
    await expect(orbit).toHaveAttribute("aria-pressed", "true");
    await orbit.click();
    await expect(orbit).toHaveAttribute("aria-pressed", "false");

    const picker = controls.getByRole("button", { name: /^Car: / });
    await picker.click();
    await expect(picker).toHaveAttribute("aria-expanded", "true");
    const garage = page.getByRole("radiogroup", { name: "Garage" });
    await expect(garage.getByRole("radio")).toHaveCount(3);
    const carId = await garage
      .locator('[role="radio"][aria-checked="false"]')
      .first()
      .getAttribute("data-car");
    const choice = garage.locator(`[data-car="${carId}"]`);
    await choice.click();
    await expect(choice).toHaveAttribute("aria-checked", "true");
    await expect(garage.locator('[aria-checked="true"]')).toHaveCount(1);
    expect(await page.evaluate(() => window.__world!.car())).toBe(carId);
    await page.keyboard.press("Escape");
    await expect(picker).toHaveAttribute("aria-expanded", "false");

    const mapButton = controls.getByRole("button", {
      name: "Map",
      exact: true,
    });
    await mapButton.click();
    const map = page.getByRole("dialog", { name: "District map" });
    await expect(map).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(map).toBeHidden();
    await expect(mapButton).toBeFocused();
  },
);

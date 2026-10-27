// Light / dark / system theme (src/lib/theme.ts): the choice applies at once,
// persists under `kirat:theme` (System = no key), survives a reload, and the 3D
// world keeps the document dark whatever the site pages use.

import type { Page } from "@playwright/test";
import { test, expect } from "./support/test";
import {
  gotoRoute,
  navigateTo,
  pathname,
  paths,
  waitForPage,
} from "./support/app";

const THEME_KEY = "kirat:theme";
const themeOf = (page: Page) => page.locator("html").getAttribute("data-theme");
const stored = (page: Page) =>
  page.evaluate((key) => window.localStorage.getItem(key), THEME_KEY);
const pageBackground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** Desktop navbar menu: icon button "Theme: <current>" → menuitemradio options. */
async function pickDesktop(page: Page, label: "System" | "Light" | "Dark") {
  await page
    .getByRole("banner")
    .getByRole("button", { name: /^Theme: / })
    .click();
  const menu = page.getByRole("menu", { name: "Colour theme" });
  await expect(menu).toBeVisible();
  await menu.getByRole("menuitemradio", { name: label, exact: true }).click();
  await expect(menu).toBeHidden();
}

test.describe("theme — desktop", () => {
  test("defaults to the system scheme and stores nothing", async ({ page }) => {
    await gotoRoute(page, paths.about);
    expect(await themeOf(page)).toBe("dark");
    expect(await stored(page)).toBeNull();
    await expect(
      page.getByRole("button", { name: "Theme: System", exact: true }),
    ).toBeVisible();
  });

  test("follows a light OS preference while on System", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await gotoRoute(page, paths.about);
    await expect.poll(() => themeOf(page)).toBe("light");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => themeOf(page)).toBe("dark");
  });

  test("Light and Dark apply at once, persist across reloads, and System clears the key", async ({
    page,
  }) => {
    await gotoRoute(page, paths.engineering);
    const darkBg = await pageBackground(page);

    await pickDesktop(page, "Light");
    await expect.poll(() => themeOf(page)).toBe("light");
    expect(await stored(page)).toBe("light");
    expect(await pageBackground(page)).not.toBe(darkBg);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      "#f6f6f4",
    );
    await expect(
      page.getByRole("button", { name: "Theme: Light", exact: true }),
    ).toBeFocused();

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForPage(page);
    expect(await themeOf(page)).toBe("light");

    // Also applies on other routes.
    await navigateTo(page, "About");
    await expect.poll(() => pathname(page)).toBe(paths.about);
    expect(await themeOf(page)).toBe("light");

    await pickDesktop(page, "Dark");
    await expect.poll(() => themeOf(page)).toBe("dark");
    expect(await stored(page)).toBe("dark");

    // Dark is kept even when the OS asks for light.
    await page.emulateMedia({ colorScheme: "light" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForPage(page);
    expect(await themeOf(page)).toBe("dark");

    await pickDesktop(page, "System");
    expect(await stored(page)).toBeNull();
    await expect.poll(() => themeOf(page)).toBe("light");
  });

  test("the menu works from the keyboard and Escape closes it", async ({
    page,
  }) => {
    await gotoRoute(page, paths.contact);
    const button = page.getByRole("button", {
      name: "Theme: System",
      exact: true,
    });
    await button.focus();
    await page.keyboard.press("ArrowDown");
    const menu = page.getByRole("menu", { name: "Colour theme" });
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole("menuitemradio", { name: "System" }),
    ).toBeFocused();
    await expect(
      menu.getByRole("menuitemradio", { name: "System" }),
    ).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("ArrowDown");
    await expect(
      menu.getByRole("menuitemradio", { name: "Light" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
    expect(await stored(page)).toBeNull();
  });
});

test(
  "theme — mobile menu radio group",
  { tag: "@mobile-only" },
  async ({ page }) => {
    await gotoRoute(page, paths.about);
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const group = dialog.getByRole("radiogroup");
    await expect(group).toBeVisible();
    await expect(group.getByRole("radio", { name: "System" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await group.getByRole("radio", { name: "Light" }).click();
    await expect.poll(() => themeOf(page)).toBe("light");
    expect(await stored(page)).toBe("light");
    await expect(group.getByRole("radio", { name: "Light" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    // Arrow keys move the selection, like a native radio group.
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => themeOf(page)).toBe("dark");
    expect(await stored(page)).toBe("dark");
  },
);

test.describe("in the 3D world", () => {
  // Software WebGL can hold the main thread for seconds per frame while the world loads.
  test.use({ actionTimeout: 60_000 });

  test(
    "the 3D world keeps the document dark while the site pages stay light",
    { tag: "@world" },
    async ({ page }) => {
      test.setTimeout(240_000);
      await page.addInitScript(
        (key) => window.localStorage.setItem(key, "light"),
        THEME_KEY,
      );
      await gotoRoute(page, paths.about);
      expect(await themeOf(page)).toBe("light");

      await navigateTo(page, "Home");
      await expect.poll(() => pathname(page)).toBe(paths.home);
      await expect.poll(() => themeOf(page)).toBe("dark");
      // The preference itself is untouched.
      expect(await stored(page)).toBe("light");
      await expect(
        page
          .getByRole("button", {
            name: /^(Enter the district|Use the classic view)$/,
          })
          .first(),
      ).toBeVisible({ timeout: 60_000 });
      expect(await themeOf(page)).toBe("dark");

      await navigateTo(page, "About");
      await expect.poll(() => pathname(page)).toBe(paths.about);
      await expect.poll(() => themeOf(page)).toBe("light");
    },
  );
});

test("the classic home follows the site theme", async ({ page }) => {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "light");
    window.localStorage.setItem("kirat:view", "classic");
  }, THEME_KEY);
  await gotoRoute(page, paths.home);
  await expect(
    page.getByRole("button", { name: "Enter the 3D world", exact: true }),
  ).toBeVisible();
  expect(await themeOf(page)).toBe("light");
});

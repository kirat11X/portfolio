// Opt-in (QA_LINK_CHECK=1): requests every external link found on the pages.
// ARCHITECTURE §6 allows only verified URLs; this catches dead or mistyped ones.
import { test, expect } from './support/test';
import { INNER_ROUTES, ROUTES, gotoRoute } from './support/app';

test.skip(!process.env.QA_LINK_CHECK, 'Set QA_LINK_CHECK=1 to request external links (needs network).');

test('every external link answers with a non-error status', async ({ page, request }) => {
  test.setTimeout(300_000);
  const links = new Set<string>();
  for (const route of [...INNER_ROUTES, ...ROUTES.filter((r) => r.kind === 'home')]) {
    await gotoRoute(page, route.path);
    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href]'))
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => /^https?:/.test(href) && new URL(href).origin !== location.origin),
    );
    hrefs.forEach((href) => links.add(href));
  }
  const broken: string[] = [];
  for (const href of links) {
    const response = await request.get(href, { maxRedirects: 5, timeout: 20_000, failOnStatusCode: false }).catch((error: Error) => error);
    if (response instanceof Error) broken.push(`${href} — ${response.message.split('\n')[0]}`);
    else if (response.status() >= 400 && response.status() !== 429 && response.status() !== 999) broken.push(`${href} — HTTP ${response.status()}`);
  }
  console.info(`[links] checked ${links.size} external links`);
  expect(broken).toEqual([]);
});

// The four résumé tracks on /resume: switching, ?track= deep links, and the PDFs.

import { test, expect } from './support/test';
import { gotoRoute, pathname, paths, profileData } from './support/app';

const tracks = profileData.resumes ?? [];
const [defaultTrack] = tracks;

const trackGroup = (page: import('@playwright/test').Page) => page.getByRole('group', { name: 'Resume version', exact: true });
const trackParam = (page: import('@playwright/test').Page) => new URL(page.url()).searchParams.get('track');

test('there are four résumé tracks, each with its own PDF', () => {
  expect(tracks).toHaveLength(4);
  expect(new Set(tracks.map((t) => t.id)).size).toBe(4);
  expect(new Set(tracks.map((t) => t.pdfUrl)).size).toBe(4);
});

test('switching tracks updates the sheet, the URL and the download link', { tag: '@mobile' }, async ({ page }) => {
  await gotoRoute(page, paths.resume);
  const group = trackGroup(page);
  await expect(group.getByRole('button')).toHaveCount(tracks.length);
  await expect(group.getByRole('button', { name: new RegExp(`^${defaultTrack.label}`) })).toHaveAttribute('aria-pressed', 'true');

  for (const track of [...tracks.slice(1), defaultTrack]) {
    await group.getByRole('button', { name: new RegExp(`^${track.label}`) }).click();
    await expect(group.getByRole('button', { name: new RegExp(`^${track.label}`) })).toHaveAttribute('aria-pressed', 'true');
    await expect(group.locator('[aria-pressed="true"]')).toHaveCount(1);
    // The default track keeps a clean URL; the others are shareable via ?track=.
    await expect.poll(() => trackParam(page)).toBe(track.id === defaultTrack.id ? null : track.id);
    expect(pathname(page)).toBe(paths.resume);
    await expect(page.locator('#resume-name')).toBeVisible();
    await expect(page.getByText(`${track.label} resume`, { exact: true })).toBeVisible();
    const download = page.getByRole('link', { name: `Download ${track.shortLabel} PDF`, exact: true });
    await expect(download).toHaveAttribute('href', track.pdfUrl!);
    await expect(download).toHaveAttribute('download', /.*/);
  }
});

for (const track of tracks) {
  test(`deep link ?track=${track.id} selects it, and its PDF is served`, async ({ page, request }) => {
    await gotoRoute(page, `${paths.resume}?track=${track.id}`);
    await expect(trackGroup(page).locator('[aria-pressed="true"]')).toContainText(track.label);
    const href = await page.getByRole('link', { name: `Download ${track.shortLabel} PDF`, exact: true }).getAttribute('href');
    expect(href).toBe(track.pdfUrl);
    const response = await request.get(href!);
    expect(response.status(), href!).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
    const body = await response.body();
    expect(body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(body.length, 'a real résumé, not a stub').toBeGreaterThan(10_000);
  });
}

test('an unknown ?track= falls back to the default track', async ({ page }) => {
  await gotoRoute(page, `${paths.resume}?track=astronaut`);
  await expect(trackGroup(page).locator('[aria-pressed="true"]')).toContainText(defaultTrack.label);
});

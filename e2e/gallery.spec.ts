import { test, expect } from './support/test';
import {
  getAdjacent,
  gotoRoute,
  pageTitle,
  pathname,
  paths,
  projectPath,
  resultLink,
  sortedCreative,
  sortedEngineering,
} from './support/app';
import { pending } from './support/pending';
import { countByCategory } from '@/lib/projects';
import { getCategory } from '@/data/categories';
import type { Discipline, Project } from '@/types';

const GALLERIES: Array<{ discipline: Discipline; path: string; projects: Project[]; gallery: 'engineeringGallery' | 'creativeGallery'; caseStudy: 'engineeringCaseStudy' | 'creativeCaseStudy' }> = [
  { discipline: 'engineering', path: paths.engineering, projects: sortedEngineering, gallery: 'engineeringGallery', caseStudy: 'engineeringCaseStudy' },
  { discipline: 'creative', path: paths.creative, projects: sortedCreative, gallery: 'creativeGallery', caseStudy: 'creativeCaseStudy' },
];

for (const { discipline, path, projects, gallery, caseStudy } of GALLERIES) {
  test.describe(`${discipline} gallery`, () => {
    test('lists every project with a link to its page', async ({ page }) => {
      pending(gallery);
      await gotoRoute(page, path);
      for (const project of projects) await expect(resultLink(page, projectPath(project)).first()).toBeVisible();
    });

    test('?category= filters the results and presses that filter', async ({ page }) => {
      pending(gallery);
      const counts = countByCategory(discipline);
      test.skip(counts.size < 2, `Only one ${discipline} category has projects, so there is nothing to filter.`);
      // The smallest category guarantees something is filtered out.
      const [category] = [...counts.entries()].sort((a, b) => a[1] - b[1])[0];
      await gotoRoute(page, `${path}?category=${category}`);
      for (const project of projects) {
        const link = resultLink(page, projectPath(project));
        if (project.category === category) await expect(link.first()).toBeVisible();
        else await expect(link).toHaveCount(0);
      }
      const meta = getCategory(category);
      const pressed = page.locator('main button[aria-pressed="true"]');
      await expect(pressed).toHaveCount(1);
      await expect(pressed).toContainText(meta.shortLabel);

      await page.locator('main button[aria-pressed]').filter({ hasText: /^All/ }).click();
      await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBeNull();
      for (const project of projects) await expect(resultLink(page, projectPath(project)).first()).toBeVisible();
    });

    test('an unknown ?category= falls back to everything', async ({ page }) => {
      pending(gallery);
      await gotoRoute(page, `${path}?category=not-a-category`);
      for (const project of projects) await expect(resultLink(page, projectPath(project)).first()).toBeVisible();
    });

    test('a project page shows the project and links to its neighbours and back', async ({ page }) => {
      pending(caseStudy);
      const project = projects[0];
      await gotoRoute(page, projectPath(project));
      await expect(page.locator('h1')).toHaveText(project.title);
      await expect(page).toHaveTitle(pageTitle(project.title));
      await expect(page.getByRole('main').locator(`a[href="${path}"]`).first()).toBeVisible();
      const { next } = getAdjacent(project);
      if (next) await expect(page.getByRole('main').locator(`a[href="${projectPath(next)}"]`).first()).toBeAttached();
      if (project.placeholder) await expect(page.getByRole('main').getByText(/placeholder/i).first()).toBeVisible();
    });

    test('an unknown slug shows a not-found state with a link back', async ({ page }) => {
      pending(caseStudy);
      await gotoRoute(page, `${path}/definitely-not-a-real-project`);
      await expect(page.locator('h1')).toHaveText(/not found|isn.t in|couldn.t find|doesn.t exist|no such/i);
      await expect(page.getByRole('main').locator(`a[href="${path}"]`).first()).toBeVisible();
    });
  });
}

test('clicking an engineering card title opens its case study', async ({ page }) => {
  pending('engineeringGallery', 'engineeringCaseStudy');
  await gotoRoute(page, paths.engineering);
  const project = sortedEngineering[0];
  // .first(): the spotlight may repeat a project that is also in the grid.
  await page.getByRole('heading', { name: project.title, exact: true }).first().getByRole('link').click();
  await expect.poll(() => pathname(page)).toBe(projectPath(project));
  await expect(page.locator('h1')).toHaveText(project.title);
});

test('creative quick view opens a dialog that Escape closes, returning focus', async ({ page }) => {
  pending('creativeGallery');
  await gotoRoute(page, paths.creative);
  const trigger = page.getByRole('button', { name: `Quick view: ${sortedCreative[0].title}` }).first();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

// ARCHITECTURE §10: every route works at 360 px with no horizontal scroll.
import { test, expect } from './support/test';
import { ROUTES, gotoRoute, paths, profileData, projectPath, settle, sortedCreative, sortedEngineering, type RouteCase } from './support/app';
import { horizontalOverflow } from './support/audit';

test.use({ viewport: { width: 360, height: 800 } });

// Every route, plus every résumé track and every case study (long titles, tables, pagers).
const EXTRA: RouteCase[] = [
  ...profileData.resumes.slice(1).map((track) => ({ label: track.id, path: `${paths.resume}?track=${track.id}`, kind: 'page' as const })),
  ...[...sortedEngineering.slice(1), ...sortedCreative.slice(1)].map((project) => ({ label: project.slug, path: projectPath(project), kind: 'project' as const })),
];

for (const route of [...ROUTES, ...EXTRA]) {
  test(`no horizontal overflow at 360 px — ${route.path}`, async ({ page }) => {
    await gotoRoute(page, route.path);
    if (route.kind === 'home') test.setTimeout(240_000);
    await settle(page, route.kind);
    const report = await horizontalOverflow(page);
    expect(
      report.scrollWidth,
      `document is ${report.scrollWidth}px wide in a ${report.innerWidth}px viewport; offenders: ${report.offenders.join('; ') || 'none located'}`,
    ).toBeLessThanOrEqual(report.innerWidth);
  });
}

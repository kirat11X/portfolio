import { describe, expect, it } from 'vitest';
import { galleryPath, isExternalHref, paths, projectPath } from './routes';

describe('routes', () => {
  it('gallery paths follow the discipline', () => {
    expect(galleryPath('engineering')).toBe(paths.engineering);
    expect(galleryPath('creative')).toBe(paths.creative);
  });

  it('project paths nest under the gallery', () => {
    expect(projectPath({ discipline: 'engineering', slug: 'my-project' })).toBe('/engineering/my-project');
    expect(projectPath({ discipline: 'creative', slug: 'street-01' })).toBe('/creative/street-01');
  });

  it('top-level paths are unique, absolute and lower-case', () => {
    const values = Object.values(paths) as string[];
    expect(new Set(values).size).toBe(values.length);
    for (const path of values) expect(path).toMatch(/^\/[a-z-]*$/);
  });

  it.each([
    ['https://github.com/kirat11X', true],
    ['http://insecure.example', true],
    ['//cdn.jsdelivr.net/x.js', true],
    ['mailto:hello@domain.dev', true],
    ['/about', false],
    ['/creative/street-01.webp', false],
    ['#main', false],
    ['about', false],
  ])('isExternalHref(%s) is %s', (href, expected) => {
    expect(isExternalHref(href)).toBe(expected);
  });
});

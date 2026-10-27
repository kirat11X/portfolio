// Behaviour of the project helpers against fixture data (the real data is
// covered by src/data/content.test.ts). Mocking the data modules lets us pin
// edge cases the real catalogue may not have: unordered entries, a discipline
// with a single project, no featured projects.

import { describe, expect, it, vi } from 'vitest';
import type { CreativeProject, EngineeringProject } from '@/types';
import {
  allProjects,
  countByCategory,
  getAdjacent,
  getCreativeProject,
  getEngineeringProject,
  getFeatured,
  getProjects,
} from './projects';

const fixtures = vi.hoisted(() => {
  const eng = (slug: string, extra: Partial<EngineeringProject>): EngineeringProject => ({
    slug,
    discipline: 'engineering',
    category: 'software',
    title: slug,
    tagline: 'tagline',
    summary: 'summary',
    overview: 'overview',
    tags: ['tag'],
    ...extra,
  });
  const cre = (slug: string, extra: Partial<CreativeProject>): CreativeProject => ({
    slug,
    discipline: 'creative',
    category: 'photography',
    medium: 'image',
    title: slug,
    tagline: 'tagline',
    summary: 'summary',
    tags: [],
    ...extra,
  });
  return {
    engineering: [
      eng('c-third', { order: 3, featured: true, category: 'software' }),
      eng('b-unordered', { category: 'cv' }),
      eng('a-first', { order: 1, category: 'ml' }),
      eng('d-second', { order: 2, featured: true, category: 'ml' }),
    ],
    creative: [cre('solo', {})],
  };
});

vi.mock('@/data/engineeringProjects', () => ({ engineeringProjects: fixtures.engineering }));
vi.mock('@/data/creativeProjects', () => ({ creativeProjects: fixtures.creative }));

const slugs = (list: Array<{ slug: string }>) => list.map((p) => p.slug);

describe('getProjects', () => {
  it('sorts by order and puts unordered entries last', () => {
    expect(slugs(getProjects('engineering'))).toEqual(['a-first', 'd-second', 'c-third', 'b-unordered']);
  });

  it('does not mutate the source data', () => {
    expect(slugs(fixtures.engineering)).toEqual(['c-third', 'b-unordered', 'a-first', 'd-second']);
  });

  it('allProjects is engineering then creative, each sorted', () => {
    expect(slugs(allProjects)).toEqual(['a-first', 'd-second', 'c-third', 'b-unordered', 'solo']);
  });
});

describe('lookups', () => {
  it('finds projects only within their discipline', () => {
    expect(getEngineeringProject('d-second')?.title).toBe('d-second');
    expect(getEngineeringProject('solo')).toBeUndefined();
    expect(getCreativeProject('solo')?.discipline).toBe('creative');
    expect(getCreativeProject('a-first')).toBeUndefined();
    expect(getEngineeringProject(undefined)).toBeUndefined();
  });
});

describe('getFeatured', () => {
  it('returns featured projects in order', () => {
    expect(slugs(getFeatured('engineering'))).toEqual(['d-second', 'c-third']);
  });

  it('respects the limit', () => {
    expect(slugs(getFeatured('engineering', 1))).toEqual(['d-second']);
    expect(getFeatured('engineering', 0)).toEqual([]);
  });

  it('falls back to the whole list when nothing is featured', () => {
    expect(slugs(getFeatured('creative'))).toEqual(['solo']);
  });
});

describe('getAdjacent', () => {
  it('wraps from the first to the last and back', () => {
    const list = getProjects('engineering');
    expect(getAdjacent(list[0]).previous?.slug).toBe('b-unordered');
    expect(getAdjacent(list[0]).next?.slug).toBe('d-second');
    expect(getAdjacent(list[list.length - 1]).next?.slug).toBe('a-first');
  });

  it('returns nulls for a discipline with a single project', () => {
    expect(getAdjacent(getProjects('creative')[0])).toEqual({ previous: null, next: null });
  });

  it('returns nulls for a project that is not in the catalogue', () => {
    const stranger = { ...fixtures.engineering[0], slug: 'not-listed' };
    expect(getAdjacent(stranger)).toEqual({ previous: null, next: null });
  });
});

describe('countByCategory', () => {
  it('counts projects per category', () => {
    expect(Object.fromEntries(countByCategory('engineering'))).toEqual({ ml: 2, software: 1, cv: 1 });
    expect(Object.fromEntries(countByCategory('creative'))).toEqual({ photography: 1 });
  });
});

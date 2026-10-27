// Content integrity: invariants every project, profile and navigation entry must
// satisfy, whatever the data grows into. Each rule collects *all* offenders so a
// failure reads as a to-do list ("<slug>: <problem>").
//
// Honesty rules come from docs/ARCHITECTURE.md §6: no invented links, no fake
// URLs, placeholders clearly flagged, no personal data from disk.

import { describe, expect, it } from 'vitest';
import type { CreativeProject, EngineeringProject, MediaItem, Project, ProjectLink, SocialLink } from '@/types';
import { allCategories, creativeCategories, engineeringCategories, getCategory } from '@/data/categories';
import { creativeProjects } from '@/data/creativeProjects';
import { engineeringProjects } from '@/data/engineeringProjects';
import { navItems } from '@/data/navigation';
import { profileData } from '@/data/profile';
import { EXHIBIT_SLOTS } from '@/world/config/layout';
import { WORLD_EXHIBITS, exhibitsIn, getExhibit } from '@/world/config/exhibits';
import {
  allProjects,
  countByCategory,
  getAdjacent,
  getCreativeProject,
  getEngineeringProject,
  getFeatured,
  getProjects,
  sortedCreative,
  sortedEngineering,
} from '@/lib/projects';
import { galleryPath, paths, projectPath } from '@/lib/routes';

// ---------------------------------------------------------------------------
// Helpers

const SUMMARY_MAX = 260;
const TAGLINE_MAX = 160;
const TITLE_MAX = 90;
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CURRENT_YEAR = new Date().getFullYear();

/** Files under public/, as site-relative paths ("/creative/a.webp"). Lazy glob: nothing is imported. */
const PUBLIC_FILES = new Set(Object.keys(import.meta.glob('/public/**/*')).map((key) => key.replace(/^\/public/, '')));
/** Raw text of every PDF under public/, keyed like PUBLIC_FILES. */
const PUBLIC_PDFS = Object.fromEntries(
  Object.entries(import.meta.glob<string>('/public/**/*.pdf', { query: '?raw', import: 'default', eager: true })).map(
    ([key, raw]) => [key.replace(/^\/public/, ''), raw],
  ),
);

const FAKE_URL_PATTERNS: Array<[RegExp, string]> = [
  [/(^|[./])example\.(com|org|net)\b/i, 'example domain'],
  [/your[-_]?(user(name)?|name|handle|profile|repo|account|github|link)/i, '"your-…" template text'],
  [/\b(todo|tbd|fixme|lorem|dummy|sample-link)\b/i, 'to-do / dummy marker'],
  [/\b(localhost|127\.0\.0\.1|0\.0\.0\.0)\b/i, 'local address'],
  [/placeholder\.(com|org)|placehold\.(it|co)|via\.placeholder|picsum\.photos|dummyimage/i, 'stock placeholder host'],
  [/\{\{|\}\}|<[^>]*>|\$\{/, 'unrendered template'],
  [/\bx{3,}\b/i, '"xxx" filler'],
];

const HOST_BY_KIND: Partial<Record<ProjectLink['kind'] | SocialLink['kind'], RegExp>> = {
  github: /^(www\.)?github\.com$/,
  figma: /^(www\.)?figma\.com$/,
  behance: /^(www\.)?behance\.net$/,
  dribbble: /^(www\.)?dribbble\.com$/,
  instagram: /^(www\.)?instagram\.com$/,
  linkedin: /^([a-z]{2,3}\.)?linkedin\.com$/,
  x: /^(www\.)?(x|twitter)\.com$/,
};

/** Problems with an href; empty when it is acceptable. */
function hrefProblems(href: string, options: { allowMailto?: boolean; kind?: string } = {}): string[] {
  const problems: string[] = [];
  if (typeof href !== 'string' || href.trim() === '') return ['empty href'];
  if (href !== href.trim()) problems.push(`surrounding whitespace in "${href}"`);
  if (href.startsWith('#')) problems.push(`fragment-only href "${href}"`);
  for (const [pattern, why] of FAKE_URL_PATTERNS) if (pattern.test(href)) problems.push(`${why}: "${href}"`);

  if (href.startsWith('mailto:')) {
    if (!options.allowMailto) problems.push(`mailto not allowed here: "${href}"`);
    else if (!/^mailto:[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(href)) problems.push(`malformed mailto "${href}"`);
    return problems;
  }
  if (href.startsWith('/') && !href.startsWith('//')) return problems;
  if (!href.startsWith('https://')) {
    problems.push(`not https or site-relative: "${href}"`);
    return problems;
  }
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return [...problems, `unparseable URL "${href}"`];
  }
  if (!url.hostname.includes('.')) problems.push(`hostname without a dot: "${href}"`);
  const hostRule = options.kind ? HOST_BY_KIND[options.kind as keyof typeof HOST_BY_KIND] : undefined;
  if (hostRule && !hostRule.test(url.hostname)) problems.push(`${options.kind} link on unexpected host: "${href}"`);
  if (options.kind === 'github' && url.pathname.replace(/\/+$/, '').split('/').filter(Boolean).length < 1) {
    problems.push(`GitHub link without an owner: "${href}"`);
  }
  return problems;
}

/** Site-relative paths must exist in public/. */
function localAssetProblems(src: string): string[] {
  if (!src.startsWith('/') || src.startsWith('//')) return [];
  const path = decodeURI(src.split(/[?#]/)[0]);
  return PUBLIC_FILES.has(path) ? [] : [`missing file public${path}`];
}

function blank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const value of values) (seen.has(value) ? dupes : seen).add(value);
  return [...dupes];
}

function lintProjects(rule: (project: Project) => string[]): string[] {
  return allProjects.flatMap((project) => rule(project).map((problem) => `${project.slug}: ${problem}`));
}

function mediaOf(project: Project): Array<[where: string, item: MediaItem]> {
  return [
    ...(project.cover ? ([['cover', project.cover]] as Array<[string, MediaItem]>) : []),
    ...(project.gallery ?? []).map((item, i) => [`gallery[${i}]`, item] as [string, MediaItem]),
  ];
}

/** Every string value reachable from `value`, with its path. */
function collectStrings(value: unknown, path = ''): Array<[path: string, text: string]> {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, i) => collectStrings(item, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => collectStrings(item, path ? `${path}.${key}` : key));
  }
  return [];
}

const PLACEHOLDER_WORDING = /\bplaceholder\b|\bstand-?in\b|\breplace (this|with)\b|\bcoming soon\b/i;

// ---------------------------------------------------------------------------

describe('project catalogue', () => {
  it('has at least one project in each discipline', () => {
    expect(engineeringProjects.length).toBeGreaterThan(0);
    expect(creativeProjects.length).toBeGreaterThan(0);
  });

  it('allProjects is exactly the two discipline lists', () => {
    expect(allProjects).toHaveLength(engineeringProjects.length + creativeProjects.length);
    expect(new Set(allProjects)).toEqual(new Set<Project>([...engineeringProjects, ...creativeProjects]));
  });

  it('slugs are unique across all projects', () => {
    expect(duplicates(allProjects.map((project) => project.slug))).toEqual([]);
  });

  it('slugs are kebab-case and URL-safe', () => {
    expect(lintProjects((p) => (KEBAB.test(p.slug) ? [] : [`slug "${p.slug}" is not kebab-case`]))).toEqual([]);
  });

  it('each data file only contains its own discipline', () => {
    const problems = [
      ...engineeringProjects.filter((p) => p.discipline !== 'engineering').map((p) => `${p.slug} in engineeringProjects`),
      ...creativeProjects.filter((p) => p.discipline !== 'creative').map((p) => `${p.slug} in creativeProjects`),
    ];
    expect(problems).toEqual([]);
  });

  it('category matches the discipline', () => {
    expect(
      lintProjects((p) => {
        const known = allCategories.find((category) => category.id === p.category);
        if (!known) return [`unknown category "${p.category}"`];
        return known.discipline === p.discipline ? [] : [`category "${p.category}" belongs to ${known.discipline}`];
      }),
    ).toEqual([]);
  });

  it('required text fields are present and trimmed', () => {
    expect(
      lintProjects((p) => {
        const required: Array<[string, unknown]> = [
          ['title', p.title],
          ['tagline', p.tagline],
          ['summary', p.summary],
          ...(p.discipline === 'engineering' ? ([['overview', p.overview]] as Array<[string, unknown]>) : []),
        ];
        return required.flatMap(([field, value]) => {
          if (blank(value)) return [`${field} is empty`];
          return value !== (value as string).trim() ? [`${field} has surrounding whitespace`] : [];
        });
      }),
    ).toEqual([]);
  });

  it(`summaries fit cards and 3D panels (≤ ${SUMMARY_MAX} chars), taglines are one line, titles are short`, () => {
    expect(
      lintProjects((p) => [
        ...(p.summary.length > SUMMARY_MAX ? [`summary is ${p.summary.length} chars (max ${SUMMARY_MAX})`] : []),
        ...(p.tagline.length > TAGLINE_MAX ? [`tagline is ${p.tagline.length} chars (max ${TAGLINE_MAX})`] : []),
        ...(p.title.length > TITLE_MAX ? [`title is ${p.title.length} chars (max ${TITLE_MAX})`] : []),
        ...(/\n/.test(p.tagline) ? ['tagline contains a line break'] : []),
      ]),
    ).toEqual([]);
  });

  it('tags are non-empty, unique per project, and engineering projects list at least one', () => {
    expect(
      lintProjects((p) => {
        if (!Array.isArray(p.tags)) return ['tags is not an array'];
        const problems = p.tags.filter(blank).map(() => 'blank tag');
        const dupes = duplicates(p.tags.map((tag) => tag.trim().toLowerCase()));
        if (dupes.length) problems.push(`duplicate tags: ${dupes.join(', ')}`);
        if (p.discipline === 'engineering' && p.tags.length === 0) problems.push('no tags');
        return problems;
      }),
    ).toEqual([]);
  });

  it('optional fields are omitted rather than left blank', () => {
    const optionalText: Array<keyof EngineeringProject | keyof CreativeProject> = [
      'year',
      'sourceNote',
      'problem',
      'role',
      'team',
      'context',
      'client',
    ];
    const optionalLists: Array<keyof EngineeringProject | keyof CreativeProject> = [
      'contribution',
      'approach',
      'results',
      'learnings',
      'tools',
    ];
    expect(
      lintProjects((p) => {
        const record = p as unknown as Record<string, unknown>;
        const problems: string[] = [];
        for (const field of optionalText) {
          if (field in record && record[field] !== undefined && blank(record[field])) problems.push(`${field} is blank`);
        }
        for (const field of optionalLists) {
          const list = record[field];
          if (list === undefined) continue;
          if (!Array.isArray(list)) problems.push(`${field} is not an array`);
          else list.forEach((item, i) => blank(item) && problems.push(`${field}[${i}] is blank`));
        }
        if (p.discipline === 'engineering') {
          (p.pipeline ?? []).forEach((step, i) => blank(step.label) && problems.push(`pipeline[${i}].label is blank`));
          (p.stack ?? []).forEach((group, i) => {
            if (blank(group.group)) problems.push(`stack[${i}].group is blank`);
            if (!group.items.length || group.items.some(blank)) problems.push(`stack[${i}] has blank or no items`);
          });
        }
        return problems;
      }),
    ).toEqual([]);
  });

  it('years are real, verified-looking and not in the future', () => {
    const YEAR = /^(19|20)\d{2}(\s*[–-]\s*((19|20)\d{2}|present|now))?$/i;
    expect(
      lintProjects((p) => {
        if (p.year === undefined) return [];
        if (!YEAR.test(p.year)) return [`year "${p.year}" is not "YYYY" or "YYYY – YYYY"`];
        const years = (p.year.match(/(19|20)\d{2}/g) ?? []).map(Number);
        const problems = years.filter((y) => y > CURRENT_YEAR).map((y) => `year ${y} is in the future`);
        if (years.length === 2 && years[1] < years[0]) problems.push(`year range "${p.year}" is reversed`);
        return problems;
      }),
    ).toEqual([]);
  });

  it('status and medium values are within the contract', () => {
    const statuses = ['shipped', 'prototype', 'in-progress', 'research', 'coursework', 'competition', 'archived'];
    const media = ['image', 'video', 'design'];
    const aspects = ['landscape', 'portrait', 'square'];
    expect(
      lintProjects((p) => [
        ...(p.status !== undefined && !statuses.includes(p.status) ? [`unknown status "${p.status}"`] : []),
        ...(p.discipline === 'creative' && !media.includes(p.medium) ? [`unknown medium "${p.medium}"`] : []),
        ...(p.discipline === 'creative' && p.aspect !== undefined && !aspects.includes(p.aspect)
          ? [`unknown aspect "${p.aspect}"`]
          : []),
        ...(p.order !== undefined && !Number.isFinite(p.order) ? ['order is not a finite number'] : []),
      ]),
    ).toEqual([]);
  });
});

describe('links and media', () => {
  it('every project link is https (or site-relative), labelled, unique and not obviously fake', () => {
    const kinds = ['github', 'demo', 'video', 'figma', 'behance', 'dribbble', 'instagram', 'article', 'paper', 'other'];
    expect(
      lintProjects((p) => {
        const links = p.links ?? [];
        const problems = links.flatMap((link, i) => [
          ...(blank(link.label) ? [`links[${i}] has no label`] : []),
          ...(kinds.includes(link.kind) ? [] : [`links[${i}] unknown kind "${link.kind}"`]),
          ...hrefProblems(link.href, { kind: link.kind }).map((problem) => `links[${i}] ${problem}`),
          ...localAssetProblems(link.href).map((problem) => `links[${i}] ${problem}`),
        ]);
        const dupes = duplicates(links.map((link) => link.href));
        if (dupes.length) problems.push(`duplicate links: ${dupes.join(', ')}`);
        return problems;
      }),
    ).toEqual([]);
  });

  it('media sources are https or files that exist under public/', () => {
    expect(
      lintProjects((p) =>
        mediaOf(p).flatMap(([where, item]) => [
          ...hrefProblems(item.src).map((problem) => `${where}.src ${problem}`),
          ...localAssetProblems(item.src).map((problem) => `${where}.src ${problem}`),
          ...(item.poster !== undefined
            ? [...hrefProblems(item.poster), ...localAssetProblems(item.poster)].map((problem) => `${where}.poster ${problem}`)
            : []),
          ...(item.kind === 'embed' && !item.src.startsWith('https://') ? [`${where} embed must be an https URL`] : []),
        ]),
      ),
    ).toEqual([]);
  });

  it('every media item has descriptive alt text and sane dimensions', () => {
    const GENERIC_ALT = /^(image|photo|picture|img|screenshot|cover|thumbnail|video|placeholder)\s*\d*$/i;
    expect(
      lintProjects((p) =>
        mediaOf(p).flatMap(([where, item]) => {
          const problems: string[] = [];
          const file = item.src.split('/').pop() ?? '';
          if (blank(item.alt)) problems.push(`${where} has no alt text`);
          else if (GENERIC_ALT.test(item.alt.trim()) || item.alt.trim() === file) {
            problems.push(`${where} alt "${item.alt}" is not descriptive`);
          }
          if ((item.width === undefined) !== (item.height === undefined)) problems.push(`${where} has only one of width/height`);
          for (const [name, value] of [
            ['width', item.width],
            ['height', item.height],
          ] as const) {
            if (value !== undefined && !(Number.isInteger(value) && value > 0)) problems.push(`${where}.${name} is not a positive integer`);
          }
          return problems;
        }),
      ),
    ).toEqual([]);
  });
});

describe('placeholders and honesty', () => {
  it('lists placeholder entries (informational)', () => {
    const placeholders = allProjects.filter((p) => p.placeholder).map((p) => `${p.discipline}/${p.slug}`);
    const placeholderMedia = allProjects.flatMap((p) =>
      mediaOf(p)
        .filter(([, item]) => item.placeholder)
        .map(([where]) => `${p.slug} ${where}`),
    );
    // Not a failure: surfaced so the report can track how much real content is still missing.
    console.info(
      `[content] ${placeholders.length}/${allProjects.length} placeholder projects: ${placeholders.join(', ') || 'none'}; ` +
        `${placeholderMedia.length} placeholder media: ${placeholderMedia.join(', ') || 'none'}`,
    );
    expect(placeholders.length).toBeLessThanOrEqual(allProjects.length);
  });

  it('entries worded as placeholders are flagged `placeholder: true` (so the UI labels them)', () => {
    expect(
      lintProjects((p) => {
        if (p.placeholder) return [];
        const worded = collectStrings({ title: p.title, tagline: p.tagline, summary: p.summary }).filter(([, text]) =>
          PLACEHOLDER_WORDING.test(text),
        );
        return worded.map(([field]) => `${field} reads like a placeholder but placeholder is not set`);
      }),
    ).toEqual([]);
  });

  it('media described as placeholders are flagged `placeholder: true`', () => {
    expect(
      lintProjects((p) =>
        mediaOf(p)
          .filter(([, item]) => !item.placeholder && !p.placeholder)
          .filter(([, item]) => PLACEHOLDER_WORDING.test(`${item.alt} ${item.caption ?? ''}`))
          .map(([where]) => `${where} is described as a placeholder but not flagged`),
      ),
    ).toEqual([]);
  });

  it('placeholder entries make no factual claims (no links, results or year)', () => {
    expect(
      lintProjects((p) => {
        if (!p.placeholder) return [];
        const problems: string[] = [];
        if (p.links?.length) problems.push('placeholder has links');
        if (p.year) problems.push('placeholder has a year');
        if (p.discipline === 'engineering' && p.results?.length) problems.push('placeholder has results');
        if (p.status === 'shipped') problems.push('placeholder claims status "shipped"');
        return problems;
      }),
    ).toEqual([]);
  });

  it('no filler text (lorem ipsum, TODO, TBD, FIXME) in any content', () => {
    const FILLER = /lorem ipsum|\bTODO\b|\bTBD\b|\bFIXME\b|\bXXX\b|\[insert/i;
    const strings = [
      ...allProjects.flatMap((p) => collectStrings(p, p.slug)),
      ...collectStrings(profileData, 'profile'),
      ...collectStrings(navItems, 'navItems'),
    ];
    expect(strings.filter(([, text]) => FILLER.test(text)).map(([path, text]) => `${path}: "${text}"`)).toEqual([]);
  });

  it('no personal data or secrets (phone numbers, keys, tokens, licence plates, stray emails)', () => {
    const PATTERNS: Array<[RegExp, string]> = [
      [/(?<![\d.])(?:\+\d{1,3}[\s-]?)?\d(?:[\s-]?\d){9,}(?![\d.])/, 'phone-number-like digits'],
      [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
      [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key'],
      [/\bgh[pousr]_[A-Za-z0-9]{30,}\b/, 'GitHub token'],
      [/\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'],
      [/\b(?:sk|rk)-[A-Za-z0-9_-]{20,}\b/, 'API secret key'],
      [/\bxox[abprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
      [/\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/, 'JWT'],
      [/\b(?:[A-Z][A-Z0-9]*_)+(?:KEY|SECRET|TOKEN|PASSWORD|PASS|DSN)\s*[=:]\s*\S+/, '.env-style secret'],
      [/\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s/:@]+:[^\s/@]+@/i, 'credentials in a connection string'],
      [/\b[A-Z]{2}[ -]?\d{1,2}[ -]?[A-Z]{1,3}[ -]?\d{4}\b/, 'vehicle-registration-like string'],
      [/\b\d{2}[ -]?BH[ -]?\d{4}[ -]?[A-Z]{1,2}\b/, 'BH-series registration'],
    ];
    const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    const strings = [...allProjects.flatMap((p) => collectStrings(p, p.slug)), ...collectStrings(profileData, 'profile')];
    const problems = strings.flatMap(([path, text]) => {
      const hits = PATTERNS.filter(([pattern]) => pattern.test(text)).map(([, why]) => `${path}: ${why}`);
      // A contact address deliberately published in profile.socials (mailto:) is fine; anywhere else it is not.
      const isPublishedContact = /^profile\.socials\[\d+\]\.href$/.test(path) && text.startsWith('mailto:');
      if (EMAIL.test(text) && !isPublishedContact) hits.push(`${path}: email address outside profile.socials`);
      return hits;
    });
    expect(problems).toEqual([]);
  });
});

describe('routing helpers over real data', () => {
  it('projectPath builds /<discipline>/<slug> under the gallery path', () => {
    expect(
      lintProjects((p) => {
        const expected = `/${p.discipline}/${p.slug}`;
        const actual = projectPath(p);
        return actual === expected && actual.startsWith(`${galleryPath(p.discipline)}/`) ? [] : [`projectPath → ${actual}`];
      }),
    ).toEqual([]);
  });

  it('every slug round-trips through its discipline lookup and not the other', () => {
    expect(
      lintProjects((p) => {
        const own = p.discipline === 'engineering' ? getEngineeringProject(p.slug) : getCreativeProject(p.slug);
        const other = p.discipline === 'engineering' ? getCreativeProject(p.slug) : getEngineeringProject(p.slug);
        return [...(own === p ? [] : ['own lookup failed']), ...(other ? ['found in the other discipline'] : [])];
      }),
    ).toEqual([]);
    expect(getEngineeringProject(undefined)).toBeUndefined();
    expect(getCreativeProject('definitely-not-a-real-slug')).toBeUndefined();
  });

  it('getProjects is sorted by order with unordered entries last', () => {
    for (const list of [sortedEngineering, sortedCreative]) {
      const orders = list.map((p) => p.order ?? 999);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    }
    expect(getProjects('engineering')).toBe(sortedEngineering);
    expect(getProjects('creative')).toBe(sortedCreative);
  });

  it('getAdjacent wraps around within the discipline', () => {
    for (const list of [sortedEngineering, sortedCreative] as Project[][]) {
      list.forEach((project, i) => {
        const { previous, next } = getAdjacent(project);
        if (list.length < 2) {
          expect({ previous, next }).toEqual({ previous: null, next: null });
          return;
        }
        expect(previous).toBe(list[(i - 1 + list.length) % list.length]);
        expect(next).toBe(list[(i + 1) % list.length]);
        expect(next?.discipline).toBe(project.discipline);
        expect(getAdjacent(next as Project).previous).toBe(project);
      });
    }
  });

  it('countByCategory covers every project of the discipline', () => {
    for (const discipline of ['engineering', 'creative'] as const) {
      const counts = countByCategory(discipline);
      const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
      expect(total).toBe(getProjects(discipline).length);
      for (const category of counts.keys()) expect(getCategory(category).discipline).toBe(discipline);
    }
  });
});

describe('featured projects and the 3D world', () => {
  for (const discipline of ['engineering', 'creative'] as const) {
    it(`${discipline}: featured projects fit the ${EXHIBIT_SLOTS[discipline].length} exhibit slots`, () => {
      const featured = getProjects(discipline).filter((p) => p.featured);
      expect(
        featured.length,
        `featured ${discipline} projects beyond the slot count never appear in the world: ${featured
          .slice(EXHIBIT_SLOTS[discipline].length)
          .map((p) => p.slug)
          .join(', ')}`,
      ).toBeLessThanOrEqual(EXHIBIT_SLOTS[discipline].length);
    });

    it(`${discipline}: exhibits are the featured projects, in slot order`, () => {
      const exhibits = exhibitsIn(discipline);
      const expected = getFeatured(discipline, EXHIBIT_SLOTS[discipline].length);
      expect(exhibits.map((e) => e.project)).toEqual(expected);
      exhibits.forEach((exhibit, index) => {
        expect(exhibit.id).toBe(`exhibit:${exhibit.project.slug}`);
        expect(exhibit.district).toBe(exhibit.project.discipline);
        expect(exhibit.index).toBe(index);
        expect(exhibit.slot).toBe(EXHIBIT_SLOTS[discipline][index]);
        expect(getExhibit(exhibit.id)).toBe(exhibit);
      });
    });
  }

  it('exhibit ids are unique and getExhibit rejects unknown ids', () => {
    expect(duplicates(WORLD_EXHIBITS.map((e) => e.id))).toEqual([]);
    expect(getExhibit(null)).toBeUndefined();
    expect(getExhibit('exhibit:not-a-project')).toBeUndefined();
  });
});

describe('categories', () => {
  it('ids are unique and each list holds only its discipline', () => {
    expect(duplicates(allCategories.map((c) => c.id))).toEqual([]);
    expect(engineeringCategories.every((c) => c.discipline === 'engineering')).toBe(true);
    expect(creativeCategories.every((c) => c.discipline === 'creative')).toBe(true);
  });

  it('every category has a label, short label and description', () => {
    const problems = allCategories.flatMap((c) =>
      (['label', 'shortLabel', 'description'] as const).filter((field) => blank(c[field])).map((field) => `${c.id}.${field} blank`),
    );
    expect(problems).toEqual([]);
  });

  it('getCategory throws on unknown ids', () => {
    expect(() => getCategory('nope' as never)).toThrow(/Unknown category/);
  });
});

describe('profile', () => {
  it('core identity fields are filled in', () => {
    const problems = (['name', 'title', 'tagline', 'status'] as const)
      .filter((field) => blank(profileData[field]))
      .map((field) => `${field} is blank`);
    if (!profileData.bio.length || profileData.bio.some(blank)) problems.push('bio is empty or has blank paragraphs');
    expect(problems).toEqual([]);
  });

  it('socials are real-looking https links on the right hosts (mailto only for email)', () => {
    const problems = profileData.socials.flatMap((social, i) => [
      ...(blank(social.label) ? [`socials[${i}] has no label`] : []),
      ...hrefProblems(social.href, { allowMailto: social.kind === 'email', kind: social.kind }).map(
        (problem) => `socials[${i}] ${problem}`,
      ),
      ...(social.kind === 'email' && !social.href.startsWith('mailto:') ? [`socials[${i}] email must be mailto:`] : []),
    ]);
    const dupes = duplicates(profileData.socials.map((s) => s.href));
    if (dupes.length) problems.push(`duplicate socials: ${dupes.join(', ')}`);
    expect(problems).toEqual([]);
  });

  it('every resume track has a real PDF under public/ (or none yet) and valid references', () => {
    const problems: string[] = [];
    const slugs = new Set(allProjects.map((project) => project.slug));
    const categories = new Set(profileData.skillGroups.map((group) => group.category));
    if (!profileData.resumes.length) problems.push('no resume tracks');
    const dupes = duplicates(profileData.resumes.map((track) => track.id));
    if (dupes.length) problems.push(`duplicate resume track ids: ${dupes.join(', ')}`);
    for (const track of profileData.resumes) {
      const { id, pdfUrl } = track;
      if (blank(track.label) || blank(track.shortLabel) || blank(track.focus)) problems.push(`resumes.${id}: blank label/focus`);
      track.skillCategories.forEach((category) => {
        if (!categories.has(category)) problems.push(`resumes.${id}: unknown skill category "${category}"`);
      });
      track.projectSlugs.forEach((slug) => {
        if (!slugs.has(slug)) problems.push(`resumes.${id}: unknown project slug "${slug}"`);
      });
      if (pdfUrl === '') continue;
      problems.push(...hrefProblems(pdfUrl).map((problem) => `resumes.${id}.pdfUrl ${problem}`));
      if (!/^\/[^?#]+\.pdf$/i.test(pdfUrl)) problems.push(`resumes.${id}.pdfUrl "${pdfUrl}" is not a site-relative .pdf`);
      else if (!PUBLIC_FILES.has(pdfUrl)) problems.push(`resumes.${id}.pdfUrl: missing file public${pdfUrl}`);
      else {
        const raw = PUBLIC_PDFS[pdfUrl] ?? '';
        if (/placeholder/i.test(raw) || raw.length < 2048) problems.push(`resumes.${id}.pdfUrl is a placeholder/empty PDF (${raw.length} bytes)`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('skills, education, experience and interests have no blank entries', () => {
    const problems: string[] = [];
    profileData.skillGroups.forEach((group, i) => {
      if (blank(group.category)) problems.push(`skillGroups[${i}].category blank`);
      if (!group.items.length || group.items.some(blank)) problems.push(`skillGroups[${i}] has blank or no items`);
      const dupes = duplicates(group.items.map((item) => item.toLowerCase()));
      if (dupes.length) problems.push(`skillGroups[${i}] duplicates: ${dupes.join(', ')}`);
    });
    profileData.education.forEach((entry, i) => {
      (['institution', 'degree', 'field', 'period'] as const).forEach(
        (field) => blank(entry[field]) && problems.push(`education[${i}].${field} blank`),
      );
    });
    profileData.experience.forEach((entry, i) => {
      (['role', 'organisation', 'period', 'description'] as const).forEach(
        (field) => blank(entry[field]) && problems.push(`experience[${i}].${field} blank`),
      );
      [...entry.highlights, ...entry.technologies].forEach((item) => blank(item) && problems.push(`experience[${i}] blank item`));
    });
    if (profileData.interests.some(blank)) problems.push('blank interest');
    expect(problems).toEqual([]);
  });
});

describe('navigation', () => {
  it('nav items are unique and point at real top-level routes', () => {
    const routes = Object.values(paths) as string[];
    expect(duplicates(navItems.map((item) => item.path))).toEqual([]);
    expect(duplicates(navItems.map((item) => item.label))).toEqual([]);
    expect(navItems.filter((item) => !routes.includes(item.path)).map((item) => item.path)).toEqual([]);
    expect(navItems[0]?.path).toBe(paths.home);
  });

  it('every top-level route is reachable from the navigation', () => {
    const navPaths = navItems.map((item) => item.path);
    expect((Object.values(paths) as string[]).filter((path) => !navPaths.includes(path))).toEqual([]);
  });
});

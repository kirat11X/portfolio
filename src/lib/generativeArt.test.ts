// @vitest-environment jsdom
//
// Generative cover art must be deterministic (same project → same artwork in the
// DOM and on 3D panels), vary between projects, be well-formed SVG, and be
// memoised as a data URL.

import { describe, expect, it, vi } from 'vitest';
import type { ProjectCategory } from '@/types';
import { allCategories } from '@/data/categories';
import { palette } from '@/styles/tokens';
import { ART_SIZES, artDataUrl, generateArtSvg, motifByCategory, type ArtAspect } from './generativeArt';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PREFIX = 'data:image/svg+xml;charset=utf-8,';
const CATEGORIES = allCategories.map((category) => category.id) as ProjectCategory[];
const ENGINEERING = new Set(allCategories.filter((c) => c.discipline === 'engineering').map((c) => c.id));
const ASPECTS = Object.keys(ART_SIZES) as ArtAspect[];
const SEEDS = ['campus-vehicle-security', 'a', '', 'ünïcødé-✓ & <tags> "quotes"', 'x'.repeat(400)];
/** Data URLs feed <img> tags and 3D textures; keep them comfortably small. */
const MAX_DATA_URL_CHARS = 200_000;

const NUMERIC_ATTRS = [
  'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'x1', 'y1', 'x2', 'y2',
  'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity', 'stop-opacity', 'offset', 'stdDeviation',
];

/** Problems with an SVG document string; empty when well-formed and sane. */
function svgProblems(svg: string, aspect: ArtAspect): string[] {
  const problems: string[] = [];
  for (const bad of ['NaN', 'undefined', 'Infinity', 'null', '[object']) {
    if (svg.includes(bad)) problems.push(`contains "${bad}"`);
  }
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  } catch (error) {
    return [...problems, `parse threw: ${String(error)}`];
  }
  if (doc.getElementsByTagName('parsererror').length) return [...problems, 'XML parser error'];

  const root = doc.documentElement;
  if (root.localName !== 'svg' || root.namespaceURI !== SVG_NS) problems.push(`root is <${root.localName}> in ${root.namespaceURI}`);
  const [w, h] = ART_SIZES[aspect];
  if (root.getAttribute('width') !== String(w) || root.getAttribute('height') !== String(h)) {
    problems.push(`size ${root.getAttribute('width')}×${root.getAttribute('height')} ≠ ${w}×${h}`);
  }
  if (root.getAttribute('viewBox') !== `0 0 ${w} ${h}`) problems.push(`viewBox "${root.getAttribute('viewBox')}"`);

  const ids = new Set([...root.querySelectorAll('[id]')].map((el) => el.id));
  for (const el of root.querySelectorAll('*')) {
    for (const name of NUMERIC_ATTRS) {
      const value = el.getAttribute(name);
      if (value !== null && !Number.isFinite(Number.parseFloat(value))) problems.push(`<${el.localName} ${name}="${value}">`);
    }
    for (const attr of el.attributes) {
      for (const [, ref] of attr.value.matchAll(/url\(#([^)]+)\)/g)) {
        if (!ids.has(ref)) problems.push(`<${el.localName}> references missing #${ref}`);
      }
    }
  }
  if (root.querySelectorAll('*').length < 10) problems.push('suspiciously few elements');
  return problems;
}

describe('generateArtSvg', () => {
  it('is deterministic for the same seed, category and aspect', () => {
    for (const category of CATEGORIES) {
      for (const aspect of ASPECTS) {
        const options = { seed: 'determinism-check', category, aspect };
        expect(generateArtSvg(options)).toBe(generateArtSvg({ ...options }));
      }
    }
  });

  it('differs between seeds within every category', () => {
    for (const category of CATEGORIES) {
      expect(generateArtSvg({ seed: 'alpha', category }), category).not.toBe(generateArtSvg({ seed: 'beta', category }));
    }
  });

  it('differs between categories for the same seed', () => {
    const outputs = CATEGORIES.map((category) => generateArtSvg({ seed: 'same-seed', category }));
    expect(new Set(outputs).size).toBe(CATEGORIES.length);
  });

  it('has a motif for every category', () => {
    for (const category of CATEGORIES) expect(motifByCategory[category], category).toBeTruthy();
  });

  it('produces well-formed SVG for every category, aspect and awkward seed', () => {
    const problems: string[] = [];
    for (const category of CATEGORIES) {
      for (const aspect of ASPECTS) {
        for (const seed of SEEDS) {
          problems.push(
            ...svgProblems(generateArtSvg({ seed, category, aspect }), aspect).map(
              (problem) => `${category}/${aspect}/"${seed.slice(0, 12)}": ${problem}`,
            ),
          );
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('uses the discipline accent by default and honours overrides', () => {
    for (const category of CATEGORIES) {
      const svg = generateArtSvg({ seed: 'accent', category });
      expect(svg, category).toContain(ENGINEERING.has(category) ? palette.eng : palette.cre);
    }
    const custom = generateArtSvg({ seed: 'accent', category: 'ml', accent: '#123456', accent2: '#654321' });
    expect(custom).toContain('#123456');
    expect(custom).toContain('#654321');
    expect(custom).not.toContain(palette.eng);
  });
});

describe('artDataUrl', () => {
  it('encodes exactly the generated SVG', () => {
    const options = { seed: 'encode-check', category: 'cv' as const, aspect: 'portrait' as const };
    const url = artDataUrl(options);
    expect(url.startsWith(PREFIX)).toBe(true);
    expect(decodeURIComponent(url.slice(PREFIX.length))).toBe(generateArtSvg(options));
  });

  it('memoises per option set (the SVG is generated and encoded once)', () => {
    const encode = vi.spyOn(globalThis, 'encodeURIComponent');
    const options = { seed: `cache-${Math.random()}`, category: 'photography' as const };
    const first = artDataUrl(options);
    const second = artDataUrl({ ...options });
    const explicitDefault = artDataUrl({ ...options, aspect: 'landscape' });
    expect(second).toBe(first);
    expect(explicitDefault).toBe(first);
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it('keys the cache on aspect and accents', () => {
    const base = { seed: 'cache-keys', category: 'software' as const };
    const urls = [
      artDataUrl(base),
      artDataUrl({ ...base, aspect: 'square' }),
      artDataUrl({ ...base, accent: '#ff0000' }),
      artDataUrl({ ...base, accent2: '#00ff00' }),
    ];
    expect(new Set(urls).size).toBe(urls.length);
  });

  it(`stays under ${MAX_DATA_URL_CHARS / 1000} k characters`, () => {
    let largest = 0;
    for (const category of CATEGORIES) {
      for (const aspect of ASPECTS) {
        largest = Math.max(largest, artDataUrl({ seed: 'size-check', category, aspect }).length);
      }
    }
    console.info(`[generativeArt] largest data URL: ${(largest / 1024).toFixed(1)} KiB`);
    expect(largest).toBeLessThan(MAX_DATA_URL_CHARS);
  });
});

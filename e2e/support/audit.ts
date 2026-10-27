// In-page structural checks shared by the accessibility, routes and world specs.
// They return human-readable problems (empty = pass) so failures list every
// offender at once.

import type { Page } from '@playwright/test';

export interface OverflowReport {
  innerWidth: number;
  clientWidth: number;
  scrollWidth: number;
  /** Elements that stick out of the viewport and are not clipped by a scroll container. */
  offenders: string[];
}

/**
 * Accessibility smoke checks for the current DOM:
 * exactly one h1, one main, lang set, alt on every img, rel="noopener" on
 * external / new-tab links, accessible names on buttons and links, unique ids,
 * and ARIA id references that resolve.
 */
export function structuralProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = [];
    const describe = (el: Element) => el.outerHTML.replace(/\s+/g, ' ').slice(0, 140);
    const hiddenFromAT = (el: Element) => Boolean(el.closest('[aria-hidden="true"], [hidden], [inert]'));

    const h1s = Array.from(document.querySelectorAll('h1'));
    if (h1s.length !== 1) {
      problems.push(`expected exactly one <h1>, found ${h1s.length}: ${h1s.map((h) => JSON.stringify(h.textContent?.trim())).join(', ')}`);
    }
    const mains = document.querySelectorAll('main');
    if (mains.length !== 1) problems.push(`expected one <main>, found ${mains.length}`);
    if (!document.documentElement.lang) problems.push('<html> has no lang attribute');

    for (const img of Array.from(document.querySelectorAll('img'))) {
      if (!img.hasAttribute('alt')) problems.push(`<img> without alt: ${describe(img)}`);
    }

    for (const anchor of Array.from(document.querySelectorAll('a[href]'))) {
      const href = anchor.getAttribute('href') ?? '';
      let url: URL;
      try {
        url = new URL(href, location.href);
      } catch {
        problems.push(`unparseable href "${href}"`);
        continue;
      }
      const external = /^https?:$/.test(url.protocol) && url.origin !== location.origin;
      const rel = (anchor.getAttribute('rel') ?? '').toLowerCase().split(/\s+/);
      if ((external || anchor.getAttribute('target') === '_blank') && !rel.includes('noopener')) {
        problems.push(`link to ${href} lacks rel="noopener"`);
      }
    }

    const nameOf = (el: Element): string => {
      const label = el.getAttribute('aria-label')?.trim();
      if (label) return label;
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const text = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ')
          .trim();
        if (text) return text;
      }
      const text = (el.textContent ?? '').trim();
      if (text) return text;
      const alt = Array.from(el.querySelectorAll('img[alt], [role="img"][aria-label]'))
        .map((node) => node.getAttribute('alt') ?? node.getAttribute('aria-label') ?? '')
        .join(' ')
        .trim();
      return alt || (el.getAttribute('title') ?? '').trim();
    };
    for (const el of Array.from(document.querySelectorAll('button, a[href], [role="button"], [role="link"]'))) {
      if (hiddenFromAT(el)) continue;
      if (!nameOf(el)) problems.push(`<${el.tagName.toLowerCase()}> without an accessible name: ${describe(el)}`);
    }

    const ids = new Map<string, number>();
    for (const el of Array.from(document.querySelectorAll('[id]'))) ids.set(el.id, (ids.get(el.id) ?? 0) + 1);
    for (const [id, count] of ids) if (count > 1) problems.push(`id "${id}" is used ${count} times`);

    for (const attr of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'for']) {
      for (const el of Array.from(document.querySelectorAll(`[${attr}]`))) {
        // A collapsed control may point at content that is not rendered yet.
        if (attr === 'aria-controls' && el.getAttribute('aria-expanded') === 'false') continue;
        for (const id of (el.getAttribute(attr) ?? '').split(/\s+/).filter(Boolean)) {
          if (!document.getElementById(id)) problems.push(`${attr}="${id}" points at a missing element: ${describe(el)}`);
        }
      }
    }
    return problems;
  });
}

/** Horizontal overflow of the document, with the elements responsible. */
export function horizontalOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const root = document.documentElement;
    const limit = root.clientWidth;
    const clippedByAncestor = (el: Element) => {
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        const { overflowX } = getComputedStyle(node);
        if (overflowX !== 'visible') return true;
      }
      return false;
    };
    const offenders: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll('*'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right <= limit + 1 && rect.left >= -1) continue;
      if (getComputedStyle(el).position === 'fixed' || clippedByAncestor(el)) continue;
      const name = `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}.${String(el.getAttribute('class') ?? '')
        .split(/\s+/)
        .slice(0, 3)
        .join('.')}`;
      offenders.push(`${name} [${Math.round(rect.left)}…${Math.round(rect.right)}]`);
      if (offenders.length >= 12) break;
    }
    return { innerWidth: window.innerWidth, clientWidth: limit, scrollWidth: root.scrollWidth, offenders };
  });
}

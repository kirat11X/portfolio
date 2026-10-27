// Presentation helpers shared by the gallery components and the engineering
// pages: labels, accent tones, link lookups and the search matcher. Pure
// functions only — components live in the sibling .tsx files.

import type { CategoryMeta, LinkKind, Project, ProjectLink, ProjectStatus } from '@/types';
import { getCategory } from '@/data/categories';
import { isExternalHref } from '@/lib/routes';

/** One accent per discipline: cyan for engineering, violet for creative. */
export type AccentTone = 'eng' | 'cre';

export function accentTone(project: Pick<Project, 'discipline'>): AccentTone {
  return project.discipline === 'engineering' ? 'eng' : 'cre';
}

/** RGB triplets matching --color-eng / --color-cre, for translucent gradients. */
export const ACCENT_RGB: Record<AccentTone, string> = {
  eng: '62 224 255',
  cre: '180 140 255',
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  shipped: 'Shipped',
  prototype: 'Prototype',
  'in-progress': 'In progress',
  research: 'Research',
  coursework: 'Coursework',
  competition: 'Competition',
  archived: 'Archived',
};

export function categoryOf(project: Pick<Project, 'category'>): CategoryMeta {
  return getCategory(project.category);
}

/** Verb for the call to action that opens a project. */
export function openLabel(project: Pick<Project, 'discipline'>): string {
  return project.discipline === 'engineering' ? 'Read the case study' : 'View the project';
}

const LINK_PRIORITY: LinkKind[] = ['demo', 'github', 'video', 'paper', 'article', 'figma', 'behance', 'dribbble', 'instagram', 'other'];

/** Links with a usable href, most useful first (live demo, then source, then the rest). */
export function usableLinks(project: Pick<Project, 'links'>): ProjectLink[] {
  return (project.links ?? [])
    .filter((link) => link.href.trim().length > 0)
    .sort((a, b) => LINK_PRIORITY.indexOf(a.kind) - LINK_PRIORITY.indexOf(b.kind));
}

/** Attributes for an anchor: external destinations open in a new tab. */
export function anchorProps(href: string): { href: string; target?: '_blank'; rel?: string } {
  const external = isExternalHref(href) && !href.startsWith('mailto:');
  return external ? { href, target: '_blank', rel: 'noopener noreferrer' } : { href };
}

export function isNewTab(href: string): boolean {
  return isExternalHref(href) && !href.startsWith('mailto:');
}

/** "1 project", "3 projects". */
export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Two-digit step numbers for ordered content ("01", "02" …). */
export function stepNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

function searchableText(project: Project): string {
  const category = categoryOf(project);
  const parts: string[] = [project.title, project.tagline, project.summary, category.label, category.shortLabel, ...project.tags];
  if (project.discipline === 'engineering') {
    for (const group of project.stack ?? []) parts.push(group.group, ...group.items);
  } else {
    parts.push(...(project.tools ?? []));
  }
  return parts.join('   ').toLocaleLowerCase();
}

const searchCache = new WeakMap<Project, string>();

/**
 * True when every whitespace-separated term of `query` appears in the project's
 * title, tagline, summary, category, tags or stack (case-insensitive).
 */
export function matchesQuery(project: Project, query: string): boolean {
  const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  let haystack = searchCache.get(project);
  if (haystack === undefined) {
    haystack = searchableText(project);
    searchCache.set(project, haystack);
  }
  return terms.every((term) => haystack.includes(term));
}

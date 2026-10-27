import type { CreativeProject, Discipline, EngineeringProject, Project, ProjectCategory } from '@/types';
import { engineeringProjects } from '@/data/engineeringProjects';
import { creativeProjects } from '@/data/creativeProjects';

const byOrder = <T extends Project>(list: readonly T[]): T[] =>
  [...list].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

export const sortedEngineering: EngineeringProject[] = byOrder(engineeringProjects);
export const sortedCreative: CreativeProject[] = byOrder(creativeProjects);
export const allProjects: Project[] = [...sortedEngineering, ...sortedCreative];

export function getProjects(discipline: 'engineering'): EngineeringProject[];
export function getProjects(discipline: 'creative'): CreativeProject[];
export function getProjects(discipline: Discipline): Project[];
export function getProjects(discipline: Discipline): Project[] {
  return discipline === 'engineering' ? sortedEngineering : sortedCreative;
}

export function getEngineeringProject(slug: string | undefined): EngineeringProject | undefined {
  return sortedEngineering.find((project) => project.slug === slug);
}

export function getCreativeProject(slug: string | undefined): CreativeProject | undefined {
  return sortedCreative.find((project) => project.slug === slug);
}

/** Featured projects first (by order), then the rest, capped at `limit`. */
export function getFeatured(discipline: 'engineering', limit?: number): EngineeringProject[];
export function getFeatured(discipline: 'creative', limit?: number): CreativeProject[];
export function getFeatured(discipline: Discipline, limit?: number): Project[];
export function getFeatured(discipline: Discipline, limit = Infinity): Project[] {
  const list = getProjects(discipline);
  const featured = list.filter((project) => project.featured);
  return (featured.length ? featured : list).slice(0, limit);
}

/** Previous and next project within the same discipline, wrapping around. */
export function getAdjacent(project: Project): { previous: Project | null; next: Project | null } {
  const list: Project[] = getProjects(project.discipline);
  const index = list.findIndex((candidate) => candidate.slug === project.slug);
  if (index === -1 || list.length < 2) return { previous: null, next: null };
  return {
    previous: list[(index - 1 + list.length) % list.length],
    next: list[(index + 1) % list.length],
  };
}

export function countByCategory(discipline: Discipline): Map<ProjectCategory, number> {
  const counts = new Map<ProjectCategory, number>();
  for (const project of getProjects(discipline)) {
    counts.set(project.category, (counts.get(project.category) ?? 0) + 1);
  }
  return counts;
}

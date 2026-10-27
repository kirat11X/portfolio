import type { Discipline, Project } from '@/types';

export const paths = {
  home: '/',
  engineering: '/engineering',
  creative: '/creative',
  about: '/about',
  resume: '/resume',
  contact: '/contact',
} as const;

export function galleryPath(discipline: Discipline): string {
  return discipline === 'engineering' ? paths.engineering : paths.creative;
}

export function projectPath(project: Pick<Project, 'discipline' | 'slug'>): string {
  return `${galleryPath(project.discipline)}/${project.slug}`;
}

export function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//.test(href) || href.startsWith('mailto:');
}

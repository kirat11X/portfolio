// Maps featured projects onto the exhibit slots defined in layout.ts.
// Project content always comes from src/data via src/lib/projects.ts, so
// editing a data file updates the world automatically.

import type { Project } from '@/types';
import { getFeatured } from '@/lib/projects';
import { EXHIBIT_SLOTS, type ExhibitDistrict, type ExhibitSlot } from './layout';

export interface WorldExhibit {
  /** "exhibit:<slug>" — also used as the interactable id in the world store. */
  id: string;
  project: Project;
  district: ExhibitDistrict;
  slot: ExhibitSlot;
  /** 0-based position within its district (0 = most prominent). */
  index: number;
}

function place(district: ExhibitDistrict, projects: Project[]): WorldExhibit[] {
  const slots = EXHIBIT_SLOTS[district];
  return projects.slice(0, slots.length).map((project, index) => ({
    id: `exhibit:${project.slug}`,
    project,
    district,
    slot: slots[index],
    index,
  }));
}

export const WORLD_EXHIBITS: WorldExhibit[] = [
  ...place('engineering', getFeatured('engineering', EXHIBIT_SLOTS.engineering.length)),
  ...place('creative', getFeatured('creative', EXHIBIT_SLOTS.creative.length)),
];

const byId = new Map(WORLD_EXHIBITS.map((exhibit) => [exhibit.id, exhibit]));

export function getExhibit(id: string | null | undefined): WorldExhibit | undefined {
  return id ? byId.get(id) : undefined;
}

export function exhibitsIn(district: ExhibitDistrict): WorldExhibit[] {
  return WORLD_EXHIBITS.filter((exhibit) => exhibit.district === district);
}

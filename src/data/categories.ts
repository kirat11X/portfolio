import type { CategoryMeta, CreativeCategory, EngineeringCategory } from '@/types';

export const engineeringCategories: CategoryMeta<EngineeringCategory>[] = [
  {
    id: 'software',
    discipline: 'engineering',
    label: 'Software & Systems',
    shortLabel: 'Software',
    description: 'Full-stack applications, backends and dependable systems.',
  },
  {
    id: 'ml',
    discipline: 'engineering',
    label: 'Machine & Deep Learning',
    shortLabel: 'ML / DL',
    description: 'Models, training pipelines and applied learning systems.',
  },
  {
    id: 'cv',
    discipline: 'engineering',
    label: 'Computer Vision',
    shortLabel: 'Vision',
    description: 'Detection, recognition and video-analysis pipelines.',
  },
  {
    id: 'dsa',
    discipline: 'engineering',
    label: 'DSA & Algorithms',
    shortLabel: 'DSA',
    description: 'Data structures, algorithms and competitive programming.',
  },
  {
    id: 'research',
    discipline: 'engineering',
    label: 'Research & Experiments',
    shortLabel: 'Research',
    description: 'Experimental systems, studies and prototypes.',
  },
];

export const creativeCategories: CategoryMeta<CreativeCategory>[] = [
  {
    id: 'photography',
    discipline: 'creative',
    label: 'Photography',
    shortLabel: 'Photo',
    description: 'Street, travel and portrait photography.',
  },
  {
    id: 'editing',
    discipline: 'creative',
    label: 'Photo Editing & Retouching',
    shortLabel: 'Editing',
    description: 'Colour grading, compositing and retouching.',
  },
  {
    id: 'video',
    discipline: 'creative',
    label: 'Video Editing',
    shortLabel: 'Video',
    description: 'Edits, reels and short films.',
  },
  {
    id: 'motion',
    discipline: 'creative',
    label: 'Motion Graphics',
    shortLabel: 'Motion',
    description: 'Animated titles, transitions and motion design.',
  },
  {
    id: 'ui-ux',
    discipline: 'creative',
    label: 'UI / UX Design',
    shortLabel: 'UI / UX',
    description: 'Interface design and prototypes in Figma.',
  },
  {
    id: 'graphic-design',
    discipline: 'creative',
    label: 'Graphic Design',
    shortLabel: 'Graphic',
    description: 'Posters, branding, thumbnails and event creatives.',
  },
];

export const allCategories: CategoryMeta[] = [...engineeringCategories, ...creativeCategories];

const byId = new Map(allCategories.map((category) => [category.id, category]));

export function getCategory(id: CategoryMeta['id']): CategoryMeta {
  const category = byId.get(id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}

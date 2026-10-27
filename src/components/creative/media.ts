// Media helpers shared by the creative studio components. Pure functions only.

import type { CreativeCategory, CreativeProject, MediaItem } from '@/types';
import { ART_SIZES, artDataUrl, type ArtAspect } from '@/lib/generativeArt';
import type { BeforeAfterPair } from '@/data/creativeProjects';

/** Width ÷ height of each cover aspect (matches ProjectCover's aspect classes). */
export const ASPECT_RATIO: Record<ArtAspect, number> = {
  landscape: 16 / 10,
  portrait: 3 / 4,
  square: 1,
};

export function projectAspect(project: CreativeProject): ArtAspect {
  return project.aspect ?? 'landscape';
}

/** True when the entry, or the cover that represents it, is a stand-in. */
export function isPlaceholder(project: CreativeProject): boolean {
  return Boolean(project.placeholder || project.cover?.placeholder);
}

/** Width ÷ height of a media item, or `fallback` when its dimensions are unknown. */
export function mediaRatio(item: MediaItem | undefined, fallback: number): number {
  return item?.width && item.height ? item.width / item.height : fallback;
}

interface ArtMediaOptions {
  aspect?: ArtAspect;
  /** Draw a different motif than the project's own category. */
  category?: CreativeCategory;
  /** Varies the composition while staying deterministic. */
  seedSuffix?: string;
  alt?: string;
  caption?: string;
}

/**
 * The project's abstract generated artwork as a MediaItem. Always flagged as a
 * placeholder, and described as abstract artwork rather than as the work itself.
 */
export function placeholderArt(project: CreativeProject, options: ArtMediaOptions = {}): MediaItem {
  const aspect = options.aspect ?? projectAspect(project);
  const [width, height] = ART_SIZES[aspect];
  return {
    kind: 'image',
    src: artDataUrl({ seed: `${project.slug}${options.seedSuffix ?? ''}`, category: options.category ?? project.category, aspect }),
    alt: options.alt ?? `Abstract placeholder artwork for “${project.title}”. It is not the finished work.`,
    width,
    height,
    caption: options.caption ?? `${project.title} — placeholder artwork until the original work is added.`,
    placeholder: true,
  };
}

/** The real cover image if there is one, otherwise the placeholder artwork. */
export function coverMedia(project: CreativeProject): MediaItem {
  const { cover } = project;
  if (cover?.kind === 'image') {
    return { ...cover, caption: cover.caption ?? project.title, placeholder: cover.placeholder || project.placeholder };
  }
  if (cover?.kind === 'video' && cover.poster) {
    return {
      kind: 'image',
      src: cover.poster,
      alt: cover.alt,
      width: cover.width,
      height: cover.height,
      caption: cover.caption ?? project.title,
      placeholder: cover.placeholder || project.placeholder,
    };
  }
  return placeholderArt(project);
}

/** The first playable item (video file or embed) of a video entry. */
export function findPlayable(project: CreativeProject): MediaItem | undefined {
  return [project.cover, ...(project.gallery ?? [])].find(
    (item): item is MediaItem => item !== undefined && (item.kind === 'video' || item.kind === 'embed'),
  );
}

/** Image-like entries can be previewed in the lightbox straight from the gallery. */
export function canQuickView(project: CreativeProject): boolean {
  return project.medium !== 'video';
}

/** Width ÷ height of a gallery tile, used to balance the masonry columns. */
export function tileRatio(project: CreativeProject): number {
  const aspect = projectAspect(project);
  if (project.medium === 'design') return aspect === 'portrait' ? 3 / 4 : 4 / 3;
  return ASPECT_RATIO[aspect];
}

/**
 * A stand-in comparison for editing slots without a real before/after pair:
 * the same abstract artwork twice. The page renders the "before" side muted so
 * the slider has something to reveal; both images say they are placeholders.
 */
export function placeholderComparison(project: CreativeProject): BeforeAfterPair {
  const shared = { aspect: projectAspect(project), category: 'photography' as const, seedSuffix: ':compare' };
  return {
    before: placeholderArt(project, {
      ...shared,
      alt: 'Placeholder “before”: abstract artwork shown muted, standing in for an unedited photograph.',
      caption: 'Before — placeholder',
    }),
    after: placeholderArt(project, {
      ...shared,
      alt: 'Placeholder “after”: the same abstract artwork in full colour, standing in for the finished edit.',
      caption: 'After — placeholder',
    }),
  };
}

/** The kind of hero a project page shows. */
export type HeroKind = 'comparison' | 'video' | 'video-slot' | 'design' | 'image';

/** Content width ÷ height of a browser frame (16:10 screen plus its title bar) and a phone frame. */
const BROWSER_RATIO = 1.5;
const PHONE_RATIO = 0.47;

/** Which hero a project gets, and how wide it is (used to choose the page layout). */
export function heroRatio(project: CreativeProject, kind: HeroKind, playable?: MediaItem, comparison?: BeforeAfterPair): number {
  const fallback = ASPECT_RATIO[projectAspect(project)];
  switch (kind) {
    case 'comparison':
      return mediaRatio(comparison?.after, fallback);
    case 'video':
      return mediaRatio(playable, playable?.kind === 'embed' ? 16 / 9 : fallback);
    case 'design':
      return projectAspect(project) === 'portrait' ? PHONE_RATIO : BROWSER_RATIO;
    case 'video-slot':
      return fallback;
    case 'image':
      return mediaRatio(project.cover?.kind === 'image' ? project.cover : undefined, fallback);
  }
}

/**
 * A copy of a media item for the shared Lightbox. Its <img> applies `width`
 * as a fixed CSS width while capping the height, which letterboxes tall images
 * inside a too-wide box (and pushes the Placeholder label off the picture), so
 * the viewer gets the item without explicit dimensions.
 */
export function forViewer(item: MediaItem): MediaItem {
  return { ...item, width: undefined, height: undefined };
}

/** Keeps a spaced em dash on the line of the word before it ("Night streets — photo series"). */
export function typeset(text: string): string {
  return text.replace(/ — /g, ' — ');
}

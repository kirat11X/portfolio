import type { CreativeProject, MediaItem } from '@/types';

/*
 * Creative studio content.
 *
 * There is no original creative work in the repository yet, so every entry
 * below is a labelled placeholder SLOT (`placeholder: true`). Slots without
 * imagery get an abstract generated artwork, and the UI shows an amber
 * "Placeholder" label wherever they appear (gallery, project page, lightbox).
 * Titles describe the slot, not a finished piece. Nothing here may claim a
 * client, date, link or result that is not real.
 *
 * HOW TO ADD REAL WORK (export settings: public/creative/README.md)
 *
 * 1. Put the files in public/creative/<slug>/, e.g.
 *      public/creative/night-streets/cover.webp
 *      public/creative/night-streets/01.webp
 *
 * 2. Set `cover` to the image that represents the piece on gallery tiles, the
 *    3D world panel and the project page. Always an image (for video work,
 *    use the poster frame). Give real alt text and the pixel dimensions:
 *      cover: {
 *        kind: 'image',
 *        src: '/creative/night-streets/cover.webp',
 *        alt: 'Rain-soaked crossing at night, shop signs reflected in the puddles',
 *        width: 1600,
 *        height: 2400,
 *      },
 *    Set `aspect` to the cover's orientation ('portrait' | 'landscape' | 'square').
 *
 * 3. Add the rest of the piece to `gallery`, in viewing order:
 *      images  { kind: 'image', src, alt, width, height, caption? }
 *      videos  { kind: 'video', src: '/creative/<slug>/video.mp4', poster: '/creative/<slug>/poster.webp', alt, width, height }
 *      embeds  { kind: 'embed', src: 'https://www.youtube-nocookie.com/embed/<id>', alt }   (only a real, verified URL)
 *    For `medium: 'video'` the first video or embed becomes the player at the
 *    top of the project page; everything else appears in the gallery grid.
 *
 * 4. Rewrite title, tagline, summary and context about the actual piece. Add
 *    `year`, `tools`, `client` and `links` only when they are true and verified.
 *
 * 5. Delete `placeholder: true` from the entry (and from any media item).
 *
 * 6. Optional extras (see `creativeExtras` at the bottom of this file):
 *      comparison: a before/after pair for editing work; it becomes the
 *                  interactive comparison slider at the top of the page.
 *      captions:   WebVTT caption tracks for the entry's video.
 *
 * `featured: true` puts an entry on a glass panel in the 3D world (up to 6,
 * in `order`). `order` also sets the gallery order: the first three fill the
 * top row of the masonry on wide screens. Add a new entry by copying an
 * existing one and giving it a unique kebab-case `slug`.
 */

export const creativeProjects: CreativeProject[] = [
  {
    slug: 'night-streets',
    discipline: 'creative',
    category: 'photography',
    medium: 'image',
    aspect: 'portrait',
    title: 'Night streets — photo series',
    tagline: 'Reserved for a series of street photographs made after dark.',
    summary:
      'Placeholder slot for a night-time street photography series. The original photographs will go here, each with a short note.',
    context:
      'When it is filled, this page will show the series in sequence and at full size, with a line or two on each frame: where it was made and what caught the eye.',
    tags: ['Photography', 'Series'],
    featured: true,
    order: 1,
    placeholder: true,
  },
  {
    slug: 'app-concept-figma',
    discipline: 'creative',
    category: 'ui-ux',
    medium: 'design',
    aspect: 'landscape',
    title: 'App concept — Figma prototype',
    tagline: 'Reserved for an interface concept, from first flows to a clickable prototype.',
    summary:
      'Placeholder slot for an app concept designed in Figma. Key screens, the main user flow and a prototype walkthrough will go here.',
    context:
      'The finished entry will cover the problem the app addresses, the main user flow, a few key screens at full resolution and a link to the interactive prototype.',
    tags: ['UI design', 'Prototype'],
    tools: ['Figma'],
    featured: true,
    order: 2,
    placeholder: true,
  },
  {
    slug: 'reel-edit-colour',
    discipline: 'creative',
    category: 'video',
    medium: 'video',
    aspect: 'portrait',
    title: 'Reel — edit & colour',
    tagline: 'Reserved for a short vertical edit: structure, pacing and colour grade.',
    summary:
      'Placeholder slot for a short-form reel. The video will play here, with notes on the cut and the colour grade.',
    context:
      'This page will play the reel with captions and walk through a few decisions behind it: the structure of the cut, its rhythm and the look of the grade.',
    tags: ['Video edit', 'Colour grade'],
    featured: true,
    order: 3,
    placeholder: true,
  },
  {
    slug: 'event-poster-series',
    discipline: 'creative',
    category: 'graphic-design',
    medium: 'image',
    aspect: 'portrait',
    title: 'Event poster series',
    tagline: 'Reserved for a set of posters and social creatives made for events.',
    summary:
      'Placeholder slot for an event poster series and its social-media variants. The final designs will go here.',
    context:
      'The finished entry will show each poster at full size next to its square and story formats, with a note on the brief, the type and the layout.',
    tags: ['Poster', 'Layout'],
    featured: true,
    order: 4,
    placeholder: true,
  },
  {
    slug: 'retouch-before-after',
    discipline: 'creative',
    category: 'editing',
    medium: 'image',
    aspect: 'square',
    title: 'Retouch: before / after',
    tagline: 'Reserved for retouching and colour work, compared side by side.',
    summary:
      'Placeholder slot for a retouched photograph shown against its unedited original, with a slider to compare the two.',
    context:
      'The comparison at the top of this page will show the real before and after. A short note will explain what changed and why: exposure, colour, clean-up and any compositing.',
    tags: ['Retouching', 'Colour'],
    order: 5,
    placeholder: true,
  },
  {
    slug: 'travel-photo-set',
    discipline: 'creative',
    category: 'photography',
    medium: 'image',
    aspect: 'landscape',
    title: 'Travel — photo set',
    tagline: 'Reserved for a set of travel and landscape photographs.',
    summary: 'Placeholder slot for a set of travel photographs. The originals will go here with short captions.',
    context:
      'The set will be presented as a sequence with captions on place and light, plus a note on how the photographs were edited.',
    tags: ['Photography', 'Travel'],
    order: 6,
    placeholder: true,
  },
  {
    slug: 'title-sequence-motion',
    discipline: 'creative',
    category: 'motion',
    medium: 'video',
    aspect: 'landscape',
    title: 'Title sequence — motion study',
    tagline: 'Reserved for animated type, transitions and timing.',
    summary:
      'Placeholder slot for a short motion study: an animated title sequence. The video will play here with notes on timing and easing.',
    context:
      'This page will play the sequence, then break out a few stills and the easing choices behind the movement.',
    tags: ['Motion design', 'Typography'],
    order: 7,
    placeholder: true,
  },
];

// ---------------------------------------------------------------------------
// Extras the shared content contract (src/types) does not cover yet. Keyed by
// slug. Paths follow the same rules as `cover` / `gallery` above.

export interface CaptionTrack {
  /** Site-relative WebVTT file, e.g. "/creative/reel-edit-colour/captions.en.vtt". */
  src: string;
  /** BCP 47 language tag, e.g. "en". */
  srclang: string;
  /** Name shown in the player's captions menu, e.g. "English". */
  label: string;
  kind?: 'captions' | 'subtitles';
  /** Show this track by default. */
  default?: boolean;
}

export interface BeforeAfterPair {
  /** The unedited original. */
  before: MediaItem;
  /** The finished edit. Use the same dimensions and framing as `before`. */
  after: MediaItem;
}

export interface CreativeExtras {
  /** Before/after pair, shown as a comparison slider at the top of the page. */
  comparison?: BeforeAfterPair;
  /** Caption tracks for the entry's video (the first video in `gallery`). */
  captions?: CaptionTrack[];
}

/*
 * Example, once real files exist:
 *
 *   'retouch-before-after': {
 *     comparison: {
 *       before: { kind: 'image', src: '/creative/retouch-before-after/before.webp', alt: '…', width: 2400, height: 2400 },
 *       after: { kind: 'image', src: '/creative/retouch-before-after/after.webp', alt: '…', width: 2400, height: 2400 },
 *     },
 *   },
 *   'reel-edit-colour': {
 *     captions: [{ src: '/creative/reel-edit-colour/captions.en.vtt', srclang: 'en', label: 'English', default: true }],
 *   },
 */
export const creativeExtras: Partial<Record<string, CreativeExtras>> = {};

export function getCreativeExtras(slug: string): CreativeExtras {
  return creativeExtras[slug] ?? {};
}

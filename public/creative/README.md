# Creative studio media

Everything in this folder is served as-is at `/creative/…`. Each entry in
`src/data/creativeProjects.ts` is a placeholder slot until you add its files
here and update the entry. The site's honesty rules apply: only real work,
real dates, real links.

## Folder naming

One folder per entry, named exactly like its `slug`:

```
public/creative/night-streets/
  cover.webp        ← the image on gallery tiles, the 3D world panel and the page hero
  01.webp 02.webp … ← the rest of the series, in viewing order
public/creative/reel-edit-colour/
  poster.webp       ← first impression of the video (also its cover)
  reel.mp4
  captions.en.vtt   ← optional
public/creative/retouch-before-after/
  before.webp after.webp
```

Lowercase, no spaces, kebab-case. Never put personal data in file names or images
(faces of strangers who didn't agree to it, licence plates, addresses).

## Export settings

| Kind | Settings |
| --- | --- |
| Photos and graphics | 2400 px on the long edge, WebP (or AVIF) at about quality 80, sRGB, metadata (EXIF/GPS) stripped |
| Covers | Same as photos. Keep the subject away from the bottom 30% (the title overlays it on touch screens) |
| Video | MP4, H.264 + AAC, ≤ 20 MB, 1080p max (1080×1920 for vertical reels), `faststart` |
| Video poster | One frame from the video as JPG or WebP, same aspect ratio |
| Captions | WebVTT (`.vtt`), UTF-8. Add them for anything with speech |
| Figma frames | Export at 2× as PNG, then convert to WebP (≤ 2400 px long edge). Remove real user data from mock screens |
| Before / after | Two files with identical dimensions and framing |

Example video export:
`ffmpeg -i master.mov -c:v libx264 -crf 23 -preset slow -c:a aac -b:a 128k -movflags +faststart reel.mp4`

## Alt text

Describe what is in the picture and why it matters, in one sentence, as if
reading it to someone over the phone. "Rain-soaked crossing at night, shop
signs reflected in the puddles". Avoid "image of" or "photo of", and avoid
the file name. For a UI screen, describe what the screen does ("Checkout
screen with the order summary and a single pay button"). For a video, the
`alt` is a short description of the clip.

## Data-file edits (`src/data/creativeProjects.ts`)

1. Set `cover` (always an image) with real alt text and the pixel size:
   ```ts
   cover: { kind: 'image', src: '/creative/night-streets/cover.webp', alt: '…', width: 1600, height: 2400 },
   ```
   and set `aspect` to `'portrait'`, `'landscape'` or `'square'` to match it.
2. Add the rest to `gallery`:
   ```ts
   gallery: [
     { kind: 'image', src: '/creative/night-streets/01.webp', alt: '…', width: 2400, height: 1600, caption: '…' },
     { kind: 'video', src: '/creative/reel-edit-colour/reel.mp4', poster: '/creative/reel-edit-colour/poster.webp', alt: '…', width: 1080, height: 1920 },
   ],
   ```
   For `medium: 'video'`, the first video in `gallery` plays at the top of the page.
3. Rewrite `title`, `tagline`, `summary` and `context` about the actual piece.
   Add `year`, `tools`, `client` and `links` only if they're true.
4. Delete `placeholder: true`.
5. Optional, in `creativeExtras` at the bottom of the same file:
   - `comparison: { before, after }` for editing work. It becomes the slider at the top of the page.
   - `captions: [{ src: '/creative/<slug>/captions.en.vtt', srclang: 'en', label: 'English', default: true }]`.
6. `featured: true` (up to 6) puts the entry in the 3D world; `order` sets the
   gallery order (the first three fill the top row on wide screens).

Run `npm test` afterwards. The content tests check that every file you
reference exists and that every image has alt text.

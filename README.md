# Kirat — Developer & Creative Portfolio

A responsive React portfolio with a lightweight editorial shell, an optional interactive Three.js homepage scene, engineering project summaries, creative gallery placeholders, profile information and contact links.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`. Run static checks with `npm run lint`.

## Routes

- `/` — homepage and 3D scene, with conventional links to every section
- `/engineering` — documented engineering projects
- `/engineering/:slug` — engineering project detail
- `/creative` — creative gallery placeholders
- `/creative/:slug` — creative placeholder detail
- `/about` — profile, study area and interests
- `/contact` — currently available GitHub contact link

The homepage scene is lazy-loaded. If WebGL is unavailable or fails, a conventional 2D navigation view is shown. The scene also has keyboard-accessible links to the galleries.

## Edit the content

- `src/data/profile.ts` — name, bio, interests and any verified contact or résumé URLs
- `src/data/engineeringProjects.ts` — project summaries based on repository documentation; add contribution notes, dates, screenshots and verified public links
- `src/data/creativeProjects.ts` — clearly marked replaceable entries. Current Unsplash images are illustrative stock previews, not Kirat's work. Replace them with original images and descriptions before publication.
- `public/resume.pdf` — currently a tiny placeholder file and is not linked in the interface; replace it with a real résumé before adding a download link

Email, LinkedIn, education details, dates, project links, metrics and creative assets are omitted when unverified. The two engineering summaries reflect project documentation found in the local workspace; add public source links and personal contribution details before publishing them as case studies.

## Stack

React 19, TypeScript, Vite, React Router, Tailwind CSS, Three.js, React Three Fiber, Drei and Lucide.

## Deploy (free static hosting)

The site is a pure client-side single-page app (Vite + React): there is no server
rendering and no backend, so any free static host works. The build output is `dist/`.

- **Vercel (free):** import the repo — `vercel.json` sets the build (`npm run build`),
  the output (`dist`), the SPA rewrite (every route → `index.html`, so deep links like
  `/engineering/…` work on refresh) and long-lived caching for hashed `/assets/*`.
- **Render (free static site):** create a Blueprint from `render.yaml`, or a Static Site
  with build command `npm ci && npm run build`, publish directory `dist`, and a rewrite
  rule `/*` → `/index.html`.

Performance notes: the first page loads ~83 kB of gzipped JavaScript; the 3D world
(three.js, ~425 kB gzipped) is downloaded lazily behind the loader, only when the world
is opened, and adapts its quality to the visitor's device. The classic 2D view and every
page work without WebGL.

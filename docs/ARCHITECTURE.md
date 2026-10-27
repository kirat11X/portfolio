# Portfolio architecture & team contract

This is the shared contract for everyone building the portfolio. Read it before
writing code. If a contract below does not fit what you need, do **not** change
someone else's file — finish your work against the current contract and list
the requested change in your final report.

## 1. Product in one paragraph

An original portfolio for **Kirat**, a Computer Science & Engineering student who
works across software, ML/DL, computer vision, DSA and research, and also does
photography, editing, video/motion and UI/graphic design. The home route is a
**night-time miniature neon district** you can drive around (Bruno Simon-style
playfulness, a Neon-City-style stylised night street): glowing signs, glass
exhibit panels for featured projects, landmark buildings whose doors lead to the
galleries. Everything is also reachable through a conventional, recruiter-
friendly site: editorial galleries, case studies, about, résumé, contact. Both
halves share one visual identity: near-black ink, cool grey type, **cyan for
engineering**, **violet for creative**, glass surfaces used sparingly.

Inspiration only — never copy another site's assets, layout or branding.

## 2. Stack

React 19 · TypeScript 6 · Vite 8 · React Router 7 · Tailwind CSS 4 (CSS-first
`@theme`) · three 0.186 · @react-three/fiber 9 · @react-three/drei 10 ·
@react-three/postprocessing 3 · zustand 5 · lucide-react · Vitest · Playwright.
All dependencies are already installed. **Do not run `npm install`** — ask the
lead in your report if you need a package.

Path alias: `@/` → `src/`.

## 3. Routes

| Path | Page | Owner |
| --- | --- | --- |
| `/` | `pages/HomePage.tsx` → 3D world (via `WorldHost` in the layout) or `ClassicHome` | lead (page), world agents (world), nav agent (`ClassicHome`) |
| `/engineering` | `pages/EngineeringGallery.tsx` | gallery agent |
| `/engineering/:slug` | `pages/EngineeringProjectPage.tsx` | gallery agent |
| `/creative` | `pages/CreativeGallery.tsx` | creative agent |
| `/creative/:slug` | `pages/CreativeProjectPage.tsx` | creative agent |
| `/about` | `pages/AboutPage.tsx` | nav agent |
| `/resume` | `pages/ResumePage.tsx` | nav agent |
| `/contact` | `pages/ContactPage.tsx` | nav agent |
| `*` | `pages/NotFoundPage.tsx` | nav agent |

Build links with `paths`, `projectPath(project)` and `galleryPath(discipline)`
from `@/lib/routes` — never hand-write `/engineering/${slug}`.

Pages are lazy-loaded and rendered inside `<main id="main">` by
`components/layout/Layout.tsx`, which already applies the top offset for the
fixed navbar (`pt-(--nav-h)`). Pages start with `<Container>` + `<PageHeader>`
and call `usePageTitle('Title')`.

## 4. File ownership

Only edit files you own. Read anything.

| Owner | Files |
| --- | --- |
| **Lead architect** | `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/styles/**`, `src/types/**`, `src/lib/**`, `src/components/ui/**`, `src/components/layout/Layout.tsx`, `WorldHost.tsx`, `PageFallback.tsx`, `ScrollToTop.tsx`, `src/pages/HomePage.tsx`, `src/data/categories.ts`, `src/data/navigation.ts`, `src/world/config/layout.ts`, `src/world/config/exhibits.ts`, `src/world/config/colliders.ts`, `src/world/state/**`, `index.html`, `package.json`, `vite.config.ts`, `tsconfig*.json`, `docs/ARCHITECTURE.md`, `README.md` |
| **Loader** | `src/components/loader/**` |
| **World — city art** | `src/world/city/**`, `src/world/config/decorColliders.ts` |
| **World — gameplay & HUD** | `src/world/World.tsx`, `src/world/scene/**`, `src/world/hud/**` |
| **Gallery & engineering pages** | `src/components/gallery/**`, `src/pages/EngineeringGallery.tsx`, `src/pages/EngineeringProjectPage.tsx` |
| **Engineering content** | `src/data/engineeringProjects.ts`, `docs/CONTENT_SOURCES.md` |
| **Creative studio** | `src/data/creativeProjects.ts`, `src/components/creative/**`, `src/pages/CreativeGallery.tsx`, `src/pages/CreativeProjectPage.tsx`, `public/creative/**` |
| **Navigation & content pages** | `src/components/layout/Navbar.tsx`, `src/components/layout/Footer.tsx` (+ any new `src/components/layout/Mobile*.tsx`), `src/components/home/**`, `src/data/profile.ts`, `src/pages/AboutPage.tsx`, `ResumePage.tsx`, `ContactPage.tsx`, `NotFoundPage.tsx` |
| **QA** | `e2e/**`, `playwright.config.ts`, `vitest.config.ts`, `src/**/*.test.ts(x)`, `docs/QA_REPORT.md` |

Files marked `STUB` at the top are placeholders that already satisfy the
contract so the app compiles. Their owner replaces them **keeping the exported
names and props**.

## 5. Design system (lead-owned; use it, don't fork it)

Tokens live in `src/index.css` (`@theme`) with JS mirrors in `src/styles/tokens.ts`.

- Surfaces: `bg-void` (#04050a) · `bg-ink-950` page · `ink-900/850/800` raised · `ink-700/600` hover/borders.
- Text: `text-fg` · `text-fg-muted` (body copy) · `text-fg-subtle` (meta, ≥ 4.5:1 on ink-950).
- Lines: `border-line` (8 % white) · `border-line-strong` (16 %).
- Accents: `eng` cyan #3ee0ff (engineering + primary UI), `cre` violet #b48cff
  (creative), `signal` amber (placeholders/warnings only), `ok` green. Use one
  accent per context; never rainbow.
- Type: `font-display` Unbounded (major headings, wordmarks, neon signs — sparingly),
  `font-sans` Inter (everything else), `font-mono` JetBrains Mono (labels,
  metadata, code). Display sizes: `text-display-xl/lg/md/sm` (fluid, tracked).
- Utilities: `glass`, `glass-strong`, `eyebrow`, `no-scrollbar`, `hairline-top`.
- Radii `rounded-card` (1.25rem) / `rounded-panel`; shadows `shadow-panel`,
  `shadow-glow-eng`, `shadow-glow-cre`; easing `ease-out-expo`; animations
  `animate-rise`, `animate-fade`.
- Focus: global `:focus-visible` cyan ring. Never remove outlines without a replacement.
- Themes: dark is the default; `src/lib/theme.ts` (System/Light/Dark, `kirat:theme`)
  sets `data-theme` on `<html>` and `[data-theme='light']` in `index.css` overrides the
  tokens. Never hard-code white/black for UI: use `contrast` (white in dark, black in
  light, e.g. `bg-contrast/[0.03]`, `hover:text-contrast`) and `rgb(var(--eng-rgb)/a)` /
  `--cre-rgb` / `--contrast-rgb` in hand-written gradients. Add `data-theme="dark"` to a
  subtree that must stay dark (the 3D world, HUD, loader, lightbox, media tiles); the
  `light:` variant targets light-only exceptions.

Primitives in `src/components/ui/`:

| Component | Purpose |
| --- | --- |
| `Button` (`buttonClasses` in `buttonStyles.ts`) | `variant` primary/secondary/ghost/outline · `tone` eng/cre/neutral · `size` · `to` (router) / `href` (external opens new tab) / button · `iconLeft`/`iconRight` · `download` |
| `Tag` | Small mono chip. `tone`, `dot`, `casing="plain"` for tech names |
| `Container` | Page column with 16 px mobile gutters. `size` sm/md/lg/xl |
| `Panel` | Glass surface. `interactive`, `strong`, `as` |
| `PageHeader` | Eyebrow + h1 + lede + actions, top of every inner page |
| `SectionHeading` | Eyebrow + h2 + description + optional `action` |
| `ProjectCover` | Real cover image or the deterministic generative artwork; amber "Placeholder" label on stand-ins |
| `FilterBar` | Accessible toggle-button filter row (`aria-pressed`) |
| `Lightbox` | Portal media viewer: `items: MediaItem[]`, `index: number \| null`, `onClose`, `onIndexChange` |
| `Icons` | `Github`, `Linkedin`, `Instagram`, `SocialIcon({ kind })` |
| `SkipLink` | Already in the layout |

Generative art (`@/lib/generativeArt`): `artDataUrl({ seed, category, aspect })`
returns an SVG data URL. It is abstract and decorative, so it is used as cover
art for projects without imagery — in the DOM and as 3D panel textures. It is
**never** labelled or described as a screenshot or as the person's work.

## 6. Content contract (`src/types/index.ts`)

`Project = EngineeringProject | CreativeProject`, discriminated by `discipline`.
Read data through `@/lib/projects` (`getProjects`, `getFeatured`,
`getEngineeringProject`, `getCreativeProject`, `getAdjacent`, `countByCategory`)
and category labels through `@/data/categories`. Profile: `@/data/profile`.

**Honesty rules (non-negotiable):**
- No invented metrics, job titles, awards, dates, links, screenshots or results.
- Only include a URL after verifying it (e.g. HTTP 200 for a public GitHub repo).
- Unknown → omit the field (UI must hide empty sections gracefully) or use a
  clearly labelled placeholder (`placeholder: true`).
- Never publish personal data found on disk (emails, phone numbers, keys,
  `.pem`/`.env` contents, licence plates or faces from datasets).

## 7. Shared runtime state

- `@/lib/viewMode` — `useViewStore`: `mode` 'world' | 'classic', `webgl`,
  `notice`, `setMode(mode, { persist, notice })`. Classic view is the 2D
  overview and the WebGL fallback.
- `@/lib/motion` — `useReducedMotion()`, `getReducedMotion()`,
  `useMotionStore().setUserReduced(bool|null)`. OS setting + in-app override.
  CSS honours it via `html[data-motion]`.
- `@/lib/loadingStore` — `useLoadingStore`: truthful staged loading for the
  world. Stages in order: `engine` (world chunk, reported by `WorldHost`),
  `fonts`, `world`, `shaders`, `frame` (reported by the world). `start`,
  `complete`, `fail`, `setSub` (real sub-progress only), `enter()`,
  `entered`, `returning`. Helpers `selectProgress`, `selectCurrentStage`,
  `selectCompletedCount`, `LOAD_STAGES`. Nothing may advance progress on a timer.

## 8. Home, loader and world hand-off

`Layout` renders `<Navbar overlay>` (z-50), `<WorldHost visible>` and `<main>`.
`WorldHost` lazy-loads `src/world/World.tsx` the first time `/` shows the world,
keeps it mounted (paused) on other routes, unmounts it in classic view, locks
page scroll while visible, and overlays the loader (z-40, below the navbar so the
site is navigable during loading).

```ts
// src/components/loader/PortfolioLoader.tsx (loader agent)
interface PortfolioLoaderProps {
  progress: number;          // 0..1 from real events
  stageLabel: string;        // e.g. "Compiling shaders"
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  slow: boolean;             // > 12 s: offer the classic view prominently
  returning: boolean;        // intro already seen this session: compact, auto-enter when ready
  reducedMotion: boolean;
  onEnterStart(): void;      // visitor committed (button / Enter key / auto) — world begins its intro
  onExited(): void;          // exit transition done — host unmounts the loader
  onSkipToClassic(): void;
  onRetry(): void;
}
// It may also read useLoadingStore directly for per-stage detail.

// src/world/World.tsx (gameplay agent) — default export
interface WorldProps {
  active: boolean;           // false on other routes: frameloop 'never', ignore input
  onRequestClassic(): void;  // HUD "Classic view" button
}
```

## 9. World contract (`src/world/`)

Coordinates (see the header of `config/layout.ts`): Y up, ground y = 0, north
= −Z, east = +X. `heading` = three.js `rotation.y`; forward =
(−sin h, 0, −cos h). Panel/door `rotationY` turns local +Z toward the plaza.

- `config/layout.ts` — island: a rounded rectangle `ISLAND` {minX −46, maxX 46,
  minZ −46, maxZ 80, cornerRadius 12} (NOT symmetric about the hub; use
  `ISLAND_CENTER` (0, 17), `ISLAND_SIZE`, `ISLAND_RADIUS`, `islandOutline()`),
  with a 7-unit border strip around the original city square (±33) and the
  car-soccer arena to the south. `DISTRICTS` (hub at 0,0; engineering west
  −24,0; creative east 24,0; **about = "The Archive"** north 0,−24 with three
  doors About · Résumé · Contact; **gaming = "Gaming Zone"** south 0,24, accent
  `neon.orange`, no route) with accent, zone radius, spawn and route;
  `AVENUES`, `PLAZAS`, `LANDMARKS` (buildings closing each avenue; Archive is
  x −9..9; the Gaming arcade hall has no door), `BUILDING_LOTS` (20 lots of
  7×7), `PORTALS` (doors → routes, with trigger circles; all three Archive
  doors at x −5/0/5), `HUB_PROPS` (monolith + 4 signposts), `EXHIBIT_SLOTS`,
  and helpers `insideIsland`, `clampToIsland`, `districtAt`.
- Gaming contracts (same file):
  - `GAMING_SPOTS` {tetris, pacman, catgpt, pc} and `TOWER_ROUNDABOUT`
    {centre, radius, innerRadius, serverRackSpot {x,z,rotationY}, server} are
    `InteractiveSpot`s {id, label, x, z, rotationY (front +Z → pad), radius
    (collider), pad {x,z,radius}}; ids `arcade:tetris`, `arcade:pacman`,
    `arcade:catgpt`, `pc:rig`, `server:ram`. `INTERACTIVE_SPOTS` lists all
    five. Each is a circle collider `spot:<id>`; art must keep the prop's
    footprint inside `radius`.
  - `ARENA` {pitch (x −18..18, z 46..74), center, walls (box rects with ids,
    pitch walls + goal back/sides), wallThickness, wallHeight, goals {north,
    south} (`GoalDef`: mouth centre, width 8, depth 3, `area` rect, `inward`),
    ballSpawn, ballRadius, carKickoff, entrances (gaps in the north wall at
    x ±9..±15 — gameplay should add a ball-only barrier there), accessRoads}.
    Walls are registered as box colliders `arena:*`.
  - `RACE` {start: Spawn, checkpoints: RaceGate[], finish: RaceGate}; a gate is
    {id, x, z, width, rotationY = heading of travel through it; the gate line
    runs along local X}; `gateEnds(gate)` gives the post positions. The lap:
    Gaming → south of the city → west strip (behind Engineering) → north strip
    (behind the Archive) → east strip (behind Creative) → back into Gaming →
    finish on the hub roundabout.
- `config/exhibits.ts` — `WORLD_EXHIBITS` (featured projects placed on slots;
  id `exhibit:<slug>`), `getExhibit(id)`, `exhibitsIn(district)`.
- `config/colliders.ts` — `getStaticColliders()` = lots + landmarks + arena
  walls/goals (boxes) + hub props + exhibit pedestals (r 1.3) + interactive
  spots (`spot:<id>`) + `DECOR_COLLIDERS`.
- `config/decorColliders.ts` — city art registers circle colliders for any prop
  taller than ~0.3 units placed where the vehicle can drive.
- `state/worldStore.ts` — `useWorldStore`: `activeDistrict`, `hoveredId`,
  `focusedId`, `selectedExhibitId`, `travel` (+ nonce), `helpOpen`, `quality`
  ('high' | 'medium' | 'low'), setters, `requestTravel(district)`. Mutable
  per-frame `vehiclePose` {x, z, heading, speed}. Use selectors; never setState
  inside `useFrame` unless the value actually changed (setters already guard).

Split of responsibilities:
- **City art** exports `CityScene` (everything static/ambient: sky, fog, lights,
  ground, roads, buildings, landmarks, neon signs, exhibit panels with pointer
  hover/click → store, portal doors with click → navigate, ambient life) and
  `WorldEffects` (post-processing by quality tier). No loading-store calls.
- **Gameplay & HUD** owns `World.tsx` (Canvas, quality/performance monitor,
  loading stages fonts/world/shaders/frame, context-loss handling), the vehicle,
  physics/collisions, camera rig and intro, keyboard/pointer/touch input,
  proximity focus, quick travel, and the HTML HUD.

## 10. Engineering conventions

- Typed props, no `any`. Small modules. Content separate from presentation.
- R3F: never allocate or `setState` in `useFrame`; use refs, `delta`, shared
  geometries/materials via `useMemo`, instancing for repeats, dispose what you
  create manually. ≤ 4 dynamic lights. Target < 150 draw calls, 60 fps on an
  integrated GPU; degrade by `quality`.
- Accessibility: semantic HTML, real `<button>`/`<a>`, visible focus, labels,
  `aria-live` for status changes, keyboard paths for everything, touch targets
  ≥ 44 px, no information conveyed only in 3D or only by colour.
- Motion: purposeful, short; respect `useReducedMotion()` (no camera swoops,
  flicker or parallax when reduced).
- Responsive: works at 360 px wide with no horizontal scroll; 16 px gutters.
- Copy: confident, plain, specific. No "SECTOR 01 // COMPUTATIONAL" cosplay,
  no fake terminals, no "verified" badges that aren't true.

## 11. Tooling

- Shared dev server (already running): **http://127.0.0.1:5173** (HMR). Do not
  start another on 5173; if you need a second server use another port.
- Type-check only your files:
  `npx tsc -p tsconfig.app.json --noEmit 2>&1 | grep -E '^src/<your-folder>'`
  (others' work in progress may show errors — not yours to fix).
- Lint: `npx oxlint <your paths>`.
- Visual check (headless Chromium, software WebGL — slow but faithful):
  `node scripts/screenshot.mjs --url http://127.0.0.1:5173/<route> --out <png> [--mobile] [--full] [--steps '<json>']`
  (see the header of the script for steps: click, key-hold, waitFor, eval, shot).
  Save screenshots under the scratchpad given in your brief, not in the repo.
- Do **not** run `vite build` into `dist/`, `npm install`, git commands, or
  anything that deletes files you don't own.

## 12. Definition of done (every agent)

Your files type-check and lint clean, render without console errors at desktop
(1440×900) and mobile (390×844) widths, you have looked at screenshots of your
work, empty/missing data degrades gracefully, and your final report lists:
files changed, assumptions, contract change requests, known gaps.

## 13. Rendering tiers & performance tools (world)

- Quality tiers `high` / `medium` / `low` (world store). Every tier keeps an
  EffectComposer: `high` = bloom (8 mip levels) + vignette + MSAA, `medium` =
  cheaper bloom (0.35 resolution, 5 levels), `low` = tone-mapping-only composer.
  Keeping a composer (and keeping point lights mounted at intensity 0 on `low`)
  means tier changes never trigger a full shader recompile.
- `PerformanceMonitor` steps quality down (and, on `low`, drops the pixel ratio
  to 0.75); rendering pauses while the tab is hidden.
- Dev-only profiling: `window.__world.perf()`, `?perf=1` overlay (draw calls,
  triangles, frame/CPU ms, programs, DPR), `?perf=pin` to freeze the tier.
  Budget: ≤ 110 draw calls at `high` in every view.

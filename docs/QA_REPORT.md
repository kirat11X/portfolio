# QA report

Owner: QA & 2D design. Files: `vitest.config.ts`, `playwright.config.ts`, `e2e/**`,
`src/**/*.test.ts(x)` (except `src/world/arcade` and `src/world/game` tests), this report,
and design fixes in the 2D site. Last pass: 2026-10-23.

## 1. How to run

| What | Command |
| --- | --- |
| Unit tests (Vitest, ~2 s) | `npm test` (= `vitest run`) |
| All E2E projects | `npx playwright test --reporter=line` |
| Desktop only | `npx playwright test --project=chromium` |
| Fast pass (skip the 3D world) | `npx playwright test --grep-invert @world` |
| Phone (390×844, touch) | `npx playwright test --project=mobile` |
| WebGL disabled | `npx playwright test --project=no-webgl` |
| E2E type-check | `npx tsc -p e2e/tsconfig.json` |
| Against a production preview | `npx vite build --outDir <tmp>` · `npx vite preview --outDir <tmp> --port 4173 --strictPort --host 127.0.0.1` · `QA_BASE_URL=http://127.0.0.1:4173 npx playwright test --grep-invert @world` |
| External link check (network) | `QA_LINK_CHECK=1 npx playwright test e2e/links.spec.ts` |

Playwright reuses the dev server on `127.0.0.1:5173`. WebGL runs on SwiftShader, so
world specs get long budgets (loader ≤ 150 s, test ≤ 360 s, actions 60 s). `@world`
specs that use `window.__world` need the **dev** server (the handle is DEV-only).
Override artefact folders with `QA_OUTPUT_DIR` / `QA_REPORT_DIR`.

## 2. Test inventory

### Unit (Vitest) — 17 files, 211 tests, all passing

Unchanged in this pass: content integrity (`src/data/content.test.ts`), project helpers,
routes, generative art, loading store (+ session), world layout/colliders/BFS
drivability, world store, and the world agents' own arcade/game tests (tetris, pac-maze,
meow, ball physics, race logic, spawn clearance, consent storage, ArcadeOverlay).

### E2E (Playwright, `e2e/`)

Every test runs with the **diagnostics fixture** (`e2e/support/test.ts`): uncaught page
errors, console errors and ≥ 400 / failed same-origin requests fail the test.

| Spec | Covers |
| --- | --- |
| `routes.spec.ts` (@mobile) | Every route renders one non-empty h1 and the exact title, no errors. |
| `navigation.spec.ts` | Primary nav reaches every route with `aria-current`; brand link; back/forward; 404 way home. Mobile: menu dialog, Escape/close, focus return, focus containment, `inert` page. **New:** menu link names are the bare label, descriptions are `aria-describedby`. |
| `a11y.spec.ts` (@mobile) | Structural audit on every route (one h1/main, lang, alt, rel=noopener, names, unique ids, ARIA refs); skip link; 44 px header targets. |
| `responsive.spec.ts` | No horizontal scroll at 360 px. **Extended** to every résumé track and every case study (29 pages). |
| `gallery.spec.ts` | Listing, `?category=` filters, unknown category/slug, case-study links, creative quick view dialog. |
| `home-world.spec.ts` (@world) | Loader → enter, leave/return, classic ↔ 3D, reload auto-enter, HUD + quick travel (5 districts incl. Gaming Zone), exhibit panel, skip-to-classic while loading, failed engine download, reduced motion, context loss. |
| `fallback.spec.ts` (no-webgl) | Classic home without WebGL; stored "world" preference ignored. |
| **`theme.spec.ts`** (new) | Default = system, nothing stored. Follows OS light/dark live on System. Light/Dark apply at once, set `kirat:theme`, update `meta[theme-color]`, survive reload and route changes; Dark wins over a light OS; System removes the key. Keyboard menu (ArrowDown, Escape, focus return). Mobile radio group (click + arrow keys). **The 3D world forces the document dark while the stored preference stays light, and leaving restores light.** Classic home follows the theme. |
| **`resume.spec.ts`** (new) | Four tracks, unique ids and PDFs. Switching updates `aria-pressed`, `?track=` (clean URL for the default), the sheet subtitle and the download link. Deep link per track; each PDF answers 200 `application/pdf`, starts with `%PDF-`, > 10 kB. Unknown track → default. |
| **`cursor-and-links.spec.ts`** (new) | Cursor follower: shows for a mouse on desktop, `aria-hidden`, `pointer-events: none`; absent on touch phones and with reduced motion. 404 shows the path, title "Page not found" and links home/engineering/creative; unknown slug handled in-gallery. Deep links (case studies, `?category=`, `?track=`, contact) answer 200 on direct load and on reload. |
| **`world-play.spec.ts`** (new, @world) | Via the dev handle: **consent card** — visible on first visit, says "no cookies"; a car chosen before answering lives in sessionStorage; "Give it RAM" stores `kirat:consent=granted` and moves game keys to localStorage; re-asked and "Keep it starving" stores `declined` and removes every game key from localStorage; answer survives reload (no card); **zero cookies**. **Arcade** — `spot('arcade:tetris')` → proximity focus → `interact()` opens a modal "Blocks" dialog with focus inside and Tab contained; Escape closes it, `arcade` state is null and the car has not moved (< 0.05 u). **Race** start → countdown, cancel → idle. **Soccer** ball moved then `reset()` returns it to `ARENA.ballSpawn`. **Toolbar** — "Orbit the city" toggles `aria-pressed`; car picker opens the "Garage" radio group and picking a car updates the handle; "Map" opens the "District map" dialog, Escape closes it and returns focus. |
| `links.spec.ts` | Opt-in external link check. |

Support changes: `e2e/support/world.ts` now takes the `window.__world` type from
`src/world/scene/devHandle.ts` (one source of truth); `e2e/tsconfig.json` adds
`vite/client` types so that import type-checks.

## 3. Results (this pass)

| Check | Result |
| --- | --- |
| `npx vitest run` | **17 files, 211 tests passed** |
| Baseline `npx playwright test` (before changes, 80 tests) | 77 passed, 1 skipped, 2 failed — both environmental (world loader slower than 150 s under load; 504 "Outdated Optimize Dep" during a dev-server re-optimisation). No stale spec failed. |
| Final `npx playwright test` (all 3 projects, dev server) | **130 passed, 1 skipped (opt-in link check), 0 failed** in 12.9 min |
| Navigation + a11y re-run after the mobile-menu fix | 25 passed |
| Production preview, `--grep-invert @world` | **116 passed, 1 skipped, 0 failed** |
| `npx tsc -b` | clean at the end of the pass (was red mid-pass, see QA-W1) |
| `npx tsc -p e2e/tsconfig.json` | clean |
| `npx oxlint src e2e scripts dev` | 0 warnings, 0 errors |

## 4. Fixes made in this pass (2D site)

| ID | Where | Fix |
| --- | --- | --- |
| QA-D1 | `src/components/layout/Navbar.tsx`, `src/components/home/Wordmark.tsx` | On phones the header grid was `1fr auto 1fr` with the desktop nav hidden, so the brand got half the row and "KRITANSH UPPAL" wrapped onto two lines at 390 px (and 360 px). Mobile grid is now `minmax(0,1fr) auto` (menu button in column 2), desktop unchanged; the wordmark is `whitespace-nowrap`. Verified one line at 360 px. |
| QA-D2 | `src/pages/ResumePage.tsx` | Track descriptions under the résumé version buttons were `text-fg-subtle` at 12 px on the tinted card: 4.18:1 in dark (below AA 4.5). Now `text-fg-muted`. A contrast sweep of 10 routes × 2 themes reports no other text below AA. |
| QA-D3 | `src/components/layout/MobileMenu.tsx` | Mobile menu links announced "Engineering Software, ML, vision and research projects". The description is now `aria-hidden` text referenced by `aria-describedby`, so the link name is just "Engineering" (old QA-O2). |

Previously open items re-checked: **QA-E1** (creative pager overflow at 360 px) — fixed
(all creative pages pass at 360 px). **QA-E2** (`.gitignore` test artefacts) — fixed
by lead. **QA-O1** (`public/resume.pdf` stub) — gone; the four real PDFs live in
`public/resume/`.

Design review: screenshots of 14 views (engineering + 2 case studies, creative + 2
pieces, about, 4 résumé tracks, contact, 404, classic home) × dark/light × 1440×900 /
390×844 (56 shots). No overflow (scrollWidth = viewport on all 56), one h1 everywhere,
no console errors. Light theme is consistent (cards, tags, pagers, placeholder notes,
the résumé sheet). Focus rings are visible on every tab stop sampled (project cards
draw theirs on `::after`). Dialogs checked for focus containment: mobile menu, creative
quick view, arcade overlay, map (native `<dialog>`).

## 5. World defects and notes (owned by the world agents — not edited by QA)

| ID | Severity | Owner | Finding |
| --- | --- | --- | --- |
| QA-W1 | major (build) — **resolved** | world gameplay/HUD — `src/world/hud/CarPicker.tsx`, `src/world/scene/Vehicle.tsx`, `src/world/game/cars.ts` | `npx tsc -b` fails: `Property 'canopyEmissive' / 'bodyEmissive' / 'canopy' does not exist on type 'CarDef'` (CarPicker.tsx:42, Vehicle.tsx:56/60/63). Looks like an in-progress `CarDef` change; `vite build` still succeeds (no type-check), but `npm run build` / CI will fail until the type and its users agree. Resolved by the world agents before the end of this pass (`tsc -b` clean on the final check); listed so the lead knows it was red mid-session. |
| QA-W2 | minor | world gameplay — dev server | During long runs the shared dev server occasionally answers 504 "Outdated Optimize Dep" for `node_modules/.vite/deps/*` and HMR-reloads `World.tsx`, so a world test can fail with "Failed to fetch dynamically imported module". Environmental (dep re-optimisation / edits mid-run), not reproducible on the production preview. Pre-bundling `three`, `troika-three-text`, `maath` via `optimizeDeps.include` would stop the mid-session re-optimisation (lead: `vite.config.ts`). |
| QA-W3 | info | world | The consent card does not move focus on first visit (by design: it does not steal focus), so keyboard users reach it only by tabbing through the HUD; consider a "Storage choice" entry in the help dialog. |
| QA-W4 | info | world | Software-WebGL frames can block the main thread for several seconds while the world streams in; site-nav clicks during loading needed a 60 s action budget in tests. Real GPUs are not affected, but low-end devices may see a laggy navbar until the loader finishes. |

## 6. Production check

`npx vite build` into the scratchpad (never `./dist`): built in ~2 s; entry chunk
263.5 kB (83 kB gzip); the world chunk 1.48 MB (430 kB gzip) is lazy and loaded only
on `/`. `vite preview` on :4173: `/`, `/engineering`, a case study, a creative piece,
`/resume?track=ml-cv`, `/contact` and an unknown path all answer 200 (SPA fallback);
`/world/pdc-club.png`, `pec-seal.png`, `pec-wordmark.png` → 200 `image/png`; all four
`/resume/*.pdf` → 200 `application/pdf`; fonts (Inter/Unbounded/JetBrains Mono woff2)
are emitted under `/assets`. The non-world E2E suite against the preview:
**116 passed, 1 skipped (opt-in link check), 0 failed**, which includes `/` loading
the production world to "Enter the district" with no console errors. Entering the
world and driving on the preview: no console errors (only SwiftShader/three
deprecation warnings). Preview server stopped afterwards.

## 7. Remaining risks

- World specs are slow (~1–2 min each on SwiftShader) and sensitive to machine load
  and to other agents editing files mid-run; re-run a failed `@world` test alone before
  treating it as a defect.
- The dev handle is DEV-only, so the Gaming Zone / consent / arcade specs cannot run
  against a production build; production coverage for those flows is manual.
- External links are only checked with `QA_LINK_CHECK=1` (network).
- Contrast was measured on solid backgrounds; text over gradients/images (hero
  artwork, 3D world HUD over the canvas) was reviewed visually only.

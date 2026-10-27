# Kritansh Uppal (Kirat) — Interactive 3D & Creative Portfolio

[![Live Site](https://img.shields.io/badge/Live%20Demo-kritanshportfolio.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://kritanshportfolio.vercel.app/)
[![React 19](https://img.shields.io/badge/React-19.2-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r186-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

> **Live Deployment:** 🌐 **[https://kritanshportfolio.vercel.app/](https://kritanshportfolio.vercel.app/)**

---

## 🌟 The Vision & Experiment

I wanted to push beyond the boundaries of standard grid-based developer portfolios by experimenting with interactive 3D in the browser. 

My goal was to merge **rigorous software engineering**, **creative/visual craftsmanship**, and **game mechanics** into a single cohesive universe — without compromising performance, mobile accessibility, or recruiter convenience.

### The Experience

- 🏙️ **Interactive 3D Neon District**: An open night-time miniature cyberpunk metropolis built with **Three.js** and **React Three Fiber**. Drive vehicles around the district, kick balls in the arena, challenge time-trials on the circuit, and drive into landmark portals that bridge directly into portfolio case studies.
- 🕹️ **Playable Arcade Machines**: Step inside the virtual arcade and play interactive mini-games directly in the 3D viewport or overlay:
  - **Pac-Maze**: Neon retro maze-chase with ghost AI, pellets, and power-ups.
  - **Blocks**: Cyberpunk grid-stacking falling-block puzzle game.
  - **CatGPT**: Interactive retro terminal dialogue simulation.
- 🏎️ **Vehicle Simulation & Physics**: Choose between multiple vehicles (*Pod*, *Kestrel*, *Stingray*) with custom procedural geometry, spring-damped camera director, ground picking, raycasting, acceleration, drifting, and ball collision physics.
- 📄 **Classic Recruiter-First View**: At any moment, toggle into the ultra-fast, clean editorial view. If WebGL is unsupported or turned off, the app gracefully falls back to an elegant, high-contrast 2D layout.
- 🛠️ **Engineering Gallery & Deep Case Studies**: Structured breakdowns of software engineering, machine learning, computer vision, data systems, and algorithmic projects with interactive pipeline diagrams.
- 🎨 **Creative Showcase**: Highlighting photography, motion graphics, video editing, and UI/UX design with responsive masonry grids, device frames, and lightbox viewers.
- 💼 **Multi-Track Résumés & Contact**: Tailored résumé views (SDE, ML/CV, Data Product, Creative) and direct communication channels.

---

## 🚀 Key Highlights & Architecture

### 1. Pure Client-Side Rendering (CSR)
- **Zero Backend Required**: Built as an optimized client-side Single-Page Application (SPA) powered by **Vite** and **React Router 7**.
- **Edge-Ready Static Deployment**: Deployed globally on **Vercel** with instant cache invalidation, custom header caching for immutable assets, and wildcard rewrites (`/* -> /index.html`) so deep links load seamlessly on refresh.
- **Lazy-Loaded 3D Engine**: The initial page shell weighs only **~83 kB** gzipped. The Three.js runtime and 3D world assets are lazy-loaded behind a themed neon loading screen, ensuring instantaneous first paints.

### 2. Dual-Mode Design System
- **Theme Support**: Seamless Dark/Light mode switching with an initial-script paint guard preventing flashes.
- **Design Language**: Ink blacks, cool slate greys, **electric cyan for engineering**, and **neon violet for creative** tracks.
- **Hardware Adaptive**: Real-time performance profiling adjusts shadow maps, particle density, and render resolution based on client FPS and device capabilities.

---

## 📁 File & Directory Structure

```text
portfolio/
├── dev/                     # Standalone HTML harnesses for rapid 3D & arcade iteration
│   ├── arcade-preview.html  # Standalone arcade emulator testing
│   ├── city-preview.html    # Isolated 3D city scene bench
│   └── loader-preview.html  # Neon loader sequence harness
├── docs/                    # Architectural specs, QA audits, and source guidelines
│   ├── ARCHITECTURE.md      # Team contracts and system architecture specifications
│   ├── CONTENT_SOURCES.md   # Project content registries and attributions
│   └── QA_REPORT.md         # Automated & manual test audit records
├── e2e/                     # End-to-end test suite (Playwright)
│   ├── a11y.spec.ts         # Screen-reader & keyboard accessibility audits
│   ├── home-world.spec.ts   # 3D world interaction & controls tests
│   ├── navigation.spec.ts   # Client-side routing verification
│   └── world-play.spec.ts   # In-world arcade and vehicle mechanics tests
├── public/                  # Static assets served as-is
│   ├── _redirects           # Client-side routing rewrite rules (Netlify/Cloudflare)
│   ├── favicon.svg          # Portfolio favicon
│   ├── resume/              # Specialized PDF resumes (SDE, ML/CV, Creative, Data)
│   └── world/               # 3D textures, emblems, and seal decals
├── src/
│   ├── App.tsx              # Application root with client-side React Router tree
│   ├── main.tsx             # React 19 createRoot entry point
│   ├── index.css            # Tailwind CSS 4 design token rules & typography
│   ├── components/
│   │   ├── creative/        # Masonry, Before/After slider, Lightbox, MediaStage
│   │   ├── gallery/         # Project cards, case study layouts, pipeline diagrams
│   │   ├── home/            # Classic 2D view, district map, social badges
│   │   ├── layout/          # Navbar, Footer, MobileMenu, WorldHost (3D shell)
│   │   ├── loader/          # Neon exit-sequence progress loader
│   │   └── ui/              # Buttons, Tags, Panels, Cursor follower, Modals
│   ├── data/
│   │   ├── engineeringProjects.ts # Documented software & ML case studies
│   │   ├── creativeProjects.ts    # Photography, video, and design entries
│   │   ├── navigation.ts          # Route definitions and navigation items
│   │   └── profile.ts             # Bio, skills, and verified contact links
│   ├── lib/
│   │   ├── generativeArt.ts       # Procedural SVG poster & fallback art generator
│   │   ├── loadingStore.ts        # Zustand store coordinating 3D stage loading
│   │   ├── routes.ts              # Route path constants & slug resolver
│   │   ├── theme.ts               # Theme management (dark/light)
│   │   └── webgl.ts               # WebGL2 feature detection & canvas checks
│   ├── pages/
│   │   ├── AboutPage.tsx          # Background, university, and skill sets
│   │   ├── ContactPage.tsx        # Direct contact channels (GitHub, Email, etc.)
│   │   ├── CreativeGallery.tsx    # Creative visual work showcase
│   │   ├── EngineeringGallery.tsx # Engineering project gallery
│   │   ├── HomePage.tsx           # Home switchboard (3D World vs. Classic View)
│   │   └── ResumePage.tsx         # Multi-disciplinary résumé reader & selector
│   └── world/                     # 🎮 3D WebGL Engine
│       ├── World.tsx              # Canvas root, post-processing stack & canvas lifecycle
│       ├── arcade/                # Embedded games (Pacman, Tetris/Blocks, CatGPT)
│       ├── city/                  # Procedural city generator, buildings, neon signs
│       │   └── bake/              # Static mesh geometry mergers for 60 FPS rendering
│       ├── config/                # City layout coordinates, exhibits, and colliders
│       ├── game/                  # Physics engine: vehicles, ball mechanics, checkpoints
│       ├── hud/                   # In-game HUD: minimap, vehicle picker, quick-travel dock
│       ├── scene/                 # Camera director, vehicle kinematics, input managers
│       └── state/                 # Zustand world store (score, vehicle, audio, mode)
├── package.json             # Scripts and dependencies
├── playwright.config.ts     # Playwright test configuration
├── render.yaml              # Render blueprint deployment specification
├── vercel.json              # Vercel configuration (Vite preset, rewrites & headers)
├── vite.config.ts           # Vite build, alias, and dependency pre-bundling setup
└── vitest.config.ts         # Vitest unit test configuration
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | **React 19**, **TypeScript** |
| **Bundler & Tooling** | **Vite 8**, **Oxlint** |
| **3D & Graphics Engine** | **Three.js (r186)**, **@react-three/fiber**, **@react-three/drei**, **postprocessing** |
| **Styling & Design** | **Tailwind CSS 4**, custom CSS-first `@theme` design tokens |
| **State Management** | **Zustand 5** |
| **Routing** | **React Router 7** (Client-Side Rendering / `BrowserRouter`) |
| **Icons & Fonts** | **Lucide React**, **Unbounded**, **JetBrains Mono**, **Inter** |
| **Testing** | **Vitest** (211 unit & property tests), **Playwright** (E2E) |
| **Hosting & CI/CD** | **Vercel** (`https://kritanshportfolio.vercel.app/`) |

---

## 💻 Local Development

Clone the repository and install the dependencies:

```bash
# 1. Clone the repository
git clone https://github.com/kirat11X/portfolio.git
cd portfolio

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Visit `http://localhost:5173` to explore the project locally.

### Available Scripts

- `npm run dev` — Start the local Vite development server with HMR.
- `npm run build` — Run typechecking (`tsc -b`) and bundle the production build into `dist/`.
- `npm run preview` — Locally preview the production build.
- `npm run lint` — Instant linting via Oxlint across the entire codebase.
- `npm run test` — Run all 211 unit tests with Vitest.
- `npm run test:e2e` — Run end-to-end tests with Playwright.

---

## 🌐 Deployment to Vercel

The portfolio is deployed to Vercel at [kritanshportfolio.vercel.app](https://kritanshportfolio.vercel.app/).

The deployment configuration is maintained in [`vercel.json`](./vercel.json):
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/index.html",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    }
  ]
}
```

Every push to the `main` branch automatically triggers a fresh build and deploy on Vercel.

---

## 📬 Contact & Links

- **Live Portfolio:** [kritanshportfolio.vercel.app](https://kritanshportfolio.vercel.app/)
- **GitHub:** [@kirat11X](https://github.com/kirat11X)
- **Repository:** [https://github.com/kirat11X/portfolio](https://github.com/kirat11X/portfolio)

---

*Crafted with code, math, and light by Kritansh Uppal.*

// Unit tests (Vitest). Owned by QA — see docs/QA_REPORT.md.
//
// Reuses the app's Vite config so the `@/` alias (and any future `define` or
// alias) stays identical to the app. Tests run in Node by default; a file that
// needs a DOM opts in with a `// @vitest-environment jsdom` docblock.
//
// Test files live next to the code (`src/**/*.test.ts(x)`) and are type-checked
// by `tsc -b` with the app, so import test APIs from 'vitest' explicitly and do
// not use Node built-ins in them (tsconfig.app.json has no Node types).

import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: ['e2e/**', 'node_modules/**', 'dist/**', 'test-results/**', 'playwright-report/**'],
      restoreMocks: true,
      unstubGlobals: true,
      testTimeout: 15_000,
    },
  }),
);

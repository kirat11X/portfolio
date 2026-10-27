// End-to-end tests (Playwright). Owned by QA — see docs/QA_REPORT.md.
//
// Runs against the shared Vite dev server on 127.0.0.1:5173 (reused when it is
// already running). Chromium renders WebGL in software (SwiftShader), which is
// faithful but slow: loading the 3D world can take 20–60 s, so world tests use
// long, explicit timeouts instead of fixed waits.
//
// Environment overrides:
//   QA_BASE_URL     test another server, e.g. a production preview on :4173
//                   (no dev server is started then)
//   QA_OUTPUT_DIR   traces/screenshots of failures (default test-results/)
//   QA_REPORT_DIR   HTML report folder (default playwright-report/)
//   QA_RUN_PENDING  run tests marked fixme until their feature lands (e2e/support/pending.ts)
//   QA_LINK_CHECK   also request every external link found on the pages (network)
//
// Projects:
//   chromium   desktop 1440×900, all specs except @mobile-only and the no-WebGL fallback
//   mobile     390×844 touch phone, only tests tagged @mobile / @mobile-only
//   no-webgl   WebGL disabled at launch, only e2e/fallback.spec.ts

import { defineConfig, devices } from '@playwright/test';

const DEV_URL = 'http://127.0.0.1:5173';
const BASE_URL = process.env.QA_BASE_URL ?? DEV_URL;

/** Software WebGL that works headless (same flags as scripts/screenshot.mjs). */
const SWIFTSHADER = ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const NO_WEBGL = ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'];

const FALLBACK_SPEC = /fallback\.spec\.ts$/;

export default defineConfig({
  testDir: 'e2e',
  outputDir: process.env.QA_OUTPUT_DIR ?? 'test-results',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never', outputFolder: process.env.QA_REPORT_DIR ?? 'playwright-report' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    colorScheme: 'dark',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: FALLBACK_SPEC,
      grepInvert: /@mobile-only/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        launchOptions: { args: SWIFTSHADER },
      },
    },
    {
      name: 'mobile',
      testIgnore: FALLBACK_SPEC,
      grep: /@mobile/,
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        screen: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        launchOptions: { args: SWIFTSHADER },
      },
    },
    {
      name: 'no-webgl',
      testMatch: FALLBACK_SPEC,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        launchOptions: { args: NO_WEBGL },
      },
    },
  ],
  webServer: process.env.QA_BASE_URL
    ? undefined
    : {
        command: 'npx vite --host 127.0.0.1 --port 5173 --strictPort',
        url: DEV_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});

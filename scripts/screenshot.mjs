#!/usr/bin/env node
// Headless visual check: opens a page in Playwright's Chromium (software WebGL
// via SwiftShader), optionally runs interaction steps, saves screenshots and
// prints console errors. Used during development and QA.
//
//   node scripts/screenshot.mjs --url http://127.0.0.1:5173/ --out shot.png
//     [--width 1440] [--height 900] [--mobile] [--full] [--wait 1500]
//     [--reduced-motion] [--no-webgl] [--intro-seen]
//     [--storage '{"kirat:view":"classic"}']
//     [--steps '[{"waitFor":"text=Enter"},{"click":"text=Enter"},{"wait":2500},
//               {"key":"KeyW","hold":1200},{"shot":"after-drive.png"},
//               {"eval":"document.title"}]']
//
// Step types: wait(ms) · waitFor(selector[, timeout]) · click(selector) ·
// clickAt([x, y]) · move([x, y]) · press(key) · key(code) + hold(ms) · type(text) ·
// goto(url) · eval(js expression, result printed) · shot(path).

import { chromium } from '@playwright/test';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.url) {
  console.error('Missing --url');
  process.exit(2);
}

const mobile = Boolean(args.mobile);
const width = Number(args.width ?? (mobile ? 390 : 1440));
const height = Number(args.height ?? (mobile ? 844 : 900));
const out = args.out ?? 'screenshot.png';
const steps = args.steps ? JSON.parse(args.steps) : [];

const launchArgs = ['--ignore-gpu-blocklist', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
if (args['no-webgl']) launchArgs.push('--disable-webgl', '--disable-webgl2', '--disable-3d-apis');

const browser = await chromium.launch({ args: launchArgs });
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: mobile ? 2 : 1,
  isMobile: mobile,
  hasTouch: mobile,
  reducedMotion: args['reduced-motion'] ? 'reduce' : 'no-preference',
});

const storage = args.storage ? JSON.parse(args.storage) : {};
await context.addInitScript(
  ({ storage, introSeen }) => {
    try {
      for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);
      if (introSeen) window.sessionStorage.setItem('kirat:intro-seen', '1');
    } catch {
      /* ignore */
    }
  },
  { storage, introSeen: Boolean(args['intro-seen']) },
);

const page = await context.newPage();
const problems = [];
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    problems.push(`[console.${message.type()}] ${message.text()}`);
  }
});
page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`));
page.on('requestfailed', (request) => problems.push(`[requestfailed] ${request.url()} ${request.failure()?.errorText ?? ''}`));

const started = Date.now();
await page.goto(args.url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(Number(args.wait ?? 1500));

for (const step of steps) {
  if (step.wait) await page.waitForTimeout(step.wait);
  if (step.waitFor) await page.waitForSelector(step.waitFor, { timeout: step.timeout ?? 30000 });
  if (step.goto) await page.goto(step.goto, { waitUntil: 'domcontentloaded' });
  if (step.click) await page.click(step.click, { timeout: step.timeout ?? 15000 });
  if (step.clickAt) await page.mouse.click(step.clickAt[0], step.clickAt[1]);
  if (step.move) await page.mouse.move(step.move[0], step.move[1], { steps: step.steps ?? 8 });
  if (step.press) await page.keyboard.press(step.press);
  if (step.type) await page.keyboard.type(step.type);
  if (step.key) {
    await page.keyboard.down(step.key);
    await page.waitForTimeout(step.hold ?? 500);
    await page.keyboard.up(step.key);
  }
  if (step.eval) {
    const result = await page.evaluate(step.eval);
    console.log(`eval> ${step.eval}\n  = ${JSON.stringify(result)}`);
  }
  if (step.shot) {
    await page.screenshot({ path: step.shot, fullPage: Boolean(step.full) });
    console.log(`saved ${step.shot}`);
  }
}

await page.screenshot({ path: out, fullPage: Boolean(args.full) });
console.log(`saved ${out} (${width}x${height}${mobile ? ', mobile' : ''}) after ${Date.now() - started} ms`);
console.log(`final url: ${page.url()}`);
console.log(problems.length ? problems.join('\n') : 'no console errors or warnings');
await browser.close();

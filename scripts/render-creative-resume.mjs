#!/usr/bin/env node
// Prints the site's creative resume track (/resume?track=creative) to
// public/resume/kritansh-uppal-creative.pdf using the page's own print styles.
// Needs the dev server running:  npm run dev   then   npm run resume:creative
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const out = 'public/resume/kritansh-uppal-creative.pdf';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${base}/resume?track=creative`, { waitUntil: 'networkidle' });
await page.waitForSelector('#resume-name');
await page.evaluate(() => document.fonts.ready);
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log(`saved ${out}`);

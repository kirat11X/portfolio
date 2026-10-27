// The suite's `test`: Playwright's, plus an automatic `diagnostics` fixture that
// fails a test on uncaught page errors, console errors, or failed same-origin
// requests (missing images, 404/504 chunks). Console warnings are attached to
// the report but never fail a test.

import { test as base, expect, type ConsoleMessage, type Page, type Request, type Response } from '@playwright/test';

/** Third-party noise that is not a defect of this app. Keep it short and specific. */
export const KNOWN_NOISE: RegExp[] = [
  /THREE\.Clock\b.*deprecated/i,
  /KHR_parallel_shader_compile/,
  /GPU stall due to ReadPixels/,
  /Automatic fallback to software WebGL has been deprecated/,
];

const strip = (url: string) => url.replace(/^https?:\/\/[^/]+/, '');

export class Diagnostics {
  readonly pageErrors: string[] = [];
  readonly consoleErrors: string[] = [];
  readonly consoleWarnings: string[] = [];
  readonly httpErrors: string[] = [];
  readonly failedRequests: string[] = [];
  readonly crossOrigin: string[] = [];
  private readonly allowedText: RegExp[] = [...KNOWN_NOISE];
  private readonly allowedUrls: RegExp[] = [];

  constructor(private readonly origin: string) {}

  /** Start listening to a page (the default `page` is watched automatically). */
  watch(page: Page): this {
    page.on('pageerror', (error) => {
      const text = `${error.name}: ${error.message}`;
      if (!this.isAllowedText(text)) this.pageErrors.push(text);
    });
    page.on('console', (message) => this.onConsole(message));
    page.on('response', (response) => this.onResponse(response));
    page.on('requestfailed', (request) => this.onRequestFailed(request));
    return this;
  }

  /** Expected console/page errors for this test only (e.g. a deliberately failed download). */
  allow(...patterns: RegExp[]): void {
    this.allowedText.push(...patterns);
  }

  /** Expected failed or erroring requests for this test only. */
  allowRequests(...patterns: RegExp[]): void {
    this.allowedUrls.push(...patterns);
  }

  /** Everything that should fail the test. */
  problems(): string[] {
    return [
      ...this.pageErrors.map((text) => `[pageerror] ${text}`),
      ...this.consoleErrors.map((text) => `[console.error] ${text}`),
      ...this.httpErrors.map((text) => `[http] ${text}`),
      ...this.failedRequests.map((text) => `[requestfailed] ${text}`),
    ];
  }

  summary(): Record<string, string[]> | null {
    const entries = Object.entries({
      pageErrors: this.pageErrors,
      consoleErrors: this.consoleErrors,
      consoleWarnings: this.consoleWarnings,
      httpErrors: this.httpErrors,
      failedRequests: this.failedRequests,
      crossOrigin: this.crossOrigin,
    }).filter(([, list]) => list.length > 0);
    return entries.length ? Object.fromEntries(entries) : null;
  }

  private isAllowedText(text: string): boolean {
    return this.allowedText.some((pattern) => pattern.test(text));
  }

  private isAllowedUrl(url: string): boolean {
    return this.allowedUrls.some((pattern) => pattern.test(url));
  }

  private sameOrigin(url: string): boolean {
    try {
      return new URL(url).origin === this.origin;
    } catch {
      return false;
    }
  }

  private onConsole(message: ConsoleMessage): void {
    const type = message.type();
    if (type !== 'error' && type !== 'warning') return;
    const { url, lineNumber } = message.location();
    const text = `${message.text()}${url ? ` (${strip(url)}:${lineNumber})` : ''}`;
    if (type === 'warning') {
      this.consoleWarnings.push(text);
      return;
    }
    // Resource failures are reported with their URL by onResponse/onRequestFailed.
    if (/^Failed to load resource/.test(message.text())) return;
    if (!this.isAllowedText(text)) this.consoleErrors.push(text);
  }

  private onResponse(response: Response): void {
    if (response.status() < 400 || this.isAllowedUrl(response.url())) return;
    const line = `${response.status()} ${response.request().method()} ${strip(response.url())}`;
    if (this.sameOrigin(response.url())) this.httpErrors.push(line);
    else this.crossOrigin.push(line);
  }

  private onRequestFailed(request: Request): void {
    const error = request.failure()?.errorText ?? 'unknown error';
    // Requests cancelled by navigation or unmounting are not defects.
    if (/ERR_ABORTED|NS_BINDING_ABORTED/.test(error) || this.isAllowedUrl(request.url())) return;
    const line = `${request.method()} ${strip(request.url())} — ${error}`;
    if (this.sameOrigin(request.url())) this.failedRequests.push(line);
    else this.crossOrigin.push(line);
  }
}

export const test = base.extend<{ diagnostics: Diagnostics }>({
  diagnostics: [
    async ({ page, baseURL }, use, testInfo) => {
      const diagnostics = new Diagnostics(new URL(baseURL ?? 'http://127.0.0.1:5173').origin).watch(page);
      await use(diagnostics);
      const summary = diagnostics.summary();
      if (summary) {
        await testInfo.attach('diagnostics.json', { body: JSON.stringify(summary, null, 2), contentType: 'application/json' });
      }
      if (testInfo.status !== 'skipped') {
        expect(diagnostics.problems(), 'uncaught errors, console errors or failed same-origin requests').toEqual([]);
      }
    },
    { auto: true },
  ],
});

export { expect };

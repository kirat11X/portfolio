// Canvas 2D text uses the same self-hosted faces as the DOM (declared by
// index.css via @fontsource). This resolves once the faces we draw with are
// loaded, so canvas-baked labels can be redrawn crisply.

export const CANVAS_FONTS = {
  display: "'Unbounded', 'Inter', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
} as const;

let ready: Promise<void> | null = null;

export function canvasFontsReady(): Promise<void> {
  if (ready) return ready;
  if (typeof document === 'undefined' || !document.fonts) {
    ready = Promise.resolve();
    return ready;
  }
  ready = Promise.all([
    document.fonts.load(`600 64px ${CANVAS_FONTS.display}`),
    document.fonts.load(`600 64px ${CANVAS_FONTS.body}`),
    document.fonts.load(`500 32px ${CANVAS_FONTS.mono}`),
  ])
    .then(() => undefined)
    .catch(() => undefined);
  return ready;
}

/** Sets letter spacing where the canvas supports it (Chromium, Firefox, Safari 17+). */
export function setTracking(ctx: CanvasRenderingContext2D, px: number): void {
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

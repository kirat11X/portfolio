// The `fonts` loading stage: troika parses each typeface used in the world and
// generates the signed-distance glyphs up front, so signs and panels never pop
// in after the loader says "ready". Completes only when every callback fired.

import { useEffect } from 'react';
import { preloadFont } from 'troika-three-text';
import { fontUrls } from '@/lib/fonts';
import { useLoadingStore } from '@/lib/loadingStore';

// Only characters covered by the self-hosted latin subsets (anything else would
// make troika fetch fallback fonts from a CDN).
const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const TEXT_GLYPHS = `${ASCII}·•—–‘’“”…éÉèàáüöäñç©`;
const DISPLAY_GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;!?&+-–—/·’\'"()';

const JOBS: Array<{ font: string; characters: string }> = [
  { font: fontUrls.display, characters: TEXT_GLYPHS },
  { font: fontUrls.displayBold, characters: DISPLAY_GLYPHS },
  { font: fontUrls.body, characters: TEXT_GLYPHS },
  { font: fontUrls.mono, characters: TEXT_GLYPHS },
];

let ready: Promise<void> | null = null;
let fraction = 0;
const listeners = new Set<(fraction: number) => void>();

/** Starts the preload once per page; later world mounts reuse the result. */
function preloadWorldFonts(): Promise<void> {
  ready ??= new Promise<void>((resolve) => {
    let remaining = JOBS.length;
    for (const job of JOBS) {
      preloadFont(job, () => {
        remaining--;
        fraction = 1 - remaining / JOBS.length;
        for (const listener of listeners) listener(fraction);
        if (remaining === 0) resolve();
      });
    }
  });
  return ready;
}

/** Starts the `fonts` and `world` stages when the world mounts. */
export function useFontStage(): void {
  useEffect(() => {
    let alive = true;
    const store = useLoadingStore.getState();
    store.start('fonts');
    store.start('world');
    const onProgress = (value: number) => useLoadingStore.getState().setSub('fonts', value);
    listeners.add(onProgress);
    if (fraction > 0) onProgress(fraction);
    preloadWorldFonts().then(() => {
      if (alive) useLoadingStore.getState().complete('fonts');
    });
    return () => {
      alive = false;
      listeners.delete(onProgress);
    };
  }, []);
}

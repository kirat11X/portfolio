// Self-hosted font files for troika (drei <Text>) in the 3D world. troika reads
// WOFF/TTF/OTF but not WOFF2, so these point at the .woff builds that Vite
// emits as hashed assets. CSS typography is loaded separately in index.css.
import displayFont from '@fontsource/unbounded/files/unbounded-latin-600-normal.woff?url';
import displayBoldFont from '@fontsource/unbounded/files/unbounded-latin-700-normal.woff?url';
import bodyFont from '@fontsource/inter/files/inter-latin-500-normal.woff?url';
import monoFont from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff?url';

export const fontUrls = {
  display: displayFont,
  displayBold: displayBoldFont,
  body: bodyFont,
  mono: monoFont,
} as const;

export type FontRole = keyof typeof fontUrls;

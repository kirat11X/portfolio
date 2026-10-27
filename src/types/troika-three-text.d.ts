// Minimal typings for the troika-three-text API used directly by this project
// (drei's <Text> wraps the rest). troika ships no root type declarations.
declare module 'troika-three-text' {
  export interface PreloadFontOptions {
    /** URL of a .woff/.ttf/.otf font file. */
    font?: string;
    /** Characters whose glyph SDFs should be generated up front. */
    characters?: string | string[];
    sdfGlyphSize?: number;
    lang?: string;
  }
  export function preloadFont(options: PreloadFontOptions, callback: () => void): void;
}

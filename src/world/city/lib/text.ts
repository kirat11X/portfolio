// Text helpers for troika (drei <Text>). troika fetches fallback fonts from a
// CDN for any glyph missing from our self-hosted fonts, so every string shown
// in the world is reduced to characters all four fonts contain.

const EXTRA = new Set([
  0x2013, 0x2014, 0x2018, 0x2019, 0x201a, 0x201c, 0x201d, 0x201e, 0x2022, 0x2026, 0x2039, 0x203a, 0x2044,
  0x20ac, 0x2122, 0x2191, 0x2193, 0x2212,
]);

function supported(code: number): boolean {
  if (code === 0x0a) return true;
  if (code >= 0x20 && code <= 0x7e) return true;
  if (code >= 0xa0 && code <= 0xff) return code !== 0xad && code !== 0xb5;
  return EXTRA.has(code);
}

const REPLACEMENTS: Record<string, string> = {
  '→': '›',
  '←': '‹',
  '·': '·',
  '­': '',
};

/** Keeps only glyphs present in Unbounded, Inter and JetBrains Mono (latin subsets). */
export function safeText(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    if (supported(code)) out += ch;
    else if (REPLACEMENTS[ch] !== undefined) out += REPLACEMENTS[ch];
  }
  return out;
}

/**
 * Rough line fitting for titles: picks the largest font size from `sizes`
 * whose estimated wrapped height stays within `maxLines`, then truncates.
 * `em` is the average advance of the font per unit size.
 */
export function fitTitle(
  title: string,
  maxWidth: number,
  sizes: number[],
  maxLines: number,
  em = 0.56,
): { text: string; fontSize: number } {
  const clean = safeText(title).trim();
  for (const size of sizes) {
    const perLine = Math.floor(maxWidth / (size * em));
    if (estimateLines(clean, perLine) <= maxLines) return { text: clean, fontSize: size };
  }
  const size = sizes[sizes.length - 1];
  const perLine = Math.floor(maxWidth / (size * em));
  return { text: truncateToLines(clean, perLine, maxLines), fontSize: size };
}

function estimateLines(text: string, perLine: number): number {
  let lines = 1;
  let current = 0;
  for (const word of text.split(/\s+/)) {
    const len = word.length;
    if (current === 0) current = len;
    else if (current + 1 + len <= perLine) current += 1 + len;
    else {
      lines++;
      current = len;
    }
  }
  return lines;
}

function truncateToLines(text: string, perLine: number, maxLines: number): string {
  const words = text.split(/\s+/);
  let out = '';
  for (const word of words) {
    const next = out ? `${out} ${word}` : word;
    if (estimateLines(`${next}…`, perLine) > maxLines) break;
    out = next;
  }
  return out.length < text.length ? `${out}…` : out;
}

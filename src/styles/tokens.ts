// Design tokens shared by JavaScript consumers (the 3D world, generative art).
// CSS consumers use the matching custom properties declared in src/index.css.
// Keep both in sync when changing a value.

export const palette = {
  void: '#04050a',
  ink950: '#07080e',
  ink900: '#0b0d16',
  ink850: '#10131f',
  ink800: '#151927',
  ink700: '#1e2335',
  ink600: '#2a3048',

  fg: '#f2f4f8',
  fgMuted: '#a9aec0',
  fgSubtle: '#737a92',

  eng: '#3ee0ff',
  engDeep: '#0891b2',
  cre: '#b48cff',
  creDeep: '#7c3aed',
  signal: '#ffb547',
  ok: '#4ade80',
} as const;

// Saturated emissive colours for the night-time world. Use with toneMapped={false}
// and an intensity multiplier so bloom only catches these surfaces.
export const neon = {
  cyan: '#3ee0ff',
  violet: '#b48cff',
  magenta: '#ff4fd8',
  amber: '#ffb547',
  emerald: '#34f5a6',
  blue: '#5b8cff',
  /** Gaming Zone accent: hot neon orange. */
  orange: '#ff6a2c',
  white: '#e8f1ff',
} as const;

export const disciplineAccent = {
  engineering: palette.eng,
  creative: palette.cre,
} as const;

export const motion = {
  easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  easeInOutQuart: 'cubic-bezier(0.76, 0, 0.24, 1)',
  fast: 160,
  base: 280,
  slow: 600,
} as const;

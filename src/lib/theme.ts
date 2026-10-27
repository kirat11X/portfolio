import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const QUERY = '(prefers-color-scheme: light)';
export const THEME_STORAGE_KEY = 'kirat:theme';

/** Browser-chrome colours (meta theme-color); keep in sync with --color-ink-950 per theme. */
const CHROME: Record<Theme, string> = { dark: '#07080e', light: '#f6f6f4' };

interface ThemeState {
  /** The visitor's choice. 'system' follows prefers-color-scheme. */
  preference: ThemePreference;
  /** Operating-system preference. */
  system: Theme;
  /**
   * Number of active requests to show the whole document dark (the full-screen 3D
   * world). The preference is untouched, so leaving the world restores it.
   */
  forcedDark: number;
  setPreference: (preference: ThemePreference) => void;
}

function readSystem(): Theme {
  return typeof window !== 'undefined' && window.matchMedia?.(QUERY).matches ? 'light' : 'dark';
}

function readPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: typeof window === 'undefined' ? 'system' : readPreference(),
  system: readSystem(),
  forcedDark: 0,
  setPreference: (preference) => {
    try {
      if (preference === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY);
      else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      /* Storage can be unavailable (private mode); the choice still applies for this visit. */
    }
    set({ preference });
  },
}));

function resolve(state: Pick<ThemeState, 'preference' | 'system'>): Theme {
  return state.preference === 'system' ? state.system : state.preference;
}

/** The theme the site pages use (ignores the 3D world's forced dark). */
export function useResolvedTheme(): Theme {
  return useThemeStore(resolve);
}

/** Forces the whole document dark until the returned release function is called (the 3D world). */
export function forceDarkDocument(): () => void {
  useThemeStore.setState((s) => ({ forcedDark: s.forcedDark + 1 }));
  let released = false;
  return () => {
    if (released) return;
    released = true;
    useThemeStore.setState((s) => ({ forcedDark: Math.max(0, s.forcedDark - 1) }));
  };
}

/**
 * Mirrors the effective theme onto <html> (CSS tokens) and the browser chrome.
 * index.html applies its best guess inline before first paint; the layout calls
 * this once on mount to correct it, and every store change re-syncs.
 */
export function syncTheme() {
  if (typeof document === 'undefined') return;
  const state = useThemeStore.getState();
  const theme: Theme = state.forcedDark > 0 ? 'dark' : resolve(state);
  const root = document.documentElement;
  if (root.dataset.theme !== theme) root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CHROME[theme]);
}

if (typeof window !== 'undefined') {
  window.matchMedia?.(QUERY).addEventListener('change', (event) => {
    useThemeStore.setState({ system: event.matches ? 'light' : 'dark' });
  });
  useThemeStore.subscribe(syncTheme);
}

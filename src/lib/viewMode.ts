import { create } from 'zustand';
import { hasWebGL } from './webgl';

export type ViewMode = 'world' | 'classic';

const STORAGE_KEY = 'kirat:view';

interface ViewState {
  /** What the home route shows: the 3D world or the classic 2D overview. */
  mode: ViewMode;
  /** Whether WebGL is available at all. When false, mode is always 'classic'. */
  webgl: boolean;
  /** One-off message shown on the classic view, e.g. after a WebGL failure. */
  notice: string | null;
  setMode: (mode: ViewMode, options?: { persist?: boolean; notice?: string | null }) => void;
  clearNotice: () => void;
}

function readStoredMode(): ViewMode | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'world' || value === 'classic' ? value : null;
  } catch {
    return null;
  }
}

const webgl = typeof window !== 'undefined' && hasWebGL();

export const useViewStore = create<ViewState>((set) => ({
  mode: webgl ? (typeof window === 'undefined' ? 'world' : readStoredMode() ?? 'world') : 'classic',
  webgl,
  notice: null,
  setMode: (mode, options = {}) => {
    const { persist = true, notice = null } = options;
    const next: ViewMode = webgl ? mode : 'classic';
    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* Non-persistent storage is fine. */
      }
    }
    set({ mode: next, notice });
  },
  clearNotice: () => set({ notice: null }),
}));

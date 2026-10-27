import { create } from 'zustand';

const QUERY = '(prefers-reduced-motion: reduce)';
const STORAGE_KEY = 'kirat:motion';

interface MotionState {
  /** Operating-system preference. */
  system: boolean;
  /** Explicit in-app choice; null follows the system preference. */
  user: boolean | null;
  setUserReduced: (reduced: boolean | null) => void;
}

function readSystem(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.(QUERY).matches);
}

function readUser(): boolean | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === null ? null : value === 'reduced';
  } catch {
    return null;
  }
}

export const useMotionStore = create<MotionState>((set) => ({
  system: readSystem(),
  user: typeof window === 'undefined' ? null : readUser(),
  setUserReduced: (reduced) => {
    try {
      if (reduced === null) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, reduced ? 'reduced' : 'full');
    } catch {
      /* Storage can be unavailable (private mode); the choice still applies for this visit. */
    }
    set({ user: reduced });
  },
}));

export function getReducedMotion(): boolean {
  const { user, system } = useMotionStore.getState();
  return user ?? system;
}

/** True when motion should be minimised. An in-app choice overrides the OS setting. */
export function useReducedMotion(): boolean {
  return useMotionStore((s) => s.user ?? s.system);
}

if (typeof window !== 'undefined') {
  window.matchMedia?.(QUERY).addEventListener('change', (event) => {
    useMotionStore.setState({ system: event.matches });
  });
  // Mirror the effective preference onto <html> so CSS can honour the in-app toggle too.
  const sync = () => {
    document.documentElement.dataset.motion = getReducedMotion() ? 'reduced' : 'full';
  };
  sync();
  useMotionStore.subscribe(sync);
}

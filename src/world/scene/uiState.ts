import { create } from 'zustand';

/** HUD-only UI state that gameplay input also needs to respect. */
interface HudState {
  mapOpen: boolean;
  /** "Orbit the city" idle showcase is running. */
  showcase: boolean;
  /** Interactable id of the prop the camera is framing up close (the gaming PC), or null. */
  closeup: string | null;
  /** Car picker menu is open. */
  carMenuOpen: boolean;
  setMapOpen: (open: boolean) => void;
  setCloseup: (id: string | null) => void;
  setCarMenuOpen: (open: boolean) => void;
  setShowcase: (on: boolean) => void;
}

export const useHudStore = create<HudState>((set, get) => ({
  mapOpen: false,
  showcase: false,
  closeup: null,
  carMenuOpen: false,
  setMapOpen: (mapOpen) => set({ mapOpen }),
  setCloseup: (closeup) => {
    if (get().closeup !== closeup) set({ closeup });
  },
  setCarMenuOpen: (carMenuOpen) => set({ carMenuOpen }),
  setShowcase: (showcase) => {
    if (get().showcase !== showcase) set({ showcase });
  },
}));

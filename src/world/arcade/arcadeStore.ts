import { create } from 'zustand';

/** The cabinets in the Gaming Zone. */
export type ArcadeGameId = 'tetris' | 'pacman' | 'catgpt';

interface ArcadeState {
  /** The game whose overlay is open, or null when no cabinet is in use. */
  open: ArcadeGameId | null;
  openGame(id: ArcadeGameId): void;
  close(): void;
}

export const useArcadeStore = create<ArcadeState>((set) => ({
  open: null,
  openGame: (id) => set({ open: id }),
  close: () => set({ open: null }),
}));

/** True while an arcade overlay is open; world input handlers should ignore keys then. */
export function isArcadeOpen(): boolean {
  return useArcadeStore.getState().open !== null;
}

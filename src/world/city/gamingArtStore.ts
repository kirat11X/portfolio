// Visual hooks the gameplay code can drive without touching city components:
// the next race gate to highlight, whether the data server has been fed its
// RAM stick, and the car-soccer score. Each exported component (<RaceGates>,
// <DataServer>, <ArenaScoreboard>) also accepts the value as a prop; the prop
// wins when given. Setters ignore unchanged values, so calling them from
// gameplay code every frame is cheap (but prefer calling on change).

import { create } from 'zustand';

export interface ArenaScore {
  /** Team cyan (defends the north goal). */
  home: number;
  /** Team orange (defends the south goal). */
  away: number;
}

interface GamingArtState {
  /**
   * Index into RACE_GATES (city/gamingLayout.ts: the checkpoints in order,
   * then the finish) of the gate to highlight, or null when no lap is running
   * (every gate shows its normal light).
   */
  raceActiveGate: number | null;
  ramInserted: boolean;
  arenaScore: ArenaScore;
  setRaceActiveGate: (index: number | null) => void;
  setRamInserted: (inserted: boolean) => void;
  setArenaScore: (score: ArenaScore) => void;
}

export const useGamingArtStore = create<GamingArtState>((set, get) => ({
  raceActiveGate: null,
  ramInserted: false,
  arenaScore: { home: 0, away: 0 },
  setRaceActiveGate: (index) => {
    if (get().raceActiveGate !== index) set({ raceActiveGate: index });
  },
  setRamInserted: (inserted) => {
    if (get().ramInserted !== inserted) set({ ramInserted: inserted });
  },
  setArenaScore: (score) => {
    const cur = get().arenaScore;
    if (cur.home !== score.home || cur.away !== score.away) set({ arenaScore: { home: score.home, away: score.away } });
  },
}));

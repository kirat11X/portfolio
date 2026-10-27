// Feeds gameplay state to the Gaming Zone art (city/gamingArtStore): the next
// race gate to highlight, whether the data server has its RAM, and the
// stadium scoreboard. One-way: art never writes gameplay state.

import { useEffect } from 'react';
import { useGamingArtStore } from '../city/gamingArtStore';
import { useConsentStore } from '../game/consentStore';
import { useRaceStore } from '../game/raceStore';
import { useSoccerStore } from '../game/soccerStore';

export function useGameArtBridge(): void {
  useEffect(() => {
    const art = useGamingArtStore.getState();
    const syncRace = () => {
      const { phase, next } = useRaceStore.getState();
      art.setRaceActiveGate(phase === 'countdown' || phase === 'running' ? next : null);
    };
    const syncRam = () => art.setRamInserted(useConsentStore.getState().status === 'granted');
    // Team cyan (home) defends the north goal: goals in the north net count for orange (away).
    const syncScore = () => {
      const { northNet, southNet } = useSoccerStore.getState();
      art.setArenaScore({ home: southNet, away: northNet });
    };
    syncRace();
    syncRam();
    syncScore();
    const unsubscribers = [useRaceStore.subscribe(syncRace), useConsentStore.subscribe(syncRam), useSoccerStore.subscribe(syncScore)];
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, []);
}

import { create } from 'zustand';
import { currentConsent, setConsent, type ConsentStatus } from './storage';

interface ConsentState {
  status: ConsentStatus;
  /** The "feed the server" card is showing. */
  cardOpen: boolean;
  /** Bumped when the visitor accepts, so the data-server art can replay its RAM animation. */
  insertSerial: number;
  /** Short confirmation after answering ("RAM installed" …). */
  notice: string | null;
  openCard: () => void;
  closeCard: () => void;
  accept: () => void;
  decline: () => void;
  clearNotice: () => void;
}

export const useConsentStore = create<ConsentState>((set, get) => ({
  status: currentConsent(),
  cardOpen: currentConsent() === 'unknown',
  insertSerial: 0,
  notice: null,
  openCard: () => set({ cardOpen: true, notice: null }),
  closeCard: () => set({ cardOpen: false }),
  accept: () => {
    setConsent('granted');
    set({
      status: 'granted',
      cardOpen: false,
      insertSerial: get().insertSerial + 1,
      notice: 'RAM installed. Your car and scores are now kept in this browser.',
    });
  },
  decline: () => {
    setConsent('declined');
    set({
      status: 'declined',
      cardOpen: false,
      notice: 'The server stays hungry. Car and scores last until you close this tab.',
    });
  },
  clearNotice: () => set({ notice: null }),
}));

/** True when the art should show RAM in the data server. */
export function ramInserted(status: ConsentStatus): boolean {
  return status === 'granted';
}

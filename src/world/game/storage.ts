// Consent-aware storage for the world's own preferences (car, race times,
// soccer goals). The site sets no cookies. With the visitor's "Give it RAM"
// consent, values live in localStorage (kept between visits); without it they
// live in sessionStorage only (gone when the tab closes).
//
// Note: the site-wide theme / view / motion preferences in src/lib persist on
// their own and are not gated by this consent (documented, not changed here).

export type ConsentStatus = 'unknown' | 'granted' | 'declined';

export const CONSENT_KEY = 'kirat:consent';
/** Keys this module manages; moved between session and local storage when consent changes. */
export const GAME_KEYS = ['kirat:car', 'kirat:race', 'kirat:soccer'] as const;
export type GameKey = (typeof GAME_KEYS)[number];

function area(kind: 'local' | 'session'): Storage | null {
  try {
    return typeof window === 'undefined' ? null : kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readConsent(): ConsentStatus {
  try {
    const value = area('local')?.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'declined' ? value : 'unknown';
  } catch {
    return 'unknown';
  }
}

let consent: ConsentStatus = readConsent();

export function currentConsent(): ConsentStatus {
  return consent;
}

/** Read a game value: the persistent copy when consented, else this session's copy. */
export function readGame(key: GameKey): string | null {
  try {
    if (consent === 'granted') return area('local')?.getItem(key) ?? area('session')?.getItem(key) ?? null;
    return area('session')?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeGame(key: GameKey, value: string): void {
  try {
    (consent === 'granted' ? area('local') : area('session'))?.setItem(key, value);
  } catch {
    /* Storage unavailable (private mode, quota): the value still lives in memory. */
  }
}

export function readGameJson<T>(key: GameKey, fallback: T, valid: (value: unknown) => value is T): T {
  const raw = readGame(key);
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Record the visitor's answer. Granting moves this session's values into
 * localStorage; declining (or revoking) moves them back to the session and
 * removes the persistent copies. Only the answer itself is remembered.
 */
export function setConsent(next: Exclude<ConsentStatus, 'unknown'>): void {
  const local = area('local');
  const session = area('session');
  try {
    for (const key of GAME_KEYS) {
      if (next === 'granted') {
        const value = session?.getItem(key);
        if (value != null) local?.setItem(key, value);
        session?.removeItem(key);
      } else {
        const value = local?.getItem(key);
        if (value != null) session?.setItem(key, value);
        local?.removeItem(key);
      }
    }
    local?.setItem(CONSENT_KEY, next);
  } catch {
    /* ignore */
  }
  consent = next;
}

/** Test/dev hook: forget the answer so the card shows again. */
export function resetConsentForTests(status: ConsentStatus = 'unknown'): void {
  consent = status;
}

// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { CONSENT_KEY, readConsent, readGame, resetConsentForTests, setConsent, writeGame } from './storage';

describe('consent-aware storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetConsentForTests('unknown');
  });

  it('keeps values for the session only until the visitor consents', () => {
    writeGame('kirat:car', 'kestrel');
    expect(window.localStorage.getItem('kirat:car')).toBeNull();
    expect(window.sessionStorage.getItem('kirat:car')).toBe('kestrel');
    expect(readGame('kirat:car')).toBe('kestrel');
  });

  it('moves session values into localStorage on "Give it RAM"', () => {
    writeGame('kirat:race', '{"board":[]}');
    setConsent('granted');
    expect(readConsent()).toBe('granted');
    expect(window.localStorage.getItem(CONSENT_KEY)).toBe('granted');
    expect(window.localStorage.getItem('kirat:race')).toBe('{"board":[]}');
    expect(window.sessionStorage.getItem('kirat:race')).toBeNull();
    writeGame('kirat:car', 'stingray');
    expect(window.localStorage.getItem('kirat:car')).toBe('stingray');
  });

  it('declining (or taking the RAM back) removes the persistent copies but keeps this visit working', () => {
    setConsent('granted');
    writeGame('kirat:soccer', '{"best":3,"total":9}');
    setConsent('declined');
    expect(window.localStorage.getItem('kirat:soccer')).toBeNull();
    expect(window.localStorage.getItem(CONSENT_KEY)).toBe('declined');
    expect(readGame('kirat:soccer')).toBe('{"best":3,"total":9}');
    // Nothing but the answer itself is left in localStorage.
    expect(Object.keys(window.localStorage)).toEqual([CONSENT_KEY]);
  });

  it('sets no cookies', () => {
    writeGame('kirat:car', 'pod');
    setConsent('granted');
    expect(document.cookie).toBe('');
  });
});

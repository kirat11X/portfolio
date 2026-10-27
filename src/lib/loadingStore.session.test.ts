// @vitest-environment jsdom
//
// Browser-session behaviour of the loading store: a visitor who already passed
// the intro in this tab is "returning" (compact loader, auto-enter), and storage
// failures (private mode, blocked storage) never break loading.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const INTRO_KEY = 'kirat:intro-seen';

async function freshStore() {
  vi.resetModules();
  return (await import('./loadingStore')).useLoadingStore;
}

beforeEach(() => window.sessionStorage.clear());
afterEach(() => window.sessionStorage.clear());

describe('intro-seen flag', () => {
  it('a first visit is not returning', async () => {
    const store = await freshStore();
    expect(store.getState().returning).toBe(false);
  });

  it('a visitor who entered earlier this session is returning', async () => {
    window.sessionStorage.setItem(INTRO_KEY, '1');
    const store = await freshStore();
    expect(store.getState().returning).toBe(true);
  });

  it('enter() records the flag for the rest of the session', async () => {
    const store = await freshStore();
    store.getState().enter();
    expect(window.sessionStorage.getItem(INTRO_KEY)).toBe('1');
  });

  it('tolerates storage that throws on read and on write', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const store = await freshStore();
    expect(store.getState().returning).toBe(false);
    expect(() => store.getState().enter()).not.toThrow();
    expect(store.getState().entered).toBe(true);
  });
});

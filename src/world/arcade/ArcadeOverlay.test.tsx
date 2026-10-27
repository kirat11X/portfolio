// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ArcadeOverlay } from './ArcadeOverlay';
import { isArcadeOpen, useArcadeStore } from './arcadeStore';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let trigger: HTMLButtonElement;

beforeEach(() => {
  trigger = document.createElement('button');
  trigger.textContent = 'cabinet';
  document.body.appendChild(trigger);
  trigger.focus();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ArcadeOverlay />));
});

afterEach(() => {
  act(() => {
    useArcadeStore.getState().close();
    root.unmount();
  });
  container.remove();
  trigger.remove();
});

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');

describe('ArcadeOverlay', () => {
  it('renders nothing while closed', () => {
    expect(dialog()).toBeNull();
    expect(isArcadeOpen()).toBe(false);
  });

  it('opens a labelled modal dialog for the chosen game', async () => {
    await act(async () => useArcadeStore.getState().openGame('catgpt'));
    const el = dialog()!;
    expect(el.getAttribute('aria-modal')).toBe('true');
    const title = document.getElementById(el.getAttribute('aria-labelledby')!);
    expect(title?.textContent).toBe('CatGPT');
    expect(isArcadeOpen()).toBe(true);
  });

  it('keeps key events from reaching window listeners', async () => {
    let leaked = 0;
    const listener = () => leaked++;
    window.addEventListener('keydown', listener);
    await act(async () => useArcadeStore.getState().openGame('catgpt'));
    const close = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Close'))!;
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true }));
    // A stray event from outside the dialog (focus on <body>) is swallowed as well.
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true }));
    window.removeEventListener('keydown', listener);
    expect(leaked).toBe(0);
  });

  it('Escape and the Close button close it and focus returns', async () => {
    await act(async () => useArcadeStore.getState().openGame('catgpt'));
    act(() => {
      dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    });
    expect(useArcadeStore.getState().open).toBeNull();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);

    await act(async () => useArcadeStore.getState().openGame('catgpt'));
    const close = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Close'))!;
    act(() => close.click());
    expect(useArcadeStore.getState().open).toBeNull();
  });
});

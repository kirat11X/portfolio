import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DISTRICT_ORDER } from '../config/layout';
import { useWorldStore } from '../state/worldStore';
import { isArcadeOpen } from '../arcade/arcadeStore';
import { useConsentStore } from '../game/consentStore';
import { useSoccerStore } from '../game/soccerStore';
import { useRaceStore } from '../game/raceStore';
import { closeCloseup, interact, returnToNearestDistrict } from './actions';
import { cancelAutopilot, clearKeys, runtime, type DriveKeys } from './runtime';
import { useHudStore } from './uiState';
import { stopShowcase } from './showcase';

const DRIVE_KEYS: Record<string, keyof DriveKeys> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'backward',
  ArrowDown: 'backward',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

const TRAVEL_KEYS: Record<string, number> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Digit5: 4,
  Numpad1: 0,
  Numpad2: 1,
  Numpad3: 2,
  Numpad4: 3,
  Numpad5: 4,
};

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'color', 'file', 'image']);

function isTextEntry(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return true;
  return element instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(element.type);
}

/** Elements where Space/Enter already mean "activate". */
function isActivatable(element: Element | null): boolean {
  return Boolean(
    element?.closest(
      'button, a[href], input, select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="tab"], [role="menuitem"], [role="option"]',
    ),
  );
}

/**
 * Driving and shortcut keys. Listens only while `enabled` (world visible and
 * entered); ignores typing in fields and everything except Esc while the help
 * dialog is open (the dialog handles Esc itself). Only keys it handles are
 * prevented.
 */
export function useKeyboardControls(enabled: boolean): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) {
      clearKeys();
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (isTextEntry(target)) return;
      const world = useWorldStore.getState();
      const hud = useHudStore.getState();
      // Modal UI owns the keyboard: help, map, car menu and arcade cabinets.
      if (world.helpOpen || hud.mapOpen || hud.carMenuOpen || isArcadeOpen()) return;

      const drive = DRIVE_KEYS[event.code];
      // Any key we handle ends the showcase. Driving and Esc keys only stop it (the
      // vehicle must not lurch while the camera is still flying back); shortcuts
      // like 1–5, M or H still do their job afterwards.
      if (runtime.camera.showcase) {
        const isShortcut = event.code in TRAVEL_KEYS || ['KeyH', 'KeyM', 'KeyR', 'KeyE', 'Enter'].includes(event.code) || event.key === '?';
        if (drive || isShortcut || event.code === 'Space' || event.code === 'Escape') {
          stopShowcase();
          if (!isShortcut) {
            event.preventDefault();
            return;
          }
        }
      }
      if (drive) {
        // Arrow keys keep their native job (scrolling) inside the exhibit panel.
        if (event.code.startsWith('Arrow') && target?.closest('[data-world-panel]')) return;
        event.preventDefault();
        runtime.keys[drive] = true;
        cancelAutopilot();
        closeCloseup();
        if (world.selectedExhibitId) world.selectExhibit(null);
        return;
      }
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        runtime.keys.boost = true;
        return;
      }
      if (event.code === 'Space') {
        if (isActivatable(target)) return;
        event.preventDefault();
        runtime.keys.brake = true;
        cancelAutopilot();
        return;
      }

      const travelIndex = TRAVEL_KEYS[event.code];
      const isHelp = event.code === 'KeyH' || event.key === '?';
      const isMap = event.code === 'KeyM';
      const isInteract = event.code === 'KeyE' || ((event.code === 'Enter' || event.code === 'NumpadEnter') && !isActivatable(target));
      const isResetBall = event.code === 'KeyB' && useSoccerStore.getState().inArena;
      const handled =
        travelIndex !== undefined || isHelp || isMap || isInteract || isResetBall || event.code === 'KeyR' || event.code === 'Escape';
      if (!handled) return;
      if (event.repeat) {
        if (event.code !== 'Escape') event.preventDefault();
        return;
      }

      if (isInteract) {
        if (interact(world.focusedId, navigate)) event.preventDefault();
      } else if (isResetBall) {
        event.preventDefault();
        useSoccerStore.getState().resetBall();
      } else if (event.code === 'Escape') {
        const race = useRaceStore.getState();
        const consent = useConsentStore.getState();
        if (world.selectedExhibitId) {
          world.selectExhibit(null);
          event.preventDefault();
        } else if (closeCloseup()) {
          event.preventDefault();
        } else if (consent.cardOpen) {
          consent.closeCard();
          event.preventDefault();
        } else if (race.phase === 'countdown' || race.phase === 'running') {
          race.cancel();
          event.preventDefault();
        } else if (race.phase === 'finished') {
          race.exit();
          event.preventDefault();
        } else if (runtime.autopilot.active) {
          cancelAutopilot();
          event.preventDefault();
        }
      } else if (travelIndex !== undefined) {
        event.preventDefault();
        world.requestTravel(DISTRICT_ORDER[travelIndex]);
      } else if (event.code === 'KeyR') {
        event.preventDefault();
        returnToNearestDistrict();
      } else if (isHelp) {
        event.preventDefault();
        world.setHelpOpen(true);
      } else if (isMap) {
        event.preventDefault();
        useHudStore.getState().setMapOpen(true);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const drive = DRIVE_KEYS[event.code];
      if (drive) runtime.keys[drive] = false;
      else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') runtime.keys.boost = false;
      else if (event.code === 'Space') runtime.keys.brake = false;
    };
    const onBlur = () => clearKeys();
    const onVisibility = () => {
      if (document.hidden) clearKeys();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      clearKeys();
    };
  }, [enabled, navigate]);
}

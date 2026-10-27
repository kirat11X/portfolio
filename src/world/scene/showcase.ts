// "Orbit the city": an idle showcase where the camera revolves around the whole
// island. The follow pose is derived from the (untouched) vehicle and camera
// controls, so stopping eases back to exactly the view the visitor left.

import { useWorldStore } from '../state/worldStore';
import { cancelAutopilot, clearKeys, runtime } from './runtime';
import { useHudStore } from './uiState';

export function isShowcasing(): boolean {
  return runtime.camera.showcase;
}

export function startShowcase(): void {
  if (runtime.camera.showcase) return;
  cancelAutopilot();
  clearKeys();
  const world = useWorldStore.getState();
  if (world.selectedExhibitId) world.selectExhibit(null);
  runtime.camera.showcase = true;
  useHudStore.getState().setShowcase(true);
}

/** Stop the showcase; returns true when it was running (the caller may swallow the input). */
export function stopShowcase(): boolean {
  if (!runtime.camera.showcase) return false;
  runtime.camera.showcase = false;
  useHudStore.getState().setShowcase(false);
  return true;
}

export function toggleShowcase(): void {
  if (runtime.camera.showcase) stopShowcase();
  else startShowcase();
}

// The world store is read by the 3D scene every frame and by the HTML HUD, so
// setters must not notify subscribers when nothing changed (ARCHITECTURE §9).

import { beforeEach, describe, expect, it } from 'vitest';
import { DISTRICTS } from '../config/layout';
import { useWorldStore, vehiclePose } from './worldStore';

const store = useWorldStore;

function notifications(run: () => void): number {
  let count = 0;
  const unsubscribe = store.subscribe(() => {
    count++;
  });
  try {
    run();
  } finally {
    unsubscribe();
  }
  return count;
}

beforeEach(() => store.setState(store.getInitialState(), true));

describe('initial state', () => {
  it('starts in the hub with nothing hovered, focused or selected', () => {
    const state = store.getState();
    expect(state.activeDistrict).toBe('hub');
    expect(state.hoveredId).toBeNull();
    expect(state.focusedId).toBeNull();
    expect(state.selectedExhibitId).toBeNull();
    expect(state.travel).toBeNull();
    expect(state.helpOpen).toBe(false);
    expect(['high', 'medium', 'low']).toContain(state.quality);
  });

  it('the vehicle starts on the hub spawn', () => {
    expect({ x: vehiclePose.x, z: vehiclePose.z, heading: vehiclePose.heading }).toEqual(DISTRICTS.hub.spawn);
  });
});

describe('guarded setters', () => {
  it('do not notify when the value is unchanged', () => {
    expect(notifications(() => store.getState().setActiveDistrict('hub'))).toBe(0);
    expect(notifications(() => store.getState().setHovered(null))).toBe(0);
    expect(notifications(() => store.getState().setFocused(null))).toBe(0);
  });

  it('notify once per real change', () => {
    expect(
      notifications(() => {
        store.getState().setActiveDistrict('engineering');
        store.getState().setActiveDistrict('engineering');
        store.getState().setHovered('exhibit:x');
        store.getState().setHovered('exhibit:x');
        store.getState().setFocused('portal:about');
        store.getState().setFocused('portal:about');
      }),
    ).toBe(3);
    expect(store.getState().activeDistrict).toBe('engineering');
  });
});

describe('travel and selection', () => {
  it('requestTravel records the destination with a nonce and closes any open exhibit', () => {
    store.getState().selectExhibit('exhibit:campus-vehicle-security');
    store.getState().requestTravel('creative');
    const { travel, selectedExhibitId } = store.getState();
    expect(travel?.district).toBe('creative');
    expect(travel?.nonce).toEqual(expect.any(Number));
    expect(selectedExhibitId).toBeNull();
    store.getState().clearTravel();
    expect(store.getState().travel).toBeNull();
  });

  it('a repeated request to the same district is still a new request object', () => {
    store.getState().requestTravel('about');
    const first = store.getState().travel;
    store.getState().requestTravel('about');
    expect(store.getState().travel).not.toBe(first);
  });
});

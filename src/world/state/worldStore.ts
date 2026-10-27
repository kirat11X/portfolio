// Interaction state shared by the 3D scene and the HTML HUD. Per-frame values
// (vehicle pose) live in the mutable `vehiclePose` object instead of React
// state so animation never triggers re-renders.

import { create } from 'zustand';
import type { DistrictId } from '../config/layout';
import { DISTRICTS } from '../config/layout';

export type QualityTier = 'high' | 'medium' | 'low';

/** Ids are "exhibit:<slug>" or "portal:<name>". */
export type InteractableId = string;

interface WorldState {
  /** District the vehicle is currently inside, or null on the streets. */
  activeDistrict: DistrictId | null;
  /** Interactable under the mouse pointer. */
  hoveredId: InteractableId | null;
  /** Interactable whose trigger pad the vehicle is on (E / Enter acts on it). */
  focusedId: InteractableId | null;
  /** Exhibit whose detail panel is open. */
  selectedExhibitId: InteractableId | null;
  /** Quick-travel request from the HUD; the scene consumes it. */
  travel: { district: DistrictId; nonce: number } | null;
  helpOpen: boolean;
  quality: QualityTier;

  setActiveDistrict: (district: DistrictId | null) => void;
  setHovered: (id: InteractableId | null) => void;
  setFocused: (id: InteractableId | null) => void;
  selectExhibit: (id: InteractableId | null) => void;
  requestTravel: (district: DistrictId) => void;
  clearTravel: () => void;
  setHelpOpen: (open: boolean) => void;
  setQuality: (quality: QualityTier) => void;
}

function initialQuality(): QualityTier {
  if (typeof window === 'undefined') return 'medium';
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  return coarse || small ? 'medium' : 'high';
}

export const useWorldStore = create<WorldState>((set, get) => ({
  activeDistrict: 'hub',
  hoveredId: null,
  focusedId: null,
  selectedExhibitId: null,
  travel: null,
  helpOpen: false,
  quality: initialQuality(),

  setActiveDistrict: (activeDistrict) => {
    if (get().activeDistrict !== activeDistrict) set({ activeDistrict });
  },
  setHovered: (hoveredId) => {
    if (get().hoveredId !== hoveredId) set({ hoveredId });
  },
  setFocused: (focusedId) => {
    if (get().focusedId !== focusedId) set({ focusedId });
  },
  selectExhibit: (selectedExhibitId) => set({ selectedExhibitId }),
  requestTravel: (district) => set({ travel: { district, nonce: Date.now() }, selectedExhibitId: null }),
  clearTravel: () => set({ travel: null }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setQuality: (quality) => set({ quality }),
}));

/** Mutable vehicle pose, written every frame by the vehicle, read by camera, HUD minimap, etc. */
export const vehiclePose = {
  x: DISTRICTS.hub.spawn.x,
  z: DISTRICTS.hub.spawn.z,
  heading: DISTRICTS.hub.spawn.heading,
  /** Signed speed in units per second (negative when reversing). */
  speed: 0,
};

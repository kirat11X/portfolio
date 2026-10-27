// The three cars in the garage. Original procedural designs: the classic
// hover-pod, a stubby big-wheeled hatch and a long low coupe. Handling differs
// a little; the collision circle is shared (VEHICLE.radius) so every car fits
// the same roads, pads and autopilot grid.

import { create } from 'zustand';
import { neon } from '@/styles/tokens';
import { VEHICLE } from '../scene/tuning';
import { readGame, writeGame } from './storage';

export type CarId = 'pod' | 'kestrel' | 'stingray';

export type VehicleTuning = { -readonly [K in keyof typeof VEHICLE]: number };

export interface CarDef {
  id: CarId;
  name: string;
  /** One line under the name in the picker. */
  tagline: string;
  /** Short handling summary (picker + help). */
  handling: string;
  /** Main paint. */
  body: string;
  /** Second livery colour (lower body, roof, stripes or slash, per car). */
  livery: string;
  /** Third livery colour (stripes, slashes, fins). */
  detail: string;
  /** Dark trim: skirts, intakes, diffuser, interior. */
  trim: string;
  /** Wheel rims. */
  rim: string;
  /** Tinted glass and its faint inner glow. */
  glass: string;
  glassGlow: string;
  /** Neon accent: light strips, underglow, wheel rings. */
  accent: string;
  tuning: VehicleTuning;
}

function tune(overrides: Partial<VehicleTuning>): VehicleTuning {
  return { ...VEHICLE, ...overrides };
}

export const CARS: Record<CarId, CarDef> = {
  pod: {
    id: 'pod',
    name: 'Nimbus',
    tagline: 'Pearl hover-pod on four glowing pads',
    handling: 'Balanced and forgiving',
    body: '#dfe7f2',
    livery: '#1b2446',
    detail: '#3ee0ff',
    trim: '#131a30',
    rim: '#8e9bb8',
    glass: '#0f2b44',
    glassGlow: '#0d5a78',
    accent: neon.cyan,
    tuning: tune({}),
  },
  kestrel: {
    id: 'kestrel',
    name: 'Kestrel',
    tagline: 'Tall stubby hatch, chunky tyres, big wing',
    handling: 'Quick off the line, turns tight',
    body: '#ff6a2c',
    livery: '#22252f',
    detail: '#ffe7c9',
    trim: '#15161d',
    rim: '#2e3242',
    glass: '#131c2a',
    glassGlow: '#4a2a1a',
    accent: neon.orange,
    tuning: tune({ accel: 19.5, boostAccel: 28, maxSpeed: 12.2, steerRate: 2.85, pivotRate: 1.3, grip: 12 }),
  },
  stingray: {
    id: 'stingray',
    name: 'Stingray',
    tagline: 'Long, low wedge coupe with twin stripes',
    handling: 'Highest top speed, wider turns',
    body: '#7a30c8',
    livery: '#151225',
    detail: '#f1e8ff',
    trim: '#100e1a',
    rim: '#c3c8dc',
    glass: '#150f26',
    glassGlow: '#3a1f66',
    accent: neon.magenta,
    tuning: tune({ maxSpeed: 13.6, boostSpeed: 20.5, accel: 16, steerRate: 2.35, highSpeedSteerFalloff: 0.32, grip: 10 }),
  },
};

export interface CarStats {
  speed: number;
  acceleration: number;
  turning: number;
}

const unit = (value: number, min: number, max: number) => Math.min(1, Math.max(0, (value - min) / (max - min)));

/**
 * Picker stat bars (0..1), derived from the handling numbers so they can never
 * drift from how the cars actually drive. Ranges bracket the garage's spread.
 */
export function carStats(def: CarDef): CarStats {
  const t = def.tuning;
  return {
    speed: 0.15 + 0.85 * unit(t.maxSpeed * 0.7 + t.boostSpeed * 0.3, 13, 15.8),
    acceleration: 0.15 + 0.85 * unit(t.accel * 0.7 + t.boostAccel * 0.3, 18, 22.5),
    turning: 0.15 + 0.85 * unit(t.steerRate * (1 - t.highSpeedSteerFalloff * 0.5), 1.9, 2.4),
  };
}

export const CAR_ORDER: CarId[] = ['pod', 'kestrel', 'stingray'];

export function isCarId(value: unknown): value is CarId {
  return typeof value === 'string' && value in CARS;
}

interface CarState {
  carId: CarId;
  setCar: (id: CarId) => void;
  /** Re-read the stored choice (after consent changes). */
  reload: () => void;
}

function storedCar(): CarId {
  const value = readGame('kirat:car');
  return isCarId(value) ? value : 'pod';
}

export const useCarStore = create<CarState>((set, get) => ({
  carId: storedCar(),
  setCar: (carId) => {
    if (!isCarId(carId)) return;
    writeGame('kirat:car', carId);
    if (get().carId !== carId) set({ carId });
  },
  reload: () => set({ carId: storedCar() }),
}));

/** Handling of the car currently selected (read every frame by the simulation). */
export function currentTuning(): VehicleTuning {
  return CARS[useCarStore.getState().carId].tuning;
}

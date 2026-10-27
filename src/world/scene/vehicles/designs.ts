// Shape data for the three cars, shared by the 3D builder (vehicleGeometry.ts)
// and the garage silhouettes (CarPicker). Pure data: no three.js import, so the
// HUD can use it without pulling geometry code.
//
// Local car space: front = -Z, +X = right, y = up from the body group origin
// (the ground for wheeled cars; the hover height for the pod).

import type { CarId } from '../../game/cars';

/** One cross-section of a lofted body: a superellipse spanning yb..yt and ±w. */
export interface Station {
  z: number;
  /** Half width. */
  w: number;
  /** Bottom and top of the section. */
  yb: number;
  yt: number;
  /** Superellipse exponent of the upper / lower half (2 = round, 4+ = boxy). */
  n?: number;
  nb?: number;
  /** Tumblehome: width of the top relative to the waist (1 = straight sides). */
  tw?: number;
}

export interface WheelSpec {
  x: number;
  z: number;
  /** Front wheels steer. */
  front: boolean;
}

export interface CarDesign {
  body: Station[];
  cabin: Station[];
  /** Height of the body group above the ground (the pod floats). */
  ride: number;
  wheelRadius: number;
  wheelWidth: number;
  wheels: WheelSpec[];
}

export const DESIGNS: Record<CarId, CarDesign> = {
  // Nimbus: a smooth teardrop pod with a bubble canopy, floating on four pads.
  pod: {
    ride: 0.3,
    wheelRadius: 0,
    wheelWidth: 0,
    wheels: [],
    body: [
      { z: -1.17, w: 0.24, yb: 0.2, yt: 0.32, n: 2, nb: 2, tw: 0.9 },
      { z: -1.11, w: 0.44, yb: 0.1, yt: 0.42, n: 2.3, nb: 2.3, tw: 0.86 },
      { z: -0.9, w: 0.61, yb: 0.04, yt: 0.5, n: 2.6, nb: 2.6, tw: 0.8 },
      { z: -0.4, w: 0.72, yb: 0.0, yt: 0.56, n: 2.7, nb: 2.8, tw: 0.78 },
      { z: 0.35, w: 0.74, yb: 0.0, yt: 0.58, n: 2.7, nb: 2.8, tw: 0.78 },
      { z: 0.85, w: 0.65, yb: 0.05, yt: 0.55, n: 2.5, nb: 2.6, tw: 0.8 },
      { z: 1.05, w: 0.5, yb: 0.12, yt: 0.48, n: 2.3, nb: 2.4, tw: 0.84 },
      { z: 1.14, w: 0.36, yb: 0.18, yt: 0.42, n: 2.2, nb: 2.2, tw: 0.88 },
      { z: 1.18, w: 0.2, yb: 0.24, yt: 0.36, n: 2, nb: 2, tw: 0.9 },
    ],
    cabin: [
      { z: -0.62, w: 0.16, yb: 0.42, yt: 0.52, n: 2, nb: 2, tw: 0.9 },
      { z: -0.44, w: 0.36, yb: 0.4, yt: 0.72, n: 2, nb: 2, tw: 0.9 },
      { z: -0.05, w: 0.46, yb: 0.38, yt: 0.93, n: 2.1, nb: 2, tw: 0.9 },
      { z: 0.35, w: 0.45, yb: 0.38, yt: 0.92, n: 2.1, nb: 2, tw: 0.9 },
      { z: 0.7, w: 0.34, yb: 0.42, yt: 0.72, n: 2, nb: 2, tw: 0.9 },
      { z: 0.84, w: 0.14, yb: 0.48, yt: 0.56, n: 2, nb: 2, tw: 0.9 },
    ],
  },
  // Kestrel: short, tall and stubby, big chunky wheels, a tall cab and a big wing.
  kestrel: {
    ride: 0,
    wheelRadius: 0.4,
    wheelWidth: 0.36,
    wheels: [
      { x: -0.77, z: -0.68, front: true },
      { x: 0.77, z: -0.68, front: true },
      { x: -0.77, z: 0.72, front: false },
      { x: 0.77, z: 0.72, front: false },
    ],
    body: [
      { z: -1.13, w: 0.5, yb: 0.36, yt: 0.6, n: 3, nb: 3, tw: 0.92 },
      { z: -1.08, w: 0.63, yb: 0.3, yt: 0.68, n: 3.4, nb: 3.4, tw: 0.9 },
      { z: -0.94, w: 0.68, yb: 0.28, yt: 0.73, n: 3.6, nb: 4, tw: 0.88 },
      { z: -0.35, w: 0.69, yb: 0.27, yt: 0.82, n: 3.6, nb: 4, tw: 0.86 },
      { z: 0.45, w: 0.7, yb: 0.27, yt: 0.86, n: 3.6, nb: 4, tw: 0.86 },
      { z: 0.98, w: 0.68, yb: 0.29, yt: 0.86, n: 3.6, nb: 4, tw: 0.88 },
      { z: 1.1, w: 0.62, yb: 0.33, yt: 0.82, n: 3.2, nb: 3.4, tw: 0.9 },
      { z: 1.14, w: 0.5, yb: 0.4, yt: 0.74, n: 3, nb: 3, tw: 0.92 },
    ],
    cabin: [
      { z: -0.42, w: 0.5, yb: 0.76, yt: 0.8, n: 3, nb: 3, tw: 0.8 },
      { z: -0.22, w: 0.56, yb: 0.76, yt: 1.06, n: 3.2, nb: 3, tw: 0.76 },
      { z: 0.2, w: 0.57, yb: 0.76, yt: 1.19, n: 3.4, nb: 3, tw: 0.74 },
      { z: 0.72, w: 0.56, yb: 0.76, yt: 1.17, n: 3.4, nb: 3, tw: 0.74 },
      { z: 0.94, w: 0.5, yb: 0.78, yt: 1.08, n: 3, nb: 3, tw: 0.76 },
      { z: 1.0, w: 0.4, yb: 0.8, yt: 0.96, n: 3, nb: 3, tw: 0.8 },
    ],
  },
  // Stingray: long, low and wide, a sharp wedge nose and a long fastback.
  stingray: {
    ride: 0,
    wheelRadius: 0.31,
    wheelWidth: 0.36,
    wheels: [
      { x: -0.78, z: -0.82, front: true },
      { x: 0.78, z: -0.82, front: true },
      { x: -0.79, z: 0.88, front: false },
      { x: 0.79, z: 0.88, front: false },
    ],
    body: [
      { z: -1.36, w: 0.56, yb: 0.18, yt: 0.24, n: 4, nb: 4, tw: 0.9 },
      { z: -1.3, w: 0.74, yb: 0.15, yt: 0.29, n: 4.5, nb: 4.5, tw: 0.9 },
      { z: -1.08, w: 0.82, yb: 0.14, yt: 0.36, n: 4.5, nb: 5, tw: 0.88 },
      { z: -0.8, w: 0.85, yb: 0.13, yt: 0.42, n: 4.5, nb: 5, tw: 0.84 },
      { z: -0.1, w: 0.76, yb: 0.13, yt: 0.52, n: 4.5, nb: 5, tw: 0.86 },
      { z: 0.85, w: 0.88, yb: 0.15, yt: 0.58, n: 4.5, nb: 5, tw: 0.82 },
      { z: 1.18, w: 0.84, yb: 0.19, yt: 0.58, n: 4, nb: 4.5, tw: 0.86 },
      { z: 1.33, w: 0.7, yb: 0.27, yt: 0.54, n: 3.4, nb: 3.4, tw: 0.9 },
    ],
    cabin: [
      { z: -0.62, w: 0.42, yb: 0.44, yt: 0.47, n: 2.6, nb: 2.6, tw: 0.82 },
      { z: -0.35, w: 0.54, yb: 0.44, yt: 0.7, n: 2.8, nb: 2.6, tw: 0.76 },
      { z: 0.05, w: 0.57, yb: 0.46, yt: 0.82, n: 3, nb: 2.6, tw: 0.72 },
      { z: 0.42, w: 0.56, yb: 0.48, yt: 0.8, n: 3, nb: 2.6, tw: 0.72 },
      { z: 0.95, w: 0.48, yb: 0.52, yt: 0.64, n: 2.8, nb: 2.6, tw: 0.78 },
      { z: 1.18, w: 0.36, yb: 0.54, yt: 0.58, n: 2.6, nb: 2.6, tw: 0.82 },
    ],
  },
};

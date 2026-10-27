// Placement of decorative props that stand on drivable ground. Pure data (no
// three.js) so config/decorColliders.ts can register the same positions the
// art renders: visuals and physics always agree.

import { DISTRICTS, type DistrictId } from '../config/layout';

export interface LampPlacement {
  id: string;
  x: number;
  z: number;
  /** Direction the lamp arm reaches toward, as a rotation about +Y (0 = +X). */
  armAngle: number;
}

export interface BoothPlacement {
  id: string;
  x: number;
  z: number;
  /** Turns the booth's open side (local +Z) toward the street. */
  rotationY: number;
  r: number;
}

export const LAMP_COLLIDER_RADIUS = 0.32;

function lamps(): LampPlacement[] {
  const out: LampPlacement[] = [];
  // Avenue segments between the hub plaza and each district plaza.
  const seg = 12.5;
  const side = 4.75;
  const avenue: Array<[number, number, number]> = [
    [side, -seg, Math.PI],
    [-side, -seg, 0],
    [side, seg, Math.PI],
    [-side, seg, 0],
    [-seg, side, Math.PI / 2],
    [-seg, -side, -Math.PI / 2],
    [seg, side, Math.PI / 2],
    [seg, -side, -Math.PI / 2],
  ];
  avenue.forEach(([x, z, a], i) => out.push({ id: `lamp-avenue-${i}`, x, z, armAngle: a }));

  // Rims of the four district plazas: two flanking the entry from the hub and
  // two flanking the landmark front. The Archive's front pair stands wider so
  // its three doors stay clear.
  const ids: Array<Exclude<DistrictId, 'hub'>> = ['engineering', 'creative', 'about', 'gaming'];
  for (const id of ids) {
    const [cx, cz] = DISTRICTS[id].center;
    const len = Math.hypot(cx, cz);
    const hx = -cx / len;
    const hz = -cz / len;
    const base = Math.atan2(hz, hx);
    const rim = 9.75;
    const far = id === 'about' ? 125 : 145;
    [35, -35, far, -far].forEach((deg, i) => {
      const a = base + (deg * Math.PI) / 180;
      const x = cx + Math.cos(a) * rim;
      const z = cz + Math.sin(a) * rim;
      // Arm reaches back toward the plaza centre.
      out.push({ id: `lamp-${id}-${i}`, x, z, armAngle: Math.atan2(-(cz - z), cx - x) });
    });
  }
  return out;
}

export const STREET_LAMPS: LampPlacement[] = lamps();

/** A small emerald phone booth beside the Archive's Contact door, open side toward the plaza. */
export const PHONE_BOOTH: BoothPlacement = { id: 'phone-booth', x: 7.9, z: -31.6, rotationY: Math.atan2(-7.9, 7.6), r: 0.78 };

/** Server racks lining the north edge of the Engineering plaza (fronts face south). */
export const RACKS: Array<{ x: number; z: number }> = [-31.6, -30.4, -29.2, -28.0, -20.0, -18.8, -17.6].map((x) => ({ x, z: -16.8 }));
export const RACK_RADIUS = 0.75;

/** Oversized GPU card south of the Engineering plaza, fans facing the plaza (north). */
export const GPU_MONUMENT = { x: -24, z: 16.6, length: 4.6 } as const;

/** Creative props: a film reel north of the studio plaza and a camera on a tripod south of it. */
export const FILM_REEL = { x: 24, z: -16.6, r: 1.5 } as const;
export const CAMERA_PROP = { x: 24, z: 16.6 } as const;

/** Free-standing contact boards at the Archive avenue entry, facing south so they read from the hub. */
export const CONTACT_BOARDS: Array<{ id: string; x: number; z: number; atlas: string }> = [
  { id: 'board-sayhello', x: -8.4, z: -15.6, atlas: 'sayhello' },
  { id: 'board-socials', x: 8.4, z: -15.6, atlas: 'socials' },
];

/** Free-standing lightbox with the PDC Club logo beside the Creative plaza approach. */
export const PDC_SIGN = { x: 16.9, z: -9.3, rotationY: -0.64, width: 3.0, aspect: 244 / 143, bottom: 1.35, r: 1.5 } as const;

export interface PropFootprint {
  id: string;
  x: number;
  z: number;
  r: number;
}

/** Every prop above ~0.3 units standing where the vehicle can drive. */
export const DECOR_PROPS: PropFootprint[] = [
  ...STREET_LAMPS.map((lamp) => ({ id: lamp.id, x: lamp.x, z: lamp.z, r: LAMP_COLLIDER_RADIUS })),
  { id: PHONE_BOOTH.id, x: PHONE_BOOTH.x, z: PHONE_BOOTH.z, r: PHONE_BOOTH.r },
  ...RACKS.map((rack, i) => ({ id: `rack-${i}`, x: rack.x, z: rack.z, r: RACK_RADIUS })),
  ...[-1.6, 0, 1.6].map((dx, i) => ({ id: `gpu-${i}`, x: GPU_MONUMENT.x + dx, z: GPU_MONUMENT.z, r: 0.95 })),
  { id: 'film-reel', x: FILM_REEL.x, z: FILM_REEL.z, r: 1.05 },
  { id: 'camera-prop', x: CAMERA_PROP.x, z: CAMERA_PROP.z, r: 0.95 },
  ...CONTACT_BOARDS.map((b) => ({ id: b.id, x: b.x, z: b.z, r: 1.5 })),
  { id: 'pdc-sign', x: PDC_SIGN.x, z: PDC_SIGN.z, r: PDC_SIGN.r },
];

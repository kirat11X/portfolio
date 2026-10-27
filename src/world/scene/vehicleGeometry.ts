// Procedural geometry for the garage: Nimbus (pearl hover-pod), Kestrel (tall
// stubby hatch with chunky wheels and a big wing) and Stingray (long, low wedge
// coupe). Bodies are lofted superellipse sections (vehicles/loft.ts) painted
// per vertex, so each car's paint, livery, trim and interior share ONE draw
// call; lights, glass, wheels (instanced) and effects add a handful more.
// Built once per selected car (~20k triangles), disposed on unmount.

import { BufferGeometry, Color, CylinderGeometry, ExtrudeGeometry, CapsuleGeometry, CircleGeometry, PlaneGeometry, Shape, SphereGeometry, TorusGeometry } from 'three';
import { CARS, type CarDef, type CarId } from '../game/cars';
import { DESIGNS, type WheelSpec } from './vehicles/designs';
import { Loft, type Painter } from './vehicles/loft';
import { flameGeometry, mergeParts, pair, roundedBox, tint, tube, washCone, wheelGeometry, wheelRing, type WheelLook } from './vehicles/parts';

export type { WheelSpec } from './vehicles/designs';

export interface VehicleGeometries {
  /** Body, livery, trim, interior: vertex-coloured, one material. */
  paint: BufferGeometry;
  glass: BufferGeometry;
  /** Neon light strips (accent colour). */
  accent: BufferGeometry;
  headlights: BufferGeometry;
  tailLight: BufferGeometry;
  /** Boost flame + exhaust trail (additive, vertex colours), anchored at `flameZ`. */
  flame: BufferGeometry;
  /** Hover pads and their light wash (pod only; additive, pulsing). */
  thrusters: BufferGeometry | null;
  /** One wheel (instanced ×4) and its glowing rim ring. */
  wheel: BufferGeometry | null;
  wheelRing: BufferGeometry | null;
  antenna: BufferGeometry | null;
  antennaTip: BufferGeometry | null;
  decal: BufferGeometry;
}

export interface VehicleShape {
  geometries: VehicleGeometries;
  /** Height of the body group above the ground (hover-pod floats; wheeled cars sit on their tyres). */
  ride: number;
  wheelRadius: number;
  wheels: WheelSpec[];
  /** Antenna mount (pod only). */
  antennaAt: [number, number, number] | null;
  /** Ground glow / shadow footprint scale (x, z). */
  footprint: [number, number];
  /** Headlight beam origin (z) in front of the car. */
  beamZ: number;
  /** Where the exhaust nozzles end (flame root). */
  flameZ: number;
}

const DECAL = () => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

function palette(def: CarDef) {
  return {
    body: new Color(def.body),
    livery: new Color(def.livery),
    detail: new Color(def.detail),
    trim: new Color(def.trim),
    rim: new Color(def.rim),
  };
}

/** Points along a loft surface line at a fixed section angle. */
function lineAt(loft: Loft, angle: number, z0: number, z1: number, inflate = 0.012, count = 12): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = [];
  for (let i = 0; i <= count; i++) points.push(loft.point(z0 + ((z1 - z0) * i) / count, angle, inflate));
  return points;
}

/** Points around a loft section (fixed z) between two angles. */
function arcAt(loft: Loft, z: number, a0: number, a1: number, inflate = 0.012, count = 12): Array<[number, number, number]> {
  const points: Array<[number, number, number]> = [];
  for (let i = 0; i <= count; i++) points.push(loft.point(z, a0 + ((a1 - a0) * i) / count, inflate));
  return points;
}

const mirrorX = (points: Array<[number, number, number]>) => points.map(([x, y, z]) => [-x, y, z] as [number, number, number]);

/** Two seats, a dash and a steering wheel: the interior seen through the glass. */
function interior(seatColor: string, trim: string, seats: number[], y: number, z: number, dashZ: number, dashY: number, width: number): BufferGeometry[] {
  const parts: BufferGeometry[] = [];
  for (const x of seats) {
    parts.push(tint(roundedBox(0.3, 0.1, 0.32, 0.04).translate(x, y, z), seatColor));
    parts.push(tint(roundedBox(0.3, 0.28, 0.09, 0.04).rotateX(-0.25).translate(x, y + 0.15, z + 0.17), seatColor));
  }
  parts.push(tint(roundedBox(width, 0.1, 0.2, 0.04).translate(0, dashY, dashZ), trim));
  parts.push(tint(new TorusGeometry(0.09, 0.016, 6, 16).rotateX(-0.9).translate(seats[0], dashY + 0.06, dashZ + 0.16), trim));
  return parts;
}

// --- Nimbus: pearl hover-pod --------------------------------------------------

function podShape(def: CarDef): VehicleShape {
  const design = DESIGNS.pod;
  const c = palette(def);
  const body = new Loft(design.body);
  const cabin = new Loft(design.cabin);

  const paintBody: Painter = (_x, _y, _z, _s, angle, out) => {
    out.copy(Math.sin(angle) < -0.12 ? c.livery : c.body);
  };

  const nacelles: Array<[number, number]> = [
    [-0.7, -0.6],
    [0.7, -0.6],
    [-0.7, 0.62],
    [0.7, 0.62],
  ];
  const paint: BufferGeometry[] = [body.geometry({ along: 44, around: 52, paint: paintBody })];
  // Navy spine stripe over the nose and tail.
  paint.push(...pair(body.ribbon(0, 0.075, -1.12, -0.52), def.livery), ...pair(body.ribbon(0, 0.075, 0.74, 1.15), def.livery));
  for (const [x, z] of nacelles) {
    paint.push(tint(new CapsuleGeometry(0.13, 0.3, 6, 14).rotateX(Math.PI / 2).scale(1, 0.72, 1).translate(x, 0.05, z), c.livery));
    // Pearl fairing on top of each pad.
    paint.push(tint(new CapsuleGeometry(0.1, 0.24, 6, 12).rotateX(Math.PI / 2).scale(0.9, 0.45, 1).translate(x, 0.1, z - 0.02), c.body));
  }
  // Rear thruster nozzles.
  for (const x of [-0.26, 0.26]) {
    paint.push(tint(new CylinderGeometry(0.1, 0.125, 0.2, 20, 1, true).rotateX(Math.PI / 2).translate(x, 0.22, 1.08), c.trim));
    paint.push(tint(new TorusGeometry(0.105, 0.018, 8, 20).translate(x, 0.22, 1.18), c.rim));
  }
  paint.push(...interior('#1c2850', def.trim, [0], 0.36, 0.2, -0.3, 0.46, 0.46));

  const accent = mergeParts([
    tube(lineAt(body, -0.08, -0.98, 1.0, 0.012, 16), 0.016, 40),
    tube(mirrorX(lineAt(body, -0.08, -0.98, 1.0, 0.012, 16)), 0.016, 40),
    // Nozzle cores.
    new CircleGeometry(0.085, 18).translate(-0.26, 0.22, 1.12),
    new CircleGeometry(0.085, 18).translate(0.26, 0.22, 1.12),
    // Glowing pinlines either side of the spine stripe.
    ...pair(body.ribbon(0.09, 0.11, -1.1, -0.52, 0.008, 20, 1), '#ffffff'),
    ...pair(body.ribbon(0.09, 0.11, 0.74, 1.14, 0.008, 14, 1), '#ffffff'),
    // Dash screen.
    new PlaneGeometry(0.3, 0.05).rotateX(-1.0).translate(0, 0.54, -0.2),
  ]);

  const headlights = mergeParts([
    tube(arcAt(body, -1.06, 0.12, 0.62, 0.008, 10), 0.03, 16),
    tube(mirrorX(arcAt(body, -1.06, 0.12, 0.62, 0.008, 10)), 0.03, 16),
  ]);
  const tailLight = mergeParts([tube(arcAt(body, 1.1, 0.35, Math.PI - 0.35, 0.008, 16), 0.024, 24)]);

  const thrusters: BufferGeometry[] = [];
  const glow = new Color(def.accent);
  for (const [x, z] of nacelles) {
    thrusters.push(tint(new CircleGeometry(0.1, 20).rotateX(Math.PI / 2).scale(1, 1, 1.6).translate(x, -0.005, z), glow, 1.4));
    thrusters.push(washCone(x, -0.01, z, 0.09, 0.22, def.accent));
  }

  const antennaAt = body.point(0.84, Math.PI / 2 + 0.75, -0.02);
  return {
    geometries: {
      paint: mergeParts(paint),
      glass: cabin.geometry({ along: 30, around: 40 }),
      accent,
      headlights,
      tailLight,
      flame: flameGeometry(
        [
          [-0.26, 0.22],
          [0.26, 0.22],
        ],
        0.11,
        0.7,
        def.accent,
      ),
      thrusters: mergeParts(thrusters),
      wheel: null,
      wheelRing: null,
      antenna: new CylinderGeometry(0.012, 0.018, 0.5, 6).translate(0, 0.25, 0),
      antennaTip: new SphereGeometry(0.05, 12, 8),
      decal: DECAL(),
    },
    ride: design.ride,
    wheelRadius: 0,
    wheels: [],
    antennaAt,
    footprint: [1.04, 1],
    beamZ: -4.85,
    flameZ: 1.18,
  };
}

// --- Kestrel: tall stubby hatch ------------------------------------------------

/** Airfoil side profile (u = back along +Z, v = up), extruded across the car. */
function wing(span: number, chord: number): BufferGeometry {
  const k = chord / 0.44;
  const s = new Shape();
  s.moveTo(0, 0.02 * k);
  s.quadraticCurveTo(0.05 * k, 0.066 * k, 0.2 * k, 0.062 * k);
  s.quadraticCurveTo(0.36 * k, 0.058 * k, 0.44 * k, 0.11 * k);
  s.lineTo(0.43 * k, 0.07 * k);
  s.quadraticCurveTo(0.3 * k, 0.005 * k, 0.12 * k, -0.008 * k);
  s.quadraticCurveTo(0.02 * k, -0.01 * k, 0, 0.02 * k);
  const bevel = 0.012;
  const g = new ExtrudeGeometry(s, { depth: span - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: 0.008, bevelSegments: 2, curveSegments: 8 });
  g.rotateY(-Math.PI / 2);
  g.translate((span - bevel * 2) / 2, 0, 0);
  return g;
}

function kestrelShape(def: CarDef): VehicleShape {
  const design = DESIGNS.kestrel;
  const c = palette(def);
  const body = new Loft(design.body);
  const cabin = new Loft(design.cabin);
  const r = design.wheelRadius;

  const paintBody: Painter = (_x, _y, z, _s, angle, out) => {
    const up = Math.sin(angle);
    // Bold two-tone: charcoal lower half under a cream pinstripe, charcoal hood spine.
    if (up < -0.3) out.copy(c.livery);
    else if (up < -0.16 && z > -1.0 && z < 1.06) out.copy(c.detail);
    else out.copy(c.body);
  };

  const paint: BufferGeometry[] = [body.geometry({ along: 44, around: 52, paint: paintBody })];
  paint.push(...pair(body.ribbon(0, 0.07, -1.1, -0.44), def.livery));
  // Charcoal roof over the glass cabin.
  paint.push(
    cabin.geometry({
      arc: [Math.PI / 2 - 0.95, Math.PI / 2 + 0.95],
      inflate: 0.012,
      range: [-0.16, 0.97],
      along: 20,
      around: 18,
      paint: (_x, _y, _z, _s, _a, out) => out.copy(c.livery),
    }),
  );
  // Fender flares over each wheel.
  for (const wheel of design.wheels) {
    const sx = Math.sign(wheel.x);
    paint.push(
      tint(
        new TorusGeometry(r + 0.06, 0.07, 8, 20, Math.PI)
          .rotateY(Math.PI / 2)
          .scale(2.5, 1, 1)
          .translate(sx * 0.76, r - 0.02, wheel.z),
        c.livery,
      ),
    );
  }
  // Side intakes, hood scoop, bumpers and splitter.
  for (const sx of [-1, 1]) {
    paint.push(tint(roundedBox(0.09, 0.17, 0.34, 0.05).translate(sx * 0.685, 0.53, 0.2), c.trim));
    paint.push(tint(roundedBox(0.05, 0.1, 0.24, 0.03).translate(sx * 0.72, 0.53, 0.2), '#050508'));
  }
  paint.push(tint(roundedBox(0.36, 0.07, 0.32, 0.03).translate(0, 0.79, -0.62), c.trim));
  paint.push(tint(roundedBox(0.26, 0.04, 0.2, 0.02).translate(0, 0.82, -0.62), '#050508'));
  paint.push(tint(roundedBox(1.22, 0.17, 0.14, 0.06).translate(0, 0.38, -1.09), c.trim));
  paint.push(tint(roundedBox(1.34, 0.04, 0.22, 0.02).translate(0, 0.29, -1.1), c.livery));
  paint.push(tint(roundedBox(1.18, 0.15, 0.12, 0.05).translate(0, 0.4, 1.11), c.trim));
  // Rear wing: struts, blade, endplates.
  for (const sx of [-1, 1]) {
    paint.push(tint(roundedBox(0.07, 0.34, 0.16, 0.025).rotateX(-0.3).translate(sx * 0.36, 0.98, 1.04), c.body));
    paint.push(tint(roundedBox(0.035, 0.2, 0.5, 0.015).translate(sx * 0.7, 1.16, 1.08), c.detail));
  }
  paint.push(tint(wing(1.38, 0.46).rotateX(0.08).translate(0, 1.11, 0.85), c.body));
  // Exhaust pipes.
  for (const x of [-0.34, 0.34]) {
    paint.push(tint(new CylinderGeometry(0.065, 0.065, 0.16, 16, 1, true).rotateX(Math.PI / 2).translate(x, 0.33, 1.14), c.rim));
    paint.push(tint(new TorusGeometry(0.065, 0.014, 6, 16).translate(x, 0.33, 1.22), '#9aa3b8'));
  }
  paint.push(...interior('#3a2a26', def.trim, [-0.22, 0.22], 0.62, 0.32, -0.18, 0.78, 0.9));

  const accent = mergeParts([
    tube(lineAt(body, -0.55, -0.32, 0.3, 0.01, 8), 0.016, 16),
    tube(mirrorX(lineAt(body, -0.55, -0.32, 0.3, 0.01, 8)), 0.016, 16),
    // Intake glow lines.
    roundedBox(0.03, 0.02, 0.3, 0.008).translate(0.735, 0.63, 0.2),
    roundedBox(0.03, 0.02, 0.3, 0.008).translate(-0.735, 0.63, 0.2),
    // Grille slot and wing trailing edge.
    roundedBox(0.7, 0.03, 0.03, 0.012).translate(0, 0.4, -1.17),
    roundedBox(1.36, 0.02, 0.025, 0.01).translate(0, 1.22, 1.3),
  ]);

  const headlights = mergeParts([
    new SphereGeometry(0.1, 16, 10).scale(1.25, 0.85, 0.5).translate(-0.42, 0.6, -1.08),
    new SphereGeometry(0.1, 16, 10).scale(1.25, 0.85, 0.5).translate(0.42, 0.6, -1.08),
  ]);
  const tailLight = mergeParts([
    roundedBox(0.24, 0.07, 0.05, 0.02).translate(-0.42, 0.68, 1.12),
    roundedBox(0.24, 0.07, 0.05, 0.02).translate(0.42, 0.68, 1.12),
    roundedBox(0.06, 0.16, 0.05, 0.02).translate(-0.57, 0.62, 1.1),
    roundedBox(0.06, 0.16, 0.05, 0.02).translate(0.57, 0.62, 1.1),
  ]);

  const look: WheelLook = {
    radius: r,
    width: design.wheelWidth,
    rimRatio: 0.56,
    spokes: 6,
    spokeWidth: 0.34,
    tyre: '#16171d',
    rim: def.rim,
    hub: def.accent,
    treads: 14,
  };
  return {
    geometries: {
      paint: mergeParts(paint),
      glass: cabin.geometry({ along: 26, around: 40 }),
      accent,
      headlights,
      tailLight,
      flame: flameGeometry(
        [
          [-0.34, 0.33],
          [0.34, 0.33],
        ],
        0.085,
        0.65,
        def.accent,
      ),
      thrusters: null,
      wheel: wheelGeometry(look),
      wheelRing: wheelRing(r * 0.56 * 1.02, design.wheelWidth, 0.86),
      antenna: null,
      antennaTip: null,
      decal: DECAL(),
    },
    ride: design.ride,
    wheelRadius: r,
    wheels: design.wheels,
    antennaAt: null,
    footprint: [1.08, 1.02],
    beamZ: -4.95,
    flameZ: 1.22,
  };
}

// --- Stingray: long, low wedge coupe ------------------------------------------

function stingrayShape(def: CarDef): VehicleShape {
  const design = DESIGNS.stingray;
  const c = palette(def);
  const body = new Loft(design.body);
  const cabin = new Loft(design.cabin);
  const r = design.wheelRadius;

  const paintBody: Painter = (_x, _y, _z, _s, angle, out) => {
    out.copy(Math.sin(angle) < -0.3 ? c.livery : c.body);
  };

  const paint: BufferGeometry[] = [body.geometry({ along: 48, around: 56, paint: paintBody })];
  // Roof panel carrying the stripes over the glass.
  paint.push(
    cabin.geometry({
      arc: [Math.PI / 2 - 0.62, Math.PI / 2 + 0.62],
      inflate: 0.01,
      range: [-0.1, 1.12],
      along: 24,
      around: 16,
      paint: (_x, _y, _z, _s, _a, out) => out.copy(c.body),
    }),
  );
  // Twin racing stripes: hood, roof and tail.
  paint.push(
    ...pair(body.ribbon(0.07, 0.19, -1.33, -0.64, 0.006, 24), def.detail),
    ...pair(cabin.ribbon(0.07, 0.19, -0.1, 1.12, 0.018, 28), def.detail),
    ...pair(body.ribbon(0.07, 0.19, 1.1, 1.32, 0.006, 6), def.detail),
  );
  for (const sx of [-1, 1]) {
    // Side skirt and a vent behind each front wheel.
    paint.push(tint(roundedBox(0.09, 0.08, 1.2, 0.035).translate(sx * 0.82, 0.17, 0.03), c.livery));
    paint.push(tint(roundedBox(0.06, 0.13, 0.3, 0.03).rotateX(0.35).translate(sx * 0.83, 0.33, -0.42), c.trim));
  }
  // Front splitter, ducktail lip and the long rear diffuser with fins.
  paint.push(tint(roundedBox(1.5, 0.035, 0.16, 0.015).translate(0, 0.13, -1.25), c.livery));
  paint.push(tint(wing(1.36, 0.2).translate(0, 0.55, 1.12), c.body));
  paint.push(tint(roundedBox(1.36, 0.05, 0.46, 0.02).rotateX(-0.1).translate(0, 0.17, 1.26), c.livery));
  for (let i = 0; i < 5; i++) {
    paint.push(tint(roundedBox(0.03, 0.12, 0.42, 0.012).rotateX(-0.1).translate(-0.5 + i * 0.25, 0.22, 1.28), c.trim));
  }
  for (const x of [-0.16, 0.16]) {
    paint.push(tint(new CylinderGeometry(0.055, 0.055, 0.14, 16, 1, true).rotateX(Math.PI / 2).translate(x, 0.29, 1.34), c.rim));
  }
  paint.push(...interior('#3b2458', def.trim, [-0.22, 0.22], 0.36, 0.25, -0.3, 0.44, 0.7));

  const accent = mergeParts([
    tube(lineAt(body, -0.08, -1.12, 1.22, 0.01, 18), 0.014, 40),
    tube(mirrorX(lineAt(body, -0.08, -1.12, 1.22, 0.01, 18)), 0.014, 40),
    roundedBox(1.44, 0.018, 0.02, 0.008).translate(0, 0.115, -1.33),
  ]);

  // Swept slit headlights along the wedge nose.
  const lamp = (sx: number) =>
    tube(
      [0, 1, 2, 3, 4, 5].map((i) => {
        const z = -1.325 + i * 0.022 + i * i * 0.004;
        const p = body.point(z, body.angleForX(z, 0.3 + i * 0.075), 0.012);
        return [sx * p[0], p[1], p[2]] as [number, number, number];
      }),
      0.03,
      14,
    );
  const headlights = mergeParts([lamp(1), lamp(-1)]);
  const tailLight = mergeParts([tube(arcAt(body, 1.31, 0.22, Math.PI - 0.22, 0.008, 18), 0.02, 28)]);

  const look: WheelLook = {
    radius: r,
    width: design.wheelWidth,
    rimRatio: 0.76,
    spokes: 10,
    spokeWidth: 0.11,
    tyre: '#1a1b22',
    rim: def.rim,
    hub: '#2a2f3f',
    treads: 0,
  };
  return {
    geometries: {
      paint: mergeParts(paint),
      glass: cabin.geometry({ along: 28, around: 40 }),
      accent,
      headlights,
      tailLight,
      flame: flameGeometry(
        [
          [-0.16, 0.29],
          [0.16, 0.29],
        ],
        0.075,
        0.75,
        def.accent,
      ),
      thrusters: null,
      wheel: wheelGeometry(look),
      wheelRing: wheelRing(r * 0.76 * 0.99, design.wheelWidth, 0.84),
      antenna: null,
      antennaTip: null,
      decal: DECAL(),
    },
    ride: design.ride,
    wheelRadius: r,
    wheels: design.wheels,
    antennaAt: null,
    footprint: [1.14, 1.2],
    beamZ: -5.15,
    flameZ: 1.41,
  };
}

export function createVehicleShape(id: CarId): VehicleShape {
  const def = CARS[id];
  if (id === 'kestrel') return kestrelShape(def);
  if (id === 'stingray') return stingrayShape(def);
  return podShape(def);
}

export function disposeGeometries(geometries: VehicleGeometries): void {
  for (const geometry of Object.values(geometries)) geometry?.dispose();
}

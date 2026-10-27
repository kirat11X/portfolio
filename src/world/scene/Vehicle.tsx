import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Euler, Matrix4, Quaternion, Vector3, type Group, type InstancedMesh, type Mesh } from 'three';
import { getReducedMotion } from '@/lib/motion';
import { runtime } from './runtime';
import { clamp } from './physics';
import { createBeamTexture, createRadialTexture } from './textures';
import { CARS, useCarStore, type CarId } from '../game/cars';
import { createVehicleMaterials, STRIPE_IDLE, TAIL_BASE, TAIL_IDLE } from './vehicles/materials';
import { createVehicleShape, disposeGeometries } from './vehicleGeometry';
import { VEHICLE } from './tuning';

const noRaycast = () => undefined;

interface Spring {
  x: number;
  v: number;
}

/** Semi-implicit spring step; `k` stiffness, `c` damping. */
function spring(s: Spring, target: number, k: number, c: number, dt: number) {
  s.v += (-k * (s.x - target) - c * s.v) * dt;
  s.x += s.v * dt;
}

// Per-frame scratch (one player car at a time).
const wheelEuler = new Euler(0, 0, 0, 'YXZ');
const wheelQuat = new Quaternion();
const wheelPos = new Vector3();
const wheelScale = new Vector3(1, 1, 1);
const wheelMatrix = new Matrix4();

/** The player's car (the one picked in the garage): purely visual, follows `runtime.car` every frame. */
export function Vehicle() {
  const carId = useCarStore((s) => s.carId);
  return <CarModel key={carId} carId={carId} />;
}

function CarModel({ carId }: { carId: CarId }) {
  const def = CARS[carId];
  const shape = useMemo(() => createVehicleShape(carId), [carId]);
  const geometries = shape.geometries;
  const stripeBase = useMemo(() => new Color(def.accent), [def.accent]);
  const textures = useMemo(() => ({ radial: createRadialTexture(), beam: createBeamTexture() }), []);
  const materials = useMemo(() => createVehicleMaterials(def, textures), [textures, def]);

  useEffect(
    () => () => {
      disposeGeometries(geometries);
      textures.radial.dispose();
      textures.beam.dispose();
      for (const material of Object.values(materials)) material.dispose();
    },
    [geometries, textures, materials],
  );

  const rootRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const antennaRef = useRef<Group>(null);
  const wheelsRef = useRef<InstancedMesh>(null);
  const ringsRef = useRef<InstancedMesh>(null);
  const flameRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const shadowRef = useRef<Mesh>(null);
  const materialsRef = useRef(materials);
  const motionRef = useRef({
    pitch: { x: 0, v: 0 } as Spring,
    roll: { x: 0, v: 0 } as Spring,
    drift: { x: 0, v: 0 } as Spring,
    antennaX: { x: 0, v: 0 } as Spring,
    antennaZ: { x: 0, v: 0 } as Spring,
    tail: TAIL_IDLE,
    stripe: STRIPE_IDLE,
    boost: 0,
    spin: 0,
  });

  useFrame((state, delta) => {
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!root || !body) return;
    const motion = motionRef.current;
    const mats = materialsRef.current;
    const car = runtime.car;
    const reduced = getReducedMotion();
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;

    root.position.set(car.x, 0, car.z);
    root.rotation.y = car.heading;

    // Body: squat on acceleration, dive on braking, bank into turns, slight drift yaw.
    const speedRatio = clamp(Math.abs(car.forwardSpeed) / VEHICLE.maxSpeed, 0, 1.5);
    const pitchTarget = clamp(car.accel * 0.0062, -0.11, 0.1);
    const rollTarget = clamp(car.yawRate * car.forwardSpeed * 0.0058, -0.17, 0.17);
    const driftTarget = clamp(car.steer * speedRatio * 0.1, -0.12, 0.12);
    if (car.impact > 2.5) {
      motion.pitch.v -= Math.min(car.impact, 14) * 0.05;
      motion.antennaX.v -= Math.min(car.impact, 14) * 0.45;
    }
    const steps = dt > 1 / 60 ? 2 : 1;
    for (let i = 0; i < steps; i++) {
      const h = dt / steps;
      spring(motion.pitch, pitchTarget, 150, 15, h);
      spring(motion.roll, rollTarget, 120, 13, h);
      spring(motion.drift, driftTarget, 90, 14, h);
      spring(motion.antennaX, clamp(-car.accel * 0.02, -0.55, 0.55), 70, 4.5, h);
      spring(motion.antennaZ, clamp(-car.yawRate * car.forwardSpeed * 0.02, -0.5, 0.5), 70, 4.5, h);
    }
    const bobAmount = (reduced ? 0.012 : 0.045) * (1 - 0.6 * Math.min(1, speedRatio));
    const bob = Math.sin(t * 2.3) * bobAmount + (reduced ? 0 : Math.sin(t * 1.27 + 1.3) * 0.015);
    // Wheeled cars sit on their tyres: a small suspension bob plus a road buzz at speed.
    const wheeled = shape.wheels.length > 0;
    const buzz = wheeled && !reduced ? Math.sin(t * 31) * 0.004 * Math.min(1, speedRatio) : 0;
    body.position.y = shape.ride + (wheeled ? bob * 0.22 + buzz : bob);
    body.rotation.set(motion.pitch.x * (wheeled ? 0.7 : 1), wheeled ? motion.drift.x * 0.5 : motion.drift.x, motion.roll.x * (wheeled ? 0.6 : 1));
    antennaRef.current?.rotation.set(motion.antennaX.x, 0, motion.antennaZ.x);

    const wheels = wheelsRef.current;
    if (wheeled && wheels) {
      motion.spin -= (car.forwardSpeed / shape.wheelRadius) * dt;
      const steerAngle = car.steer * 0.42;
      // Wheels hang below the leaning body: counter the body offset so tyres stay on the road.
      const drop = -(body.position.y - shape.ride);
      for (let i = 0; i < shape.wheels.length; i++) {
        const wheel = shape.wheels[i];
        const left = wheel.x < 0;
        const yaw = (wheel.front ? steerAngle : 0) + (left ? Math.PI : 0);
        wheelEuler.set(left ? -motion.spin : motion.spin, yaw, 0);
        wheelQuat.setFromEuler(wheelEuler);
        wheelPos.set(wheel.x, shape.wheelRadius + drop, wheel.z);
        wheelMatrix.compose(wheelPos, wheelQuat, wheelScale);
        wheels.setMatrixAt(i, wheelMatrix);
        ringsRef.current?.setMatrixAt(i, wheelMatrix);
      }
      wheels.instanceMatrix.needsUpdate = true;
      if (ringsRef.current) ringsRef.current.instanceMatrix.needsUpdate = true;
    }

    // Lights: tail brightens when braking or reversing; strips flare when boosting.
    const tailTarget = car.braking ? 6 : car.reversing ? 4.2 : TAIL_IDLE;
    motion.tail += (tailTarget - motion.tail) * Math.min(1, dt * 18);
    mats.tail.color.copy(TAIL_BASE).multiplyScalar(motion.tail);
    const stripeTarget = car.boosting ? 4.2 : STRIPE_IDLE;
    motion.stripe += (stripeTarget - motion.stripe) * Math.min(1, dt * 8);
    mats.stripe.color.copy(stripeBase).multiplyScalar(motion.stripe);

    // Boost flame: grows in, flickers (unless reduced motion), fades out.
    motion.boost += ((car.boosting ? 1 : 0) - motion.boost) * Math.min(1, dt * (car.boosting ? 10 : 6));
    const flame = flameRef.current;
    if (flame) {
      flame.visible = motion.boost > 0.02;
      if (flame.visible) {
        const flicker = reduced ? 1 : 0.86 + 0.14 * Math.sin(t * 47) + 0.08 * Math.sin(t * 29 + 1.7);
        const k = motion.boost;
        flame.scale.set(0.7 + 0.3 * k, 0.7 + 0.3 * k, (0.35 + 0.65 * k) * flicker);
        mats.flame.color.setScalar(k);
      }
    }
    // Hover pads breathe; brighter under boost.
    const pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 5.2) + 0.05 * Math.sin(t * 13.1);
    mats.thrusters.color.setScalar((1 + motion.boost * 0.6) * pulse);

    // Ground decals react to the hover height.
    const lift = (bob + bobAmount) / (2 * Math.max(bobAmount, 0.001));
    mats.glow.opacity = (wheeled ? 0.62 : 0.55) + 0.2 * (1 - lift) + motion.boost * 0.22;
    mats.shadow.opacity = 0.8 - 0.12 * lift;
    const glow = glowRef.current;
    const [fx, fz] = shape.footprint;
    if (glow) glow.scale.set((2.6 + 0.2 * (1 - lift)) * fx, 1, (3.5 + 0.25 * (1 - lift)) * fz);
    const shadow = shadowRef.current;
    if (shadow) shadow.scale.set((1.9 - 0.08 * lift) * fx, 1, (2.75 - 0.1 * lift) * fz);
  }, -2);

  return (
    <group ref={rootRef} name="gameplay:vehicle">
      <mesh ref={shadowRef} geometry={geometries.decal} material={materials.shadow} position-y={0.02} renderOrder={1} raycast={noRaycast} />
      <mesh ref={glowRef} geometry={geometries.decal} material={materials.glow} position-y={0.028} renderOrder={2} raycast={noRaycast} />
      <mesh
        geometry={geometries.decal}
        material={materials.beam}
        position={[0, 0.034, shape.beamZ]}
        scale={[3.9, 1, 7.6]}
        renderOrder={3}
        raycast={noRaycast}
      />
      <group ref={bodyRef} position-y={shape.ride}>
        <mesh geometry={geometries.paint} material={materials.paint} raycast={noRaycast} />
        <mesh geometry={geometries.glass} material={materials.glass} renderOrder={4} raycast={noRaycast} />
        <mesh geometry={geometries.accent} material={materials.stripe} raycast={noRaycast} />
        <mesh geometry={geometries.headlights} material={materials.headlight} raycast={noRaycast} />
        <mesh geometry={geometries.tailLight} material={materials.tail} raycast={noRaycast} />
        <mesh ref={flameRef} geometry={geometries.flame} material={materials.flame} position-z={shape.flameZ} visible={false} renderOrder={5} raycast={noRaycast} />
        {geometries.thrusters && <mesh geometry={geometries.thrusters} material={materials.thrusters} renderOrder={5} raycast={noRaycast} />}
        {shape.antennaAt && geometries.antenna && geometries.antennaTip && (
          <group ref={antennaRef} position={shape.antennaAt}>
            <mesh geometry={geometries.antenna} material={materials.antenna} raycast={noRaycast} />
            <mesh geometry={geometries.antennaTip} material={materials.tip} position-y={0.52} raycast={noRaycast} />
          </group>
        )}
        {geometries.wheel && (
          <instancedMesh
            ref={wheelsRef}
            args={[geometries.wheel, materials.wheel, shape.wheels.length]}
            frustumCulled={false}
            raycast={noRaycast}
          />
        )}
        {geometries.wheelRing && (
          <instancedMesh
            ref={ringsRef}
            args={[geometries.wheelRing, materials.ring, shape.wheels.length]}
            frustumCulled={false}
            raycast={noRaycast}
          />
        )}
      </group>
    </group>
  );
}

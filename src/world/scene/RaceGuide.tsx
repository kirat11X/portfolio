import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BoxGeometry, Color, ConeGeometry, MeshBasicMaterial, RingGeometry, type Group, type Mesh } from 'three';
import { getReducedMotion } from '@/lib/motion';
import { neon } from '@/styles/tokens';
import { RACE_GATES, RACE_START_PAD } from '../game/raceLogic';
import { useRaceStore } from '../game/raceStore';
import { runtime } from './runtime';

const noRaycast = () => undefined;
/** The chevron floats above the city art's gate frames (posts ≈ 4.3 high). */
const CHEVRON_Y = 6;

function glow(color: string, intensity: number, opacity: number) {
  return new MeshBasicMaterial({
    color: new Color(color).multiplyScalar(intensity),
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
}

/**
 * Gameplay overlay for the time trial: the start pad ring (when idle, near the
 * Gaming Zone) and, during a race, a cue on the next gate — a glowing line
 * across the road and a bobbing chevron pointing the way. The gate frames and
 * their highlight are city art (<RaceGates>, fed via gameArtBridge).
 */
export function RaceGuide() {
  const phase = useRaceStore((s) => s.phase);
  const next = useRaceStore((s) => s.next);
  const resources = useMemo(
    () => ({
      bar: new BoxGeometry(1, 0.08, 0.3),
      chevron: new ConeGeometry(0.55, 1.1, 4).rotateX(-Math.PI / 2),
      ring: new RingGeometry(RACE_START_PAD.radius - 0.25, RACE_START_PAD.radius, 48).rotateX(-Math.PI / 2),
      barMat: glow(neon.orange, 2, 0.75),
      chevronMat: glow(neon.amber, 2.6, 0.95),
      ringMat: glow(neon.orange, 2.2, 0.8),
    }),
    [],
  );
  useEffect(
    () => () => {
      for (const resource of Object.values(resources)) resource.dispose();
    },
    [resources],
  );

  const resourcesRef = useRef(resources);
  const gateRef = useRef<Group>(null);
  const chevronRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);

  const racing = phase === 'countdown' || phase === 'running';
  const gate = racing ? RACE_GATES[next] : null;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const reduced = getReducedMotion();
    const mats = resourcesRef.current;
    const chevron = chevronRef.current;
    if (chevron) chevron.position.y = CHEVRON_Y + (reduced ? 0 : Math.sin(t * 3) * 0.35);
    const ring = ringRef.current;
    if (ring) {
      const car = runtime.car;
      const near = Math.hypot(car.x - RACE_START_PAD.x, car.z - RACE_START_PAD.z) < 30;
      ring.visible = !racing && near;
      mats.ringMat.opacity = reduced ? 0.7 : 0.55 + Math.sin(t * 2.4) * 0.25;
    }
    if (gateRef.current && !reduced) mats.chevronMat.opacity = 0.8 + Math.sin(t * 6) * 0.15;
  });

  return (
    <group name="gameplay:race-guide">
      <mesh ref={ringRef} geometry={resources.ring} material={resources.ringMat} position={[RACE_START_PAD.x, 0.04, RACE_START_PAD.z]} raycast={noRaycast} />
      {gate && (
        <group ref={gateRef}>
          <group position={[gate.x, 0, gate.z]} rotation-y={gate.rotationY}>
            <mesh geometry={resources.bar} material={resources.barMat} position-y={0.04} scale-x={gate.width} raycast={noRaycast} />
            <mesh ref={chevronRef} geometry={resources.chevron} material={resources.chevronMat} position-y={CHEVRON_Y} raycast={noRaycast} />
          </group>
        </group>
      )}
    </group>
  );
}

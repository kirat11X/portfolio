import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CircleGeometry, Color, MeshBasicMaterial, RingGeometry, type Group, type Mesh } from 'three';
import { getReducedMotion } from '@/lib/motion';
import { neon } from '@/styles/tokens';
import { runtime } from './runtime';

const noRaycast = () => undefined;

function glowMaterial(intensity: number) {
  return new MeshBasicMaterial({
    color: new Color(neon.cyan).multiplyScalar(intensity),
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
}

/** Ground ring at the autopilot target, plus a pulse where quick travel lands. */
export function TargetMarker() {
  const resources = useMemo(
    () => ({
      ring: new RingGeometry(0.5, 0.64, 48).rotateX(-Math.PI / 2),
      dot: new CircleGeometry(0.13, 24).rotateX(-Math.PI / 2),
      burst: new RingGeometry(0.86, 1, 64).rotateX(-Math.PI / 2),
      ringMaterial: glowMaterial(2.2),
      dotMaterial: glowMaterial(2.6),
      burstMaterial: glowMaterial(2),
    }),
    [],
  );
  useEffect(
    () => () => {
      for (const resource of Object.values(resources)) resource.dispose();
    },
    [resources],
  );

  const groupRef = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  const burstRef = useRef<Mesh>(null);
  const animRef = useRef({ fade: 0, intro: 1, serial: 0, burst: 1, burstSerial: 0 });
  const resourcesRef = useRef(resources);

  useFrame((state, delta) => {
    const group = groupRef.current;
    const ring = ringRef.current;
    const burst = burstRef.current;
    if (!group || !ring || !burst) return;
    const anim = animRef.current;
    const res = resourcesRef.current;
    const dt = Math.min(delta, 0.1);
    const marker = runtime.marker;
    const reduced = getReducedMotion();

    if (marker.serial !== anim.serial) {
      anim.serial = marker.serial;
      anim.intro = 0;
    }
    anim.intro = Math.min(1, anim.intro + dt / 0.32);
    const target = marker.visible ? 1 : 0;
    anim.fade += (target - anim.fade) * Math.min(1, dt * (marker.visible ? 14 : 7));
    group.visible = anim.fade > 0.01;
    if (group.visible) {
      group.position.set(marker.x, 0.05, marker.z);
      const settle = reduced ? 1 : 1 + 0.7 * Math.pow(1 - anim.intro, 3);
      const pulse = reduced ? 1 : 1 + Math.sin(state.clock.elapsedTime * 5) * 0.06;
      ring.scale.setScalar(settle * pulse);
      res.ringMaterial.opacity = 0.9 * anim.fade;
      res.dotMaterial.opacity = 0.95 * anim.fade;
    }

    if (marker.burstSerial !== anim.burstSerial) {
      anim.burstSerial = marker.burstSerial;
      anim.burst = 0;
    }
    if (anim.burst < 1 && !reduced) {
      anim.burst = Math.min(1, anim.burst + dt / 0.75);
      const e = 1 - Math.pow(1 - anim.burst, 3);
      burst.visible = true;
      burst.position.set(marker.burstX, 0.06, marker.burstZ);
      burst.scale.setScalar(0.8 + e * 3.6);
      res.burstMaterial.opacity = 0.85 * (1 - anim.burst);
    } else {
      burst.visible = false;
    }
  }, -1);

  return (
    <>
      <group ref={groupRef} visible={false} name="gameplay:target">
        <mesh ref={ringRef} geometry={resources.ring} material={resources.ringMaterial} renderOrder={4} raycast={noRaycast} />
        <mesh geometry={resources.dot} material={resources.dotMaterial} renderOrder={4} raycast={noRaycast} />
      </group>
      <mesh ref={burstRef} geometry={resources.burst} material={resources.burstMaterial} visible={false} renderOrder={4} raycast={noRaycast} />
    </>
  );
}

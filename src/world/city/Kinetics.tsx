// Slow-moving sculptural pieces: the monolith's holographic rings and the
// Creative Studio's rooftop aperture.
// All motion stops with reduced motion.

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, DoubleSide, Group, Mesh, RingGeometry, Shape, ShapeGeometry, ShaderMaterial, TorusGeometry, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { neon } from '@/styles/tokens';
import { useReducedMotion } from '@/lib/motion';
import { cityUniforms } from './lib/cityUniforms';
import { useDisposable } from './lib/useDisposable';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const holoVertex = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const holoFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uTime; uniform float uDashes; uniform float uSpeed;
  varying vec2 vUv;
  void main() {
    // RingGeometry UVs are planar; recover the angle from them.
    vec2 p = vUv - 0.5;
    float a = atan(p.y, p.x) / 6.2831853 + 0.5;
    float dash = smoothstep(0.32, 0.38, fract(a * uDashes)) * (1.0 - smoothstep(0.82, 0.88, fract(a * uDashes)));
    float sweep = pow(fract(a - uTime * uSpeed), 6.0);
    float alpha = 0.32 * dash + 0.9 * sweep * dash + 0.08;
    gl_FragColor = vec4(uColor * alpha, 1.0);
  }
`;

function holoMaterial(color: string, dashes: number, speed: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color).multiplyScalar(2.2) }, uTime: cityUniforms.uTime, uDashes: { value: dashes }, uSpeed: { value: speed } },
    vertexShader: holoVertex,
    fragmentShader: holoFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}

function HoloRings() {
  const outer = useRef<Mesh>(null);
  const inner = useRef<Mesh>(null);
  const reduced = useReducedMotion();
  const res = useDisposable(
    () => ({
      g1: new RingGeometry(2.05, 2.13, 128, 1),
      g2: new RingGeometry(1.78, 1.83, 128, 1),
      m1: holoMaterial('#bfe9ff', 36, 0.08),
      m2: holoMaterial(neon.cyan, 64, -0.12),
    }),
    [],
    (r) => [r.g1, r.g2, r.m1, r.m2],
  );
  useFrame((_, delta) => {
    if (reduced) return;
    const dt = Math.min(delta, 0.1);
    if (outer.current) outer.current.rotation.z += dt * 0.12;
    if (inner.current) inner.current.rotation.z -= dt * 0.2;
  });
  return (
    <group position={[0, 0, 0]}>
      <mesh ref={outer} geometry={res.g1} material={res.m1} position={[0, 5.75, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <group position={[0, 5.2, 0]} rotation={[0.32, 0, 0.18]}>
        <mesh ref={inner} geometry={res.g2} material={res.m2} rotation={[-Math.PI / 2, 0, 0]} />
      </group>
    </group>
  );
}

function Aperture() {
  const spin = useRef<Group>(null);
  const reduced = useReducedMotion();
  const res = useDisposable(
    () => {
      const blade = new Shape();
      blade.moveTo(0, 0);
      blade.lineTo(1.75, 0.15);
      blade.quadraticCurveTo(1.55, 0.9, 0.92, 1.18);
      blade.closePath();
      return {
        ring: new TorusGeometry(1.95, 0.075, 8, 72),
        inner: new TorusGeometry(0.55, 0.035, 6, 48),
        blade: (() => {
          const parts = Array.from({ length: 6 }, (_, i) => new ShapeGeometry(blade).rotateZ((i / 6) * Math.PI * 2).translate(0, 0, i * 0.004));
          const merged = mergeGeometries(parts);
          parts.forEach((g) => g.dispose());
          return merged;
        })(),
        neonMat: new MeshBasicMaterial({ color: new Color(neon.magenta).multiplyScalar(2.3), toneMapped: false }),
        innerMat: new MeshBasicMaterial({ color: new Color(neon.violet).multiplyScalar(2.6), toneMapped: false }),
        bladeMat: new MeshStandardMaterial({ color: '#1a1830', roughness: 0.35, metalness: 0.7, side: DoubleSide, emissive: '#2a1648', emissiveIntensity: 0.6 }),
      };
    },
    [],
    (r) => [r.ring, r.inner, r.blade, r.neonMat, r.innerMat, r.bladeMat],
  );
  useFrame((_, delta) => {
    if (!reduced && spin.current) spin.current.rotation.z += Math.min(delta, 0.1) * 0.16;
  });
  return (
    <group position={[36.6, 13.9, 0]} rotation={[0, -Math.PI / 2 + 0.0, 0]}>
      <group rotation={[-0.22, 0, 0]}>
        <mesh geometry={res.ring} material={res.neonMat} />
        <group ref={spin}>
          <mesh geometry={res.blade} material={res.bladeMat} />
          <mesh geometry={res.inner} material={res.innerMat} />
        </group>
      </group>
    </group>
  );
}

export function Kinetics() {
  return (
    <group name="kinetics">
      <HoloRings />
      <Aperture />
    </group>
  );
}

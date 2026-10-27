// Calm ambient life, gated by quality: light-trail traffic on elevated
// skyways far outside the island, a few slow drones, drifting light motes and
// two searchlights sweeping the far sky. GPU-driven where possible; nothing
// allocates per frame. Reduced motion freezes everything (shared clock).

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  InstancedBufferAttribute,
  MeshStandardMaterial,
  MeshBasicMaterial,
  Object3D,
  ShaderMaterial,
  SphereGeometry,
  type InstancedMesh,
  type Mesh,
  type Points,
} from 'three';
import { neon } from '@/styles/tokens';
import { useReducedMotion } from '@/lib/motion';
import type { QualityTier } from '../state/worldStore';
import { DISTRICTS, ISLAND } from '../config/layout';
import { ACCENT } from './constants';
import { cityUniforms } from './lib/cityUniforms';
import { createRng } from './lib/random';
import { useDisposable } from './lib/useDisposable';

// ---------------------------------------------------------------- skyways

/**
 * Two elevated loops that follow the island's rounded-rectangle outline at a
 * constant distance (offset) beyond its edge, so the light trails never cross
 * the island itself (the arena reaches far south of the original city square).
 */
const SKYWAYS = [
  { offset: 9, y: 2.5 },
  { offset: 16, y: -9 },
];

const R0 = ISLAND.cornerRadius;
const CX = ((ISLAND.minX + ISLAND.maxX) / 2).toFixed(2);
const CZ = ((ISLAND.minZ + ISLAND.maxZ) / 2).toFixed(2);
/** Half-lengths of the straight sides (they do not change with the offset). */
const HX = ((ISLAND.maxX - ISLAND.minX) / 2 - R0).toFixed(2);
const HZ = ((ISLAND.maxZ - ISLAND.minZ) / 2 - R0).toFixed(2);

const trafficVertex = /* glsl */ `
  attribute vec4 aCar; // offset beyond the island edge, height, start (0..1 of the loop), speed (signed, units/s)
  attribute vec3 aColor;
  uniform float uTime;
  varying vec3 vColor;
  varying float vHead;
  const float HX = ${HX};
  const float HZ = ${HZ};
  const vec2 C = vec2(${CX}, ${CZ});
  const float HALF_PI = 1.5707963;
  // Point at arc length s along a rounded rectangle (corner radius R), anticlockwise from the east side.
  vec2 loopAt(float s, float R) {
    float q = HALF_PI * R;
    float sx = 2.0 * HX;
    float sz = 2.0 * HZ;
    float total = 2.0 * (sx + sz) + 4.0 * q;
    s = mod(s, total);
    if (s < sz) return C + vec2(HX + R, -HZ + s);
    s -= sz;
    if (s < q) { float a = s / R; return C + vec2(HX, HZ) + R * vec2(cos(a), sin(a)); }
    s -= q;
    if (s < sx) return C + vec2(HX - s, HZ + R);
    s -= sx;
    if (s < q) { float a = HALF_PI + s / R; return C + vec2(-HX, HZ) + R * vec2(cos(a), sin(a)); }
    s -= q;
    if (s < sz) return C + vec2(-HX - R, HZ - s);
    s -= sz;
    if (s < q) { float a = 2.0 * HALF_PI + s / R; return C + vec2(-HX, -HZ) + R * vec2(cos(a), sin(a)); }
    s -= q;
    if (s < sx) return C + vec2(-HX + s, -HZ - R);
    s -= sx;
    float a = 3.0 * HALF_PI + s / R;
    return C + vec2(HX, -HZ) + R * vec2(cos(a), sin(a));
  }
  void main() {
    float R = ${R0.toFixed(1)} + aCar.x;
    float total = 4.0 * (HX + HZ) + 4.0 * HALF_PI * R;
    float s = aCar.z * total + uTime * aCar.w;
    vec2 c = loopAt(s, R);
    vec2 ahead = loopAt(s + sign(aCar.w) * 0.5, R);
    vec2 t2 = normalize(ahead - c);
    vec3 tangent = vec3(t2.x, 0.0, t2.y);
    vec3 side = vec3(-t2.y, 0.0, t2.x);
    vec3 centre = vec3(c.x, aCar.y, c.y);
    vec3 p = centre + tangent * position.x * 2.6 + vec3(0.0, position.y * 0.12, 0.0) + side * position.z * 0.22;
    vHead = position.x + 0.5;
    vColor = aColor;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;
const trafficFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vHead;
  void main() { gl_FragColor = vec4(vColor * pow(vHead, 2.0), 1.0); }
`;

function Skyways({ cars }: { cars: number }) {
  const ref = useRef<InstancedMesh>(null);
  const res = useDisposable(
    () => {
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new ShaderMaterial({
        uniforms: { uTime: cityUniforms.uTime },
        vertexShader: trafficVertex,
        fragmentShader: trafficFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      return { geometry, material };
    },
    [],
    (r) => [r.geometry, r.material],
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const r = createRng('kirat-skyways');
    const car = new Float32Array(cars * 4);
    const color = new Float32Array(cars * 3);
    const white = new Color('#dfeaff').multiplyScalar(1.3);
    const amber = new Color(neon.amber).multiplyScalar(1.2);
    for (let i = 0; i < cars; i++) {
      const way = SKYWAYS[i % SKYWAYS.length];
      const lane = (i >> 1) % 2;
      const dir = lane === 0 ? 1 : -1;
      car.set([way.offset + (lane ? 0.5 : -0.5), way.y + 0.25, r.next(), dir * r.range(5.5, 8)], i * 4);
      const c = lane === 0 ? white : amber;
      color.set([c.r, c.g, c.b], i * 3);
    }
    mesh.geometry.setAttribute('aCar', new InstancedBufferAttribute(car, 4));
    mesh.geometry.setAttribute('aColor', new InstancedBufferAttribute(color, 3));
  }, [cars]);
  return (
    <group name="skyways">
      <instancedMesh ref={ref} args={[res.geometry, res.material, cars]} frustumCulled={false} />
    </group>
  );
}

// ---------------------------------------------------------------- drones

interface DronePath {
  cx: number;
  cz: number;
  r: number;
  y: number;
  w: number;
  phase: number;
  accent: Color;
}

const _o = new Object3D();
const _c = new Color();

function Drones({ count }: { count: number }) {
  const bodies = useRef<InstancedMesh>(null);
  const lights = useRef<InstancedMesh>(null);
  const reduced = useReducedMotion();
  const res = useDisposable(
    () => ({
      body: new BoxGeometry(0.46, 0.09, 0.46),
      light: new SphereGeometry(1, 8, 6),
      bodyMat: new MeshStandardMaterial({ color: '#1b2030', roughness: 0.4, metalness: 0.7 }),
      lightMat: new MeshBasicMaterial({ toneMapped: false }),
    }),
    [],
    (r) => [r.body, r.light, r.bodyMat, r.lightMat],
  );
  const paths = useMemo<DronePath[]>(() => {
    const r = createRng('kirat-drones');
    const homes = ['hub', 'engineering', 'creative', 'about', 'gaming'] as const;
    return Array.from({ length: count }, (_, i) => {
      const home = homes[i % homes.length];
      const [cx, cz] = DISTRICTS[home].center;
      return {
        cx,
        cz,
        r: r.range(4, 8),
        y: r.range(12, 17.5),
        w: r.range(0.12, 0.24) * (r.chance(0.5) ? 1 : -1),
        phase: r.next() * Math.PI * 2,
        accent: new Color(ACCENT[home]).multiplyScalar(2.4),
      };
    });
  }, [count]);

  useFrame(() => {
    const b = bodies.current;
    const l = lights.current;
    if (!b || !l) return;
    const t = cityUniforms.uTime.value;
    for (let i = 0; i < paths.length; i++) {
      const p = paths[i];
      const a = p.phase + t * p.w;
      const x = p.cx + Math.cos(a) * p.r;
      const z = p.cz + Math.sin(a) * p.r * 0.75;
      const y = p.y + Math.sin(t * 0.7 + p.phase) * 0.35;
      _o.position.set(x, y, z);
      _o.rotation.set(0, -a, Math.sin(t + p.phase) * 0.05);
      _o.scale.setScalar(1);
      _o.updateMatrix();
      b.setMatrixAt(i, _o.matrix);
      _o.rotation.set(0, 0, 0);
      _o.position.set(x, y - 0.08, z);
      _o.scale.setScalar(0.07);
      _o.updateMatrix();
      l.setMatrixAt(i * 2, _o.matrix);
      _c.copy(p.accent);
      l.setColorAt(i * 2, _c);
      const blink = reduced || Math.sin(t * 5 + p.phase * 3) > 0.6 ? 1 : 0.05;
      _o.position.set(x, y + 0.08, z);
      _o.scale.setScalar(0.05);
      _o.updateMatrix();
      l.setMatrixAt(i * 2 + 1, _o.matrix);
      _c.setRGB(2.6 * blink, 0.9 * blink, 0.4 * blink);
      l.setColorAt(i * 2 + 1, _c);
    }
    b.instanceMatrix.needsUpdate = true;
    l.instanceMatrix.needsUpdate = true;
    if (l.instanceColor) l.instanceColor.needsUpdate = true;
  });

  return (
    <group name="drones">
      <instancedMesh ref={bodies} args={[res.body, res.bodyMat, count]} frustumCulled={false} />
      <instancedMesh ref={lights} args={[res.light, res.lightMat, count * 2]} frustumCulled={false} />
    </group>
  );
}

// ---------------------------------------------------------------- motes

const moteVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSeed;
  uniform float uTime; uniform float uPixelRatio;
  varying vec3 vColor; varying float vAlpha;
  void main() {
    vec3 p = position;
    float h = mod(p.y + uTime * (0.12 + aSeed * 0.2), 9.0);
    p.y = 0.3 + h;
    p.x += sin(uTime * 0.3 + aSeed * 30.0) * 0.6;
    p.z += cos(uTime * 0.25 + aSeed * 20.0) * 0.6;
    vAlpha = smoothstep(0.0, 1.2, h) * (1.0 - smoothstep(7.0, 9.0, h));
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uPixelRatio * (1.2 + aSeed * 2.4) * (28.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const moteFragment = /* glsl */ `
  varying vec3 vColor; varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(vColor * a, 1.0);
  }
`;

function Motes({ count, dpr }: { count: number; dpr: number }) {
  const res = useDisposable(
    () => {
      const r = createRng('kirat-motes');
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      const seed = new Float32Array(count);
      const tint = new Color();
      for (let i = 0; i < count; i++) {
        const x = r.range(-36, 36);
        const z = r.range(-36, 36);
        pos.set([x, r.range(0, 9), z], i * 3);
        let best = 'hub' as keyof typeof DISTRICTS;
        let bestD = Infinity;
        for (const id of Object.keys(DISTRICTS) as Array<keyof typeof DISTRICTS>) {
          const [cx, cz] = DISTRICTS[id].center;
          const d = Math.hypot(x - cx, z - cz);
          if (d < bestD) {
            bestD = d;
            best = id;
          }
        }
        tint.set(ACCENT[best]).lerp(new Color('#ffffff'), 0.3).multiplyScalar(0.55);
        col.set([tint.r, tint.g, tint.b], i * 3);
        seed[i] = r.next();
      }
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(pos, 3));
      geometry.setAttribute('aColor', new BufferAttribute(col, 3));
      geometry.setAttribute('aSeed', new BufferAttribute(seed, 1));
      const material = new ShaderMaterial({
        uniforms: { uTime: cityUniforms.uTime, uPixelRatio: { value: 1 } },
        vertexShader: moteVertex,
        fragmentShader: moteFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      return { geometry, material };
    },
    [count],
    (r) => [r.geometry, r.material],
  );
  // A pixel-ratio change (adaptive resolution) only updates the uniform; no rebuild.
  const points = useRef<Points<BufferGeometry, ShaderMaterial>>(null);
  useLayoutEffect(() => {
    const m = points.current?.material;
    if (m) m.uniforms.uPixelRatio.value = dpr;
  }, [res, dpr]);
  return <points ref={points} geometry={res.geometry} material={res.material} frustumCulled={false} />;
}

// ---------------------------------------------------------------- searchlights

const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float along = 1.0 - vUv.y; // 0 at the lamp, 1 at the far end
    float a = pow(1.0 - along, 1.6) * 0.22;
    gl_FragColor = vec4(uColor * a, 1.0);
  }
`;

const BEAMS = [
  { x: -78, z: -70, phase: 0, speed: 0.09 },
  { x: 86, z: -58, phase: 2.1, speed: -0.07 },
];

function Searchlights() {
  const beams = useRef<Array<Mesh | null>>([]);
  const res = useDisposable(
    () => {
      const geometry = new ConeGeometry(7, 150, 24, 1, true).translate(0, -75, 0).rotateX(Math.PI);
      const material = new ShaderMaterial({
        uniforms: { uColor: { value: new Color('#9fb8ff').multiplyScalar(0.32) } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: beamFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      });
      return { geometry, material };
    },
    [],
    (r) => [r.geometry, r.material],
  );
  useFrame(() => {
    const t = cityUniforms.uTime.value;
    beams.current.forEach((beam, i) => {
      if (!beam) return;
      const b = BEAMS[i];
      beam.rotation.set(0.28 + Math.sin(t * b.speed * 0.7 + b.phase) * 0.12, 0, Math.sin(t * b.speed + b.phase) * 0.42);
    });
  });
  return (
    <group name="searchlights">
      {BEAMS.map((b, i) => (
        <mesh
          key={i}
          ref={(m) => {
            beams.current[i] = m;
          }}
          geometry={res.geometry}
          material={res.material}
          position={[b.x, -18, b.z]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}

export function Ambient({ quality, dpr }: { quality: QualityTier; dpr: number }) {
  if (quality === 'low') return <Skyways cars={24} />;
  const high = quality === 'high';
  return (
    <group name="ambient">
      <Skyways cars={high ? 96 : 56} />
      <Drones count={high ? 10 : 5} />
      <Motes count={high ? 320 : 140} dpr={dpr} />
      {high ? <Searchlights /> : null}
    </group>
  );
}

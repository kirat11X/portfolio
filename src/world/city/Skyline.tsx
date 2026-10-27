// Distant, unreachable skyline ring: instanced dark towers rising out of the
// void around the island, with sparse lit windows (the shared window atlas)
// that dissolve into darkness with depth and distance. One draw call.

import { useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Color, InstancedBufferAttribute, Object3D, ShaderMaterial, type InstancedMesh, type Texture } from 'three';
import { createRng } from './lib/random';
import { createWindowTexture } from './lib/textures';
import { useDisposable } from './lib/useDisposable';
import { COLORS } from './constants';
import { ISLAND, ISLAND_CENTER, ISLAND_SIZE } from '../config/layout';

const vertexShader = /* glsl */ `
  attribute vec2 aTower; // seed, density
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec2 vTower;
  void main() {
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix * instanceMatrix) * normal);
    vTower = aTower;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uWindows;
  uniform vec3 uBase;
  uniform vec3 uFog;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec2 vTower;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 n = normalize(vNormalW);
    float side = 1.0 - step(0.5, abs(n.y));
    float s = abs(n.x) > 0.5 ? vWorld.z : vWorld.x;
    vec2 cell = vec2(s / 1.5, vWorld.y / 1.15);
    vec4 w = texture2D(uWindows, (cell + vTower.x * vec2(37.0, 11.0)) / vec2(16.0, 32.0));
    float sparse = step(hash(floor(cell) + vTower.x * 17.0), vTower.y);
    vec3 col = uBase * (0.5 + 0.5 * max(n.y, 0.0) + 0.18 * n.x);
    col *= mix(1.0, 0.55, w.a * side);
    col += w.rgb * w.a * sparse * side * 0.6;
    float d = length(vWorld.xz - vec2(${ISLAND_CENTER.x.toFixed(1)}, ${ISLAND_CENTER.z.toFixed(1)}));
    float k = smoothstep(-46.0, 4.0, vWorld.y) * (1.0 - 0.7 * smoothstep(85.0, 145.0, d));
    gl_FragColor = vec4(mix(uFog, col, k), 1.0);
    #include <colorspace_fragment>
  }
`;

const _o = new Object3D();

/** Signed distance from the island's rounded-rectangle edge (positive outside). */
function islandDistance(x: number, z: number): number {
  const r = ISLAND.cornerRadius;
  const qx = Math.abs(x - ISLAND_CENTER.x) - (ISLAND_SIZE.x / 2 - r);
  const qz = Math.abs(z - ISLAND_CENTER.z) - (ISLAND_SIZE.z / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
}

/** Towers keep clear of both skyway loops (Ambient.tsx, 9 and 16 units off the edge). */
const SKYWAY_CLEARANCE = 19;

export function Skyline({ count = 150 }: { count?: number }) {
  const ref = useRef<InstancedMesh>(null);
  const res = useDisposable(
    () => {
      const windows: Texture = createWindowTexture();
      const geometry = new BoxGeometry(1, 1, 1);
      const material = new ShaderMaterial({
        uniforms: { uWindows: { value: windows }, uBase: { value: new Color('#0e1222') }, uFog: { value: new Color(COLORS.fog) } },
        vertexShader,
        fragmentShader,
      });
      return { windows, geometry, material };
    },
    [],
    (r) => [r.windows, r.geometry, r.material],
  );

  const towers = useMemo(() => {
    const r = createRng('kirat-skyline');
    const list: Array<{ x: number; z: number; w: number; d: number; top: number; seed: number; density: number }> = [];
    let guard = 0;
    while (list.length < count && guard++ < count * 20) {
      // An elliptical ring around the (non-square) island, starting ~20 units off its edge.
      const a = r.next() * Math.PI * 2;
      const extra = 20 + Math.pow(r.next(), 0.8) * 50;
      const x = ISLAND_CENTER.x + Math.cos(a) * (ISLAND_SIZE.x / 2 + extra);
      const z = ISLAND_CENTER.z + Math.sin(a) * (ISLAND_SIZE.z / 2 + extra);
      const w = r.range(3.5, 9);
      const d = r.range(3.5, 9);
      if (islandDistance(x, z) - Math.hypot(w, d) / 2 < SKYWAY_CLEARANCE) continue;
      if (list.some((t) => Math.abs(t.x - x) < (t.w + w) / 2 + 0.6 && Math.abs(t.z - z) < (t.d + d) / 2 + 0.6)) continue;
      const top = -16 + Math.pow(r.next(), 2.2) * 42;
      list.push({ x, z, w, d, top, seed: r.next(), density: r.range(0.05, 0.22) });
    }
    return list;
  }, [count]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const attr = new Float32Array(towers.length * 2);
    towers.forEach((t, i) => {
      const bottom = -70;
      _o.position.set(t.x, (t.top + bottom) / 2, t.z);
      _o.scale.set(t.w, t.top - bottom, t.d);
      _o.updateMatrix();
      mesh.setMatrixAt(i, _o.matrix);
      attr[i * 2] = t.seed;
      attr[i * 2 + 1] = t.density;
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.geometry.setAttribute('aTower', new InstancedBufferAttribute(attr, 2));
    mesh.computeBoundingSphere();
  }, [towers]);

  return <instancedMesh ref={ref} args={[res.geometry, res.material, towers.length]} />;
}

// Every blinking beacon in the city (rooftop antennas, the radio mast, the
// skyline) in one instanced draw call. Blinking runs on the GPU from the
// shared clock; with reduced motion the lights hold steady.

import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, IcosahedronGeometry, InstancedBufferAttribute, Object3D, ShaderMaterial, type InstancedMesh } from 'three';
import type { BeaconSpec } from './buildingPlan';
import { cityUniforms } from './lib/cityUniforms';
import { useDisposable } from './lib/useDisposable';

const vertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute vec2 aBlink; // rate, phase
  uniform float uTime;
  uniform float uMotion;
  varying vec3 vColor;
  varying float vOn;
  void main() {
    float rate = aBlink.x;
    float t = fract(uTime * rate + aBlink.y);
    float pulse = rate > 0.0 ? smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.32, 0.5, t)) : 1.0;
    vOn = mix(1.0, 0.12 + 0.88 * pulse, uMotion);
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vOn;
  void main() {
    gl_FragColor = vec4(vColor * vOn, 1.0);
  }
`;

const _o = new Object3D();
const _c = new Color();

export function Beacons({ specs }: { specs: BeaconSpec[] }) {
  const ref = useRef<InstancedMesh>(null);
  const geometry = useDisposable(() => new IcosahedronGeometry(1, 1), []);
  const material = useDisposable(
    () => new ShaderMaterial({ uniforms: { uTime: cityUniforms.uTime, uMotion: cityUniforms.uMotion }, vertexShader, fragmentShader }),
    [],
  );
  const attrs = useMemo(() => {
    const color = new Float32Array(specs.length * 3);
    const blink = new Float32Array(specs.length * 2);
    specs.forEach((s, i) => {
      _c.set(s.color).multiplyScalar(s.intensity);
      color.set([_c.r, _c.g, _c.b], i * 3);
      blink.set([s.rate, s.phase], i * 2);
    });
    return { color: new InstancedBufferAttribute(color, 3), blink: new InstancedBufferAttribute(blink, 2) };
  }, [specs]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    specs.forEach((s, i) => {
      _o.position.set(s.x, s.y, s.z);
      _o.scale.setScalar(s.size);
      _o.updateMatrix();
      mesh.setMatrixAt(i, _o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.geometry.setAttribute('aColor', attrs.color);
    mesh.geometry.setAttribute('aBlink', attrs.blink);
    mesh.computeBoundingSphere();
  }, [specs, attrs]);

  if (!specs.length) return null;
  return <instancedMesh ref={ref} args={[geometry, material, specs.length]} frustumCulled={false} />;
}

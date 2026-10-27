// Sky at infinity (independent of the camera far plane): indigo horizon glow
// fading to void, a soft moon with halo, sparse twinkling stars, and a dim
// glow under the island so it reads as floating.

import { useEffect, useRef } from 'react';
import { MOON_DIR } from './constants';
import { ISLAND_CENTER } from '../config/layout';
import { AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, Color, PlaneGeometry, ShaderMaterial, SphereGeometry, type Points } from 'three';
import { useThree } from '@react-three/fiber';
import { cityUniforms } from './lib/cityUniforms';
import { createRng } from './lib/random';
import { useDisposable } from './lib/useDisposable';


const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
    gl_Position = p.xyww;
    gl_Position.z = gl_Position.w * 0.99999;
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uZenith; uniform vec3 uHorizon; uniform vec3 uBand; uniform vec3 uNadir;
  uniform vec3 uMoonDir; uniform vec3 uMoon;
  varying vec3 vDir;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uHorizon, uZenith, pow(smoothstep(-0.02, 0.85, h), 0.55));
    col += uBand * exp(-abs(h - 0.02) * 11.0);
    col = mix(col, uNadir, smoothstep(0.0, -0.5, h));
    float m = max(dot(d, uMoonDir), 0.0);
    col += uMoon * (smoothstep(0.99955, 0.99975, m) * 2.6 + pow(m, 260.0) * 0.35 + pow(m, 18.0) * 0.05);
    col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const starVertex = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime; uniform float uMotion; uniform float uPixelRatio;
  varying float vAlpha;
  void main() {
    vec4 p = projectionMatrix * mat4(mat3(viewMatrix)) * vec4(position, 1.0);
    gl_Position = p.xyww;
    gl_Position.z = gl_Position.w * 0.99998;
    float tw = 0.72 + 0.28 * sin(uTime * (0.6 + aPhase) + aPhase * 40.0);
    vAlpha = mix(1.0, tw, uMotion) * smoothstep(0.02, 0.2, position.y);
    gl_PointSize = aSize * uPixelRatio;
  }
`;

const starFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(vec3(0.78, 0.86, 1.0) * a * 0.9, a);
  }
`;

const glowFragment = /* glsl */ `
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(max(1.0 - d, 0.0), 2.2);
    gl_FragColor = vec4(uColor * a, 1.0);
  }
`;

export function Sky({ stars = 700 }: { stars?: number }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const res = useDisposable(
    () => {
      const sphere = new SphereGeometry(1, 48, 24);
      const sky = new ShaderMaterial({
        uniforms: {
          uZenith: { value: new Color('#03040a') },
          uHorizon: { value: new Color('#0b0f26') },
          uBand: { value: new Color('#1a1c45').multiplyScalar(0.55) },
          uNadir: { value: new Color('#040510') },
          uMoonDir: { value: MOON_DIR },
          uMoon: { value: new Color('#dfe8ff') },
        },
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: BackSide,
        depthWrite: false,
        fog: false,
      });
      const r = createRng('kirat-stars');
      const pos = new Float32Array(stars * 3);
      const size = new Float32Array(stars);
      const phase = new Float32Array(stars);
      for (let i = 0; i < stars; i++) {
        const y = 0.03 + Math.pow(r.next(), 0.8) * 0.97;
        const a = r.next() * Math.PI * 2;
        const rr = Math.sqrt(1 - y * y);
        pos.set([Math.cos(a) * rr, y, Math.sin(a) * rr], i * 3);
        size[i] = r.next() < 0.06 ? r.range(2.2, 3) : r.range(0.9, 1.8);
        phase[i] = r.next();
      }
      const starGeo = new BufferGeometry();
      starGeo.setAttribute('position', new BufferAttribute(pos, 3));
      starGeo.setAttribute('aSize', new BufferAttribute(size, 1));
      starGeo.setAttribute('aPhase', new BufferAttribute(phase, 1));
      const starMat = new ShaderMaterial({
        uniforms: { uTime: cityUniforms.uTime, uMotion: cityUniforms.uMotion, uPixelRatio: { value: 1 } },
        vertexShader: starVertex,
        fragmentShader: starFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const glowGeo = new PlaneGeometry(1, 1);
      const glowMat = new ShaderMaterial({
        uniforms: { uColor: { value: new Color('#1a2560').multiplyScalar(0.5) } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: glowFragment,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      return { sphere, sky, starGeo, starMat, glowGeo, glowMat };
    },
    [stars],
    (r) => [r.sphere, r.sky, r.starGeo, r.starMat, r.glowGeo, r.glowMat],
  );
  const starPoints = useRef<Points>(null);
  useEffect(() => {
    const material = starPoints.current?.material as ShaderMaterial | undefined;
    if (material) material.uniforms.uPixelRatio.value = dpr;
  }, [dpr, res]);

  return (
    <group name="sky">
      <mesh geometry={res.sphere} material={res.sky} renderOrder={-100} frustumCulled={false} />
      <points ref={starPoints} geometry={res.starGeo} material={res.starMat} renderOrder={-99} frustumCulled={false} />
      <mesh geometry={res.glowGeo} material={res.glowMat} rotation-x={-Math.PI / 2} position={[ISLAND_CENTER.x, -9, ISLAND_CENTER.z]} scale={190} />
    </group>
  );
}

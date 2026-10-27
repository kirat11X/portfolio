// Animated neon in one draw call per component: a GeometryBuilder that also
// records per-vertex effect parameters, and the matching shader. Effects are
// computed on the GPU from the shared city clock (no per-frame JS beyond a
// couple of uniform writes), and freeze with reduced motion (uMotion = 0).
//
// Modes (aFx.x):
//   0 static colour
//   1 RGB cycle     aFx.y hue offset, aFx.z speed, aFx.w intensity
//   2 blink         aFx.y phase, aFx.z rate (Hz), aFx.w dim level
//   3 race gate     aFx.y gate index; highlighted when it equals uActive
//   4 RAM stick     aFx.y lift (units above the slot) — follows uRam
//   5 RAM status    red (waiting) → green (fed), from uRam
//   6 pulse         aFx.y phase, aFx.z speed, aFx.w dim level
// Spin: vertices with aSpin.w ≠ 0 rotate about axis aSpin.xyz through aPivot.

import { BufferAttribute, Color, DoubleSide, ShaderMaterial, UniformsLib, UniformsUtils, Vector3, type BufferGeometry } from 'three';
import { GeometryBuilder, type RGB } from './GeometryBuilder';
import { cityUniforms } from './cityUniforms';

export const FX = { static: 0, rgb: 1, blink: 2, gate: 3, ram: 4, ramStatus: 5, pulse: 6 } as const;

export interface FxParams {
  mode: number;
  a?: number;
  b?: number;
  c?: number;
  pivot?: Vector3;
  /** Spin axis (unit) and speed in rad/s. */
  axis?: Vector3;
  speed?: number;
}

const ZERO = new Vector3();

export class FxBuilder extends GeometryBuilder {
  private readonly fx: number[] = [];
  private readonly pivot: number[] = [];
  private readonly spin: number[] = [];
  private cur: FxParams = { mode: 0 };

  /** Parameters for everything added until the next call. */
  set(params: FxParams): this {
    this.cur = params;
    return this;
  }

  override vertex(p: Vector3, n: Vector3, u: number, v: number, c: RGB, w = 0): void {
    super.vertex(p, n, u, v, c, w);
    const f = this.cur;
    this.fx.push(f.mode, f.a ?? 0, f.b ?? 0, f.c ?? 1);
    const pv = f.pivot ?? ZERO;
    this.pivot.push(pv.x, pv.y, pv.z);
    const ax = f.axis ?? ZERO;
    this.spin.push(ax.x, ax.y, ax.z, f.speed ?? 0);
  }

  override build(): BufferGeometry {
    const g = super.build();
    g.setAttribute('aFx', new BufferAttribute(new Float32Array(this.fx), 4));
    g.setAttribute('aPivot', new BufferAttribute(new Float32Array(this.pivot), 3));
    g.setAttribute('aSpin', new BufferAttribute(new Float32Array(this.spin), 4));
    return g;
  }
}

const vertexShader = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  attribute vec4 aFx;
  attribute vec3 aPivot;
  attribute vec4 aSpin;
  uniform float uTime;
  uniform float uMotion;
  uniform float uRam;
  varying vec3 vColor;
  varying vec4 vFx;
  varying vec3 vWorld;

  vec3 rotateAxis(vec3 v, vec3 k, float a) {
    float c = cos(a);
    float s = sin(a);
    return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
  }

  void main() {
    vec3 p = position;
    if (aSpin.w != 0.0) p = aPivot + rotateAxis(p - aPivot, aSpin.xyz, uTime * aSpin.w * uMotion);
    if (aFx.x > 3.5 && aFx.x < 4.5) {
      float lift = 1.0 - uRam;
      float wobble = sin(uTime * 1.1) * 0.5 * lift * uMotion;
      p = aPivot + rotateAxis(p - aPivot, vec3(0.0, 1.0, 0.0), wobble);
      p.y += lift * (aFx.y + 0.08 * sin(uTime * 2.2) * uMotion);
    }
    vColor = color;
    vFx = aFx;
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform float uMotion;
  uniform float uActive;
  uniform float uRam;
  varying vec3 vColor;
  varying vec4 vFx;
  varying vec3 vWorld;

  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
  }

  void main() {
    float mode = vFx.x;
    vec3 col = vColor;
    if (mode > 0.5 && mode < 1.5) {
      float h = fract(vFx.y + uTime * vFx.z * uMotion + (vWorld.x + vWorld.z) * 0.45 + vWorld.y * 0.3);
      col = hsv2rgb(vec3(h, 0.82, 1.0)) * vFx.w;
    } else if (mode > 1.5 && mode < 2.5) {
      float on = step(0.5, fract(uTime * vFx.z + vFx.y));
      on = mix(1.0, on, uMotion);
      col *= mix(vFx.w, 1.0, on);
    } else if (mode > 2.5 && mode < 3.5) {
      float racing = step(-0.5, uActive);
      float isNext = 1.0 - step(0.5, abs(vFx.y - uActive));
      float glow = mix(0.32, 2.3 + 0.7 * sin(uTime * 7.0) * uMotion, isNext);
      col *= mix(1.0, glow, racing);
    } else if (mode > 4.5 && mode < 5.5) {
      vec3 waiting = vec3(1.0, 0.22, 0.12) * (0.9 + 0.5 * step(0.5, fract(uTime * 1.2)) * uMotion);
      col = mix(waiting, vec3(0.2, 1.0, 0.55) * 2.4, uRam);
    } else if (mode > 5.5 && mode < 6.5) {
      col *= mix(vFx.w, 1.0, 0.5 + 0.5 * sin(uTime * vFx.z * uMotion + vFx.y));
    }
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export interface FxUniforms {
  uActive: { value: number };
  uRam: { value: number };
}

/** Unlit HDR effect material (bloom catches values above ~1). */
export function createFxMaterial(): ShaderMaterial & { uniforms: FxUniforms } {
  const m = new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      { uActive: { value: -1 }, uRam: { value: 0 } },
    ]),
    vertexShader,
    fragmentShader,
    vertexColors: true,
    fog: true,
    side: DoubleSide,
    toneMapped: false,
  });
  // Shared clock uniforms (same objects, so CityClock drives them).
  m.uniforms.uTime = cityUniforms.uTime;
  m.uniforms.uMotion = cityUniforms.uMotion;
  return m as ShaderMaterial & { uniforms: FxUniforms };
}

export const fxColor = (hex: string, k = 1): Color => new Color(hex).multiplyScalar(k);

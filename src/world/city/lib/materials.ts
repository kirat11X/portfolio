// Shared material factories. Each is created once per scene (useMemo) and
// disposed on unmount by the component that owns it.

import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Texture,
} from 'three';

/**
 * Facade material: dark wall + window atlas. The `aWin` vertex attribute
 * carries the window brightness for each piece (0 = roofs and clutter, no
 * windows). Glass panes darken the wall colour; lit panes add emission.
 */
export function createFacadeMaterial(windows: Texture): MeshStandardMaterial {
  const material = new MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.72,
    metalness: 0.18,
    map: windows,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindowGain = { value: 1.2 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aWin;\nvarying float vWin;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWin = aWin;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWindowGain;\nvarying float vWin;')
      .replace(
        '#include <map_fragment>',
        `vec4 winTexel = texture2D( map, vMapUv );
        float winMask = winTexel.a * step( 0.001, vWin );
        diffuseColor.rgb *= mix( 1.0, 0.38, winMask );`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        'totalEmissiveRadiance += winTexel.rgb * winMask * vWin * uWindowGain;',
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix( roughnessFactor, 0.16, winMask );',
      );
  };
  material.customProgramCacheKey = () => 'kirat-city-facade-v1';
  return material;
}

/** Unlit HDR neon driven by vertex colours (values above 1 bloom). */
export function createNeonMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    vertexColors: true,
    toneMapped: false,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

/** Additive soft light pools on the ground ("wet" neon reflections). */
export function createDecalMaterial(glow: Texture): MeshBasicMaterial {
  return new MeshBasicMaterial({
    map: glow,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
}

export function createStandard(options: {
  color?: string | number;
  vertexColors?: boolean;
  roughness: number;
  metalness: number;
  map?: Texture | null;
  envMapIntensity?: number;
  polygonOffset?: number;
}): MeshStandardMaterial {
  const m = new MeshStandardMaterial({
    color: options.color ?? 0xffffff,
    vertexColors: options.vertexColors ?? false,
    roughness: options.roughness,
    metalness: options.metalness,
    map: options.map ?? null,
    envMapIntensity: options.envMapIntensity ?? 1,
  });
  if (options.polygonOffset) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -options.polygonOffset;
    m.polygonOffsetUnits = -options.polygonOffset;
  }
  return m;
}

/** HDR colour helper for signs and frames. */
export function hdr(hex: string, intensity: number): Color {
  return new Color(hex).multiplyScalar(intensity);
}

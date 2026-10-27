// Materials for the player car. Few and shared: one clear-coated vertex-colour
// paint for the whole body, tinted glass, unlit HDR lights (bloom picks them
// up) and additive effects.

import { AdditiveBlending, Color, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, type Texture } from 'three';
import type { CarDef } from '../../game/cars';

export const TAIL_BASE = new Color('#ff2b55');
export const TAIL_IDLE = 1.7;
export const STRIPE_IDLE = 2.4;

function hdr(hex: string, intensity: number): Color {
  return new Color(hex).multiplyScalar(intensity);
}

/**
 * Car paint: clear-coated, vertex-coloured (body, livery, trim and interior in
 * one draw call) and faintly self-lit in its own colours so the silhouette
 * reads against the night city.
 */
function createPaint(selfLight: number): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    vertexColors: true,
    metalness: 0.28,
    roughness: 0.36,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.25,
    emissive: new Color(1, 1, 1),
    emissiveIntensity: selfLight,
  });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n#ifdef USE_COLOR\n\ttotalEmissiveRadiance *= vColor.rgb;\n#endif',
    );
  };
  material.customProgramCacheKey = () => 'vehicle-paint';
  return material;
}

export function createVehicleMaterials(def: CarDef, textures: { radial: Texture; beam: Texture }) {
  const additive = { transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false } as const;
  return {
    paint: createPaint(0.16),
    glass: new MeshStandardMaterial({
      color: def.glass,
      metalness: 0.2,
      roughness: 0.06,
      transparent: true,
      opacity: 0.62,
      emissive: new Color(def.glassGlow),
      emissiveIntensity: 0.55,
      envMapIntensity: 2.2,
    }),
    wheel: new MeshStandardMaterial({ vertexColors: true, metalness: 0.45, roughness: 0.42, envMapIntensity: 1.1 }),
    ring: new MeshBasicMaterial({ color: hdr(def.accent, 2.2), toneMapped: false }),
    stripe: new MeshBasicMaterial({ color: hdr(def.accent, STRIPE_IDLE), toneMapped: false }),
    headlight: new MeshBasicMaterial({ color: hdr('#eaf6ff', 4.2), toneMapped: false }),
    tail: new MeshBasicMaterial({ color: hdr('#ff2b55', TAIL_IDLE), toneMapped: false }),
    flame: new MeshBasicMaterial({ vertexColors: true, ...additive }),
    thrusters: new MeshBasicMaterial({ vertexColors: true, ...additive }),
    antenna: new MeshStandardMaterial({ color: '#2a3150', metalness: 0.5, roughness: 0.4 }),
    tip: new MeshBasicMaterial({ color: hdr(def.accent, 3.2), toneMapped: false }),
    shadow: new MeshBasicMaterial({
      color: '#000000',
      map: textures.radial,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    glow: new MeshBasicMaterial({
      color: hdr(def.accent, 1.15),
      map: textures.radial,
      opacity: 0.7,
      ...additive,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
    beam: new MeshBasicMaterial({
      color: hdr('#d6ecff', 0.62),
      map: textures.beam,
      opacity: 1,
      ...additive,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),
  };
}


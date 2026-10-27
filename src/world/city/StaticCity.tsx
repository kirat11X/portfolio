// Renders the baked static city: ~12 meshes, one per material bucket.

import { useMemo } from 'react';
import { Color, MeshBasicMaterial, ShaderMaterial, type Material, type Texture } from 'three';
import { neon } from '@/styles/tokens';
import { bakeCity, GEOMETRY_KEYS, type BakedCity } from './bake';
import { createDecalMaterial, createFacadeMaterial, createNeonMaterial, createStandard } from './lib/materials';
import { createGlowTexture, createPlazaTexture, createRackTexture, createTileTexture, createWindowTexture } from './lib/textures';
import { useDisposable, type Disposable } from './lib/useDisposable';
import { createLabelAtlas } from './lib/labelAtlas';
import { createSignAtlas } from './lib/signAtlas';
import { createZoneAtlas } from './lib/zoneAtlas';
import { cityUniforms } from './lib/cityUniforms';
import { Beacons } from './Beacons';
import { Trees } from './Trees';

interface CityMaterials {
  textures: Texture[];
  ground: Material;
  island: Material;
  asphalt: Material;
  plaza: Material;
  markings: Material;
  facade: Material;
  glass: Material;
  metal: Material;
  neon: Material;
  decals: Material;
  racks: Material;
  lightboxes: Material;
  labels: Material;
  signs: Material;
  zone: Material;
}

function createLightboxMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uA: { value: new Color(neon.violet).multiplyScalar(0.75) },
      uB: { value: new Color(neon.magenta).multiplyScalar(0.62) },
      uTime: cityUniforms.uTime,
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uA; uniform vec3 uB; uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        float side = step(0.5, uv.x);
        vec2 p = vec2(fract(uv.x * 2.0), uv.y);
        vec3 col = mix(uA, uB, smoothstep(0.0, 1.0, p.y + 0.15 * sin(p.x * 3.0 + side * 2.0)));
        // A soft abstract composition: a disc and a band, different per frame.
        vec2 c = mix(vec2(0.45, 0.62), vec2(0.58, 0.4), side);
        float disc = smoothstep(0.24, 0.2, length((p - c) * vec2(1.0, 0.68)));
        float band = smoothstep(0.03, 0.0, abs(p.y - mix(0.28, 0.74, side) - 0.04 * sin(p.x * 6.0 + uTime * 0.2)));
        col *= 0.35 + 0.65 * smoothstep(0.0, 0.9, p.y);
        col += vec3(1.0, 0.92, 1.0) * disc * 0.55 + uA * band * 0.9;
        float edge = smoothstep(0.0, 0.04, p.x) * smoothstep(1.0, 0.96, p.x) * smoothstep(0.0, 0.03, p.y) * smoothstep(1.0, 0.97, p.y);
        gl_FragColor = vec4(col * (0.55 + 0.45 * edge), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

function createMaterials(): CityMaterials {
  const windows = createWindowTexture();
  const tiles = createTileTexture();
  const plaza = createPlazaTexture();
  const glow = createGlowTexture();
  const racks = createRackTexture();
  const atlas = createLabelAtlas();
  const signAtlas = createSignAtlas();
  const zoneAtlas = createZoneAtlas();
  return {
    textures: [windows, tiles, plaza, glow, racks, atlas, signAtlas, zoneAtlas],
    ground: createStandard({ vertexColors: true, roughness: 0.9, metalness: 0.05, map: tiles }),
    island: createStandard({ vertexColors: true, roughness: 0.6, metalness: 0.2 }),
    asphalt: createStandard({ vertexColors: true, roughness: 0.34, metalness: 0.15, envMapIntensity: 1.4 }),
    plaza: createStandard({ roughness: 0.55, metalness: 0.1, map: plaza, envMapIntensity: 1.1, polygonOffset: 1 }),
    markings: new MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    facade: createFacadeMaterial(windows),
    glass: createStandard({ vertexColors: true, roughness: 0.38, metalness: 0.85, envMapIntensity: 1.6 }),
    metal: createStandard({ vertexColors: true, roughness: 0.42, metalness: 0.6 }),
    neon: createNeonMaterial(),
    decals: createDecalMaterial(glow),
    racks: new MeshBasicMaterial({ map: racks, color: new Color(1.7, 1.7, 1.7), toneMapped: false }),
    lightboxes: createLightboxMaterial(),
    labels: new MeshBasicMaterial({ map: atlas, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }),
    signs: new MeshBasicMaterial({
      map: signAtlas,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
    zone: new MeshBasicMaterial({
      map: zoneAtlas,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  };
}

function disposeAll(value: { city: BakedCity; materials: CityMaterials }): Disposable[] {
  const items: Disposable[] = [];
  for (const key of GEOMETRY_KEYS) items.push(value.city[key]);
  const { textures, ...mats } = value.materials;
  items.push(...textures, ...Object.values(mats));
  return items;
}

export function StaticCity() {
  const { city, materials } = useDisposable(() => ({ city: bakeCity(), materials: createMaterials() }), [], disposeAll);
  const meshes = useMemo(
    () =>
      GEOMETRY_KEYS.map((key) => ({
        key,
        geometry: city[key],
        material: materials[key],
        renderOrder: key === 'decals' ? 2 : key === 'labels' || key === 'signs' || key === 'zone' ? 4 : 0,
      })).filter((m) => m.geometry.getAttribute('position').count > 0),
    [city, materials],
  );
  return (
    <group name="static-city">
      {meshes.map((m) => (
        <mesh key={m.key} name={m.key} geometry={m.geometry} material={m.material} renderOrder={m.renderOrder} matrixAutoUpdate={false} />
      ))}
      <Beacons specs={city.beacons} />
      <Trees />
    </group>
  );
}

// PDC Club (Photography & Design Club) logo in a free-standing lightbox near
// the Creative plaza. The logo keeps its cream plate and is tone-mapped with a
// modest gain so it reads at night without blooming. The frame and posts are
// baked (bake/enrich.ts). If the image fails to load, nothing is shown.

import { useEffect, useRef } from 'react';
import { LinearFilter, LinearMipmapLinearFilter, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader, type Mesh } from 'three';
import { PDC_SIGN } from './propLayout';
import { useDisposable } from './lib/useDisposable';

export function PdcSign() {
  const mesh = useRef<Mesh>(null);
  const geometry = useDisposable(() => new PlaneGeometry(PDC_SIGN.width, PDC_SIGN.width / PDC_SIGN.aspect), []);

  useEffect(() => {
    let alive = true;
    // The map is attached before the first render (still empty), so the shader
    // variant compiles with the rest of the world instead of when the image lands.
    const texture = new TextureLoader().load(
      '/world/pdc-club.png',
      (t) => {
        if (!alive || !mesh.current) return;
        t.needsUpdate = true;
        mesh.current.visible = true;
      },
      undefined,
      () => undefined,
    );
    texture.colorSpace = SRGBColorSpace;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    texture.anisotropy = 8;
    const material = new MeshBasicMaterial({ color: 0xd4d4d4, transparent: true, map: texture });
    if (mesh.current) mesh.current.material = material;
    return () => {
      alive = false;
      texture.dispose();
      material.dispose();
    };
  }, []);

  const h = PDC_SIGN.width / PDC_SIGN.aspect;
  return (
    <group position={[PDC_SIGN.x, PDC_SIGN.bottom + h / 2, PDC_SIGN.z]} rotation={[0, PDC_SIGN.rotationY, 0]}>
      <mesh ref={mesh} geometry={geometry} visible={false} renderOrder={4} />
    </group>
  );
}

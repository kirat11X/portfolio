// Holographic neural-network sculpture floating over the Engineering plaza:
// three layers of glowing nodes joined by thin edges, slowly turning. One
// merged mesh, one draw call; motion stops with reduced motion.

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { IcosahedronGeometry, MeshBasicMaterial, Vector3, type Group } from 'three';
import { neon } from '@/styles/tokens';
import { useReducedMotion } from '@/lib/motion';
import { DISTRICTS } from '../config/layout';
import { EXTRA } from './constants';
import { GeometryBuilder, rgb, trs } from './lib/GeometryBuilder';
import { useDisposable } from './lib/useDisposable';

const LAYERS = [4, 6, 6, 3];

function buildNet() {
  const b = new GeometryBuilder();
  const node = new IcosahedronGeometry(1, 1);
  const pos: Vector3[][] = LAYERS.map((n, li) =>
    Array.from({ length: n }, (_, i) => new Vector3((li - (LAYERS.length - 1) / 2) * 1.7, (i - (n - 1) / 2) * 0.62, 0)),
  );
  const edge = rgb(neon.cyan, 0.55);
  for (let li = 0; li < pos.length - 1; li++) {
    for (const a of pos[li]) for (const c of pos[li + 1]) b.bar(a, c, 0.018, edge);
  }
  pos.forEach((layer, li) =>
    layer.forEach((p, i) => {
      const hot = (li + i) % 4 === 1;
      const color = li === pos.length - 1 ? rgb(EXTRA.amber, 2.6) : hot ? rgb(EXTRA.teal, 2.6) : rgb('#d6f6ff', 2.2);
      b.addGeometry(node, trs(p.x, p.y, p.z, 0, 0.13, 0.13, 0.13), color);
    }),
  );
  node.dispose();
  return b.build();
}

export function NeuralNet() {
  const spin = useRef<Group>(null);
  const reduced = useReducedMotion();
  const res = useDisposable(
    () => ({ geometry: buildNet(), material: new MeshBasicMaterial({ vertexColors: true, toneMapped: false }) }),
    [],
    (r) => [r.geometry, r.material],
  );
  useFrame((_, delta) => {
    if (!reduced && spin.current) spin.current.rotation.y += Math.min(delta, 0.1) * 0.18;
  });
  // Hovers over the server-rack row north of the Engineering plaza.
  const [cx] = DISTRICTS.engineering.center;
  return (
    <group position={[cx, 6.2, -16.8]}>
      <group ref={spin}>
        <mesh geometry={res.geometry} material={res.material} />
      </group>
    </group>
  );
}

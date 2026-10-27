// Small sidewalk trees inside the building lots (inside lot colliders, so no
// decor colliders needed), plus border/arena trees (colliders in gamingLayout). Two instanced draw calls: trunks and canopies.

import { useLayoutEffect, useRef } from 'react';
import { Color, CylinderGeometry, IcosahedronGeometry, MeshStandardMaterial, Object3D, type InstancedMesh } from 'three';
import { CITY_PLAN, type TreeSpec } from './buildingPlan';
import { ARENA_TREES, BORDER_PROPS } from './gamingLayout';
import { COLORS } from './constants';
import { useDisposable } from './lib/useDisposable';

const _o = new Object3D();
const _c = new Color();

/** Lot trees plus the larger trees of the border strip and around the arena (those have colliders). */
const ALL_TREES: TreeSpec[] = [
  ...CITY_PLAN.trees,
  ...[...BORDER_PROPS.filter((p) => p.kind === 'tree'), ...ARENA_TREES].map((p, i) => ({ x: p.x, z: p.z, y: 0, scale: 1.55 + ((i * 37) % 10) * 0.04, tint: 0.85 + ((i * 53) % 10) * 0.04 })),
];

export function Trees() {
  const trees = ALL_TREES;
  const trunks = useRef<InstancedMesh>(null);
  const canopies = useRef<InstancedMesh>(null);
  const res = useDisposable(
    () => {
      const trunkGeo = new CylinderGeometry(0.04, 0.06, 1, 6);
      const canopyGeo = new IcosahedronGeometry(1, 0);
      const trunkMat = new MeshStandardMaterial({ color: '#1a1712', roughness: 0.9 });
      const canopyMat = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, flatShading: true, emissive: '#06201c', emissiveIntensity: 0.6 });
      return { trunkGeo, canopyGeo, trunkMat, canopyMat };
    },
    [],
    (r) => [r.trunkGeo, r.canopyGeo, r.trunkMat, r.canopyMat],
  );

  useLayoutEffect(() => {
    const t = trunks.current;
    const c = canopies.current;
    if (!t || !c) return;
    trees.forEach((tree, i) => {
      _o.rotation.set(0, i * 1.7, 0);
      _o.position.set(tree.x, tree.y + 0.3 * tree.scale, tree.z);
      _o.scale.set(1, 0.6 * tree.scale, 1);
      _o.updateMatrix();
      t.setMatrixAt(i, _o.matrix);
      _o.position.set(tree.x, tree.y + 0.86 * tree.scale, tree.z);
      _o.scale.set(0.36 * tree.scale, 0.46 * tree.scale, 0.36 * tree.scale);
      _o.updateMatrix();
      c.setMatrixAt(i, _o.matrix);
      _c.set(COLORS.tree).multiplyScalar(tree.tint);
      c.setColorAt(i, _c);
    });
    t.instanceMatrix.needsUpdate = true;
    c.instanceMatrix.needsUpdate = true;
    if (c.instanceColor) c.instanceColor.needsUpdate = true;
    t.computeBoundingSphere();
    c.computeBoundingSphere();
  }, [trees]);

  if (!trees.length) return null;
  return (
    <group name="trees">
      <instancedMesh ref={trunks} args={[res.trunkGeo, res.trunkMat, trees.length]} />
      <instancedMesh ref={canopies} args={[res.canopyGeo, res.canopyMat, trees.length]} />
    </group>
  );
}

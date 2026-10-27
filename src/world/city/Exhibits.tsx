// Glass exhibit panels for the featured projects, one per WORLD_EXHIBITS
// entry at its slot. Shared parts (glass body, accent frame, ground pad) are
// instanced; each panel face is one mesh whose canvas texture carries the
// cover art and labels. Hover / focus / selection are read from the world
// store each frame; pointer events write back to it.

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import {
  BoxGeometry,
  Color,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  type Group,
  type InstancedMesh,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { neon } from '@/styles/tokens';
import { useReducedMotion } from '@/lib/motion';
import { WORLD_EXHIBITS, type WorldExhibit } from '../config/exhibits';
import { useWorldStore } from '../state/worldStore';
import { Y } from './constants';
import { acquireExhibitFace, releaseExhibitFace } from './exhibitArt';
import { useDisposable } from './lib/useDisposable';

const PANEL_W = 3.2;
const PANEL_H = 2.0;
const PANEL_Y = 2.33;
const FACE_W = 3.04;
const FACE_H = 1.9;

const accentOf = (exhibit: WorldExhibit) => (exhibit.district === 'engineering' ? neon.cyan : neon.violet);

function createShared() {
  const t = 0.04;
  const w = FACE_W + 0.08;
  const h = FACE_H + 0.08;
  const bars = [
    new BoxGeometry(w + t, t, 0.05).translate(0, h / 2, 0.035),
    new BoxGeometry(w + t, t, 0.05).translate(0, -h / 2, 0.035),
    new BoxGeometry(t, h, 0.05).translate(w / 2, 0, 0.035),
    new BoxGeometry(t, h, 0.05).translate(-w / 2, 0, 0.035),
  ];
  const frame = mergeGeometries(bars);
  bars.forEach((g) => g.dispose());
  return {
    body: new BoxGeometry(PANEL_W, PANEL_H, 0.08),
    face: new PlaneGeometry(FACE_W, FACE_H).translate(0, 0, 0.042),
    hit: new BoxGeometry(PANEL_W + 0.1, PANEL_H + 0.1, 0.2),
    frame,
    ring: new RingGeometry(0.94, 1, 72).rotateX(-Math.PI / 2),
    bodyMat: new MeshStandardMaterial({ color: '#0a0d18', roughness: 0.18, metalness: 0.6, envMapIntensity: 1.4 }),
    frameMat: new MeshBasicMaterial({ toneMapped: false }),
    ringMat: new MeshBasicMaterial({
      toneMapped: false,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),
    hitMat: new MeshBasicMaterial({ visible: false }),
  };
}

type Shared = ReturnType<typeof createShared>;

interface FaceProps {
  exhibit: WorldExhibit;
  shared: Shared;
  register: (id: string, group: Group | null, material: MeshBasicMaterial | null) => void;
}

function ExhibitFace({ exhibit, shared, register }: FaceProps) {
  const group = useRef<Group>(null);
  const setHovered = useWorldStore((s) => s.setHovered);
  const selectExhibit = useWorldStore((s) => s.selectExhibit);
  const accent = accentOf(exhibit);
  const material = useRef<MeshBasicMaterial>(null);

  // The face texture is shared and reference-counted (see exhibitArt.ts).
  useEffect(() => {
    const m = material.current;
    if (!m) return;
    m.map = acquireExhibitFace(exhibit, accent);
    m.needsUpdate = true;
    return () => {
      m.map = null;
      releaseExhibitFace(exhibit.id);
    };
  }, [exhibit, accent]);

  useLayoutEffect(() => {
    register(exhibit.id, group.current, material.current);
    return () => register(exhibit.id, null, null);
  }, [exhibit.id, register]);

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(exhibit.id);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectExhibit(exhibit.id);
  };

  return (
    <group
      ref={group}
      position={[exhibit.slot.x, PANEL_Y, exhibit.slot.z]}
      rotation={[0, exhibit.slot.rotationY, 0]}
      onPointerOver={onOver}
      onPointerOut={() => setHovered(null)}
      onClick={onClick}
    >
      <mesh geometry={shared.face}>
        <meshBasicMaterial ref={material} color="#ffffff" />
      </mesh>
      <mesh geometry={shared.hit} material={shared.hitMat} />
    </group>
  );
}

const _m = new Matrix4();
const _r = new Matrix4();
const _c = new Color();

export function Exhibits() {
  const exhibits = WORLD_EXHIBITS;
  const count = exhibits.length;
  const shared = useDisposable(createShared, [], (s) => [s.body, s.face, s.hit, s.frame, s.ring, s.bodyMat, s.frameMat, s.ringMat, s.hitMat]);
  const reduced = useReducedMotion();
  const body = useRef<InstancedMesh>(null);
  const frame = useRef<InstancedMesh>(null);
  const ring = useRef<InstancedMesh>(null);
  const faces = useRef(new Map<string, { group: Group; material: MeshBasicMaterial }>());
  const anim = useRef<Array<{ k: number; accent: Color }>>([]);

  const register = useMemo(
    () => (id: string, group: Group | null, material: MeshBasicMaterial | null) => {
      if (group && material) faces.current.set(id, { group, material });
      else faces.current.delete(id);
    },
    [],
  );

  useLayoutEffect(() => {
    anim.current = exhibits.map((e) => ({ k: -1, accent: new Color(accentOf(e)) }));
  }, [exhibits]);

  useFrame(({ clock }, delta) => {
    const b = body.current;
    const f = frame.current;
    const r = ring.current;
    if (!b || !f || !r) return;
    const { hoveredId, focusedId, selectedExhibitId } = useWorldStore.getState();
    const step = 1 - Math.exp(-Math.min(delta, 0.1) * 8);
    const pulse = reduced ? 1 : 0.72 + 0.28 * Math.sin(clock.elapsedTime * 4);
    const states = anim.current;
    if (states.length !== count) return;
    for (let i = 0; i < count; i++) {
      const e = exhibits[i];
      const a = states[i];
      const target = e.id === hoveredId || e.id === focusedId || e.id === selectedExhibitId ? 1 : 0;
      a.k = a.k < 0 ? target : a.k + (target - a.k) * step;
      const lift = PANEL_Y + a.k * (reduced ? 0.05 : 0.16);
      _m.makeRotationY(e.slot.rotationY).setPosition(e.slot.x, lift, e.slot.z);
      b.setMatrixAt(i, _m);
      f.setMatrixAt(i, _m);
      f.setColorAt(i, _c.copy(a.accent).multiplyScalar(1.3 + a.k * 2.5));
      const scale = e.slot.pad.radius;
      _r.makeScale(scale, 1, scale).setPosition(e.slot.pad.x, Y.pad, e.slot.pad.z);
      r.setMatrixAt(i, _r);
      r.setColorAt(i, _c.copy(a.accent).multiplyScalar(0.45 + a.k * 2.4 * pulse));
      const face = faces.current.get(e.id);
      if (face) {
        face.group.position.y = lift;
        face.material.color.setScalar(1 + a.k * 0.22);
      }
    }
    b.instanceMatrix.needsUpdate = true;
    f.instanceMatrix.needsUpdate = true;
    r.instanceMatrix.needsUpdate = true;
    if (f.instanceColor) f.instanceColor.needsUpdate = true;
    if (r.instanceColor) r.instanceColor.needsUpdate = true;
  });

  // Instance colours must exist before the first frame so the shader variant compiles once.
  useLayoutEffect(() => {
    for (const mesh of [frame.current, ring.current]) {
      if (!mesh) continue;
      for (let i = 0; i < count; i++) mesh.setColorAt(i, _c.set(accentOf(exhibits[i])));
    }
  }, [count, exhibits]);

  if (!count) return null;
  return (
    <group name="exhibits">
      <instancedMesh ref={body} args={[shared.body, shared.bodyMat, count]} frustumCulled={false} />
      <instancedMesh ref={frame} args={[shared.frame, shared.frameMat, count]} frustumCulled={false} />
      <instancedMesh ref={ring} args={[shared.ring, shared.ringMat, count]} frustumCulled={false} renderOrder={3} />
      {exhibits.map((exhibit) => (
        <ExhibitFace key={exhibit.id} exhibit={exhibit} shared={shared} register={register} />
      ))}
    </group>
  );
}

// Glowing doors on the landmark fronts. Frames, door light and trigger rings
// are instanced (three draw calls for all five portals); each portal keeps an
// invisible hit box for pointer events. Hover/focus brighten a portal;
// clicking navigates to its route (R3F bridges the router context).

import { useCallback, useLayoutEffect, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
import { BoxGeometry, Color, Matrix4, MeshBasicMaterial, PlaneGeometry, RingGeometry, ShaderMaterial, type InstancedMesh } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { palette } from '@/styles/tokens';
import { useReducedMotion } from '@/lib/motion';
import { PORTALS, type PortalDef } from '../config/layout';
import { useWorldStore } from '../state/worldStore';
import { ACCENT, Y } from './constants';
import { NeonText } from './NeonText';
import { useDisposable } from './lib/useDisposable';
import { PORTAL_DOOR_H, PORTAL_LABEL_SIZE, PORTAL_LABEL_TEXT } from './portalLabels';

const DOOR_W = 2.3;
const DOOR_H = PORTAL_DOOR_H;

const doorVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vTint;
  void main() {
    vUv = uv;
    vTint = instanceColor;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;
const doorFragment = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vTint;
  void main() {
    float floorGlow = pow(1.0 - vUv.y, 2.2);
    float edge = pow(abs(vUv.x - 0.5) * 2.0, 6.0);
    float lines = smoothstep(0.9, 1.0, sin(vUv.y * 60.0) * 0.5 + 0.5) * 0.07;
    gl_FragColor = vec4(vTint * (0.1 + 0.55 * floorGlow + 0.25 * edge + lines), 1.0);
  }
`;


function createShared() {
  const t = 0.11;
  const parts = [
    new BoxGeometry(t, DOOR_H + t, 0.12).translate(-(DOOR_W + t) / 2, (DOOR_H + t) / 2, 0.06),
    new BoxGeometry(t, DOOR_H + t, 0.12).translate((DOOR_W + t) / 2, (DOOR_H + t) / 2, 0.06),
    new BoxGeometry(DOOR_W + 2 * t, t, 0.12).translate(0, DOOR_H + t / 2, 0.06),
  ];
  const frame = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return {
    frame,
    door: new PlaneGeometry(DOOR_W, DOOR_H).translate(0, DOOR_H / 2, 0.02),
    ring: new RingGeometry(0.88, 1, 64).rotateX(-Math.PI / 2),
    hit: new BoxGeometry(DOOR_W + 0.4, DOOR_H + 0.9, 0.6).translate(0, (DOOR_H + 0.9) / 2, 0.2),
    frameMat: new MeshBasicMaterial({ toneMapped: false }),
    doorMat: new ShaderMaterial({ vertexShader: doorVertex, fragmentShader: doorFragment }),
    ringMat: new MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    hitMat: new MeshBasicMaterial({ visible: false }),
  };
}

interface HitProps {
  portal: PortalDef;
  shared: ReturnType<typeof createShared>;
  register: (id: string, gain: { current: number } | null) => void;
}

function PortalHit({ portal, shared, register }: HitProps) {
  const gain = useRef(1);
  useLayoutEffect(() => {
    register(portal.id, gain);
    return () => register(portal.id, null);
  }, [portal.id, register]);
  const setHovered = useWorldStore((s) => s.setHovered);
  const navigate = useNavigate();
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(portal.id);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    navigate(portal.route);
  };
  return (
    <group position={[portal.x, 0, portal.z]} rotation={[0, portal.rotationY, 0]}>
      <mesh geometry={shared.hit} material={shared.hitMat} onPointerOver={onOver} onPointerOut={() => setHovered(null)} onClick={onClick} />
      <NeonText color={palette.fg} intensity={1.6} font="mono" fontSize={PORTAL_LABEL_SIZE} letterSpacing={0.12} position={[0, DOOR_H + 0.42, 0.14]} gainRef={gain}>
        {PORTAL_LABEL_TEXT[portal.id] ?? portal.label.toUpperCase()}
      </NeonText>
    </group>
  );
}

const _m = new Matrix4();
const _c = new Color();

export function Portals() {
  const shared = useDisposable(createShared, [], (s) => [s.frame, s.door, s.ring, s.hit, s.frameMat, s.doorMat, s.ringMat, s.hitMat]);
  const reduced = useReducedMotion();
  const frames = useRef<InstancedMesh>(null);
  const doors = useRef<InstancedMesh>(null);
  const rings = useRef<InstancedMesh>(null);
  const state = useRef(PORTALS.map((p) => ({ k: 0, accent: new Color(ACCENT[p.district]) })));
  const gains = useRef(new Map<string, { current: number }>());
  const register = useCallback((id: string, gain: { current: number } | null) => {
    if (gain) gains.current.set(id, gain);
    else gains.current.delete(id);
  }, []);
  const count = PORTALS.length;

  useLayoutEffect(() => {
    const f = frames.current;
    const d = doors.current;
    const r = rings.current;
    if (!f || !d || !r) return;
    PORTALS.forEach((p, i) => {
      _m.makeRotationY(p.rotationY).setPosition(p.x, 0, p.z);
      f.setMatrixAt(i, _m);
      d.setMatrixAt(i, _m);
      _m.makeScale(p.trigger.radius, 1, p.trigger.radius).setPosition(p.trigger.x, Y.pad, p.trigger.z);
      r.setMatrixAt(i, _m);
      for (const mesh of [f, d, r]) mesh.setColorAt(i, state.current[i].accent);
    });
    for (const mesh of [f, d, r]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, []);

  useFrame(({ clock }, delta) => {
    const f = frames.current;
    const d = doors.current;
    const r = rings.current;
    if (!f || !d || !r) return;
    const { hoveredId, focusedId } = useWorldStore.getState();
    const step = 1 - Math.exp(-Math.min(delta, 0.1) * 8);
    const pulse = reduced ? 1 : 0.8 + 0.2 * Math.sin(clock.elapsedTime * 3.2);
    for (let i = 0; i < count; i++) {
      const s = state.current[i];
      const target = PORTALS[i].id === hoveredId || PORTALS[i].id === focusedId ? 1 : 0;
      s.k += (target - s.k) * step;
      f.setColorAt(i, _c.copy(s.accent).multiplyScalar(2 + s.k * 2.4));
      d.setColorAt(i, _c.copy(s.accent).multiplyScalar(1 + s.k * 1.6 * pulse));
      r.setColorAt(i, _c.copy(s.accent).multiplyScalar(1.1 + s.k * 2 * pulse));
      const gain = gains.current.get(PORTALS[i].id);
      if (gain) gain.current = 1 + s.k * 0.6;
    }
    if (f.instanceColor) f.instanceColor.needsUpdate = true;
    if (d.instanceColor) d.instanceColor.needsUpdate = true;
    if (r.instanceColor) r.instanceColor.needsUpdate = true;
  });

  return (
    <group name="portals">
      <instancedMesh ref={frames} args={[shared.frame, shared.frameMat, count]} />
      <instancedMesh ref={doors} args={[shared.door, shared.doorMat, count]} />
      <instancedMesh ref={rings} args={[shared.ring, shared.ringMat, count]} renderOrder={3} />
      {PORTALS.map((portal) => (
        <PortalHit key={portal.id} portal={portal} shared={shared} register={register} />
      ))}
    </group>
  );
}

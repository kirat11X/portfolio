import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  CanvasTexture,
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Mesh,
} from 'three';
import { getReducedMotion } from '@/lib/motion';
import { neon } from '@/styles/tokens';
import { BALL } from '../game/ballPhysics';
import { soccer } from '../game/soccerStore';
import { createRadialTexture } from './textures';

const noRaycast = () => undefined;

/** Equirectangular emissive pattern: neon hex panels on a dark shell. */
function createBallTexture(): CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#05060c';
    ctx.fillRect(0, 0, w, h);
    const cols = 8;
    const rows = 4;
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const cx = (c + (r % 2) * 0.5) * (w / cols);
        const cy = r * (h / rows);
        const size = w / cols / 2.4;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i + Math.PI / 6;
          const x = cx + Math.cos(a) * size;
          const y = cy + Math.sin(a) * size * 0.9;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        const accent = (r + c) % 3 === 0;
        ctx.fillStyle = accent ? 'rgba(255,106,44,0.85)' : 'rgba(62,224,255,0.16)';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = accent ? '#ffd2b8' : '#3ee0ff';
        ctx.stroke();
      }
    }
    // Equator band.
    ctx.fillStyle = 'rgba(232,241,255,0.9)';
    ctx.fillRect(0, h / 2 - 3, w, 6);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const axis = new Vector3();
const spin = new Quaternion();

/** The car-soccer ball: rolls with its velocity, hops on hard kicks and squashes a touch on impact. */
export function Ball() {
  const resources = useMemo(() => {
    const pattern = createBallTexture();
    const radial = createRadialTexture();
    return {
      pattern,
      radial,
      sphere: new SphereGeometry(BALL.radius, 36, 24),
      decal: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      shell: new MeshStandardMaterial({
        color: '#1a1d2c',
        map: pattern,
        emissive: new Color('#ffffff'),
        emissiveMap: pattern,
        emissiveIntensity: 1.6,
        metalness: 0.3,
        roughness: 0.35,
      }),
      shadow: new MeshBasicMaterial({ color: '#000000', map: radial, transparent: true, opacity: 0.7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
      glow: new MeshBasicMaterial({
        color: new Color(neon.orange).multiplyScalar(1.4),
        map: radial,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      }),
    };
  }, []);
  useEffect(
    () => () => {
      for (const resource of Object.values(resources)) resource.dispose();
    },
    [resources],
  );

  const resourcesRef = useRef(resources);
  const rootRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const shadowRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const squash = useRef(0);

  useFrame((_, delta) => {
    const root = rootRef.current;
    const mesh = meshRef.current;
    if (!root || !mesh) return;
    const dt = Math.min(delta, 1 / 20);
    const ball = soccer.ball;
    const reduced = getReducedMotion();
    const mats = resourcesRef.current;
    root.position.set(ball.x, 0, ball.z);
    // Roll: rotate about (up × velocity) by distance / radius.
    const speed = Math.hypot(ball.vx, ball.vz);
    if (speed > 1e-3) {
      axis.set(ball.vz, 0, -ball.vx).normalize();
      spin.setFromAxisAngle(axis, (speed * dt) / BALL.radius);
      mesh.quaternion.premultiply(spin);
    }
    const hit = Math.max(soccer.lastKick, soccer.wallHit * 0.6);
    soccer.lastKick = 0;
    soccer.wallHit = 0;
    if (!reduced && hit > 3) squash.current = Math.max(squash.current, Math.min(0.18, hit * 0.012));
    squash.current *= Math.exp(-dt * 9);
    const s = squash.current;
    mesh.position.y = BALL.radius + ball.y;
    mesh.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5);
    const height = ball.y;
    const shadow = shadowRef.current;
    if (shadow) {
      const k = 1 / (1 + height * 0.25);
      shadow.scale.set(BALL.radius * 2.6 * k, 1, BALL.radius * 2.6 * k);
      mats.shadow.opacity = 0.7 * k;
    }
    const glow = glowRef.current;
    if (glow) {
      const k = 1 / (1 + height * 0.35);
      glow.scale.set(BALL.radius * 4.2, 1, BALL.radius * 4.2);
      mats.glow.opacity = (0.35 + Math.min(0.4, speed * 0.03)) * k;
    }
  });

  return (
    <group ref={rootRef} name="gameplay:ball">
      <mesh ref={shadowRef} geometry={resources.decal} material={resources.shadow} position-y={0.021} renderOrder={1} raycast={noRaycast} />
      <mesh ref={glowRef} geometry={resources.decal} material={resources.glow} position-y={0.029} renderOrder={2} raycast={noRaycast} />
      <mesh ref={meshRef} geometry={resources.sphere} material={resources.shell} position-y={BALL.radius} raycast={noRaycast} />
    </group>
  );
}

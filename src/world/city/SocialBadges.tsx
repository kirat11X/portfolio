// GitHub and LinkedIn badges floating above the Archive's CONTACT door. Links come from profileData.socials, so they stay in sync with the
// rest of the site; clicking opens the profile in a new tab. The same links
// are always available in the navbar, footer and contact page.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { CanvasTexture, Color, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type Group, type Mesh } from 'three';
import { neon } from '@/styles/tokens';
import { profileData } from '@/data/profile';
import { useReducedMotion } from '@/lib/motion';
import type { SocialLink } from '@/types';
import { LANDMARKS, PORTALS } from '../config/layout';
import { useWorldStore } from '../state/worldStore';

const W = 1.25;
const H = 1.5;
const TEX_W = 320;
const TEX_H = 384;

const GITHUB_PATHS = [
  'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4',
  'M9 18c-4.51 2-5-2-7-2',
];
const LINKEDIN_PATHS = ['M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z', 'M2 9h4v12H2z'];

interface BadgeDef {
  kind: 'github' | 'linkedin';
  label: string;
  color: string;
  x: number;
}

const CONTACT_DOOR_X = PORTALS.find((p) => p.id === 'portal:contact')?.x ?? 0;

const BADGES: BadgeDef[] = [
  { kind: 'github', label: 'GITHUB', color: neon.white, x: CONTACT_DOOR_X - 1.15 },
  { kind: 'linkedin', label: 'LINKEDIN', color: neon.blue, x: CONTACT_DOOR_X + 1.15 },
];

function drawBadge(ctx: CanvasRenderingContext2D, def: BadgeDef) {
  ctx.clearRect(0, 0, TEX_W, TEX_H);
  const r = 46;
  const inset = 10;
  ctx.beginPath();
  ctx.roundRect(inset, inset, TEX_W - inset * 2, TEX_H - inset * 2, r);
  ctx.fillStyle = 'rgba(10, 14, 28, 0.82)';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = def.color;
  ctx.stroke();

  // Icon: a 24-unit viewBox drawn at 8× (192 px), centred in the upper part.
  const scale = 8;
  ctx.save();
  ctx.translate((TEX_W - 24 * scale) / 2, 52);
  ctx.scale(scale, scale);
  ctx.lineWidth = 1.9;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = def.color;
  const paths = def.kind === 'github' ? GITHUB_PATHS : LINKEDIN_PATHS;
  for (const d of paths) ctx.stroke(new Path2D(d));
  if (def.kind === 'linkedin') {
    ctx.beginPath();
    ctx.arc(4, 4, 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = def.color;
  ctx.font = '500 34px "JetBrains Mono", ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '6px';
  ctx.fillText(def.label, TEX_W / 2, TEX_H - 52);
}

function Badge({ def, link, geometry }: { def: BadgeDef; link: SocialLink; geometry: PlaneGeometry }) {
  const id = `social:${def.kind}`;
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const hover = useRef(0);
  const reduced = useReducedMotion();
  const setHovered = useWorldStore((s) => s.setHovered);
  const base = useMemo(() => new Color('#ffffff'), []);

  const { texture, material } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false, depthWrite: false });
    return { texture, material };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const paint = () => {
      // Reach the texture through the mesh ref (hook values stay immutable).
      const tex = (mesh.current?.material as MeshBasicMaterial | undefined)?.map;
      const ctx = (tex?.image as HTMLCanvasElement | undefined)?.getContext('2d');
      if (!tex || !ctx || cancelled) return;
      drawBadge(ctx, def);
      tex.needsUpdate = true;
    };
    paint();
    // Repaint once the label font is available (it may still be loading).
    document.fonts?.load('500 34px "JetBrains Mono"').then(paint, () => undefined);
    return () => {
      cancelled = true;
      texture.dispose();
      material.dispose();
    };
  }, [def, texture, material]);

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    const target = useWorldStore.getState().hoveredId === id ? 1 : 0;
    hover.current += (target - hover.current) * (1 - Math.exp(-Math.min(delta, 0.1) * 10));
    const k = hover.current;
    const bob = reduced ? 0 : Math.sin(clock.elapsedTime * 1.4 + def.x) * 0.06;
    g.position.y = 5.35 + bob + k * 0.08;
    g.scale.setScalar(1 + k * 0.08);
    const mat = mesh.current?.material as MeshBasicMaterial | undefined;
    mat?.color.copy(base).multiplyScalar(1.15 + k * 0.9);
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    window.open(link.href, '_blank', 'noopener,noreferrer');
  };

  return (
    <group ref={group} position={[def.x, 5.35, LANDMARKS.about.maxZ + 0.4]}>
      <mesh
        ref={mesh}
        geometry={geometry}
        material={material}
        renderOrder={4}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(id);
        }}
        onPointerOut={() => setHovered(null)}
        onClick={onClick}
      />
    </group>
  );
}

export function SocialBadges() {
  const geometry = useMemo(() => new PlaneGeometry(W, H), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const links = BADGES.map((def) => ({ def, link: profileData.socials.find((s) => s.kind === def.kind) })).filter(
    (entry): entry is { def: BadgeDef; link: SocialLink } => Boolean(entry.link),
  );
  return (
    <group name="social-badges">
      {links.map(({ def, link }) => (
        <Badge key={def.kind} def={def} link={link} geometry={geometry} />
      ))}
    </group>
  );
}

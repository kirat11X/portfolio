// drei <Text> with an HDR unlit material so bloom catches it, plus an optional
// rare, subtle flicker (disabled with reduced motion). Flicker is computed
// from the clock without allocations; only the material colour changes.

import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { Color, FrontSide, type MeshBasicMaterial } from 'three';
import { useReducedMotion } from '@/lib/motion';
import { fontUrls, type FontRole } from '@/lib/fonts';
import { safeText } from './lib/text';

export interface NeonTextProps {
  children: string;
  color: string;
  /** Multiplier on the colour; above ~1.2 the text blooms. */
  intensity?: number;
  font?: FontRole;
  fontSize: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  letterSpacing?: number;
  maxWidth?: number;
  lineHeight?: number;
  textAlign?: 'left' | 'right' | 'center' | 'justify';
  anchorX?: 'left' | 'center' | 'right' | number;
  anchorY?: 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom' | number;
  opacity?: number;
  /** Seed > 0 enables a rare flicker. */
  flicker?: number;
  /** Mutable intensity scale written by a parent (hover states). */
  gainRef?: { current: number };
  toneMapped?: boolean;
  renderOrder?: number;
  extra?: ReactNode;
}

function flickerAt(t: number, seed: number): number {
  const period = 9 + (seed % 7);
  const local = (t + seed * 3.17) % period;
  if (local > 0.55) return 1;
  const k = Math.sin(Math.floor(local * 26 + seed) * 12.9898) * 43758.5453;
  return k - Math.floor(k) > 0.45 ? 1 : 0.28;
}

export function NeonText({
  children,
  color,
  intensity = 1,
  font = 'display',
  fontSize,
  position,
  rotation,
  letterSpacing = 0,
  maxWidth,
  lineHeight,
  textAlign,
  anchorX = 'center',
  anchorY = 'middle',
  opacity = 1,
  flicker = 0,
  gainRef,
  toneMapped = false,
  renderOrder,
}: NeonTextProps) {
  const reduced = useReducedMotion();
  const material = useRef<MeshBasicMaterial>(null);
  const base = useMemo(() => new Color(color).multiplyScalar(intensity), [color, intensity]);
  useFrame(({ clock }) => {
    const m = material.current;
    const flickering = flicker > 0 && !reduced;
    if (!m || (!flickering && !gainRef)) return;
    let k = gainRef ? gainRef.current : 1;
    if (flicker > 0 && !reduced) k *= flickerAt(clock.elapsedTime, flicker);
    m.color.copy(base).multiplyScalar(k);
  });

  return (
    <Text
      font={fontUrls[font]}
      fontSize={fontSize}
      position={position}
      rotation={rotation}
      letterSpacing={letterSpacing}
      maxWidth={maxWidth}
      lineHeight={lineHeight}
      textAlign={textAlign}
      anchorX={anchorX}
      anchorY={anchorY}
      renderOrder={renderOrder}
    >
      {safeText(children)}
      <meshBasicMaterial ref={material} color={base} toneMapped={toneMapped} transparent opacity={opacity} side={FrontSide} depthWrite={false} />
    </Text>
  );
}

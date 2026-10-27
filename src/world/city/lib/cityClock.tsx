// One clock for every animated shader in the city. Only this component touches
// the uniforms each frame (two number writes); with reduced motion the clock
// freezes and `uMotion` drops to 0 so blinking lights hold steady.

import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useReducedMotion } from '@/lib/motion';
import { cityUniforms } from './cityUniforms';


export function CityClock() {
  const reduced = useReducedMotion();
  useEffect(() => {
    cityUniforms.uMotion.value = reduced ? 0 : 1;
  }, [reduced]);
  useFrame((_, delta) => {
    if (!reduced) cityUniforms.uTime.value += Math.min(delta, 0.1);
  });
  return null;
}

// Post-processing by quality tier: 'high' = bloom + vignette with MSAA,
// 'medium' = cheaper bloom (smaller base, fewer mips) without MSAA, 'low' = tone
// mapping only. The composer disables renderer tone mapping while mounted, so the
// same tone mapping is re-applied as the last effect to keep every tier alike.
//
// 'low' keeps a (minimal) composer on purpose: rendering straight to the canvas
// would switch every scene material to the tone-mapped / sRGB-output shader
// variant, recompiling ~15 programs right when a struggling device steps down.

import { useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  CineonToneMapping,
  LinearToneMapping,
  NeutralToneMapping,
  ReinhardToneMapping,
  type ToneMapping as ThreeToneMapping,
} from 'three';
import { useWorldStore } from '../state/worldStore';

function toMode(mapping: ThreeToneMapping): ToneMappingMode | null {
  switch (mapping) {
    case ACESFilmicToneMapping:
      return ToneMappingMode.ACES_FILMIC;
    case AgXToneMapping:
      return ToneMappingMode.AGX;
    case NeutralToneMapping:
      return ToneMappingMode.NEUTRAL;
    case ReinhardToneMapping:
      return ToneMappingMode.REINHARD;
    case CineonToneMapping:
      return ToneMappingMode.OPTIMIZED_CINEON;
    case LinearToneMapping:
      return ToneMappingMode.LINEAR;
    default:
      return null;
  }
}

export function WorldEffects() {
  const quality = useWorldStore((s) => s.quality);
  const gl = useThree((s) => s.gl);
  // Captured on first render, before the composer forces NoToneMapping.
  const [mode] = useState(() => toMode(gl.toneMapping));
  const high = quality === 'high';
  if (quality === 'low') {
    return (
      <EffectComposer key={quality} multisampling={0} enableNormalPass={false}>
        {mode !== null ? <ToneMapping mode={mode} /> : <></>}
      </EffectComposer>
    );
  }
  return (
    <EffectComposer key={quality} multisampling={high ? 4 : 0} enableNormalPass={false}>
      {/* Medium blurs from a smaller base (0.35 vs 0.5 of the canvas) with fewer mip levels. */}
      <Bloom
        mipmapBlur
        luminanceThreshold={0.92}
        luminanceSmoothing={0.2}
        intensity={high ? 1.0 : 0.82}
        radius={high ? 0.78 : 0.7}
        levels={high ? 8 : 5}
        resolutionScale={high ? 0.5 : 0.35}
      />
      <Vignette offset={0.3} darkness={high ? 0.62 : 0.52} />
      {mode !== null ? <ToneMapping mode={mode} /> : <></>}
    </EffectComposer>
  );
}

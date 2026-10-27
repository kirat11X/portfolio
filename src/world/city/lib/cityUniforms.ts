// Shared animation uniforms for every city shader. Written once per frame by
// <CityClock />; with reduced motion the clock freezes and uMotion is 0.
export const cityUniforms = {
  uTime: { value: 0 },
  uMotion: { value: 1 },
};
